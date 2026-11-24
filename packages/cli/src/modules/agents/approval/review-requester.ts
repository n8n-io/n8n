import type { JSONObject, ToolContext } from '@n8n/agents';
import { accountSummary, type User } from '@n8n/db';
import { z } from 'zod';

const REQUESTER_KEY = 'n8nAgentReviewRequester';
const requesterSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).optional(),
	source: z.string().min(1),
});

export type AgentReviewRequester = z.infer<typeof requesterSchema>;

export function reviewRequesterForUser(user: User, source: string): AgentReviewRequester {
	const { firstName, lastName } = accountSummary(user);
	const name = [firstName, lastName].filter(Boolean).join(' ').trim();
	return { id: user.id, ...(name ? { name } : {}), source };
}

/** Keep the original requester in the checkpoint when another user resumes the run. */
export function encodeReviewRequester(requester: AgentReviewRequester | undefined): JSONObject {
	if (!requester) return {};
	return {
		[REQUESTER_KEY]: {
			id: requester.id,
			...(requester.name ? { name: requester.name } : {}),
			source: requester.source,
		},
	};
}

export function readReviewRequester(
	persistence: ToolContext['persistence'],
): AgentReviewRequester | undefined {
	const result = requesterSchema.safeParse(persistence?.hostMetadata?.[REQUESTER_KEY]);
	return result.success ? result.data : undefined;
}
