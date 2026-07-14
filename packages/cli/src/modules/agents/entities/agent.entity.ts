import type { ToolDescriptor } from '@n8n/agents';
import type { AgentIntegrationConfig, AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import { JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, type Relation } from '@n8n/typeorm';

import type { AgentHistory } from './agent-history.entity';

@Entity({ name: 'agents' })
export class Agent extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;

	@JsonColumn({ nullable: true, default: null })
	schema: AgentJsonConfig | null;

	@JsonColumn({ default: '[]' })
	integrations: AgentIntegrationConfig[];

	@JsonColumn({ default: '{}' })
	tools: Record<
		string,
		{
			code: string;
			descriptor: ToolDescriptor;
		}
	>;

	@JsonColumn({ default: '{}' })
	skills: Record<string, AgentSkill>;

	/** UUID identifying the current draft; bumped on the first config save after each publish. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	versionId: string | null;

	/** Points to the `AgentHistory` row that is currently published, or null when unpublished. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	activeVersionId: string | null;

	@ManyToOne('AgentHistory', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'activeVersionId' })
	activeVersion?: Relation<AgentHistory> | null;
}
