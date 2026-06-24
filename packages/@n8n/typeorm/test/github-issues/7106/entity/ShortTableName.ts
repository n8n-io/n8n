import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column, Entity } from '../../../../src';

@Entity()
export class ShortTableName {
	@PrimaryGeneratedColumn() // typeORM requires a pkey
	PrimaryGeneratedColumnIDBlahBlahBlahThisIsReallyLong: number;

	@Column()
	Name: string;

	@Column()
	Value: number;
}
