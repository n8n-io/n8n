import { Column } from '../../../../../../src';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Answer } from './Answer';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';

@Entity()
export class Question {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ default: 'My question' })
	name: string;

	@OneToMany(
		(type) => Answer,
		(answer) => answer.question,
		{
			cascade: ['insert'],
		},
	)
	answers: Answer[];
}
