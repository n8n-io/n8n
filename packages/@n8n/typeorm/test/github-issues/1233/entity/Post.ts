import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '../../../../src/index';

@Entity({
	orderBy: {
		updatedDate: 'DESC',
	},
})
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@CreateDateColumn()
	createdDate: Date;

	@UpdateDateColumn()
	updatedDate: Date;
}
