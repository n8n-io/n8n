import { datetimeColumnType, JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

export type McpRegistryServerData = {
	name: string;
	title: string;
	tagline: string;
	description: string;
	authType: string;
	origin: string;
	isOfficial: boolean;
	icons: Array<{
		src: string;
		mimeType?: string;
		theme?: string;
	}>;
	remotes: Array<{
		type: string;
		url: string;
	}>;
	tools: Array<{
		name: string;
		title?: string;
		annotations?: { readOnlyHint?: boolean };
	}>;
	websiteUrl?: string;
	tags?: string[];
};

@Entity('mcp_registry_server')
export class McpRegistryServerEntity extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Index({ unique: true })
	@Column('varchar')
	slug: string;

	@Column('varchar')
	status: 'active' | 'deprecated';

	@Column('varchar')
	version: string;

	@Column(datetimeColumnType)
	registryUpdatedAt: Date;

	@JsonColumn()
	data: McpRegistryServerData;
}
