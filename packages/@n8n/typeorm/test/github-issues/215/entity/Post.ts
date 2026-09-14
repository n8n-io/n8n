import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Author } from './Author';
import { Abbreviation } from './Abbreviation';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToOne((type) => Author)
	@JoinColumn({ name: 'author_id' })
	author: Author;

	@OneToOne((type) => Abbreviation)
	@JoinColumn({ name: 'abbreviation_id' })
	abbreviation: Abbreviation;
}
