import { Column } from '../../../../src/decorator/columns/Column';

export class Duration {
	@Column({ name: 'duration_minutes' })
	durationMinutes: number;

	@Column({ name: 'duration_hours' })
	durationHours: number;

	@Column({ name: 'duration_days' })
	durationDays: number;
}
