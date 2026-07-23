import type {
	BuiltTool,
	CredentialListItem,
	CredentialProvider,
	InterruptibleToolContext,
} from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	channelSuspendPayloadSchema,
	credentialSuspendPayloadSchema,
	interactionQuestionSchema,
	questionAnswerSchema,
	questionsSuspendPayloadSchema,
	type InteractionQuestion,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { BUILDER_TOOLS } from '../builder-tool-names';

/** Filters an already-fetched credential list down to one type, in the shape the setup cards need. */
function credentialsOfType(
	all: CredentialListItem[],
	credentialType: string,
): Array<{ id: string; name: string }> {
	return all.filter((c) => c.type === credentialType).map((c) => ({ id: c.id, name: c.name }));
}

/** Compact publish-blocking validation issue, used to gate the channel phase. */
export interface PublishBlockerIssue {
	path: string;
	code: string;
}

export interface FinishSetupToolDeps {
	credentialProvider: CredentialProvider;
	agentId: string;
	projectId: string;
	isCredentialTypeKnown?: (credentialType: string) => boolean;
	/** Credential ids of the agent's configured chat channel integrations — reused for a matching credential slot. */
	listIntegrationCredentialIds?: () => Promise<string[]>;
	/** Wraps `AgentIntegrationPersistenceService.listChatIntegrations()`. */
	listChatIntegrationTypes: () => string[];
	/**
	 * Publish-blocking validation issues on the agent's current (draft) config,
	 * excluding `integrations.*` paths. Checked before entering a channel
	 * phase — connecting a channel auto-publishes the agent, which would
	 * otherwise fail with a raw publish error whenever another part of the
	 * config (e.g. a skipped tool credential) is still invalid.
	 */
	getPublishBlockers: () => Promise<PublishBlockerIssue[]>;
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

/**
 * A channel is connected (the setup card persisted it), skipped (the user
 * dismissed the card), or blocked (its card was never shown because the
 * agent could not be published yet).
 */
const channelOutcomeSchema = z.union([
	z.literal('connected'),
	z.literal('skipped'),
	z.literal('blocked'),
]);

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
	collected: collectedSchema,
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
	/** Present only when a channel phase was skipped because the agent could not be published yet. */
	publishBlockedIssues?: PublishBlockerIssue[];
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
 * one channel phase per requested channel — channels always run last since
 * their card persists the connection immediately via REST.
 */
async function computeInitialPlan(
	input: FinishSetupInput,
	deps: FinishSetupToolDeps,
): Promise<{ phases: PhaseDescriptor[]; collected: Collected }> {
	validateCredentialTypes(input, deps);
	validateChannelTypes(input, deps);

	const collected: Collected = {};
	const pendingSlots: CredentialSlotInput[] = [];

	if (input.credentialRequests?.length) {
		const integrationCredentialIds = (await deps.listIntegrationCredentialIds?.()) ?? [];
		const all = await deps.credentialProvider.list();
		const credentials: Record<string, z.infer<typeof credentialOutcomeSchema>> = {};

		for (const slot of input.credentialRequests) {
			const key = slot.credentialSlot ?? slot.credentialType;
			const existingCredentials = credentialsOfType(all, slot.credentialType);
			const channelMatch = existingCredentials.find((credential) =>
				integrationCredentialIds.includes(credential.id),
			);
			const autoResolved =
				channelMatch ?? (existingCredentials.length === 1 ? existingCredentials[0] : undefined);

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
		return { ...previous, answers: resumeData?.answers ?? [] };
	}

	if (phase.kind === 'channel') {
		const channels = { ...(previous.channels ?? {}) };
		channels[phase.integrationType] = resumeData?.approved ? 'connected' : 'skipped';
		return { ...previous, channels };
	}

	const all = await deps.credentialProvider.list();
	const credentials = { ...(previous.credentials ?? {}) };
	for (const slot of phase.slots) {
		const key = slot.credentialSlot ?? slot.credentialType;
		const credentialId = resumeData?.credentials?.[slot.credentialType];
		credentials[key] = credentialId
			? {
					id: credentialId,
					name:
						credentialsOfType(all, slot.credentialType).find((c) => c.id === credentialId)?.name ??
						credentialId,
				}
			: 'skipped';
	}
	return { ...previous, credentials };
}

/**
 * Before entering a channel phase, verify the agent can currently be
 * published — connecting a channel auto-publishes it, so an already-invalid
 * config (e.g. a skipped tool credential) would otherwise surface as a raw
 * publish error from the channel card's REST call instead of a clear message
 * here. Channel phases are always the trailing, consecutive phases (see
 * computeInitialPlan), so once `phase` is a channel phase, every phase in
 * `remainingPhases` is one too.
 */
async function checkChannelPublishability(
	phase: PhaseDescriptor,
	remainingPhases: PhaseDescriptor[],
	collected: Collected,
	deps: FinishSetupToolDeps,
): Promise<FinishSetupToolResult | undefined> {
	if (phase.kind !== 'channel') return undefined;

	const publishBlockedIssues = await deps.getPublishBlockers();
	if (publishBlockedIssues.length === 0) return undefined;

	const channels = { ...(collected.channels ?? {}) };
	for (const blockedPhase of [phase, ...remainingPhases]) {
		if (blockedPhase.kind === 'channel') channels[blockedPhase.integrationType] = 'blocked';
	}
	return { completed: true, ...collected, channels, publishBlockedIssues };
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

	const all = await deps.credentialProvider.list();
	const seenTypes = new Set<string>();
	const credentialRequests: Array<{
		credentialType: string;
		reason: string;
		existingCredentials: Array<{ id: string; name: string }>;
	}> = [];
	for (const slot of phase.slots) {
		if (seenTypes.has(slot.credentialType)) continue;
		seenTypes.add(slot.credentialType);
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
	const blocked = await checkChannelPublishability(currentPhase, remainingPhases, collected, deps);
	if (blocked) return blocked;

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
		chain.collected,
		deps,
	);

	if (chain.remainingPhases.length === 0) {
		return { completed: true, ...collected };
	}

	const [nextPhase, ...restPhases] = chain.remainingPhases;
	const blocked = await checkChannelPublishability(nextPhase, restPhases, collected, deps);
	if (blocked) return blocked;

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
				'connections. Call it at most once, only in the trailing step of an initial build ' +
				'when only blocked tasks remain, and never together with another interactive tool. ' +
				'It shows the question and credential cards back-to-back without returning control ' +
				'between them, then one card per requested channel (always last, since connecting a ' +
				'channel needs credentials to already be resolved) — but a channel card shows ' +
				'in-chain only when the agent is already publishable when its phase is reached. Pass ' +
				'`channels` with a returned `type` from list_integration_types, one entry per channel ' +
				'to connect; do not infer channel names. Connecting a channel publishes the agent, ' +
				'and answers/credentials collected by this call are NOT applied to the config ' +
				'mid-flow — so if the agent still has publish-blocking issues once a channel phase ' +
				'is reached (expected whenever this same call is still collecting the model or a ' +
				'required credential), that ' +
				'phase\'s card is never shown — its outcome is `"blocked"` instead of `"connected"`/' +
				'`"skipped"`, and the result carries `publishBlockedIssues`. Resolve those issues first ' +
				'(patch in the credentials/model this same call already collected), then call ' +
				'configure_channel directly for each blocked channel. Returns ' +
				'{ completed, answers, credentials, channels, publishBlockedIssues } (plus configMutated/agentId refresh metadata when completed): resolve the model ' +
				'answer with resolve_llm, copy returned credential ids into the config, and verify MCP ' +
				'servers with them. Auto-resolves credential slots that match an existing single ' +
				'credential or the connected channel credential.',
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
