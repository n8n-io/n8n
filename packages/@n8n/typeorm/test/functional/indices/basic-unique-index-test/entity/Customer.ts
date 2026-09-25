import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Index } from '../../../../../src/decorator/Index';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
@Index('index_name_english', ['nameEnglish'], { unique: true })
export class Customer {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	nameHebrew: string;

	@Column()
	nameEnglish: string;
}
