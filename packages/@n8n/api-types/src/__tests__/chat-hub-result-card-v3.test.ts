import { resultCardSchema } from '../chat-hub-result-card';
import { lenientResultCardSchema } from '../chat-hub-result-card-lenient';

const weather = {
	type: 'weather',
	title: 'San Francisco',
	location: 'San Francisco',
	temperature: 24,
	condition: 'Sunny',
	icon: 'sun',
	high: 26,
	low: 17,
	sources: [{ name: 'Open-Meteo', temperature: 24 }],
};

describe('result card v3 envelope', () => {
	describe('switcher + variants', () => {
		it('accepts day tabs on a weather card with partial-body variants', () => {
			const result = resultCardSchema.safeParse({
				...weather,
				switcher: {
					control: 'tabs',
					options: [
						{ key: 'mon', label: 'Mon', icon: 'sun' },
						{ key: 'tue', label: 'Tue', icon: 'cloud' },
					],
				},
				variants: {
					mon: { eyebrow: 'Monday' },
					tue: { eyebrow: 'Tuesday', temperature: 19, condition: 'Cloudy', icon: 'cloud' },
				},
			});
			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'weather') return;
			expect(result.data.switcher?.control).toBe('tabs');
			expect(result.data.variants?.tue?.temperature).toBe(19);
		});

		it('rejects a switcher with a single option', () => {
			expect(
				resultCardSchema.safeParse({
					...weather,
					switcher: { options: [{ key: 'a', label: 'A' }] },
				}).success,
			).toBe(false);
		});

		it('rejects a variant that breaks the body types', () => {
			expect(
				resultCardSchema.safeParse({
					...weather,
					variants: { tue: { temperature: 'warm' } },
				}).success,
			).toBe(false);
		});

		it('leniently builds variants and a switcher from an array of day objects', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'weather',
				title: 'SF',
				location: 'SF',
				temperature: '24°',
				condition: 'Sunny',
				variants: [
					{ key: 'mon', label: 'Mon', icon: 'sun', eyebrow: 'Monday', temp: 24, h: 26, l: 17 },
					{
						key: 'tue',
						label: 'Tue',
						icon: 'cloud',
						eyebrow: 'Tuesday',
						temperature: '19',
						condition: 'Cloudy',
						high: 21,
						low: 14,
					},
				],
			});
			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'weather') return;
			expect(result.data.switcher?.options.map((option) => option.key)).toEqual(['mon', 'tue']);
			expect(result.data.switcher?.options[1].icon).toBe('cloud');
			expect(result.data.variants?.tue).toEqual({
				eyebrow: 'Tuesday',
				temperature: 19,
				condition: 'Cloudy',
				icon: 'cloud',
				high: 21,
				low: 14,
			});
			// partial mode: no `sources` fallback is injected into an override
			expect(result.data.variants?.mon?.sources).toBeUndefined();
		});

		it('leniently reads a switcher given as a bare list of labels', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'chart',
				title: 'Token spend',
				series: ['Atlas Large', 'Vision'],
				columns: [
					{ label: 'Mon', values: [10, 2] },
					{ label: 'Tue', values: [12, 3] },
				],
				switcher: ['Week', 'Month'],
				variants: {
					Week: { range: 'Jul 1 – 7' },
					Month: { range: 'July', columns: [{ label: '1', values: [40, 8] }] },
				},
			});
			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'chart') return;
			expect(result.data.switcher?.options).toEqual([
				{ key: 'Week', label: 'Week' },
				{ key: 'Month', label: 'Month' },
			]);
			expect(result.data.variants?.Month?.columns?.[0].values).toEqual([40, 8]);
			expect(result.data.variants?.Month?.kind).toBeUndefined();
		});
	});

	describe('actions', () => {
		it('keeps a link action, infers event for a bare label and toggle from doneLabel', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'keyValue',
				title: 'Launch review',
				pairs: [{ key: 'When', value: 'Thu 2pm' }],
				actions: [
					{ label: 'Join call', url: 'https://meet.google.com/abc', icon: 'video' },
					{ label: 'Decline', doneLabel: 'Declined', destructive: true },
				],
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.actions).toEqual([
				{ label: 'Join call', href: 'https://meet.google.com/abc', icon: 'video' },
				{ label: 'Decline', kind: 'toggle', doneLabel: 'Declined', destructive: true },
			]);
		});

		it('drops an unknown icon and a non-https href but keeps the pill', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'keyValue',
				title: 't',
				pairs: [{ key: 'a', value: 'b' }],
				actions: [{ label: 'Open', href: 'http://x', icon: 'rocket' }],
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.actions).toEqual([{ label: 'Open' }]);
		});

		it('rejects a link kind without an https href in the strict schema', () => {
			expect(
				resultCardSchema.safeParse({
					type: 'keyValue',
					title: 't',
					pairs: [{ key: 'a', value: 'b' }],
					actions: [{ label: 'Open', href: 'http://x', kind: 'link' }],
				}).success,
			).toBe(false);
		});
	});
});

