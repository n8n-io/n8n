export type Options = {
	/**
	Number of digits to appear after the seconds decimal point.

	@default 1
	*/
	readonly secondsDecimalDigits?: number;

	/**
	Number of digits to appear after the milliseconds decimal point.

	Useful in combination with [`process.hrtime()`](https://nodejs.org/api/process.html#process_process_hrtime).

	@default 0
	*/
	readonly millisecondsDecimalDigits?: number;

	/**
	Keep milliseconds on whole seconds: `13s` → `13.0s`.

	Useful when you are showing a number of seconds spent on an operation and don't want the width of the output to change when hitting a whole number.

	@default false
	*/
	readonly keepDecimalsOnWholeSeconds?: boolean;

	/**
	Only show the first unit: `1h 10m` → `1h`.

	Also ensures that `millisecondsDecimalDigits` and `secondsDecimalDigits` are both set to `0`.

	@default false
	*/
	readonly compact?: boolean;

	/**
	Number of units to show. Setting `compact` to `true` overrides this option.

	@default Infinity
	*/
	readonly unitCount?: number;

	/**
	Use full-length units: `5h 1m 45s` → `5 hours 1 minute 45 seconds`.

	@default false
	*/
	readonly verbose?: boolean;

	/**
	Show milliseconds separately. This means they won't be included in the decimal part of the seconds.

	@default false
	*/
	readonly separateMilliseconds?: boolean;

	/**
	Show microseconds and nanoseconds.

	@default false
	*/
	readonly formatSubMilliseconds?: boolean;

	/**
	Display time using colon notation: `5h 1m 45s` → `5:01:45`. Always shows time in at least minutes: `1s` → `0:01`

	Useful when you want to display time without the time units, similar to a digital watch.

	Setting `colonNotation` to `true` overrides the following options to `false`:
	- `compact`
	- `formatSubMilliseconds`
	- `separateMilliseconds`
	- `verbose`

	@default false
	*/
	readonly colonNotation?: boolean;

	/**
	Hides the year and shows the hidden year additionally as days (365 per year): `1y 3d 5h 1m 45s` → `368d 5h 1m 45s`.

	@default false
	*/
	readonly hideYear?: boolean;

	/**
	Hides the year and days and shows the hidden values additionally as hours: `1y 3d 5h 1m 45s` → `8837h 1m 45s`.

	@default false
	*/
	readonly hideYearAndDays?: boolean;

	/**
	Hides the seconds: `1y 3d 5h 1m 45s` → `1y 3d 5h 1m`.

	@default false
	*/
	readonly hideSeconds?: boolean;

	/**
	Show sub-second values as decimal seconds: `900ms` → `0.9s`.

	Useful for progress indicators where you want consistent unit format to prevent flickering.

	@default false
	*/
	readonly subSecondsAsDecimals?: boolean;
};

/**
Convert milliseconds to a human readable string: `1337000000` → `15d 11h 23m 20s`.

@param milliseconds - Milliseconds to humanize.

@example
```
import prettyMilliseconds from 'pretty-ms';

prettyMilliseconds(1337000000);
//=> '15d 11h 23m 20s'

prettyMilliseconds(1337);
//=> '1.3s'

prettyMilliseconds(133);
//=> '133ms'

// `compact` option
prettyMilliseconds(1337, {compact: true});
//=> '1s'

// `verbose` option
prettyMilliseconds(1335669000, {verbose: true});
//=> '15 days 11 hours 1 minute 9 seconds'

// `colonNotation` option
prettyMilliseconds(95500, {colonNotation: true});
//=> '1:35.5'

// `formatSubMilliseconds` option
prettyMilliseconds(100.400080, {formatSubMilliseconds: true})
//=> '100ms 400µs 80ns'

// `subSecondsAsDecimals` option
prettyMilliseconds(900, {subSecondsAsDecimals: true});
//=> '0.9s'

// Can be useful for time durations
prettyMilliseconds(new Date(2014, 0, 1, 10, 40) - new Date(2014, 0, 1, 10, 5))
//=> '35m'
```
*/
export default function prettyMilliseconds(
	milliseconds: number | bigint,
	options?: Options
): string;

