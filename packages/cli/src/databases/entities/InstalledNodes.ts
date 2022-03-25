import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class InstalledNodes {
	@Column()
	name: string;

	@PrimaryColumn()
	type: string;

	@Column()
	latestVersion: string;

	@Column()
	package: string;
}
