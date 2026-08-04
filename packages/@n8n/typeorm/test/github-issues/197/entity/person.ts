import { Entity } from '../../../../src/decorator/entity/Entity';
import { Index } from '../../../../src/decorator/Index';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Person {
	@PrimaryGeneratedColumn()
	id: number;

	@Index({
		unique: true,
	})
	@Column()
	firstname: string;

	@Column()
	lastname: string;
}
