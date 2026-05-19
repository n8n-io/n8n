import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Contact } from './Contact';

@Entity()
export class Organisation {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column((type) => Contact)
	contact: Contact;
}
