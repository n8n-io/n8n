import { Column, Entity, PrimaryGeneratedColumn, Unique } from '../../../../../../src';

@Entity()
@Unique('UQ_NAME', ['name'])
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
