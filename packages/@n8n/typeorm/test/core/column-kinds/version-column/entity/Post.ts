import { Column, Entity, PrimaryGeneratedColumn, VersionColumn } from '../../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@VersionColumn()
	version: number;
}
