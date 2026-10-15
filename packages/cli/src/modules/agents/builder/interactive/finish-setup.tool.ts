import type { BuiltTool, CredentialListItem, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	channelSuspendPayloadSchema,
	credentialSuspendPayloadSchema,
	interactionQuestionSchema,
	questionAnswerSchema,
	questionsSuspendPayloadSchema,
	shouldAutoResolveCredential,
	type InteractionQuestion,
	type QuestionAnswer,
} from '@n8n/api-types';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import {
	parameterGapKey,
	type SetupGap,
	type SetupValues,
} from '../../json-config/agent-setup-gaps';
import { BUILDER_TOOLS } from '../builder-tool-names';
import type { ChannelSetupDeps, CredentialSetupDeps } from './setup-tool.types';

/** Filter an already-fetched credential list down to one type, in the shape setup cards need. */
function credentialsOfType(
	all: CredentialListItem[],
	credentialType: string,
): Array<Pick<CredentialListItem, 'id' | 'name'>> {
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

/** Result of writing the collected values into the current agent config. */
export interface SetupFillResult {
	filled: SetupGap[];
	/** Gaps that are still empty after the write. */
	remaining: SetupGap[];
	configHash?: string;
	error?: string;
}

export interface FinishSetupToolDeps extends CredentialSetupDeps, ChannelSetupDeps {
	/**
	 * Credential types whose every required node-tool slot is already served by an
	 * n8n Connect managed credential — a card for these is redundant. A type still
	 * empty on any tool is excluded, so an uncovered node/operation keeps prompting.
	 */
	listAiGatewayManagedCredentialTypes?: () => Promise<string[]>;
	/** Lists the node-tool fields that the current config leaves for the user. */
	findSetupGaps?: () => Promise<SetupGap[]>;
	/** Writes the collected values into those fields of the current config. */
	fillSetupGaps?: (values: SetupValues) => Promise<SetupFillResult>;
}

/** Question ids of parameter cards. Model questions use their own ids. */
const PARAMETER_QUESTION_PREFIX = 'setup:';

const finishSetupCredentialRequestInputSchema = z.object({
	credentialType: z.string().min(1),
	purpose: z.string().min(1),
});
type CredentialSlotInput = z.infer<typeof finishSetupCredentialRequestInputSchema>;

const finishSetupChannelInputSchema = z.object({
	integrationType: z.string().min(1),
});

const finishSetupInputSchema = z.object({
	questions: z.array(interactionQuestionSchema).optional(),
	credentialRequests: z
		.array(finishSetupCredentialRequestInputSchema)
		.optional()
		.describe(
			'Credentials that no node tool in the config holds: MCP servers, Episodic Memory, and ' +
				'tools that are not added yet. The tool finds node-tool credential slots itself.',
		),
	channels: z.array(finishSetupChannelInputSchema).optional(),
});
type FinishSetupInput = z.infer<typeof finishSetupInputSchema>;

/** One resolved credential outcome per credential type — either a resolved credential or an explicit skip. */
const credentialOutcomeSchema = z.union([
	z.object({ id: z.string(), name: z.string() }),
	z.literal('skipped'),
]);
type CredentialOutcome = z.infer<typeof credentialOutcomeSchema>;

/** A channel is configured when the setup card persists it, or skipped when dismissed. */
const channelOutcomeSchema = z.union([z.literal('configured'), z.literal('skipped')]);

/** Older checkpoints omit `questions`; they only resume this phase, which needs none. */
const questionsPhaseSchema = z.object({
	kind: z.literal('questions'),
	questions: z.array(interactionQuestionSchema).optional(),
});
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
	/** Node-tool fields that this flow wrote into the config. */
	filled?: SetupGap[];
	/** Node-tool fields that the config still leaves empty. */
	remaining?: SetupGap[];
	configHash?: string;
	setupError?: string;
}

function parameterQuestions(gaps: SetupGap[]): InteractionQuestion[] {
	const questions = new Map<string, InteractionQuestion>();
	for (const gap of gaps) {
		if (gap.kind !== 'parameter' || !gap.askable) continue;
		const id = PARAMETER_QUESTION_PREFIX + parameterGapKey(gap);
		questions.set(id, { id, question: `${gap.tool}: ${gap.label}`, type: 'text' });
	}
	return [...questions.values()];
}

