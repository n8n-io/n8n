import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { InstalledPackages } from './installed-packages.entity';

@Entity()
export class InstalledNodes extends BaseEntity {
	@Column()
	name: string;

	@PrimaryColumn()
	type: string;

	@Column()
	latestVersion: number;

	@Column()
	packageName: string;

	@PrimaryColumn()
	packageVersion: string;

	@ManyToOne('InstalledPackages', 'installedNodes')
	@JoinColumn([
		{ name: 'packageName', referencedColumnName: 'packageName' },
		{ name: 'packageVersion', referencedColumnName: 'installedVersion' },
	])
	package: InstalledPackages;
}
