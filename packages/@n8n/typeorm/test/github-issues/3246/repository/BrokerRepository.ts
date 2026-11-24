import { EntityRepository, AbstractRepository } from '../../../../src';
import { Broker } from '../entity/Broker';

@EntityRepository(Broker)
export class BrokerRepository extends AbstractRepository<Broker> {
	async createBroker(broker: Broker) {
		return this.repository.save(broker);
	}
}
