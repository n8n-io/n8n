import { DateTime, Duration, Interval } from 'luxon';
import * as lodash from 'lodash';

// Augment globalThis with runtime properties
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace globalThis {
		// eslint-disable-next-line no-var
		var __workflowData: Record<string, unknown>; // Passed from bridge context
		// eslint-disable-next-line no-var
		var __n8nExecute: (code: string) => unknown;
		// Note: _ causes duplicate identifier error, will be assigned without type declaration
		// eslint-disable-next-line no-var
		var DateTime: typeof import('luxon').DateTime;
		// eslint-disable-next-line no-var
		var Duration: typeof import('luxon').Duration;
		// eslint-disable-next-line no-var
		var Interval: typeof import('luxon').Interval;
	}
}

// Setup libraries once
// @ts-ignore - _ is assigned to globalThis for expression runtime
globalThis._ = lodash;
globalThis.DateTime = DateTime;
globalThis.Duration = Duration;
globalThis.Interval = Interval;

// Entry point called by bridge
globalThis.__n8nExecute = function (code: string) {
	// Expose workflow data properties as globals
	// Access __workflowData which was passed via VM context
	const data = globalThis.__workflowData;

	// Spread all properties from the workflow data proxy onto globalThis
	// This includes $json, $input, $items, $node, $workflow, functions like $(), etc.
	for (const key in data) {
		if (Object.prototype.hasOwnProperty.call(data, key)) {
			(globalThis as any)[key] = data[key];
		}
	}

	return eval(code); // Safe inside isolated context
};
