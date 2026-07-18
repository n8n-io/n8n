import { Column, Entity, PrimaryColumn } from '../../../../src';
import { Order } from './order';

@Entity({ name: 'order_test' })
export class OrderTestEntity {
	@PrimaryColumn()
	id: number;

	@Column({ type: 'enum', enum: Order, default: Order.FIRST })
	order: Order;

	@Column({ type: 'enum', enum: Order, default: [Order.FIRST], array: true })
	orders: Order[];
}
