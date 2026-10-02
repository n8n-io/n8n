import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { One } from './One';
import { ManyToOne } from '../../../../src';

@Entity()
export class Nine {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne((type) => One)
	one: One;

	@Column({ type: 'text' })
	aaaaa: string;

	@Column({ type: 'text' })
	bbbbb: string;

	@Column({ type: 'text' })
	ccccc: string;

	@Column({ type: 'text' })
	ddddd: string;

	@Column({ type: 'text' })
	eeeee: string;

	@Column({ type: 'text' })
	fffff: string;

	@Column({ type: 'text' })
	ggggg: string;

	@Column({ type: 'text' })
	hhhhh: string;
}
