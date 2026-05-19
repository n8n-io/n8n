import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column, Entity, Generated } from '../../../../src';

@Entity()
export class ReallyReallyVeryVeryVeryLongTableName {
	@PrimaryGeneratedColumn() // typeORM requires a pkey
	PrimaryGeneratedColumnIDBlahBlahBlahThisIsReallyLong: number;

	@Column()
	Name: string;

	@Column()
	@Generated('increment')
	MyNumber: number;
}