/** One slot per credential type: the model's requests first, then each type that a node tool leaves empty. */
function credentialSlots(
	input: FinishSetupInput,
	gaps: SetupGap[],
	aiGatewayManagedTypes: Set<string>,
): CredentialSlotInput[] {
	const slots = new Map<string, CredentialSlotInput>();
	for (const request of input.credentialRequests ?? []) {
		if (aiGatewayManagedTypes.has(request.credentialType)) continue;
		if (!slots.has(request.credentialType)) slots.set(request.credentialType, request);
	}

	const toolsByType = new Map<string, string[]>();
	for (const gap of gaps) {
		if (gap.kind !== 'credential') continue;
		toolsByType.set(gap.credentialType, [...(toolsByType.get(gap.credentialType) ?? []), gap.tool]);
	}
	for (const [credentialType, tools] of toolsByType) {
		if (slots.has(credentialType)) continue;
		slots.set(credentialType, { credentialType, purpose: `Used by ${tools.join(', ')}` });
	}
	return [...slots.values()];
}

/**
 * Auto-resolve slots with the same rules as ask_credential: a matching
 * channel credential first, then a single existing credential of the type.
 */
async function autoResolveCredentials(
	slots: CredentialSlotInput[],
	deps: FinishSetupToolDeps,
): Promise<{ resolved: Record<string, CredentialOutcome>; pending: CredentialSlotInput[] }> {
	const resolved: Record<string, CredentialOutcome> = {};
	const pending: CredentialSlotInput[] = [];
	if (slots.length === 0) return { resolved, pending };

	const integrationCredentialIds = (await deps.listIntegrationCredentialIds?.()) ?? [];
	const all = await deps.credentialService.list({ projectId: deps.projectId });
	for (const slot of slots) {
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
			resolved[slot.credentialType] = autoResolved;
		} else {
			pending.push(slot);
		}
	}
	return { resolved, pending };
}

function answerValue(answer: QuestionAnswer): string | undefined {
	if (answer.skipped) return undefined;
	const value = answer.customText?.trim() || answer.selectedOptions.join(', ');
	return value || undefined;
}

function setupValues(collected: Collected, modelQuestionIds: Set<string>): SetupValues {
	const credentials: SetupValues['credentials'] = {};
	for (const [credentialType, outcome] of Object.entries(collected.credentials ?? {})) {
		if (outcome !== 'skipped') credentials[credentialType] = outcome;
	}

	const parameters: SetupValues['parameters'] = {};
	for (const answer of collected.answers ?? []) {
		const { questionId } = answer;
		if (modelQuestionIds.has(questionId) || !questionId.startsWith(PARAMETER_QUESTION_PREFIX)) {
			continue;
		}
		const value = answerValue(answer);
		if (value !== undefined) parameters[questionId.slice(PARAMETER_QUESTION_PREFIX.length)] = value;
	}

	return { credentials, parameters };
}

/** Write the collected values into the config, then report what is still empty. */
async function complete(
	input: FinishSetupInput,
	collected: Collected,
	deps: FinishSetupToolDeps,
): Promise<FinishSetupToolResult> {
	const modelQuestionIds = new Set((input.questions ?? []).map((question) => question.id));
	const result: FinishSetupToolResult = { completed: true };
	if (collected.answers && modelQuestionIds.size > 0) {
		result.answers = collected.answers.filter((answer) => modelQuestionIds.has(answer.questionId));
	}
	if (collected.credentials) result.credentials = collected.credentials;
	if (collected.channels) result.channels = collected.channels;
	if (!deps.fillSetupGaps) return result;

	try {
		const fill = await deps.fillSetupGaps(setupValues(collected, modelQuestionIds));
		if (fill.filled.length > 0) result.filled = fill.filled;
		if (fill.remaining.length > 0) result.remaining = fill.remaining;
		if (fill.configHash) result.configHash = fill.configHash;
		if (fill.error) result.setupError = fill.error;
	} catch (error) {
		result.setupError = error instanceof Error ? error.message : String(error);
	}
	return result;
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
				`Unsupported chat channel "${channel.integrationType}". Call agent-context with type "integrations" ` +
					'and choose a returned type.' +
					availableMessage,
			);
		}
	}
}

/**
 * Validate input, read the config gaps, and auto-resolve credential slots.
 * Slots that cannot be auto-resolved become a phase. Phase order is fixed:
 * questions (the model's, then one per empty text parameter), then
 * credentials, then one channel phase per requested channel — channels always
 * run last since their cards persist configuration.
 */
