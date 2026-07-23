import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../src';
import { Two } from './Two';
import { Three } from './Three';
import { Four } from './Four';
import { Five } from './Five';
import { Six } from './Six';
import { Seven } from './Seven';
import { Eight } from './Eight';
import { Nine } from './Nine';
import { Ten } from './Ten';

@Entity()
export class One {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToOne(
		(type) => Two,
		(two) => two.one,
	)
	two: Two;

	@OneToOne(
		(type) => Three,
		(three) => three.one,
	)
	three: Three;

	@OneToOne(
		(type) => Four,
		(four) => four.one,
	)
	four: Four;

	@OneToOne(
		(type) => Five,
		(five) => five.one,
	)
	five: Five;

	@OneToOne(
		(type) => Six,
		(six) => six.one,
	)
	six: Six;

	@OneToOne(
		(type) => Seven,
		(seven) => seven.one,
	)
	seven: Seven;

	@OneToOne(
		(type) => Eight,
		(eight) => eight.one,
	)
	eight: Eight;

	@OneToOne(
		(type) => Nine,
		(nine) => nine.one,
	)
	nine: Nine;

	@OneToOne(
		(type) => Ten,
		(ten) => ten.one,
	)
	ten: Ten;

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

	@Column({ type: 'text' })
	iiiii: string;
}
