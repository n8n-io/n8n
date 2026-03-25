export type TimeComponents<T extends (number | bigint) = number> = {
	days: T;
	hours: T;
	minutes: T;
	seconds: T;
	milliseconds: T;
	microseconds: T;
	nanoseconds: T;
};

/**
Parse milliseconds into an object.

@example
```
import parseMilliseconds from 'parse-ms';

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
export default function parseMilliseconds<T extends number | bigint>(milliseconds: T): TimeComponents<T>;
