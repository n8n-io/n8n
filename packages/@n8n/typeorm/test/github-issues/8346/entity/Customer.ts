import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from '../../../../src';

import { CustomerContact } from './CustomerContact';

@Entity('Customer')
export class Customer extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		() => CustomerContact,
		(contact) => contact.customer,
	)
	contacts: CustomerContact[];
}
