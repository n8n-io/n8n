import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { VersionColumn } from '../../../../../src/decorator/columns/VersionColumn';

@Entity()
export class PostWithVersion {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@VersionColumn()
	version: number;
}
