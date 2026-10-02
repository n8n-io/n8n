import { Entity } from '../../../../src/index';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { OneToMany } from '../../../../src/decorator/relations/OneToMany';
import { Cat } from './Cat';

@Entity()
export class Dog {
	@PrimaryColumn()
	DogID: string;

	@OneToMany(
		(type) => Cat,
		(cat) => cat.dog,
	)
	cats: Cat[];
}
