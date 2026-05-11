import type { AgentIntegration, AgentSkill } from '@n8n/api-types';
import type { ToolDescriptor } from '@n8n/agents';
import { JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, OneToOne, type Relation } from '@n8n/typeorm';

import type { AgentPublishedVersion } from './agent-published-version.entity';
import type { AgentJsonConfig } from '../json-config/agent-json-config';

@Entity({ name: 'agents' })
export class Agent extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 512, nullable: true })
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
	schema: AgentJsonConfig | null;

	@JsonColumn({ default: '[]' })
	integrations: AgentIntegration[];

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

	@OneToOne('AgentPublishedVersion', 'agent', { nullable: true })
	publishedVersion?: Relation<AgentPublishedVersion> | null;
}
