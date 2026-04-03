import { JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne } from '@n8n/typeorm';
import type { AgentSchema } from '@n8n/agents';

@Entity({ name: 'sdk_agent' })
export class SdkAgent extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text' })
	code: string;

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

	@JsonColumn({ nullable: true, default: null })
	schema: AgentSchema | null;

	@JsonColumn({ default: '[]' })
	integrations: Array<{
		type: string;
		credentialId: string;
	}>;
}
