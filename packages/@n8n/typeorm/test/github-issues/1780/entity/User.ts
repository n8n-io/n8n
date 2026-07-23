import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Index } from '../../../../src/decorator/Index';
@Entity()
@Index('unique_idx', ['first_name', 'last_name'], { unique: true })
export class User {
	@PrimaryGeneratedColumn()
	id: number;
	@Column({ length: 100 })
	first_name: string;
	@Column({ length: 100 })
	last_name: string;
	@Column({ length: 100 })
	is_updated: string;
}
