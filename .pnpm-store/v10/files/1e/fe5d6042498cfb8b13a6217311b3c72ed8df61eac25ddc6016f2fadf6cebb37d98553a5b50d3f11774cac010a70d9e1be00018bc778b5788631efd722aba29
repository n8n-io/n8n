const toZeroIfInfinity = value => Number.isFinite(value) ? value : 0;

function parseNumber(milliseconds) {
	return {
		days: Math.trunc(milliseconds / 86_400_000),
		hours: Math.trunc(milliseconds / 3_600_000 % 24),
		minutes: Math.trunc(milliseconds / 60_000 % 60),
		seconds: Math.trunc(milliseconds / 1000 % 60),
		milliseconds: Math.trunc(milliseconds % 1000),
		microseconds: Math.trunc(toZeroIfInfinity(milliseconds * 1000) % 1000),
		nanoseconds: Math.trunc(toZeroIfInfinity(milliseconds * 1e6) % 1000),
	};
}

function parseBigint(milliseconds) {
	return {
		days: milliseconds / 86_400_000n,
		hours: milliseconds / 3_600_000n % 24n,
		minutes: milliseconds / 60_000n % 60n,
		seconds: milliseconds / 1000n % 60n,
		milliseconds: milliseconds % 1000n,
		microseconds: 0n,
		nanoseconds: 0n,
	};
}

export default function parseMilliseconds(milliseconds) {
	switch (typeof milliseconds) {
		case 'number': {
			if (Number.isFinite(milliseconds)) {
				return parseNumber(milliseconds);
			}

			break;
		}

		case 'bigint': {
			return parseBigint(milliseconds);
		}

		// No default
	}

	throw new TypeError('Expected a finite number or bigint');
}
