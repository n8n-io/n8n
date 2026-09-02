import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '../../../../src';
import { Sailing } from './Sailing';

@Entity()
export class ScheduledSailing extends BaseEntity {
	@PrimaryColumn()
	scheduled_departure_time: Date;

	@Column()
	scheduled_arrival_time: Date;

	@ManyToOne(
		() => Sailing,
		(sailing) => sailing.scheduled_sailings,
	)
	@JoinColumn([
		{
			referencedColumnName: 'scheduled_departure_time',
			name: 'scheduled_departure_time',
		},
	])
	sailing: Sailing;
}
