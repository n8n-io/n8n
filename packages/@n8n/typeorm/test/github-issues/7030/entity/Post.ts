import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn({
		type: 'integer',
		name: 'id',
	})
	oldId: number;

	@Column({
		nullable: false,
		unique: true,
		length: 38,
		name: 'new_id',
	})
	id: string;
}
