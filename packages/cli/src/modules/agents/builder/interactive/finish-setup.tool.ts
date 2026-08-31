import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	channelSuspendPayloadSchema,
	credentialSuspendPayloadSchema,
	interactionQuestionSchema,
	questionAnswerSchema,
	questionsSuspendPayloadSchema,
	shouldAutoResolveCredential,
	type InteractionQuestion,
} from '@n8n/api-types';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { BuilderTrackFn } from '../builder-config-telemetry';
import { BUILDER_TOOLS } from '../builder-tool-names';

/** Filter an already-fetched credential list down to one type, in the shape setup cards need. */
function credentialsOfType(
	all: Array<{ id: string; name: string; type: string }>,
	credentialType: string,
): Array<{ id: string; name: string }> {
	return all.filter((c) => c.type === credentialType).map((c) => ({ id: c.id, name: c.name }));
}

/** Resolve a credential's display name by id via `get`, falling back to the id if it was deleted between suspend and resume. */
async function credentialNameById(
	credentialService: InstanceAiCredentialService,
	credentialId: string,
): Promise<string> {
	try {
		const credential = await credentialService.get(credentialId);
		return credential.name;
	} catch {
		return credentialId;
	}
}

export interface FinishSetupToolDeps {
	credentialService: InstanceAiCredentialService;
	agentId: string;
	projectId: string;
	track: BuilderTrackFn;
	isCredentialTypeKnown?: (credentialType: string) => boolean;
	/** Credential ids of the agent's configured chat channel integrations — reused for a matching credential slot. */
	listIntegrationCredentialIds?: () => Promise<string[]>;
	/** Wraps `AgentIntegrationPersistenceService.listChatIntegrations()`. */
	listChatIntegrationTypes: () => string[];
	/**
	 * Credential types whose every required node-tool slot is already served by an
	 * n8n Connect managed credential — a card for these is redundant. A type still
	 * empty on any tool is excluded, so an uncovered node/operation keeps prompting.
	 */
	listAiGatewayManagedCredentialTypes?: () => Promise<string[]>;
}

const finishSetupCredentialRequestInputSchema = z.object({
	credentialType: z.string().min(1),
	purpose: z.string().min(1),
	credentialSlot: z.string().optional(),
});
type CredentialSlotInput = z.infer<typeof finishSetupCredentialRequestInputSchema>;

const finishSetupChannelInputSchema = z.object({
	integrationType: z.string().min(1),
});

const finishSetupInputSchema = z
	.object({
		questions: z.array(interactionQuestionSchema).optional(),
		credentialRequests: z.array(finishSetupCredentialRequestInputSchema).optional(),
		channels: z.array(finishSetupChannelInputSchema).optional(),
	})
	.refine(
		(v) =>
			(v.questions?.length ?? 0) + (v.credentialRequests?.length ?? 0) + (v.channels?.length ?? 0) >
			0,
		{ message: 'Pass at least one pending setup item.' },
	);
type FinishSetupInput = z.infer<typeof finishSetupInputSchema>;

/** One resolved credential outcome per slot key — either a resolved credential or an explicit skip. */
const credentialOutcomeSchema = z.union([
	z.object({ id: z.string(), name: z.string() }),
	z.literal('skipped'),
]);

/** A channel is configured when the setup card persists it, or skipped when dismissed. */
const channelOutcomeSchema = z.union([z.literal('configured'), z.literal('skipped')]);

const questionsPhaseSchema = z.object({ kind: z.literal('questions') });
const credentialsPhaseSchema = z.object({
	kind: z.literal('credentials'),
	slots: z.array(finishSetupCredentialRequestInputSchema),
});
const channelPhaseSchema = z.object({
	kind: z.literal('channel'),
	integrationType: z.string(),
});
const phaseDescriptorSchema = z.union([
	questionsPhaseSchema,
	credentialsPhaseSchema,
	channelPhaseSchema,
]);
type PhaseDescriptor = z.infer<typeof phaseDescriptorSchema>;

const collectedSchema = z.object({
	answers: z.array(questionAnswerSchema).optional(),
	credentials: z.record(credentialOutcomeSchema).optional(),
	channels: z.record(channelOutcomeSchema).optional(),
});
type Collected = z.infer<typeof collectedSchema>;

/** Older checkpoints recorded approved channel setup as `connected`. */
const checkpointCollectedSchema = collectedSchema.extend({
	channels: z.record(z.union([channelOutcomeSchema, z.literal('connected')])).optional(),
});
type CheckpointCollected = z.infer<typeof checkpointCollectedSchema>;

