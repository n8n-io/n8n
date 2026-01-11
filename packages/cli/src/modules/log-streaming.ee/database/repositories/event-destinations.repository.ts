import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { EventDestinations } from '../entities/event-destinations.entity';

@Service()
export class EventDestinationsRepository extends Repository<EventDestinations> {
	constructor(dataSource: DataSource) {
		super(EventDestinations, dataSource.manager);
	}
}
