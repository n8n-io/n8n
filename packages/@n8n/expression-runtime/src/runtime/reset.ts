import { DateTime, IANAZone, Settings } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';
import { extendedFunctions } from '../extensions/function-extensions';

import { __sanitize } from './safe-globals';
import { createDeepLazyProxy } from './lazy-proxy';

// ============================================================================
// Reset Function for Data Proxies
// ============================================================================

/**
 * Reset workflow data proxies before each evaluation.
 *
 * This function is called from the bridge before executing each expression
 * to clear proxy caches and initialize fresh workflow data references.
 *
 * Pattern:
 * 1. Create lazy proxies for complex properties ($json, $binary, etc.)
 * 2. Fetch primitives directly ($runIndex, $itemIndex)
 * 3. Create function wrappers for callable properties ($items, etc.)
 * 4. Expose all properties to globalThis for expression access
 *
 * Called from bridge: context.evalSync('resetDataProxies()')
 */
export function resetDataProxies(timezone?: string): void {
	if (timezone && !IANAZone.isValidZone(timezone)) {
		throw new Error(`Invalid timezone: "${timezone}"`);
	}
	Settings.defaultZone = timezone ?? 'system';

	// Clear existing __data object
	globalThis.__data = {};

	// __sanitize must be on __data because PrototypeSanitizer generates:
	// obj[this.__sanitize(expr)] where 'this' is __data (via .call(__data) wrapping)
	globalThis.__data.__sanitize = __sanitize;

	// Verify callbacks are available
	// Note: ivm.Reference may not be typeof 'function', check for existence
	if (!globalThis.__getValueAtPath) {
		throw new Error('__getValueAtPath callback not registered');
	}

	// -------------------------------------------------------------------------
	// Create lazy proxies for complex workflow properties
	// -------------------------------------------------------------------------

	globalThis.__data.$json = createDeepLazyProxy(['$json']);
	globalThis.__data.$binary = createDeepLazyProxy(['$binary']);
	globalThis.__data.$input = createDeepLazyProxy(['$input']);
	globalThis.__data.$node = createDeepLazyProxy(['$node']);
	globalThis.__data.$parameter = createDeepLazyProxy(['$parameter']);
	globalThis.__data.$workflow = createDeepLazyProxy(['$workflow']);
	globalThis.__data.$prevNode = createDeepLazyProxy(['$prevNode']);
	globalThis.__data.$data = createDeepLazyProxy(['$data']);
	globalThis.__data.$env = createDeepLazyProxy(['$env']);

	// -------------------------------------------------------------------------
	// Create DateTime values inside the isolate (not lazy-loaded from host,
	// because host-side DateTime objects lose their prototype crossing the
	// boundary). The isolate has its own luxon with the correct timezone
	// already set via Settings.defaultZone above.
	// -------------------------------------------------------------------------

	globalThis.__data.$now = DateTime.now();
	globalThis.__data.$today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

	// -------------------------------------------------------------------------
	// Fetch primitives directly (no lazy loading needed for simple values)
	// -------------------------------------------------------------------------

	try {
		globalThis.__data.$runIndex = globalThis.__getValueAtPath.applySync(null, [['$runIndex']], {
			arguments: { copy: true },
			result: { copy: true },
		});
	} catch (error) {
		// Property doesn't exist - set to undefined
		globalThis.__data.$runIndex = undefined;
	}

	try {
		globalThis.__data.$itemIndex = globalThis.__getValueAtPath.applySync(null, [['$itemIndex']], {
			arguments: { copy: true },
			result: { copy: true },
		});
	} catch (error) {
		// Property doesn't exist - set to undefined
		globalThis.__data.$itemIndex = undefined;
	}

	// -------------------------------------------------------------------------
	// Expose workflow data to globalThis for expression access
	// -------------------------------------------------------------------------

	globalThis.$json = globalThis.__data.$json;
	globalThis.$binary = globalThis.__data.$binary;
	globalThis.$input = globalThis.__data.$input;
	globalThis.$node = globalThis.__data.$node;
	globalThis.$parameter = globalThis.__data.$parameter;
	globalThis.$workflow = globalThis.__data.$workflow;
	globalThis.$prevNode = globalThis.__data.$prevNode;
	globalThis.$runIndex = globalThis.__data.$runIndex as number | undefined;
	globalThis.$itemIndex = globalThis.__data.$itemIndex as number | undefined;
	globalThis.$data = globalThis.__data.$data;
	globalThis.$env = globalThis.__data.$env;
	globalThis.$now = globalThis.__data.$now as DateTime;
	globalThis.$today = globalThis.__data.$today as DateTime;

	// Expose standalone functions (min, max, average, numberList, zip, $ifEmpty, etc.)
	Object.assign(globalThis.__data, extendedFunctions);

	// -------------------------------------------------------------------------
	// Handle function properties (check if value is function metadata)
	// -------------------------------------------------------------------------

	// Check if $items exists and is a function
	if (globalThis.__callFunctionAtPath) {
		try {
			const itemsValue = globalThis.__getValueAtPath.applySync(null, [['$items']], {
				arguments: { copy: true },
				result: { copy: true },
			});

			// If it's function metadata, create wrapper
			if (itemsValue && typeof itemsValue === 'object' && itemsValue.__isFunction) {
				globalThis.$items = function (...args: unknown[]) {
					return globalThis.__callFunctionAtPath.applySync(null, [['$items'], ...args], {
						arguments: { copy: true },
						result: { copy: true },
					});
				};
				globalThis.__data.$items = globalThis.$items;
			} else {
				// Not a function - set to undefined or the value itself
				globalThis.$items = itemsValue;
				globalThis.__data.$items = itemsValue;
			}
		} catch (error) {
			// Property doesn't exist
			globalThis.$items = undefined;
			globalThis.__data.$items = undefined;
		}
	}

	// -------------------------------------------------------------------------
	// Expose globals on __data so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly (tournament checks __data before global)
	// -------------------------------------------------------------------------

	globalThis.__data.DateTime = globalThis.DateTime;

	// Expose extend/extendOptional on __data so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly when the VM checks __data first
	globalThis.__data.extend = extend;
	globalThis.__data.extendOptional = extendOptional;

	// TODO: Add other function properties as needed ($item, $vars, etc.)
}
