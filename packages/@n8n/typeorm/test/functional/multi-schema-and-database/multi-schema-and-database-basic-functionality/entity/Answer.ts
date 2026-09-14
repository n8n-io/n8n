import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';

@Entity({ database: 'secondDB', schema: 'answers' })
export class Answer {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	text: string;

	@Column()
	questionId: number;
}
