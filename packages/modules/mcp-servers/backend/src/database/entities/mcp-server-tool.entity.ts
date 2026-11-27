import type { McpServerToolDraftSource, McpServerToolKind } from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** One tool of a server. `targetId` has no foreign key, because its table depends on `kind`. */
@Entity({ name: 'mcp_server_tool' })
@Index(['serverId', 'toolName'], { unique: true })
export class McpServerTool extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	serverId: string;

	@Column({ type: 'varchar', length: 16 })
	kind: McpServerToolKind;

	@Column({ type: 'varchar', length: 36, nullable: true })
	targetId: string | null;

	@Column({ type: 'varchar', length: 64 })
	toolName: string;

	@Column({ type: 'text', default: '' })
	description: string;

	@Column({ type: 'varchar', length: 16, default: 'defaults' })
	draftSource: McpServerToolDraftSource;

	/** Fixed input values of a workflow tool, or the node definition of a node tool. */
	@JsonColumn({ nullable: true })
	toolData: Record<string, unknown> | null;

	@Column({ type: 'int', default: 0 })
	position: number;
}
