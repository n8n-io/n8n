export {};

import luxon from 'luxon';

declare global {
	const DateTime: typeof luxon.DateTime;
	type DateTime = luxon.DateTime;
}
