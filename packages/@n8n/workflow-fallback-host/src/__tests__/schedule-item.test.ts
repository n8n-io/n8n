import { scheduleItem } from '../node-step';

describe('scheduleItem', () => {
	it('gives the fields of the v1 Schedule Trigger in the time zone', () => {
		const item = scheduleItem({
			scheduledAt: Date.parse('2026-11-12T11:00:05Z'),
			timezone: 'Europe/Berlin',
		});
		expect(item).toEqual({
			timestamp: '2026-11-12T12:00:05.000+01:00',
			'Readable date': 'November 12th 2026, 12:00:05 pm',
			'Readable time': '12:00:05 pm',
			'Day of week': 'Thursday',
			Year: '2026',
			Month: 'November',
			'Day of month': '12',
			Hour: '12',
			Minute: '00',
			Second: '05',
			Timezone: 'Europe/Berlin (UTC+01:00)',
		});
	});
});
