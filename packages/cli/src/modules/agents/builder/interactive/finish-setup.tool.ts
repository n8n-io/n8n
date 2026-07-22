import type { BuiltTool, CredentialProvider, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	credentialSuspendPayloadSchema,
	interactionQuestionSchema,
	questionAnswerSchema,
	questionsSuspendPayloadSchema,
	type InteractionQuestion,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { listExistingCredentials } from './ask-credential.tool';
import { BUILDER_TOOLS } from '../builder-tool-names';

export interface FinishSetupToolDeps {
	credentialProvider: CredentialProvider;
	isCredentialTypeKnown?: (credentialType: string) => boolean;
	/** Credential ids of the agent's configured chat channel integrations — reused for a matching credential slot. */
	listIntegrationCredentialIds?: () => Promise<string[]>;
}

const finishSetupCredentialRequestInputSchema = z.object({
	credentialType: z.string().min(1),
	purpose: z.string().min(1),
	credentialSlot: z.string().optional(),
});
type CredentialSlotInput = z.infer<typeof finishSetupCredentialRequestInputSchema>;

const finishSetupInputSchema = z
	.object({
		questions: z.array(interactionQuestionSchema).optional(),
		credentialRequests: z.array(finishSetupCredentialRequestInputSchema).optional(),
	})
	.refine((v) => (v.questions?.length ?? 0) + (v.credentialRequests?.length ?? 0) > 0, {
		message: 'Pass at least one pending setup item.',
	});
type FinishSetupInput = z.infer<typeof finishSetupInputSchema>;

/** One resolved credential outcome per slot key — either a resolved credential or an explicit skip. */
const credentialOutcomeSchema = z.union([
	z.object({ id: z.string(), name: z.string() }),
	z.literal('skipped'),
]);

const questionsPhaseSchema = z.object({ kind: z.literal('questions') });
const credentialsPhaseSchema = z.object({
	kind: z.literal('credentials'),
	slots: z.array(finishSetupCredentialRequestInputSchema),
});
const phaseDescriptorSchema = z.union([questionsPhaseSchema, credentialsPhaseSchema]);
type PhaseDescriptor = z.infer<typeof phaseDescriptorSchema>;

const collectedSchema = z.object({
	answers: z.array(questionAnswerSchema).optional(),
	credentials: z.record(credentialOutcomeSchema).optional(),
});
type Collected = z.infer<typeof collectedSchema>;

/**
 * Chain state carried inside the suspend payload (a member of each phase's
 * suspend schema, so it round-trips through the builder checkpoint) and
 * stripped by instance AI's cascade before the FE ever sees it — the FE
 * routes purely on the presence of `inputType`/`credentialRequests`,
 * identical to the single-purpose interactive tools.
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
]);
type FinishSetupSuspendPayload = z.infer<typeof finishSetupSuspendSchema>;

/**
 * Deliberately a single permissive object, not a union — the two phases'
 * resume shapes overlap enough (e.g. both carry an optional `approved`) that a
 * union would ambiguously match the wrong arm. The handler always knows which
 * phase a resume belongs to from `ctx.suspendPayload.finishSetupChain`, so
 * shape ambiguity here is harmless.
 */
const finishSetupResumeSchema = z.object({
	approved: z.boolean().optional(),
	answers: z.array(questionAnswerSchema).optional(),
	credentials: z.record(z.string()).optional(),
	skipped: z.boolean().optional(),
});
type FinishSetupResumeData = z.infer<typeof finishSetupResumeSchema>;

type FinishSetupCtx = InterruptibleToolContext<FinishSetupSuspendPayload, FinishSetupResumeData>;

type FinishSetupToolResult = { completed: true } & Collected;

/** Resolve a credential's display name for the final result, mirroring ask_credential's resume resolution. */
async function resolveCredentialName(
	deps: FinishSetupToolDeps,
	credentialType: string,
	credentialId: string,
): Promise<string> {
	const existingCredentials = await listExistingCredentials(
		deps.credentialProvider,
		credentialType,
	);
	return existingCredentials.find((c) => c.id === credentialId)?.name ?? credentialId;
}

/**
 * Validate input, then auto-resolve every credential slot using the same
 * rules as ask_credential (matching channel credential first, then a single
 * existing credential of the type). Slots that cannot be auto-resolved
 * become a phase; the questions phase (if any) always runs first.
 */
async function computeInitialPlan(
	input: FinishSetupInput,
	deps: FinishSetupToolDeps,
): Promise<{ phases: PhaseDescriptor[]; collected: Collected }> {
	for (const request of input.credentialRequests ?? []) {
		if (deps.isCredentialTypeKnown && !deps.isCredentialTypeKnown(request.credentialType)) {
			throw new Error(
				`Unknown credential type "${request.credentialType}". Use an exact n8n credential type name.`,
			);
		}
	}

	const collected: Collected = {};
	const pendingSlots: CredentialSlotInput[] = [];

	if (input.credentialRequests?.length) {
		const integrationCredentialIds = (await deps.listIntegrationCredentialIds?.()) ?? [];
		const credentials: Record<string, z.infer<typeof credentialOutcomeSchema>> = {};

		for (const slot of input.credentialRequests) {
			const key = slot.credentialSlot ?? slot.credentialType;
			const existingCredentials = await listExistingCredentials(
				deps.credentialProvider,
				slot.credentialType,
			);
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

	const credentials = { ...(previous.credentials ?? {}) };
	for (const slot of phase.slots) {
		const key = slot.credentialSlot ?? slot.credentialType;
		const credentialId = resumeData?.credentials?.[slot.credentialType];
		credentials[key] = credentialId
			? {
					id: credentialId,
					name: await resolveCredentialName(deps, slot.credentialType, credentialId),
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
		return await ctx.suspend({
			requestId: nanoid(),
			message,
			severity: 'info' as const,
			inputType: 'questions' as const,
			questions: questions ?? [],
			finishSetupChain,
		});
	}

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
			existingCredentials: await listExistingCredentials(
				deps.credentialProvider,
				slot.credentialType,
			),
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
				'questions (including the model choice) and credential slots. Call it at most once, ' +
				'only in the trailing step of an initial build when only blocked tasks remain, and ' +
				'never together with another interactive tool. It shows the setup cards back-to-back ' +
				'without returning control between them. Returns { completed, answers, credentials }: ' +
				'resolve the model answer with resolve_llm, copy returned credential ids into the ' +
				'config, and verify MCP servers with them. Auto-resolves credential slots that match ' +
				'an existing single credential or the connected channel credential. Channel ' +
				'connections are NOT included — after this resolves, point the user to the channel ' +
				'chip in the agent panel.',
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
