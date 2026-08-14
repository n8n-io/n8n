import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity({
	orderBy: {
		myOrder: 'DESC',
	},
})
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	myOrder: number;

	@Column()
	num1: number = 1;

	@Column()
	num2: number = 1;
}
