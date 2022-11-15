import { IsString, Length } from 'class-validator';
import { JsonValue } from 'n8n-workflow';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { NoXss } from '../utils/customValidators';
import { AbstractEntity } from './AbstractEntity';

@Entity({ name: 'eventdestinations_entity' })
export class EventDestinations extends AbstractEntity {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ length: 255, nullable: true })
	@NoXss()
	@IsString({ message: 'Destination name must be of type string.' })
	@Length(1, 255, {
		message: 'Destination name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	@Column('simple-json')
	destination: string;
}
