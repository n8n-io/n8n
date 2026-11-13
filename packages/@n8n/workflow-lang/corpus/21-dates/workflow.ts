/** The Date subset: construction, parsing, getters, setters, formats and escapes. */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Input {
	times: number[];
	texts: string[];
	parts: number[][];
}

export default workflow({
	triggers: [webhook<Input>({ path: 'dates' })],
	async run(ctx, trigger) {
		const describe = (d: Date) => ({
			time: d.getTime(),
			value: d.valueOf(),
			json: d.toJSON(),
			string: d.toString(),
			utc: d.toUTCString(),
			gmt: d.toGMTString(),
			date: d.toDateString(),
			clock: d.toTimeString(),
			locale: d.toLocaleString(),
			localeDate: d.toLocaleDateString('en-US'),
			localeTime: d.toLocaleTimeString(),
			local: [
				d.getFullYear(),
				d.getMonth(),
				d.getDate(),
				d.getDay(),
				d.getHours(),
				d.getMinutes(),
				d.getSeconds(),
				d.getMilliseconds(),
				d.getTimezoneOffset(),
			],
			utcParts: [
				d.getUTCFullYear(),
				d.getUTCMonth(),
				d.getUTCDate(),
				d.getUTCDay(),
				d.getUTCHours(),
				d.getUTCMinutes(),
				d.getUTCSeconds(),
				d.getUTCMilliseconds(),
			],
		});
		const iso = (d: Date): string | null => {
			try {
				return d.toISOString();
			} catch (e) {
				return `${e.name}: ${e.message}`;
			}
		};

		const fromTimes = trigger.body.times.map((ms) => {
			const d = new Date(ms);
			return { ms, iso: iso(d), ...describe(d) };
		});
		const parsed = trigger.body.texts.map((text) => ({
			text,
			parse: Date.parse(text),
			iso: iso(new Date(text)),
		}));
		const built = trigger.body.parts.map((p) => {
			const d =
				p.length === 2
					? new Date(p[0], p[1])
					: p.length === 3
						? new Date(p[0], p[1], p[2])
						: new Date(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
			return { p, local: iso(d), utc: Date.UTC(p[0], p[1], p[2], p[3], p[4], p[5], p[6]) };
		});

		// Setters change the variable and return the new time value.
		const s = new Date(Date.UTC(2024, 1, 29, 12, 30, 45, 678));
		const steps = [
			s.setFullYear(2025),
			s.setMonth(13, 31),
			s.setDate(0),
			s.setHours(25, 61, 61, 1001),
			s.setMinutes(-1),
			s.setSeconds(90, 5),
			s.setMilliseconds(-1),
			s.setUTCFullYear(1969, 11, 31),
			s.setUTCMonth(0),
			s.setUTCDate(15),
			s.setUTCHours(0, 0, 0, 0),
			s.setUTCMinutes(30),
			s.setUTCSeconds(15),
			s.setUTCMilliseconds(999),
			s.setTime(8.64e15 + 1),
			s.setHours(1),
			s.setFullYear(2000),
		];
		const shifted = new Date(s.getTime());
		const bump = () => shifted.setUTCDate(shifted.getUTCDate() + 1);
		bump();
		bump();

		// The batch clock: new Date() and Date.now() replay.
		const start = new Date();
		await ctx.wait({ name: 'Pause', duration: 90_000 });
		const later = Date.now();
		const elapsed = later - start.getTime();
		const before = start < new Date(later);

		const bad = new Date('not a date');
		const maybe: Date | undefined = trigger.body.times.length > 100 ? new Date(0) : undefined;
		await ctx.http({
			name: 'Report',
			method: 'POST',
			url: 'https://api.example.com/dates',
			body: { at: start, bad, list: [start, bad], maybe, label: `at ${start}` },
		});

		return {
			fromTimes,
			parsed,
			built,
			steps,
			after: s,
			shifted: shifted.toISOString(),
			elapsed,
			before,
			escapes: {
				object: { start },
				array: [start, bad],
				stringify: JSON.stringify(start),
				stringifyBad: JSON.stringify({ bad }),
				template: `start=${start}`,
				plus: 'start=' + start,
				string: String(bad),
				number: Number(start) + 1,
				unary: +start,
				maybe: `${maybe}`,
				maybeJson: maybe ?? start,
				invalidTime: bad.getTime(),
				invalidParts: [bad.getFullYear(), bad.getUTCDay(), bad.getTimezoneOffset()],
				invalidText: [bad.toString(), bad.toUTCString(), bad.toLocaleString(), bad.toJSON()],
				utcEdge: [
					Date.UTC(99),
					Date.UTC(100, 0),
					Date.UTC(-1, 0),
					Date.UTC(275760, 8, 13, 0, 0, 0, 1),
				],
				invalidSet: [bad.setHours(1), bad.getTime()],
			},
		};
	},
});
