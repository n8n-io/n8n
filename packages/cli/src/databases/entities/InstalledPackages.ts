import { Column, Entity, JoinColumn, OneToMany, PrimaryColumn } from 'typeorm';
import { InstalledNodes } from './InstalledNodes';
import { AbstractEntity } from './AbstractEntity';

@Entity()
export class InstalledPackages extends AbstractEntity {
	@PrimaryColumn()
	packageName: string;

	@Column()
	installedVersion: string;

	@Column()
	authorName?: string;

	@Column()
	authorEmail?: string;

	@OneToMany(() => InstalledNodes, (installedNode) => installedNode.package)
	@JoinColumn({ referencedColumnName: 'package' })
	installedNodes: InstalledNodes[];
}
