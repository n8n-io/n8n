import {
	lenientResultCardSchema,
	normalizeResultCardInput,
} from '../chat-hub-result-card-lenient';

describe('lenientResultCardSchema', () => {
	describe('metric cards the way models actually write them', () => {
		it('accepts the first payload a model produced in the field: colour-word tone, string delta, string breakdown values', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'metric',
				title: 'Yesterday’s workflow health',
				status: 'info',
				statusLabel: '99.3% success',
				tone: 'neutral',
				value: '99.3%',
				label: 'successful runs',
				delta: '↓ 0.4 pp vs. day before',
				breakdown: [
					{ label: 'Total runs', value: '681' },
					{ label: 'Succeeded', value: '676' },
					{ label: 'Failed', value: '5' },
					{ label: 'Most failures', value: 'Invoice sync (3)' },
				],
			});

			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'metric') return;
			expect(result.data.tone).toBe('paper');
			expect(result.data.statusLabel).toBe('99.3% success');
			expect(result.data.delta).toEqual({
				value: '0.4 pp',
				direction: 'down',
				label: 'vs. day before',
			});
			expect(result.data.breakdown).toEqual([
				{ label: 'Total runs', value: 681 },
				{ label: 'Succeeded', value: 676 },
				{ label: 'Failed', value: 5 },
				{ label: 'Most failures', value: 3 },
			]);
		});

		it('accepts the retry payload: delta object without a direction', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'metric',
				title: 'Yesterday’s workflow health',
				tone: 'sky',
				value: '99.3%',
				label: 'successful runs',
				delta: { value: '↓ 0.4 pp', label: 'vs. day before' },
				breakdown: [{ label: 'Total runs', value: 681 }],
			});

			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'metric') return;
			expect(result.data.delta).toEqual({
				value: '↓ 0.4 pp',
				direction: 'down',
				label: 'vs. day before',
			});
		});

		it('infers delta direction from signs and words', () => {
			const parse = (delta: unknown) => {
				const result = lenientResultCardSchema.safeParse({
					type: 'metric',
					title: 't',
					value: '1',
					label: 'l',
					delta,
				});
				return result.success && result.data.type === 'metric' ? result.data.delta : undefined;
			};

			expect(parse('+12% vs last week')).toEqual({
				value: '+12%',
				direction: 'up',
				label: 'vs last week',
			});
			expect(parse('-3 from yesterday')).toEqual({
				value: '-3',
				direction: 'down',
				label: 'from yesterday',
			});
			expect(parse('up 5% from yesterday')).toEqual({
				value: '5%',
				direction: 'up',
				label: 'from yesterday',
			});
			expect(parse('unchanged')).toEqual({ value: 'unchanged', direction: 'flat' });
			expect(parse({ value: '+2', direction: 'increase' })).toEqual({
				value: '+2',
				direction: 'up',
			});
			expect(parse(12)).toEqual({ value: '12', direction: 'up' });
		});

		it('renders a numeric hero value as text and parses formatted numbers in breakdowns', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'metric',
				title: 'Revenue',
				value: 48200,
				label: 'this month',
				breakdown: { Qualified: '€8,200', Proposal: '12.4k', Lost: 'n/a' },
				trend: ['1', 2, '3.5', 'x'],
			});

			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'metric') return;
			expect(result.data.value).toBe('48200');
			expect(result.data.breakdown).toEqual([
				{ label: 'Qualified', value: 8200 },
				{ label: 'Proposal', value: 12400 },
			]);
			expect(result.data.trend).toEqual([1, 2, 3.5]);
		});

		it('still rejects a metric with no value — leniency never invents data', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'metric',
				title: 'Revenue',
				label: 'this month',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('envelope', () => {
		it('maps colour words and status synonyms, drops unknown ones', () => {
			const parse = (envelope: Record<string, unknown>) => {
				const result = lenientResultCardSchema.safeParse({
					type: 'keyValue',
					title: 't',
					pairs: [{ key: 'k', value: 'v' }],
					...envelope,
				});
				return result.success ? result.data : undefined;
			};

			expect(parse({ tone: 'green' })?.tone).toBe('forest');
			expect(parse({ tone: 'Graphite' })?.tone).toBe('graphite');
			expect(parse({ color: 'red' })?.tone).toBe('terracotta');
			expect(parse({ tone: 'chartreuse' })?.tone).toBeUndefined();
			expect(parse({ status: 'ok' })?.status).toBe('success');
			expect(parse({ status: 'FAILED' })?.status).toBe('error');
			expect(parse({ status: 'weird' })?.status).toBeUndefined();
		});

		it('clamps over-long text and over-full lists instead of failing', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'keyValue',
				title: 'x'.repeat(200),
				statusLabel: 'Needs attention now',
				actions: [
					{ label: 'One', href: 'https://a.example' },
					{ label: 'Two', href: 'http://insecure.example' },
					{ label: 'Three', href: 'https://c.example' },
					{ label: 'Four', href: 'https://d.example' },
				],
				pairs: Array.from({ length: 9 }, (_, index) => ({ key: `k${index}`, value: index })),
			});

			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'keyValue') return;
			expect(result.data.title).toHaveLength(80);
			expect(result.data.title.endsWith('…')).toBe(true);
			expect(result.data.statusLabel).toBe('Needs attention…');
			expect(result.data.actions?.map((action) => action.label)).toEqual(['One', 'Three']);
			expect(result.data.pairs).toHaveLength(6);
			expect(result.data.pairs[0]).toEqual({ key: 'k0', value: '0' });
		});

		it('recognises archetype aliases', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'key_value',
				title: 'Fabrikam',
				pairs: { Owner: 'Maya', Stage: 'Proposal', Value: 18000 },
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.type).toBe('keyValue');
			if (result.data.type !== 'keyValue') return;
			expect(result.data.pairs).toEqual([
				{ key: 'Owner', value: 'Maya' },
				{ key: 'Stage', value: 'Proposal' },
				{ key: 'Value', value: '18000' },
			]);
		});
	});

	describe('records', () => {
		it('accepts object rows, numeric cells and operation synonyms', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'records',
				title: 'Deals closing this month',
				target: 'Deals',
				operation: 'list',
				columns: ['Deal', 'Owner', 'Value'],
				rows: [
					{ Deal: 'Fabrikam', Owner: 'Maya', Value: 18000, Extra: 'dropped' },
					['Contoso', 'Lee', 9500],
				],
				total: '2',
			});

			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'records') return;
			expect(result.data.operation).toBe('read');
			expect(result.data.rows).toEqual([
				['Fabrikam', 'Maya', '18000'],
				['Contoso', 'Lee', '9500'],
			]);
			expect(result.data.total).toBe(2);
		});

		it('derives columns from object rows and total from the row count', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'table',
				title: 'Open tickets',
				target: 'Tickets',
				rows: [
					{ id: 'T-1', priority: 'high' },
					{ id: 'T-2', priority: 'low' },
				],
			});

			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'records') return;
			expect(result.data.columns).toEqual(['id', 'priority']);
			expect(result.data.total).toBe(2);
		});
	});

	describe('list, email, message', () => {
		it('accepts plain-string list items', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'list',
				title: 'Stale deals',
				items: ['Fabrikam — 9 days', { name: 'Contoso', meta: '7 days' }, 42],
			});
			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'list') return;
			expect(result.data.items).toEqual([
				{ title: 'Fabrikam — 9 days' },
				{ title: 'Contoso', meta: '7 days' },
				{ title: '42' },
			]);
		});

		it('accepts a single recipient string and defaults the email direction', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'email',
				title: 'Follow-up sent',
				to: 'anna@example.com, lee@example.com',
				subject: 'Proposal v2',
			});
			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'email') return;
			expect(result.data.direction).toBe('sent');
			expect(result.data.to).toEqual(['anna@example.com', 'lee@example.com']);
		});

		it('falls back to the "other" channel for unknown platforms', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'message',
				title: 'Pinged ops',
				channel: 'Mattermost',
				to: '#ops',
				text: 'Invoice sync failed 3× overnight',
			});
			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'message') return;
			expect(result.data.channel).toBe('other');
		});
	});

	describe('normalizeResultCardInput', () => {
		it('leaves non-objects and unknown types alone for the strict schema to report', () => {
			expect(normalizeResultCardInput('nope')).toBe('nope');
			expect(normalizeResultCardInput(null)).toBeNull();
			const unknown = { type: 'gauge', title: 'x' };
			expect(normalizeResultCardInput(unknown)).toBe(unknown);
			expect(lenientResultCardSchema.safeParse(unknown).success).toBe(false);
		});

		it('unwraps a card the model nested one level too deep', () => {
			const result = lenientResultCardSchema.safeParse({
				card: { type: 'keyValue', title: 'Deal', pairs: [{ key: 'Owner', value: 'Maya' }] },
			});
			expect(result.success).toBe(true);
		});

		it('coerces a loosely written weather card: degree strings, unit words, icon from the condition, sources as a map', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'forecast',
				location: 'Lisbon, Portugal',
				temp: '14°',
				units: '°C',
				condition: 'Light rain showers',
				feels_like: '12 °C',
				humidity: '78%',
				wind: 21,
				max: 16,
				min: 9,
				sources: { 'Open-Meteo': 14.2, 'MET Norway': '13.6°', 'wttr.in': 15 },
				forecast: [
					{ day: 'Sat', max: 17, min: 10, condition: 'Sunny' },
					{ day: 'Sun', max: 15, min: 9, condition: 'Overcast' },
				],
			});

			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'weather') return;
			expect(result.data.title).toBe('Lisbon, Portugal');
			expect(result.data.temperature).toBe(14);
			expect(result.data.unit).toBe('C');
			expect(result.data.icon).toBe('drizzle');
			expect(result.data.feelsLike).toBe(12);
			expect(result.data.humidity).toBe(78);
			expect(result.data.wind).toEqual({ speed: 21, unit: 'km/h' });
			expect(result.data.high).toBe(16);
			expect(result.data.low).toBe(9);
			expect(result.data.sources).toEqual([
				{ name: 'Open-Meteo', temperature: 14.2 },
				{ name: 'MET Norway', temperature: 13.6 },
				{ name: 'wttr.in', temperature: 15 },
			]);
			expect(result.data.forecast).toEqual([
				{ label: 'Sat', high: 17, low: 10, icon: 'sun' },
				{ label: 'Sun', high: 15, low: 9, icon: 'cloud' },
			]);
		});

		it('gives a weather card without a comparison a single implicit source', () => {
			const result = lenientResultCardSchema.safeParse({
				type: 'weather',
				title: 'Berlin',
				location: 'Berlin',
				temperature: 3,
				unit: 'fahrenheit',
				condition: 'Snow',
			});
			expect(result.success).toBe(true);
			if (!result.success || result.data.type !== 'weather') return;
			expect(result.data.unit).toBe('F');
			expect(result.data.icon).toBe('snow');
			expect(result.data.sources).toEqual([{ name: 'Berlin', temperature: 3 }]);
		});

		it('passes already-valid cards through unchanged', () => {
			const card = {
				type: 'metric',
				title: 'Pipeline this month',
				tone: 'forest',
				value: '$48.2k',
				label: 'weighted pipeline',
				delta: { value: '+12%', direction: 'up', label: 'vs. last month' },
				breakdown: [
					{ label: 'Qualified', value: 5 },
					{ label: 'Proposal', value: 3 },
				],
			};
			const result = lenientResultCardSchema.safeParse(card);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data).toEqual(card);
		});
	});
});
