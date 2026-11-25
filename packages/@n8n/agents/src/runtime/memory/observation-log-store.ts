import type {
	BuiltMemory,
	BuiltObservationLogStore,
	BuiltObservationLogTaskLockStore,
} from '../../types';
import type { ObservationLogObserverMemory } from './observation-log-observer';

const OBSERVATION_LOG_STORE_METHODS = [
	'commitObservationLogBatch',
	'appendObservationLogEntries',
	'getActiveObservationLog',
	'getObservationLog',
	'dropObservationLogEntries',
	'supersedeObservationLogEntries',
	'applyObservationLogReflection',
] as const satisfies ReadonlyArray<keyof BuiltObservationLogStore>;

const OBSERVATION_LOG_TASK_LOCK_STORE_METHODS = [
	'acquireObservationLogTaskLock',
	'releaseObservationLogTaskLock',
] as const satisfies ReadonlyArray<keyof BuiltObservationLogTaskLockStore>;

export function hasFunctionProperty<K extends PropertyKey>(
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

const OBSERVER_MEMORY_METHODS = [
	'getMessagesForObservationScope',
	'getCursor',
	'getResumeState',
	'saveResumeState',
] as const satisfies ReadonlyArray<keyof ObservationLogObserverMemory>;

/** A store the Observer can run on: the log plus the cursor, scope reads and resume state. */
export function hasObservationLogObserverMemory(
	memory: BuiltMemory,
): memory is ObservationLogObserverMemory {
	return (
		hasObservationLogStore(memory) &&
		OBSERVER_MEMORY_METHODS.every((method) => hasFunctionProperty(memory, method))
	);
}

/** Observational memory needs the full Observer store; reject a partial one at config time. */
export function assertObservationalMemoryStore(
	memory: BuiltMemory | undefined,
): asserts memory is ObservationLogObserverMemory {
	if (memory && hasObservationLogObserverMemory(memory)) return;
	throw new Error(
		'Observational memory requires a storage backend that implements BuiltObservationLogStore, BuiltObservationResumeStore, getCursor and getMessagesForObservationScope.',
	);
}

export function hasObservationLogTaskLockStore(
	memory: BuiltMemory,
): memory is BuiltMemory & BuiltObservationLogTaskLockStore {
	return OBSERVATION_LOG_TASK_LOCK_STORE_METHODS.every((method) =>
		hasFunctionProperty(memory, method),
	);
}
