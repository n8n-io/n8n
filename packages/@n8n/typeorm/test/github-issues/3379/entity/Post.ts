import { Index, PrimaryGeneratedColumn } from '../../../../src';
import { Column } from '../../../../src';
import { Entity } from '../../../../src';

@Index('name_index', ['name'])
@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