/**
 * Chain state carried inside the suspend payload (a member of each phase's
 * suspend schema, so it round-trips through the builder checkpoint) and
 * stripped by instance AI's cascade before the FE ever sees it — the FE
 * routes purely on the presence of `inputType`/`credentialRequests`/
 * `channelConfig`, identical to the single-purpose interactive tools.
 */
const chainStateSchema = z.object({
	currentPhase: phaseDescriptorSchema,
	remainingPhases: z.array(phaseDescriptorSchema),
	collected: checkpointCollectedSchema,
	totalPhases: z.number(),
});
type ChainState = z.infer<typeof chainStateSchema>;

const finishSetupSuspendSchema = z.union([
	questionsSuspendPayloadSchema.extend({ finishSetupChain: chainStateSchema }),
	credentialSuspendPayloadSchema.extend({ finishSetupChain: chainStateSchema }),
	channelSuspendPayloadSchema.extend({ finishSetupChain: chainStateSchema }),
]);
type FinishSetupSuspendPayload = z.infer<typeof finishSetupSuspendSchema>;

/**
 * Deliberately a single permissive object, not a union — the three phases'
 * resume shapes overlap enough (e.g. questions/credentials and channel both
 * carry an optional `approved`) that a union would ambiguously match the
 * wrong arm. The handler always knows which phase a resume belongs to from
 * `ctx.suspendPayload.finishSetupChain`, so shape ambiguity here is harmless.
 */
const finishSetupResumeSchema = z.object({
	approved: z.boolean().optional(),
	answers: z.array(questionAnswerSchema).optional(),
	credentials: z.record(z.string()).optional(),
	skipped: z.boolean().optional(),
});
type FinishSetupResumeData = z.infer<typeof finishSetupResumeSchema>;

type FinishSetupCtx = InterruptibleToolContext<FinishSetupSuspendPayload, FinishSetupResumeData>;

interface FinishSetupToolResult extends Collected {
	completed: true;
}

/** Normalize checkpoint-only legacy outcomes before they enter the current setup flow. */
function normalizeCheckpointCollected({ channels, ...collected }: CheckpointCollected): Collected {
	if (!channels) return collected;

	const normalizedChannels: NonNullable<Collected['channels']> = {};
	for (const [integrationType, outcome] of Object.entries(channels)) {
		normalizedChannels[integrationType] = outcome === 'connected' ? 'configured' : outcome;
	}
	return { ...collected, channels: normalizedChannels };
}

/** Throws for any credential request whose type isn't recognized. */
function validateCredentialTypes(input: FinishSetupInput, deps: FinishSetupToolDeps): void {
	for (const request of input.credentialRequests ?? []) {
		if (deps.isCredentialTypeKnown && !deps.isCredentialTypeKnown(request.credentialType)) {
			throw new Error(
				`Unknown credential type "${request.credentialType}". Use an exact n8n credential type name.`,
			);
		}
	}
}

/** Throws for any requested channel whose type isn't a known chat integration. */
function validateChannelTypes(input: FinishSetupInput, deps: FinishSetupToolDeps): void {
	const availableChannelTypes = deps.listChatIntegrationTypes();
	for (const channel of input.channels ?? []) {
		if (!availableChannelTypes.includes(channel.integrationType)) {
			const availableMessage = availableChannelTypes.length
				? ` Available: ${availableChannelTypes.join(', ')}.`
				: ' No chat channels are currently available.';
			throw new Error(
				`Unsupported chat channel "${channel.integrationType}". Call list_integration_types ` +
					'and choose a returned type.' +
					availableMessage,
			);
		}
	}
}

/**
 * Validate input, then auto-resolve every credential slot using the same
 * rules as ask_credential (matching channel credential first, then a single
 * existing credential of the type). Slots that cannot be auto-resolved
 * become a phase. Phase order is fixed: questions, then credentials, then
 * one channel phase per requested channel — channels always run last after
 * every question and credential phase since their cards persist configuration.
 */
