import { BeforeUpdate } from '../../../../src';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@BeforeUpdate()
	beforeUpdate() {
		this.title = this.title.trim();
	}
}
