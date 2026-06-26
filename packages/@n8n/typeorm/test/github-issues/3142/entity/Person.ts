import { BaseEntity } from '../../../../src';
import { Column } from '../../../../src';
import { PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src';
import { Contact } from './Contact';

@Entity()
export class Person extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column((_type) => Contact)
	contact: Contact;

	// I added the unique: true just for the sake of the example
	@Column({ unique: true })
	status: string;
}
