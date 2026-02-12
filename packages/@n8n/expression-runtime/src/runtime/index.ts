import { DateTime, Duration, Interval } from 'luxon';
import * as lodash from 'lodash';

// Augment globalThis with our runtime properties
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace globalThis {
		// eslint-disable-next-line no-var
		var $json: Record<string, unknown>;
		// eslint-disable-next-line no-var
		var $items: Array<{ json: Record<string, unknown> }>;
		// eslint-disable-next-line no-var
		var $input: any;
		// eslint-disable-next-line no-var
		var $: Record<string, unknown>;
		// eslint-disable-next-line no-var
		// var _: typeof import('lodash'); // TODO: Fix duplicate identifier issue
		// eslint-disable-next-line no-var
		var DateTime: typeof import('luxon').DateTime;
		// eslint-disable-next-line no-var
		var Duration: typeof import('luxon').Duration;
		// eslint-disable-next-line no-var
		var Interval: typeof import('luxon').Interval;
		// eslint-disable-next-line no-var
		var __n8nExecute: (code: string, data: any) => unknown;
	}
}

// Setup workflow data globals
const setupGlobals = (data: any) => {
	globalThis.$json = data.$json || {};
	globalThis.$items = data.$items || [];
	globalThis.$input = data.$input || {};
	globalThis.$ = globalThis.$json;

	// Libraries
	// @ts-ignore - _ is assigned to globalThis for expression runtime
	globalThis._ = lodash;
	globalThis.DateTime = DateTime;
	globalThis.Duration = Duration;
	globalThis.Interval = Interval;
};

// Entry point called by bridge
globalThis.__n8nExecute = function (code: string, data: any) {
	setupGlobals(data);
	return eval(code); // Safe inside isolated context
};
