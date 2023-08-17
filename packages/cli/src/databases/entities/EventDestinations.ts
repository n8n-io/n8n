import { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { WithTimestamps, jsonColumnType } from './AbstractEntity';

@Entity({ name: 'event_destinations' })
export class EventDestinations extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column(jsonColumnType)
	destination: MessageEventBusDestinationOptions;
}
