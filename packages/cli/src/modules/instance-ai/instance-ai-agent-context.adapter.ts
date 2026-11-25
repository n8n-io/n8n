import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type { InstanceAiAgentContextReader } from '@n8n/instance-ai';

import { AgentContextService } from '@/modules/agents/agent-context.service';
import {
	formatAgentSessionTranscriptPage,
	formatPreviewSessionContext,
} from '@/modules/agents/format-agent-session-context';

@Service()
export class InstanceAiAgentContextAdapterService {
	constructor(private readonly agents: AgentContextService) {}

	createReader(user: User, projectId: string): InstanceAiAgentContextReader {
		const reader = this.agents.createReader(user, projectId);
		return {
			lookup: async (input) => {
				const { sessionDetail, ...result } = await reader.lookup(input);
				if (!sessionDetail || input.type !== 'session') return result;
				const { thread, executions } = sessionDetail;
				const { executionId, maxToolValueLength, cursor } = input;

				if (maxToolValueLength === undefined && cursor === undefined) {
					const transcript = formatPreviewSessionContext(thread, executions, executionId);
					if (transcript === null) return { notFound: true };
					return { ...result, transcript };
				}

				const page = formatAgentSessionTranscriptPage(thread, executions, {
					executionId,
					maxToolValueLength,
					cursor,
				});
				if (page.ok) return { ...result, transcript: page.transcript, nextCursor: page.nextCursor };
				if (page.reason === 'execution_not_found') return { notFound: true };
				throw new UserError(
					'The cursor does not match this transcript. The session changed, or threadId, executionId, or maxToolValueLength differs from the first page. Read again from the first page without a cursor.',
				);
			},
		};
	}
}