describe('new archetypes', () => {
	it('accepts an event card and normalises attendee statuses and timestamps', () => {
		const result = lenientResultCardSchema.safeParse({
			type: 'meeting',
			title: 'Launch review',
			start: '2026-03-14T14:00',
			end: '2026-03-14T15:00:00+01:00',
			platform: 'Google Meet',
			location: 'Studio 4, 210 Market St',
			mapUrl: 'https://maps.google.com/?q=210+Market+St',
			join: 'https://meet.google.com/abc',
			attendees: [
				{ name: 'Maya Chen', responseStatus: 'accepted' },
				'Leo Park',
				{ displayName: 'Ava Ruiz', status: 'tentative' },
			],
			going: '5',
		});
		expect(result.success).toBe(true);
		if (!result.success || result.data.type !== 'event') return;
		expect(result.data.startsAt).toBe('2026-03-14T14:00Z');
		expect(result.data.endsAt).toBe('2026-03-14T15:00:00+01:00');
		expect(result.data.attendees).toEqual([
			{ name: 'Maya Chen', status: 'going' },
			{ name: 'Leo Park' },
			{ name: 'Ava Ruiz', status: 'maybe' },
		]);
		expect(result.data.attendeeCount).toBe(5);
		expect(result.data.locationHref).toBe('https://maps.google.com/?q=210+Market+St');
	});

	it('accepts a ticket card and maps a status word to a badge tone', () => {
		const result = lenientResultCardSchema.safeParse({
			type: 'flight',
			title: 'Boarding pass',
			reference: 'TA 482 · Wed, Jun 12',
			from: { iata: 'SFO', city: 'San Francisco', time: '08:45' },
			to: { code: 'JFK', name: 'New York', time: '17:05' },
			duration: '5h 20m',
			badge: 'Delayed',
			facts: { Gate: 'B12', Seat: '14A' },
			passenger: { name: 'Maya Chen', cabin: 'Economy' },
			variants: {
				onTime: { badge: { label: 'On time', tone: 'ok' } },
				delayed: { badge: 'Delayed', from: { code: 'SFO', name: 'San Francisco', time: '09:25' } },
			},
		});
		expect(result.success).toBe(true);
		if (!result.success || result.data.type !== 'ticket') return;
		expect(result.data.mode).toBe('flight');
		expect(result.data.badge).toEqual({ label: 'Delayed', tone: 'warn' });
		expect(result.data.facts).toEqual([
			{ label: 'Gate', value: 'B12' },
			{ label: 'Seat', value: '14A' },
		]);
		expect(result.data.holder).toEqual({ name: 'Maya Chen', detail: 'Economy' });
		expect(result.data.variants?.delayed?.mode).toBeUndefined();
		expect(result.data.variants?.delayed?.from?.time).toBe('09:25');
	});

	it('accepts a chart card with per-series column objects and hex colours', () => {
		const result = lenientResultCardSchema.safeParse({
			type: 'bar-chart',
			title: 'Token spend',
			total: '1.7M',
			unit: 'Tokens',
			series: [
				{ name: 'Atlas Large', color: '#1C5FFB' },
				{ name: 'Vision', color: 'green' },
			],
			columns: [
				{ label: 'Mon', values: { 'Atlas Large': 14, Vision: 10 } },
				{ label: 'Tue', values: [15, '13'] },
			],
		});
		expect(result.success).toBe(true);
		if (!result.success || result.data.type !== 'chart') return;
		expect(result.data.kind).toBe('stacked');
		expect(result.data.totalLabel).toBe('Tokens');
		expect(result.data.series).toEqual([{ name: 'Atlas Large', color: '#1C5FFB' }, { name: 'Vision' }]);
		expect(result.data.columns).toEqual([
			{ label: 'Mon', values: [14, 10] },
			{ label: 'Tue', values: [15, 13] },
		]);
	});

	it('rejects a chart series colour that is not #rrggbb', () => {
		expect(
			resultCardSchema.safeParse({
				type: 'chart',
				title: 't',
				series: [{ name: 'a', color: 'blue' }],
				columns: [{ label: 'x', values: [1] }],
			}).success,
		).toBe(false);
	});

	it('accepts a pulse card with stats and a menu switcher', () => {
		const result = lenientResultCardSchema.safeParse({
			type: 'heart-rate',
			title: 'Heart rate',
			bpm: '72',
			unit: 'bpm',
			live: true,
			stats: [
				{ label: 'Current', value: '1.6', unit: 'sec/sqt' },
				{ label: 'Average', value: '2.2', unit: 'sec/sqt' },
			],
			switcher: { control: 'dropdown', options: ['Resting', 'Active'] },
			variants: { Resting: { value: 72 }, Active: { value: 118, period: 1.4 } },
		});
		expect(result.success).toBe(true);
		if (!result.success || result.data.type !== 'pulse') return;
		expect(result.data.value).toBe(72);
		expect(result.data.switcher?.control).toBe('menu');
		expect(result.data.variants?.Active).toEqual({ value: 118, period: 1.4 });
	});
});
