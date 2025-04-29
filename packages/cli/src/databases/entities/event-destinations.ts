import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Entity, PrimaryColumn } from '@n8n/typeorm';
import { MessageEventBusDestinationOptions } from 'n8n-workflow';

@Entity({ name: 'event_destinations' })
export class EventDestinations extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@JsonColumn()
	destination: MessageEventBusDestinationOptions;
}