async function computeInitialPlan(
	input: FinishSetupInput,
	deps: FinishSetupToolDeps,
): Promise<{ phases: PhaseDescriptor[]; collected: Collected }> {
	validateCredentialTypes(input, deps);
	validateChannelTypes(input, deps);

	const collected: Collected = {};
	const pendingSlots: CredentialSlotInput[] = [];

	// Drop requests for slots the server already covers with an n8n Connect
	// managed credential — they need no user setup, so never show a card.
	const aiGatewayManagedTypes = new Set((await deps.listAiGatewayManagedCredentialTypes?.()) ?? []);
	const credentialRequests = (input.credentialRequests ?? []).filter(
		(slot) => !aiGatewayManagedTypes.has(slot.credentialType),
	);

	if (credentialRequests.length) {
		const integrationCredentialIds = (await deps.listIntegrationCredentialIds?.()) ?? [];
		const all = await deps.credentialService.list({ projectId: deps.projectId });
		const credentials: Record<string, z.infer<typeof credentialOutcomeSchema>> = {};

		for (const slot of credentialRequests) {
			const key = slot.credentialSlot ?? slot.credentialType;
			const existingCredentials = credentialsOfType(all, slot.credentialType);
			const channelMatch = existingCredentials.find((credential) =>
				integrationCredentialIds.includes(credential.id),
			);
			const autoResolved =
				channelMatch ??
				(shouldAutoResolveCredential(slot.credentialType, existingCredentials.length)
					? existingCredentials[0]
					: undefined);
			if (autoResolved) {
				credentials[key] = autoResolved;
			} else {
				pendingSlots.push(slot);
			}
		}

		if (Object.keys(credentials).length > 0) collected.credentials = credentials;
	}

	const phases: PhaseDescriptor[] = [];
	if (input.questions?.length) phases.push({ kind: 'questions' });
	if (pendingSlots.length > 0) phases.push({ kind: 'credentials', slots: pendingSlots });
	for (const channel of input.channels ?? []) {
		phases.push({ kind: 'channel', integrationType: channel.integrationType });
	}

	return { phases, collected };
}

/** Merge a phase's resume data into the running `collected` result. Any dismissal/denial marks that phase's items skipped rather than aborting the chain. */
async function mergeResumeIntoCollected(
	phase: PhaseDescriptor,
	resumeData: FinishSetupResumeData | undefined,
	previous: Collected,
	deps: FinishSetupToolDeps,
): Promise<Collected> {
	if (phase.kind === 'questions') {
		const answers = resumeData?.answers ?? [];
		const skippedCount = answers.filter((answer) => answer.skipped === true).length;
		const hasUsableAnswer = answers.some((answer) => answer.skipped !== true);
		deps.track(TELEMETRY_EVENT.AGENTS.USER_ANSWERED_BUILDER_QUESTIONS, {
			outcome:
				resumeData?.approved === false ? 'dismissed' : hasUsableAnswer ? 'answered' : 'skipped',
			answered_count: answers.length - skippedCount,
			skipped_count: skippedCount,
		});
		return { ...previous, answers };
	}

	if (phase.kind === 'channel') {
		const channels = { ...(previous.channels ?? {}) };
		channels[phase.integrationType] = resumeData?.approved ? 'configured' : 'skipped';
		if (resumeData?.approved) {
			deps.track(TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TRIGGER, {
				trigger_type: phase.integrationType,
			});
		}
		return { ...previous, channels };
	}

	const credentials = { ...(previous.credentials ?? {}) };
	for (const slot of phase.slots) {
		const key = slot.credentialSlot ?? slot.credentialType;
		const credentialId = resumeData?.credentials?.[slot.credentialType];
		deps.track(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: slot.credentialType,
			outcome: credentialId ? 'provided' : 'skipped',
		});
		credentials[key] = credentialId
			? {
					id: credentialId,
					name: await credentialNameById(deps.credentialService, credentialId),
				}
			: 'skipped';
	}
	return { ...previous, credentials };
}

