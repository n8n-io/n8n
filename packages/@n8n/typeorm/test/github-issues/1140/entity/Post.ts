import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';

const transformer = {
	from(value: Date): number {
		return value.getTime();
	},
	to(value: number): Date {
		return new Date(value);
	},
};

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: Date, transformer })
	ts: number;
}
