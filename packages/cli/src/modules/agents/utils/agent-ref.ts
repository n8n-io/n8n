import type { AgentPersonalisation } from '@n8n/api-types';

import type { Agent } from '../entities/agent.entity';

export interface AgentRef {
	id: string;
	name: string;
	personalisation?: AgentPersonalisation;
}

/** Agent id, name and icon from the published snapshot — the minimum a chat
 *  surface may show a member who only holds `agent:execute`. */
export function toAgentRef(agent: Pick<Agent, 'id' | 'name' | 'activeVersion'>): AgentRef {
	const personalisation = agent.activeVersion?.schema?.personalisation;
	return {
		id: agent.id,
		name: agent.name,
		...(personalisation ? { personalisation } : {}),
	};
}
