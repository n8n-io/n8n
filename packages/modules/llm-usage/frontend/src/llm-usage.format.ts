// The formatters are created once: creating one per call costs about 70 µs.
const usdFormat = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 4,
});
const smallUsdFormat = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumSignificantDigits: 2,
});
const compactFormat = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1,
});
const secondsFormat = new Intl.NumberFormat('en-US', {
	style: 'unit',
	unit: 'second',
	unitDisplay: 'short',
	maximumFractionDigits: 1,
});
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'medium',
	timeStyle: 'short',
	hourCycle: 'h23',
});
const utcDayFormat = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC',
});

/** A cost in US dollars. Below a cent it keeps significant digits: a call can cost far less. */
export const formatUsd = (value: number) =>
	value !== 0 && Math.abs(value) < 0.01 ? smallUsdFormat.format(value) : usdFormat.format(value);
export const formatCount = (value: number) => value.toLocaleString('en-US');
export const formatCompact = (value: number) => compactFormat.format(value);
export const formatSeconds = (ms: number) => secondsFormat.format(ms / 1000);
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
/** A UTC day, `YYYY-MM-DD`, as the chart labels it. */
export const formatUtcDay = (date: string) => utcDayFormat.format(new Date(`${date}T00:00:00Z`));
