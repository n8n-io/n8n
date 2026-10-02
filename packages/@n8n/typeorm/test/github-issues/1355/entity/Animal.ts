import {
	Column,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	PrimaryGeneratedColumn,
} from '../../../../src';
import { Category } from './Category';
import { Breed } from './Breed';

@Entity()
export class Animal {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(() => Category, { eager: true })
	@JoinTable({
		joinColumn: {
			name: 'categoryId',
			referencedColumnName: 'id',
			foreignKeyConstraintName: 'fk_animal_category_categoryId',
		},
		inverseJoinColumn: {
			name: 'animalId',
			referencedColumnName: 'id',
			foreignKeyConstraintName: 'fk_animal_category_animalId',
		},
	})
	categories: Category[];

	@ManyToOne(() => Breed)
	@JoinColumn({
		name: 'breedId',
		referencedColumnName: 'id',
		foreignKeyConstraintName: 'fk_animal_breedId',
	})
	breed: Breed;
}
