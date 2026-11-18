import type {
	McpServerAccessMode,
	McpServerCallerType,
	McpServerCallStatus,
	McpServerResourceKind,
	McpServerShareVisibility,
	McpServerToolBehavior,
	McpServerToolInput,
	McpServerToolKind,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

/** A user-built MCP server, served at `/mcp-servers/<slug>`. */
@Entity('mcp_server')
export class McpServerEntity extends WithTimestampsAndStringId {
	@Index({ unique: true })
	@Column({ type: 'varchar', length: 64 })
	slug: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text', default: '' })
	description: string;

	@Column({ type: 'text', default: '' })
	instructions: string;

	@Column({ type: Boolean, default: true })
	active: boolean;

	@Column({ type: 'varchar', length: 16, default: 'apiKey' })
	accessMode: McpServerAccessMode;

	@Column({ type: 'int', default: 60 })
	rateLimitPerMinute: number;

	@Column({ type: 'varchar', length: 16, default: 'instance' })
	shareVisibility: McpServerShareVisibility;

	@Column({ type: Boolean, default: true })
	confirmDestructive: boolean;

	@Column({ type: Boolean, default: false })
	confirmWrite: boolean;

	/** OAuth users whose access the owner revoked. */
	@JsonColumn({ nullable: true })
	revokedUserIds: string[] | null;

	@Column({ type: 'uuid' })
	ownerId: string;
}

@Entity('mcp_server_tool')
export class McpServerToolEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	serverId: string;

	@Column({ type: 'varchar', length: 16 })
	kind: McpServerToolKind;

	@Column({ type: 'varchar', length: 36 })
	targetId: string;

	/** Override of the tool name. Null takes the name from the target. */
	@Column({ type: 'varchar', length: 64, nullable: true })
	name: string | null;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ type: 'varchar', length: 16, default: 'read' })
	behavior: McpServerToolBehavior;

	@JsonColumn({ nullable: true })
	inputs: McpServerToolInput[] | null;

	@Column({ type: Boolean, default: true })
	enabled: boolean;

	@Column({ type: 'int', default: 0 })
	position: number;
}

@Entity('mcp_server_resource')
export class McpServerResourceEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	serverId: string;

	@Column({ type: 'varchar', length: 16 })
	kind: McpServerResourceKind;

	@Column({ type: 'varchar', length: 36, nullable: true })
	targetId: string | null;

	@Column({ type: 'varchar', length: 256 })
	name: string;

	@Column({ type: 'text', default: '' })
	description: string;

	@Column({ type: 'text', nullable: true })
	content: string | null;

	@Column({ type: 'varchar', length: 128, default: 'text/plain' })
	mimeType: string;
}

@Entity('mcp_server_api_key')
export class McpServerApiKeyEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	serverId: string;

	@Column({ type: 'varchar', length: 128 })
	label: string;

	@Column({ type: 'varchar', length: 128 })
	keyHash: string;

	@Column({ type: 'varchar', length: 16 })
	keyHint: string;

	@DateTimeColumn({ nullable: true })
	lastUsedAt: Date | null;
}

/** One tool call or resource read. Inputs and outputs are stored in full (hack scope). */
@Entity('mcp_server_call')
export class McpServerCallEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	serverId: string;

	@Column({ type: 'varchar', length: 16 })
	kind: 'tool' | 'resource';

	@Column({ type: 'varchar', length: 256 })
	name: string;

	@Column({ type: 'varchar', length: 16 })
	callerType: McpServerCallerType;

	@Column({ type: 'varchar', length: 320 })
	caller: string;

	@Column({ type: 'uuid', nullable: true })
	callerUserId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	apiKeyId: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	clientName: string | null;

	@Column({ type: 'varchar', length: 16 })
	status: McpServerCallStatus;

	@Column({ type: 'int', nullable: true })
	durationMs: number | null;

	@Column({ type: 'text', nullable: true })
	input: string | null;

	@Column({ type: 'text', nullable: true })
	output: string | null;

	@Column({ type: 'text', nullable: true })
	error: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	executionId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;
}

export const MCP_SERVER_ENTITIES = [
	McpServerEntity,
	McpServerToolEntity,
	McpServerResourceEntity,
	McpServerApiKeyEntity,
	McpServerCallEntity,
];
