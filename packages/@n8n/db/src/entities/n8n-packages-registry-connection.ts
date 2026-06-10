import { Column, Entity, Index } from '@n8n/typeorm';

import { JsonColumn, WithTimestampsAndStringId } from './abstract-entity';

export type N8nPackagesRegistryConnectionType = 'git' | 's3';

export type N8nPackagesRegistryConnectionConfig = {
	repositoryUrl?: string;
	bucketName?: string;
	region?: string;
	branch?: string;
	basePath?: string;
	projectId?: string;
};

@Entity({ name: 'n8n_packages_registry_connection' })
export class N8nPackagesRegistryConnection extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	type: N8nPackagesRegistryConnectionType;

	@JsonColumn({ nullable: false })
	config: N8nPackagesRegistryConnectionConfig;

	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	@Index()
	@Column({ default: true })
	isEnabled: boolean;
}
