import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { BaseEntity } from '../../../../../src';

@Entity()
export class PersonAR extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
