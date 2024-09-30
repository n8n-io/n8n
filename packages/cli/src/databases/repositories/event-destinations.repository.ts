import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { EventDestinations } from '../entities/event-destinations';

@Service()
export class EventDestinationsRepository extends Repository<EventDestinations> {
	constructor(dataSource: DataSource) {
		super(EventDestinations, dataSource.manager);
	}
}