async function computeInitialPlan(
	input: FinishSetupInput,
	deps: FinishSetupToolDeps,
): Promise<{ phases: PhaseDescriptor[]; collected: Collected }> {
	validateCredentialTypes(input, deps);
	validateChannelTypes(input, deps);

	const gaps = (await deps.findSetupGaps?.()) ?? [];
	// Drop requests for slots the server already covers with an n8n Connect
	// managed credential — they need no user setup, so never show a card.
	const aiGatewayManagedTypes = new Set((await deps.listAiGatewayManagedCredentialTypes?.()) ?? []);
	const { resolved, pending } = await autoResolveCredentials(
		credentialSlots(input, gaps, aiGatewayManagedTypes),
		deps,
	);
	const questions = [...(input.questions ?? []), ...parameterQuestions(gaps)];

	const phases: PhaseDescriptor[] = [];
	if (questions.length > 0) phases.push({ kind: 'questions', questions });
	if (pending.length > 0) phases.push({ kind: 'credentials', slots: pending });
	for (const channel of input.channels ?? []) {
		phases.push({ kind: 'channel', integrationType: channel.integrationType });
	}

	return { phases, collected: Object.keys(resolved).length > 0 ? { credentials: resolved } : {} };
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
		const credentialId = resumeData?.credentials?.[slot.credentialType];
		deps.track(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: slot.credentialType,
			outcome: credentialId ? 'provided' : 'skipped',
		});
		credentials[slot.credentialType] = credentialId
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
	deps: FinishSetupToolDeps;
	ctx: FinishSetupCtx;
}): Promise<never> {
	const { phase, remainingPhases, collected, totalPhases, phaseNumber, deps, ctx } = params;
	const finishSetupChain: ChainState = {
		currentPhase: phase,
		remainingPhases,
		collected,
		totalPhases,
	};
	const message = `Finish setup (${phaseNumber}/${totalPhases})`;

	if (phase.kind === 'questions') {
		const questions = phase.questions ?? [];
		deps.track(TELEMETRY_EVENT.AGENTS.BUILDER_ASKED_QUESTIONS, {
			question_count: questions.length,
			question_types: [...new Set(questions.map((q) => q.type))].sort(),
		});
		return await ctx.suspend({
			requestId: nanoid(),
			message,
			severity: 'info' as const,
			inputType: 'questions' as const,
			questions,
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
		existingCredentials: Array<Pick<CredentialListItem, 'id' | 'name'>>;
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
		return await complete(input, collected, deps);
	}

	const [currentPhase, ...remainingPhases] = phases;
	return await suspendForPhase({
		phase: currentPhase,
		remainingPhases,
		collected,
		totalPhases: phases.length,
		phaseNumber: 1,
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
		return await complete(input, collected, deps);
	}

	const [nextPhase, ...restPhases] = chain.remainingPhases;
	return await suspendForPhase({
		phase: nextPhase,
		remainingPhases: restPhases,
		collected,
		totalPhases: chain.totalPhases,
		phaseNumber: chain.totalPhases - restPhases.length,
		deps,
		ctx,
	});
}

export function buildFinishSetupTool(deps: FinishSetupToolDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.FINISH_SETUP)
		.description(
			'Collect everything still needed to finish the initial build in ONE guided flow. Call ' +
				'it at most once, only in the trailing step of an initial build when only pending ' +
				'setup remains, and never together with another interactive tool. ' +
				'The tool reads the agent config and asks for every node-tool field that is still ' +
				'empty: each required credential slot and each required text parameter. Leave a value ' +
				'that only the user knows, such as a recipient address, empty in the config; do not ' +
				'ask for it yourself. Pass only what the config cannot show: `questions` for open ' +
				'decisions (including the model choice), `credentialRequests` for credentials that no ' +
				'node tool holds, and `channels` with a returned `type` from agent-context ' +
				'integrations, one entry per channel to configure; do not infer channel names. ' +
				'Cards run back-to-back: questions, then credentials, then one card per channel. ' +
				'Channel cards always run last, even when earlier setup was skipped or dismissed. ' +
				'Each channel card persists the configuration or skips it, so channel outcomes are ' +
				'`"configured"` or `"skipped"`. Do not call configure_channel again for a channel ' +
				'handled by this flow. Returns { completed, answers, credentials, channels, filled, ' +
				'remaining, configHash } (plus configMutated/agentId refresh metadata when completed). ' +
				'The tool already wrote each `filled` field into the config; do not patch them. ' +
				'`remaining` lists the node-tool fields that are still empty: resolve a selector ' +
				`with ${BUILDER_TOOLS.GET_RESOURCE_LOCATOR_OPTIONS} and put the rest in the setup ` +
				'checklist. Resolve the model answer with resolve_llm and verify MCP servers with ' +
				'the returned credential ids. Fix the cause of a `setupError`. Auto-resolves ' +
				'credentials that match a single existing credential or a configured channel credential.',
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
