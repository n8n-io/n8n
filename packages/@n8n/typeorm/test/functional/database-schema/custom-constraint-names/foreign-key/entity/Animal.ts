import {
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToOne,
	PrimaryGeneratedColumn,
} from '../../../../../../src';
import { Category } from './Category';
import { Breed } from './Breed';
import { Name } from './Name';

@Entity()
export class Animal {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(() => Category)
	@JoinTable({
		name: 'animal_category',
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

	@OneToOne(() => Name)
	@JoinColumn({
		name: 'nameId',
		referencedColumnName: 'id',
		foreignKeyConstraintName: 'fk_animal_nameId',
	})
	name: Name;
}
