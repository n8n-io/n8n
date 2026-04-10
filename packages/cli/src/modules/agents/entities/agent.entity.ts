import type { ToolDescriptor } from '@n8n/agents';
import { JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne } from '@n8n/typeorm';

import type { AgentJsonConfig } from '../json-config/agent-json-config';

@Entity({ name: 'agents' })
export class Agent extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', nullable: true })
	description: string | null;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;

	@Column({ type: 'varchar', nullable: true })
	credentialId: string | null;

	@Column({ type: 'varchar', nullable: true })
	provider: string | null;

	@Column({ type: 'varchar', nullable: true })
	model: string | null;
	// TODO: add schema versioning
	@JsonColumn({ nullable: true, default: null })
	schema: AgentJsonConfig | null;

	@JsonColumn({ default: '[]' })
	integrations: Array<{
		type: string;
		credentialId: string;
	}>;

	@JsonColumn({ default: '{}' })
	tools: Record<
		string,
		{
			code: string;
			descriptor: ToolDescriptor;
		}
	>;
}
