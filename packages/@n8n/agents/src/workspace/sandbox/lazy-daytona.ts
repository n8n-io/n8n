import type * as DaytonaSdk from '@daytona/sdk';

let _daytonaMod: typeof DaytonaSdk | undefined;

export function loadDaytona(): typeof DaytonaSdk {
	if (!_daytonaMod) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('@daytona/sdk') as typeof DaytonaSdk;
		_daytonaMod = mod;
	}
	return _daytonaMod;
}
