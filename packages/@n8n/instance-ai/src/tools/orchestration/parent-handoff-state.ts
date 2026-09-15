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

export async function recordUserDecision(
	context: InstanceAiContext,
	decision: ResolvedUserDecision,
): Promise<void> {
	if (decision.question.trim() === '') {
		return;
	}

	await hydrateUserDecisions(context);
	const decisions = context.resolvedUserDecisions ?? [];
	context.resolvedUserDecisions = decisions;

	const normalizedQuestion = normalizeQuestion(decision.question);
	const existing = decisions.find((d) => normalizeQuestion(d.question) === normalizedQuestion);
	if (existing) {
		existing.question = decision.question;
		existing.answer = decision.answer;
		existing.skipped = decision.skipped;
	} else {
		decisions.push(decision);
	}

	while (decisions.length > MAX_DECISIONS) {
		decisions.shift();
	}

	await saveUserDecisions(context);
}

async function saveUserDecisions(context: InstanceAiContext): Promise<void> {
	if (!context.threadId || !context.threadMemory) {
		return;
	}

	try {
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => ({
				metadata: {
					...metadata,
					[METADATA_KEY]: context.resolvedUserDecisions,
				},
			}),
		});
	} catch (error) {
		context.logger.debug(`Failed to save user decisions: ${String(error)}`);
	}
}

export function formatParentHandoffEnvelope(context: OrchestrationContext): string {
	const sections: string[] = [];

	const rawMessage = context.currentUserMessage?.trim() ?? '';
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
				.map((d) => `- Q: ${d.question} → A: ${d.answer}`)
				.join('\n')}`,
		);
	}

	const attachments = domain?.currentUserAttachments ?? [];
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
