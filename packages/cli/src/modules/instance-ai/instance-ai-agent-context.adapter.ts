import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiAgentContextReader } from '@n8n/instance-ai';

import { AgentContextService } from '@/modules/agents/agent-context.service';
import { formatPreviewSessionContext } from '@/modules/agents/format-agent-session-context';

@Service()
export class InstanceAiAgentContextAdapterService {
	constructor(private readonly agents: AgentContextService) {}

	createReader(user: User, projectId: string): InstanceAiAgentContextReader {
		const reader = this.agents.createReader(user, projectId);
		return {
			lookup: async (input) => {
				const { sessionDetail, ...result } = await reader.lookup(input);
				if (!sessionDetail) return result;
				const transcript = formatPreviewSessionContext(
					sessionDetail.thread,
					sessionDetail.executions,
					input.type === 'session' ? input.executionId : undefined,
				);
				if (transcript === null) return { notFound: true };
				return { ...result, transcript };
			},
		};
	}
}
