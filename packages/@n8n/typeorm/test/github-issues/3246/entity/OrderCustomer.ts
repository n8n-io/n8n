import { Order } from './Order';
import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	OneToOne,
	CreateDateColumn,
	UpdateDateColumn,
} from '../../../../src';

@Entity()
export class OrderCustomer {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', nullable: false })
	name: string;

	@OneToOne(
		(type) => Order,
		(order) => order.orderCustomer,
		{
			cascade: ['insert', 'update'],
			nullable: true,
		},
	)
	order?: Order;

	@CreateDateColumn()
	createdDate: Date;

	@UpdateDateColumn()
	modifiedDate: Date;
}
