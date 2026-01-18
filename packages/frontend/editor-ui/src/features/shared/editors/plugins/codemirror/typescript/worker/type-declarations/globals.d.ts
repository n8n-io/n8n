export {};

import luxon from 'luxon';

declare global {
	const DateTime: typeof luxon.DateTime;
	type DateTime = luxon.DateTime;

	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console) */
	interface Console {
		/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/log_static) */
		log(...data: any[]): void;
	}

	var console: Console;
}
