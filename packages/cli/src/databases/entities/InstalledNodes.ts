import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { InstalledPackages } from './InstalledPackages';

@Entity()
export class InstalledNodes {
	@Column()
	name: string;

	@PrimaryColumn()
	type: string;

	@Column()
	latestVersion: string;

	@ManyToOne(
		() => InstalledPackages,
		(installedPackages: InstalledPackages) => installedPackages.installedNodes,
	)
	@JoinColumn({ name: 'package', referencedColumnName: 'packageName' })
	package: InstalledPackages;
}
