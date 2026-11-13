/**
 * `Date.zoneOffset(zone, t)` of spec section 4.5 for the bytecode VM and the
 * reference runner, from the zone data of the ICU of Node.js. The runtime
 * reads TZif files instead (`workflow-runtime/src/core/tz.zig`).
 */
/** `Date.zoneOffset(zone, t)`: minutes from UTC, from the zone data of the ICU of Node.js. */
export function zoneOffset(zone: string, t: number): number {
	if (Number.isNaN(t)) return Number.NaN;
	if (zone === 'UTC' || zone === 'Etc/UTC') return 0;
	let f: Intl.DateTimeFormat;
	try {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
		});
	} catch {
		// oxlint-disable-next-line typescript/only-throw-error -- workflow errors are plain { name, message } objects.
		throw { name: 'RangeError', message: `Invalid time zone specified: ${zone}` };
	}
	const secs = Math.floor(t / 1000) * 1000;
	const p: Record<string, number> = {};
	for (const part of f.formatToParts(secs))
		if (part.type !== 'literal') p[part.type] = Number(part.value);
	const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	return (local - secs) / 60000;
}
