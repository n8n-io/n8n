import { BaseEntity, Entity, JoinColumn, OneToMany, PrimaryColumn } from '../../../../src';
import { ScheduledSailing } from './ScheduledSailing';

@Entity()
export class Sailing extends BaseEntity {
	@PrimaryColumn()
	scheduled_departure_time: Date;

	@OneToMany(
		() => ScheduledSailing,
		(scheduledSailing) => scheduledSailing.sailing,
	)
	@JoinColumn([
		{
			referencedColumnName: 'scheduled_departure_time',
			name: 'scheduled_departure_time',
		},
	])
	scheduled_sailings: ScheduledSailing[];
}
