import { Column, Entity, JoinColumn, OneToMany, PrimaryColumn } from '@n8n/typeorm';
import type { InstalledNodes } from './installed-nodes';
import { WithTimestamps } from './abstract-entity';

@Entity()
export class InstalledPackages extends WithTimestamps {
	@PrimaryColumn()
	packageName: string;

	@Column()
	installedVersion: string;

	@Column()
	authorName?: string;

	@Column()
	authorEmail?: string;

	@OneToMany('InstalledNodes', 'package')
	@JoinColumn({ referencedColumnName: 'package' })
	installedNodes: InstalledNodes[];
}
