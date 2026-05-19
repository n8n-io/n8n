import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';

import { Customer } from './Customer';

@Entity('CustomerContact')
@Index(['firstName', 'lastName'])
export class CustomerContact {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(
		() => Customer,
		(customer) => customer.contacts,
	)
	customer: Customer;

	@Column({ default: '' })
	firstName: string;

	@Column({ default: '' })
	lastName: string;
}
