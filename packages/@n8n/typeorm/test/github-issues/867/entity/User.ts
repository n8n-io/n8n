import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Index } from '../../../../src/decorator/Index';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	@Index()
	username: string;
}
