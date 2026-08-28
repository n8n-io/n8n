import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { BaseEntity } from '../../../../src/repository/BaseEntity';

@Entity()
export class Foo extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;
}
