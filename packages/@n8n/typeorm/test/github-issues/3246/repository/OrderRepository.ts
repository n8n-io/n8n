import { Order } from '../entity/Order';
import { EntityRepository, AbstractRepository } from '../../../../src';

@EntityRepository(Order)
export class OrderRepository extends AbstractRepository<Order> {
	async createOrder(order: Order) {
		return this.repository.save(order);
	}
}
