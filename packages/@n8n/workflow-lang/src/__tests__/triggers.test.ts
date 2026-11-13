import { decodeModule } from '../compiler/decode.ts';
import { compile } from '../compiler/index.ts';
import { checkEvery, isKnownTimezone, parseCron } from '../compiler/triggers.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';

const wrap = (trigger: string, top = '') => `import { schedule, webhook, workflow } from '@n8n/workflow-lang';
${top}
export default workflow({
	triggers: [${trigger}],
	async run(ctx, trigger) {
		return trigger;
	},
});
`;

function metaTriggers(trigger: string): unknown {
	const result = compile(wrap(trigger));
	expect(result.diagnostics).toEqual([]);
	return JSON.parse(decodeModule(result.module ?? new Uint8Array()).meta).triggers;
}

function codes(trigger: string, top = ''): string[] {
	return compile(wrap(trigger, top)).diagnostics.map((d) => d.code);
}

describe('trigger META', () => {
	it('keeps the webhook output', () => {
		expect(metaTriggers("webhook({ path: 'p', method: 'GET' })")).toEqual([
			{ kind: 'webhook', path: 'p', method: 'GET' },
		]);
	});

	it('writes a cron schedule as written, with the default time zone', () => {
		expect(JSON.stringify(metaTriggers("schedule({ cron: '0 9 * * MON-FRI' })"))).toBe(
			'[{"kind":"schedule","cron":"0 9 * * MON-FRI","timezone":"UTC"}]',
		);
	});

	it('writes every with the optional keys in a fixed order', () => {
		const t = metaTriggers(
			"schedule({ timezone: 'Europe/Berlin', every: { onDayOfMonth: 3, atMinute: 5, value: 2, unit: 'months', atHour: 7 } })",
		);
		expect(JSON.stringify(t)).toBe(
			'[{"kind":"schedule","every":{"unit":"months","value":2,"atHour":7,"atMinute":5,"onDayOfMonth":3},"timezone":"Europe/Berlin"}]',
		);
	});

	it('writes several triggers as an array', () => {
		expect(
			JSON.stringify(
				metaTriggers(
					"schedule({ every: { unit: 'weeks', value: 1, onWeekdays: [1, 3] } }), schedule({ cron: '@daily' })",
				),
			),
		).toBe(
			'[{"kind":"schedule","every":{"unit":"weeks","value":1,"onWeekdays":[1,3]},"timezone":"UTC"},{"kind":"schedule","cron":"@daily","timezone":"UTC"}]',
		);
	});

	it('gives run the schedule event', async () => {
		const source = wrap("schedule({ cron: '*/5 * * * *' })");
		const fixture = { trigger: { scheduledAt: 1700000000000 }, now: 0, seed: 1, effects: {} };
		const expected = { status: 'ok', result: { scheduledAt: 1700000000000 }, effects: [] };
		expect(await runReference(source, fixture)).toEqual(expected);
		const result = compile(source);
		const out = runModule(decodeModule(result.module ?? new Uint8Array()), fixture);
		expect(JSON.stringify(out)).toBe(JSON.stringify(expected));
	});
});

describe('trigger diagnostics', () => {
	it.each([
		['WL050', 'webhook({ path: p })', "const p = 'x';"],
		['WL050', "webhook({ path: 'a' + 'b' })", ''],
		['WL050', "schedule({ every: { unit: 'hours', value: 1 + 1 } })", ''],
		['WL050', 'schedule({ cron: c })', "const c = '* * * * *';"],
		['WL050', 't', "const t = webhook({ path: 'x' });"],
		['WL051', 'schedule({})', ''],
		['WL051', "schedule({ cron: '* * * * *', every: { unit: 'hours', value: 1 } })", ''],
		['WL052', "schedule({ cron: '0 0 ? * *' })", ''],
		['WL052', "schedule({ cron: '0 0 30 2 *' })", ''],
		['WL053', "schedule({ every: { unit: 'hours', value: 24 } })", ''],
		['WL053', "schedule({ every: { unit: 'minutes', value: 5, atMinute: 3 } })", ''],
		['WL054', "schedule({ cron: '* * * * *', timezone: 'Mars/Olympus' })", ''],
	])('%s for %s', (code, trigger, top) => {
		expect(codes(trigger, top)).toContain(code);
	});

	it('points at the bad value and explains the cron error', () => {
		const source = wrap("schedule({ cron: '0 0 L * *' })");
		const [d] = compile(source).diagnostics;
		expect(d.code).toBe('WL052');
		expect(d.message).toMatch(/Unknown name "l"/);
		expect(source.slice(d.start, d.end)).toBe("'0 0 L * *'");
		expect(d.suggestion).not.toBe('');
	});
});

