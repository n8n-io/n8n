import type { BuiltMemory, BuiltObservationStore } from '../types';

const OBSERVATION_STORE_METHODS = [
	'appendObservations',
	'getObservations',
	'getMessagesForScope',
	'deleteObservations',
	'getCursor',
	'setCursor',
	'acquireObservationLock',
	'releaseObservationLock',
] as const satisfies ReadonlyArray<keyof BuiltObservationStore>;

function hasFunctionProperty<K extends PropertyKey>(
	value: object,
	property: K,
): value is Record<K, (...args: never[]) => unknown> {
	return property in value && typeof Reflect.get(value, property) === 'function';
}

export function hasObservationStore(
	memory: BuiltMemory,
): memory is BuiltMemory & BuiltObservationStore {
	return OBSERVATION_STORE_METHODS.every((method) => hasFunctionProperty(memory, method));
}
