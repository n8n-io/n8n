import { WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { SdkAgent } from './sdk-agent.entity';

@Entity({ name: 'agent_checkpoint' })
export class AgentCheckpoint extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	runId: string;

	@ManyToOne(() => SdkAgent, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: SdkAgent | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	agentId: string | null;

	@Column({ type: 'text', nullable: true })
	state: string | null;

	@Column({ type: 'boolean', default: false })
	expired: boolean;
}
