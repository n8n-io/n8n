import { Column, Entity, ManyToOne, PrimaryColumn } from '../../../../src';
import { Event } from './Event';
import { Role } from './Role';

@Entity()
export class EventRole {
	@PrimaryColumn()
	eventId: string;

	@PrimaryColumn()
	roleId: string;

	@Column()
	description: string;

	@Column()
	compensation: string;

	@ManyToOne(
		(type) => Role,
		(role) => role.roles,
		{
			onDelete: 'CASCADE',
		},
	)
	role: Role;

	@ManyToOne(
		(type) => Event,
		(event) => event.roles,
		{
			onDelete: 'CASCADE',
		},
	)
	event: Event;
}
