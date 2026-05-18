import type { BuiltMemory, BuiltObservationLogStore } from '../types';

const OBSERVATION_LOG_STORE_METHODS = [
	'appendObservationLogEntries',
	'getActiveObservationLog',
	'getObservationLog',
	'dropObservationLogEntries',
	'supersedeObservationLogEntries',
	'applyObservationLogReflection',
] as const satisfies ReadonlyArray<keyof BuiltObservationLogStore>;

function hasFunctionProperty<K extends PropertyKey>(
	value: object,
	property: K,
): value is Record<K, (...args: never[]) => unknown> {
	return property in value && typeof Reflect.get(value, property) === 'function';
}

export function hasObservationLogStore(
	memory: BuiltMemory,
): memory is BuiltMemory & BuiltObservationLogStore {
	return OBSERVATION_LOG_STORE_METHODS.every((method) => hasFunctionProperty(memory, method));
}
