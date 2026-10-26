import { isUniqueConstraintError } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { EventDestinations } from '../entities';

@Service()
export class EventDestinationsRepository extends Repository<EventDestinations> {
	constructor(dataSource: DataSource) {
		super(EventDestinations, dataSource.manager);
	}

	async createIfNew(id: string, destination: MessageEventBusDestinationOptions): Promise<boolean> {
		try {
			await this.insert({ id, destination });
			return true;
		} catch (error) {
			if (isUniqueConstraintError(error)) return false;
			throw error;
		}
	}

	async deleteIfUnchanged(
		id: string,
		destination: MessageEventBusDestinationOptions,
	): Promise<boolean> {
		const result = await this.createQueryBuilder()
			.delete()
			.where({ id })
			.andWhere('CAST(destination AS TEXT) = :destination', {
				destination: JSON.stringify(destination),
			})
			.execute();
		return (result.affected ?? 0) > 0;
	}
}
