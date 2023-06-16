import { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AbstractEntity, jsonColumnType } from './AbstractEntity';

@Entity({ name: 'event_destinations' })
export class EventDestinations extends AbstractEntity {
	@PrimaryColumn('uuid')
	id: string;

	@Column(jsonColumnType)
	destination: MessageEventBusDestinationOptions;
}
