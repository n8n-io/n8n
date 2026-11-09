import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

import { AGENT_THREAD_ID_MAX_LENGTH } from '../integrations/types';

@Entity({ name: 'agents_threads' })
export class AgentThreadEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: AGENT_THREAD_ID_MAX_LENGTH })
	resourceId: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	title: string | null;

	@Column({ type: 'text', nullable: true })
	metadata: string | null;
}
