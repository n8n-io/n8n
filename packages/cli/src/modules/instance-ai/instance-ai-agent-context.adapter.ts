import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiAgentContextReader } from '@n8n/instance-ai';

import { AgentsPublicApi } from '@/modules/agents/public-api';

import { formatPreviewSessionContext } from './format-agent-session-context';

@Service()
export class InstanceAiAgentContextAdapterService {
	constructor(private readonly agents: AgentsPublicApi) {}

	createReader(user: User, projectId: string): InstanceAiAgentContextReader {
		const reader = this.agents.createContextReader(user, projectId);
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
