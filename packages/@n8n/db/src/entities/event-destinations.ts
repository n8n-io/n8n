import { Entity, PrimaryColumn } from '@n8n/typeorm';
import { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { JsonColumn, WithTimestamps } from './abstract-entity';

@Entity({ name: 'event_destinations' })
export class EventDestinations extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@JsonColumn()
	destination: MessageEventBusDestinationOptions;
}
