import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { DeleteDateColumn } from '../../../../../../src/decorator/columns/DeleteDateColumn';
import { AfterSoftRemove, BeforeSoftRemove } from '../../../../../../src';

@Entity()
export class PostWithDeleteDateColumn {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	description: string;

	@DeleteDateColumn()
	deletedAt: Date;

	isSoftRemoved: boolean = false;

	@BeforeSoftRemove()
	beforeSoftRemove() {
		this.title += '!';
	}

	@AfterSoftRemove()
	afterSoftRemove() {
		this.isSoftRemoved = true;
	}
}