/** Suspend for the given phase, carrying the remaining plan forward in the chain state. */
async function suspendForPhase(params: {
	phase: PhaseDescriptor;
	remainingPhases: PhaseDescriptor[];
	collected: Collected;
	totalPhases: number;
	phaseNumber: number;
	questions: InteractionQuestion[] | undefined;
	deps: FinishSetupToolDeps;
	ctx: FinishSetupCtx;
}): Promise<never> {
	const { phase, remainingPhases, collected, totalPhases, phaseNumber, questions, deps, ctx } =
		params;
	const finishSetupChain: ChainState = {
		currentPhase: phase,
		remainingPhases,
		collected,
		totalPhases,
	};
	const message = `Finish setup (${phaseNumber}/${totalPhases})`;

	if (phase.kind === 'questions') {
		deps.track(TELEMETRY_EVENT.AGENTS.BUILDER_ASKED_QUESTIONS, {
			question_count: (questions ?? []).length,
			question_types: [...new Set((questions ?? []).map((q) => q.type))].sort(),
		});
		return await ctx.suspend({
			requestId: nanoid(),
			message,
			severity: 'info' as const,
			inputType: 'questions' as const,
			questions: questions ?? [],
			finishSetupChain,
		});
	}

	if (phase.kind === 'channel') {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Set up the ${phase.integrationType} channel`,
			severity: 'info' as const,
			channelConfig: { integrationType: phase.integrationType, agentId: deps.agentId },
			projectId: deps.projectId,
			finishSetupChain,
		});
	}

	const all = await deps.credentialService.list({ projectId: deps.projectId });
	const seenTypes = new Set<string>();
	const credentialRequests: Array<{
		credentialType: string;
		reason: string;
		existingCredentials: Array<{ id: string; name: string }>;
	}> = [];
	for (const slot of phase.slots) {
		if (seenTypes.has(slot.credentialType)) continue;
		seenTypes.add(slot.credentialType);
		deps.track(TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL, {
			credential_type: slot.credentialType,
		});
		credentialRequests.push({
			credentialType: slot.credentialType,
			reason: slot.purpose,
			existingCredentials: credentialsOfType(all, slot.credentialType),
		});
	}
	return await ctx.suspend({
		requestId: nanoid(),
		message,
		severity: 'info' as const,
		credentialRequests,
		credentialFlow: { stage: 'generic' as const },
		projectId: deps.projectId,
		finishSetupChain,
	});
}

async function startPlan(
	input: FinishSetupInput,
	ctx: FinishSetupCtx,
	deps: FinishSetupToolDeps,
): Promise<FinishSetupToolResult> {
	const { phases, collected } = await computeInitialPlan(input, deps);
	if (phases.length === 0) {
		return { completed: true, ...collected };
	}

	const [currentPhase, ...remainingPhases] = phases;
	return await suspendForPhase({
		phase: currentPhase,
		remainingPhases,
		collected,
		totalPhases: phases.length,
		phaseNumber: 1,
		questions: input.questions,
		deps,
		ctx,
	});
}

async function resumePlan(
	input: FinishSetupInput,
	ctx: FinishSetupCtx,
	deps: FinishSetupToolDeps,
): Promise<FinishSetupToolResult> {
	// Guarded by the caller: ctx.suspendPayload is set whenever this branch runs.
	const chain = ctx.suspendPayload!.finishSetupChain;
	const collected = await mergeResumeIntoCollected(
		chain.currentPhase,
		ctx.resumeData,
		normalizeCheckpointCollected(chain.collected),
		deps,
	);

	if (chain.remainingPhases.length === 0) {
		return { completed: true, ...collected };
	}

	const [nextPhase, ...restPhases] = chain.remainingPhases;
	return await suspendForPhase({
		phase: nextPhase,
		remainingPhases: restPhases,
		collected,
		totalPhases: chain.totalPhases,
		phaseNumber: chain.totalPhases - restPhases.length,
		questions: input.questions,
		deps,
		ctx,
	});
}

export function buildFinishSetupTool(deps: FinishSetupToolDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.FINISH_SETUP)
		.description(
			'Collect everything still needed to finish the initial build in ONE guided flow: open ' +
				'questions (including the model choice), credential slots, and chat-channel ' +
				'setup. Call it at most once, only in the trailing step of an initial build ' +
				'when only blocked tasks remain, and never together with another interactive tool. ' +
				'It shows setup cards back-to-back without returning control between them: questions, ' +
				'then credentials, then one card per requested channel. Channel cards always run last ' +
				'after every credential phase, including when earlier setup was skipped or dismissed. Pass ' +
				'`channels` with a returned `type` from list_integration_types, one entry per channel ' +
				'to configure; do not infer channel names. Each channel card persists the configuration ' +
				'or skips it, so channel outcomes are `"configured"` or `"skipped"`. Do not call ' +
				'configure_channel again for a channel handled by ' +
				'this flow. Returns { completed, answers, credentials, ' +
				'channels } (plus configMutated/agentId refresh metadata when completed): resolve the ' +
				'model answer with resolve_llm, copy returned credential ids into the config, and verify ' +
				'MCP servers with them. Auto-resolves credential slots that match an existing single ' +
				'credential or configured channel credential.',
		)
		.input(finishSetupInputSchema)
		.suspend(finishSetupSuspendSchema)
		.resume(finishSetupResumeSchema)
		.handler(async (input: FinishSetupInput, ctx: FinishSetupCtx) => {
			if (ctx.suspendPayload) {
				return await resumePlan(input, ctx, deps);
			}
			return await startPlan(input, ctx, deps);
		})
		.build();
}
