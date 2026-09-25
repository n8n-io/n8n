import {
	Entity,
	PrimaryGeneratedColumn,
	OneToOne,
	JoinColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
} from '../../../../src';
import { OrderCustomer } from './OrderCustomer';
import { Broker } from './Broker';

@Entity()
export class Order {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', nullable: true })
	orderReferenceNumber: string;

	@ManyToOne(
		() => Broker,
		(broker) => broker.orders,
		{
			cascade: false,
			nullable: false, // starts working when set to true
		},
	)
	company?: Broker;

	@OneToOne(
		() => OrderCustomer,
		(orderCustomer) => orderCustomer.order,
		{
			cascade: ['insert', 'update'],
			onDelete: 'CASCADE',
			nullable: true,
		},
	)
	@JoinColumn({ name: 'orderCustomerId' })
	orderCustomer?: OrderCustomer;

	@Column({ type: 'int', nullable: true })
	orderCustomerId?: number;

	@CreateDateColumn()
	createdDate: Date;

	@UpdateDateColumn()
	modifiedDate: Date;
}
