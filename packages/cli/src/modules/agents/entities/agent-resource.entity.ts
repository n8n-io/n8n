import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { AGENT_THREAD_ID_MAX_LENGTH } from '../integrations/types';

@Entity({ name: 'agents_resources' })
export class AgentResourceEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: AGENT_THREAD_ID_MAX_LENGTH })
	id: string;

	@Column({ type: 'text', nullable: true })
	metadata: string | null;
}