describe('parseCron', () => {
	const values = (expr: string) => parseCron(expr).map((s) => [...s].sort((a, b) => a - b));

	it('treats 5 fields as second 0', () => {
		expect(values('5 4 * * *')[0]).toEqual([0]);
		expect(values('7 5 4 * * *').slice(0, 3)).toEqual([[7], [5], [4]]);
	});

	it('expands presets', () => {
		expect(values('@weekdays')[5]).toEqual([1, 2, 3, 4, 5]);
		expect(values('@WEEKENDS')[5]).toEqual([0, 6]);
		expect(values('@yearly').slice(3, 5)).toEqual([[1], [1]]);
	});

	it('accepts month and weekday names in any case', () => {
		const v = values('0 0 1 JAN-mar mon,Fri');
		expect(v[4]).toEqual([1, 2, 3]);
		expect(v[5]).toEqual([1, 5]);
	});

	it('handles ranges, steps, lists and */S', () => {
		const v = values('0 */15 9-17/4 1,15 * *');
		expect(v[1]).toEqual([0, 15, 30, 45]);
		expect(v[2]).toEqual([9, 13, 17]);
		expect(v[3]).toEqual([1, 15]);
		expect(values('5/20 * * * *')[1]).toEqual([5, 25, 45]);
	});

	it('maps 7 to Sunday', () => {
		expect(values('0 0 * * 7')[5]).toEqual([0]);
		expect(values('0 0 * * 5-7')[5]).toEqual([0, 5, 6]);
	});

	it('accepts 29 February and a dead day of month when day of week is restricted', () => {
		expect(() => parseCron('0 0 29 2 *')).not.toThrow();
		expect(() => parseCron('0 0 31 2,4 mon')).not.toThrow();
	});

	it.each([
		['0 0 ? * *', /cannot be parsed/],
		['0 0 L * *', /Unknown name/],
		['0 0 * * monday', /Unknown name "day"/],
		['@reboot', /Unknown name/],
		['* * * *', /Too few fields/],
		['* * * * * * *', /Too many fields/],
		['*/0 * * * *', /step of zero/],
		['10-5 * * * *', /lower > upper/],
		['60 * * * *', /out of range/],
		['* 24 * * *', /out of range/],
		['* * 0 * *', /out of range/],
		['* * * 13 *', /out of range/],
		['* * * * 8', /out of range/],
		['1-* * * * *', /not at the start/],
		['1,,2 * * * *', /cannot be parsed/],
		['0 0 31 4,6 *', /never fires/],
		['0 0 30 feb *', /never fires/],
	])('rejects %s', (expr, reason) => {
		expect(() => parseCron(expr)).toThrow(reason);
	});
});

describe('checkEvery', () => {
	it.each([
		[{ unit: 'seconds', value: 1 }],
		[{ unit: 'seconds', value: 59 }],
		[{ unit: 'minutes', value: 59 }],
		[{ unit: 'hours', value: 23, atMinute: 59 }],
		[{ unit: 'days', value: 31, atHour: 23, atMinute: 0 }],
		[{ unit: 'weeks', value: 52, onWeekdays: [0, 6], atHour: 0 }],
		[{ unit: 'weeks', value: 1, onWeekdays: [] }],
		[{ unit: 'months', value: 18, onDayOfMonth: 31 }],
	])('accepts %j', (every) => {
		expect(checkEvery(every)).toBeNull();
	});

	it.each([
		[{ unit: 'years', value: 1 }, /Unknown unit/],
		[{ unit: 'seconds', value: 0 }, /1-59/],
		[{ unit: 'seconds', value: 60 }, /1-59/],
		[{ unit: 'minutes', value: 1.5 }, /integer/],
		[{ unit: 'hours', value: 24 }, /1-23/],
		[{ unit: 'days', value: 32 }, /1-31/],
		[{ unit: 'weeks', value: 0 }, />= 1/],
		[{ unit: 'months', value: -1 }, />= 1/],
		[{ unit: 'seconds', value: 5, atMinute: 1 }, /not allowed/],
		[{ unit: 'hours', value: 1, atHour: 1 }, /not allowed/],
		[{ unit: 'days', value: 1, onWeekdays: [1] }, /not allowed/],
		[{ unit: 'weeks', value: 1, onDayOfMonth: 1 }, /not allowed/],
		[{ unit: 'days', value: 1, atHour: 24 }, /0-23/],
		[{ unit: 'days', value: 1, atMinute: 60 }, /0-59/],
		[{ unit: 'weeks', value: 1, onWeekdays: [7] }, /0 \(Sunday\) to 6/],
		[{ unit: 'months', value: 1, onDayOfMonth: 0 }, /1-31/],
		[{ unit: 'hours', value: 1, at: 3 }, /Unknown key "at"/],
	])('rejects %j', (every, reason) => {
		expect(checkEvery(every)).toMatch(reason);
	});
});

describe('isKnownTimezone', () => {
	it.each(['UTC', 'Europe/Berlin', 'America/New_York', 'Etc/GMT+5'])('accepts %s', (tz) => {
		expect(isKnownTimezone(tz)).toBe(true);
	});

	it.each(['Mars/Olympus', '', 'Europe/Nowhere'])('rejects %j', (tz) => {
		expect(isKnownTimezone(tz)).toBe(false);
	});
});
