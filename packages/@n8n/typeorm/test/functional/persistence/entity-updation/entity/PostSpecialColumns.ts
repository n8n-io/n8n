import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { CreateDateColumn } from '../../../../../src/decorator/columns/CreateDateColumn';
import { UpdateDateColumn } from '../../../../../src/decorator/columns/UpdateDateColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { VersionColumn } from '../../../../../src/decorator/columns/VersionColumn';

@Entity()
export class PostSpecialColumns {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@CreateDateColumn()
	createDate: Date;

	@UpdateDateColumn()
	updateDate: Date;

	@VersionColumn()
	version: number;
}
