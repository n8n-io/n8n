import { DateTime } from 'luxon';

/** Native Date captured at module load — must not be replaced when we override globalThis.Date. */
const NativeDate = Date;

/**
 * Local (non-UTC) Date getters that depend on the runtime timezone.
 * Overridden so expression evaluation uses the workflow timezone instead of
 * the isolate/OS timezone.
 */
function luxonParts(date: Date, timezone: string) {
	// Use getTime() (UTC millis) — not fromJSDate — so luxon never calls
	// overridden local getters like getTimezoneOffset (which would recurse).
	return DateTime.fromMillis(date.getTime(), { zone: timezone });
}

function applyLocalGetters(instance: Date, timezone: string): void {
	instance.getFullYear = () => luxonParts(instance, timezone).year;
	instance.getMonth = () => luxonParts(instance, timezone).month - 1;
	instance.getDate = () => luxonParts(instance, timezone).day;
	// Luxon weekday: Mon=1 … Sun=7; JS getDay: Sun=0 … Sat=6
	instance.getDay = () => luxonParts(instance, timezone).weekday % 7;
	instance.getHours = () => luxonParts(instance, timezone).hour;
	instance.getMinutes = () => luxonParts(instance, timezone).minute;
	instance.getSeconds = () => luxonParts(instance, timezone).second;
	instance.getMilliseconds = () => luxonParts(instance, timezone).millisecond;
	instance.getTimezoneOffset = () => -luxonParts(instance, timezone).offset;
}

/**
 * Returns a Date constructor whose instances use `timezone` for local getters
 * (getHours, getDate, …) while preserving UTC methods and absolute time.
 */
export function createTimezoneAwareDateConstructor(timezone: string): DateConstructor {
	function TimezoneAwareDate(
		valueOrYear?: string | number | Date,
		monthIndex?: number,
		date?: number,
		hours?: number,
		minutes?: number,
		seconds?: number,
		ms?: number,
	): Date {
		let instance: Date;
		if (arguments.length === 0) {
			instance = new NativeDate();
		} else if (arguments.length === 1) {
			instance = new NativeDate(valueOrYear as string | number | Date);
		} else {
			// Multi-arg Date constructor uses local wall time — interpret in workflow TZ
			instance = DateTime.fromObject(
				{
					year: valueOrYear as number,
					month: (monthIndex as number) + 1,
					day: date ?? 1,
					hour: hours ?? 0,
					minute: minutes ?? 0,
					second: seconds ?? 0,
					millisecond: ms ?? 0,
				},
				{ zone: timezone },
			).toJSDate();
		}

		applyLocalGetters(instance, timezone);
		// Returning an object from a constructor replaces the default `this`.
		return instance;
	}

	TimezoneAwareDate.prototype = NativeDate.prototype;
	TimezoneAwareDate.now = NativeDate.now.bind(NativeDate);
	TimezoneAwareDate.parse = NativeDate.parse.bind(NativeDate);
	TimezoneAwareDate.UTC = NativeDate.UTC.bind(NativeDate);

	return TimezoneAwareDate as unknown as DateConstructor;
}
