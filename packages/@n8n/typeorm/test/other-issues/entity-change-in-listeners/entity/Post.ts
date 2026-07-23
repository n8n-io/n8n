import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { BeforeUpdate } from '../../../../src/decorator/listeners/BeforeUpdate';
import { UpdateDateColumn } from '../../../../src/decorator/columns/UpdateDateColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ default: false })
	active: boolean;

	@UpdateDateColumn()
	updateDate: Date;

	@BeforeUpdate()
	beforeUpdate() {
		this.title += '!';
	}
}
