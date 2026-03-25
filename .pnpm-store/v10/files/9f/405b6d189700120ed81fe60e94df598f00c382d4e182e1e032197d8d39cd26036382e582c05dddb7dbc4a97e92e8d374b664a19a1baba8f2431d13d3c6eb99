declare namespace parseMilliseconds {
	interface Parsed {
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
		milliseconds: number;
		microseconds: number;
		nanoseconds: number;
	}
}

/**
Parse milliseconds into an object.

@example
```
import parseMilliseconds = require('parse-ms');

parseMilliseconds(1337000001);
// {
// 	days: 15,
// 	hours: 11,
// 	minutes: 23,
// 	seconds: 20,
// 	milliseconds: 1,
// 	microseconds: 0,
// 	nanoseconds: 0
// }
```
*/
declare function parseMilliseconds(
	milliseconds: number
): parseMilliseconds.Parsed;

export = parseMilliseconds;
