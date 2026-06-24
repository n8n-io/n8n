import { Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from '../../../../src';

import { AnimalEntity } from './Animal';
import { Content } from './Content';

@Entity({ name: 'person' })
export class PersonEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@OneToMany(
		() => AnimalEntity,
		({ person }) => person,
		{
			cascade: true,
			eager: true,
		},
	)
	pets!: AnimalEntity[];

	@OneToOne(() => Content, {
		cascade: true,
		eager: true,
		nullable: true,
	})
	@JoinColumn()
	content?: Content;
}
