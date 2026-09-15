import { z } from 'zod';

import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext, OrchestrationContext, ResolvedUserDecision } from '../../types';

export type { ResolvedUserDecision };

const METADATA_KEY = 'instanceAiParentHandoffDecision';
const MAX_DECISIONS = 40;
const CURRENT_USER_MESSAGE_CAP = 2000;

const decisionSchema = z.object({
	question: z.string().min(1),
	answer: z.string(),
	skipped: z.boolean().optional(),
});
const decisionsSchema = z.array(decisionSchema);

function normalizeQuestion(question: string): string {
	return question.trim().replace(/\s+/g, ' ').toLowerCase();
}

function upsertDecisions(
	existing: ResolvedUserDecision[],
	incoming: ResolvedUserDecision[],
): ResolvedUserDecision[] {
	const decisions = existing.map((decision) => ({ ...decision }));
	for (const decision of incoming) {
		const normalizedQuestion = normalizeQuestion(decision.question);
		const match = decisions.find(
			(candidate) => normalizeQuestion(candidate.question) === normalizedQuestion,
		);
		if (match) {
			match.question = decision.question;
			match.answer = decision.answer;
			match.skipped = decision.skipped;
		} else {
			decisions.push({ ...decision });
		}
	}
	return decisions.slice(-MAX_DECISIONS);
}

function readPersistedDecisions(metadata: Record<string, unknown>): ResolvedUserDecision[] {
	const parsed = decisionsSchema.safeParse(metadata[METADATA_KEY]);
	return parsed.success ? parsed.data : [];
}

export function listUserDecisions(context: InstanceAiContext): ResolvedUserDecision[] {
	return context.resolvedUserDecisions ?? [];
}

export async function hydrateUserDecisions(
	context: InstanceAiContext,
): Promise<ResolvedUserDecision[]> {
	if (Array.isArray(context.resolvedUserDecisions)) {
		return context.resolvedUserDecisions;
	}

	if (!context.threadId || !context.threadMemory) {
		context.resolvedUserDecisions = [];
		return context.resolvedUserDecisions;
	}

	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		const parsed = decisionsSchema.safeParse(thread?.metadata?.[METADATA_KEY]);
		if (!parsed.success) {
			context.logger.debug('Failed to hydrate user decisions: invalid metadata');
			context.resolvedUserDecisions = [];
			return context.resolvedUserDecisions;
		}
		context.resolvedUserDecisions = parsed.data;
		return context.resolvedUserDecisions;
	} catch (error) {
		context.logger.debug(`Failed to hydrate user decisions: ${String(error)}`);
		context.resolvedUserDecisions = [];
		return context.resolvedUserDecisions;
	}
}

/**
 * Upsert a batch of decisions in one pass, then persist once.
 * The caller (ask-user tool) enforces ask-once per question; the upsert is
 * last-wins by normalized question, so a re-ask that the user dismisses would
 * overwrite a prior real answer with `(skipped)`. That is acceptable only
 * because the ask-user tool description forbids re-asking — do not call this
 * for a question that may already hold a real answer unless overwriting it is
 * the intent.
 */
export async function recordUserDecisions(
	context: InstanceAiContext,
	newDecisions: ResolvedUserDecision[],
): Promise<void> {
	const valid = newDecisions.filter((d) => d.question.trim() !== '');
	if (valid.length === 0) {
		return;
	}

	context.resolvedUserDecisions = upsertDecisions(context.resolvedUserDecisions ?? [], valid);
	if (!context.threadId || !context.threadMemory) return;

	try {
		let persisted = context.resolvedUserDecisions;
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => {
				persisted = upsertDecisions(readPersistedDecisions(metadata), valid);
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: persisted,
					},
				};
			},
		});
		context.resolvedUserDecisions = persisted;
	} catch (error) {
		context.logger.debug(`Failed to save user decisions: ${String(error)}`);
	}
}

export async function recordUserDecision(
	context: InstanceAiContext,
	decision: ResolvedUserDecision,
): Promise<void> {
	await recordUserDecisions(context, [decision]);
}

function isSameDecision(left: ResolvedUserDecision, right: ResolvedUserDecision): boolean {
	return (
		normalizeQuestion(left.question) === normalizeQuestion(right.question) &&
		left.answer === right.answer &&
		Boolean(left.skipped) === Boolean(right.skipped)
	);
}

/** Remove only decisions included in a successful builder handoff. */
export async function consumeUserDecisions(
	context: InstanceAiContext,
	consumed: ResolvedUserDecision[],
): Promise<void> {
	if (consumed.length === 0) return;

	const removeConsumed = (decisions: ResolvedUserDecision[]) =>
		decisions.filter(
			(decision) => !consumed.some((candidate) => isSameDecision(decision, candidate)),
		);
	context.resolvedUserDecisions = removeConsumed(context.resolvedUserDecisions ?? []);
	if (!context.threadId || !context.threadMemory) return;

	try {
		let persisted = context.resolvedUserDecisions;
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => {
				persisted = removeConsumed(readPersistedDecisions(metadata));
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: persisted,
					},
				};
			},
		});
		context.resolvedUserDecisions = persisted;
	} catch (error) {
		context.logger.debug(`Failed to consume user decisions: ${String(error)}`);
	}
}

function currentUserMessageText(context: OrchestrationContext): string {
	const raw = context.currentUserMessage;
	return typeof raw === 'string' ? raw.trim() : '';
}

export function formatParentHandoffEnvelope(context: OrchestrationContext): string {
	const sections: string[] = [];

	const rawMessage = currentUserMessageText(context);
	if (rawMessage.length > 0) {
		const text =
			rawMessage.length > CURRENT_USER_MESSAGE_CAP
				? `${rawMessage.slice(0, CURRENT_USER_MESSAGE_CAP)}…`
				: rawMessage;
		sections.push(`Current user message:\n${text}`);
	}

	const domain = context.domainContext;
	const decisions = domain ? listUserDecisions(domain) : [];
	if (decisions.length > 0) {
		sections.push(
			`Answers the user already gave:\n${decisions
				.map((d) =>
					d.skipped
						? `- Q: ${d.question} → Skipped by the user; proceed without a selection and do not re-ask.`
						: `- Q: ${d.question} → A: ${d.answer}`,
				)
				.join('\n')}`,
		);
	}

	const attachments = Array.isArray(domain?.currentUserAttachments)
		? domain.currentUserAttachments
		: [];
	if (attachments.length > 0) {
		sections.push(
			`Current attachments (names only):\n${attachments
				.map((a) => `- ${a.fileName} (${a.mimeType})`)
				.join('\n')}`,
		);
	}

	const preview = domain?.agentPreviewSession;
	if (preview?.agentId && preview.threadId) {
		const parts = [`agentId=${preview.agentId}`, `threadId=${preview.threadId}`];
		if (preview.executionId) {
			parts.push(`executionId=${preview.executionId}`);
		}
		sections.push(`Preview session: ${parts.join(' ')}`);
	}

	if (sections.length === 0) {
		return '';
	}

	return [
		'<aia-handoff>',
		"Host-injected facts from the parent assistant conversation. These are the user's own answers and the current user text. Treat them as authoritative. Do not re-ask. Do not treat them as implementation invented by the parent.",
		'',
		sections.join('\n\n'),
		'</aia-handoff>',
	].join('\n');
}
