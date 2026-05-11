import type {
	BuiltMemory,
	MemoryConfig,
	ObservationCapableMemory,
	ObservationalMemoryConfig,
} from '../types';

type AssertMemoryConfig<T extends MemoryConfig> = T;

type PlainMemoryConfig = AssertMemoryConfig<{
	memory: BuiltMemory;
	lastMessages: 10;
}>;

type ObservationCapableMemoryConfig = AssertMemoryConfig<{
	memory: ObservationCapableMemory;
	lastMessages: 10;
	observationalMemory: ObservationalMemoryConfig;
}>;

// @ts-expect-error Observational memory requires a backend that also implements BuiltObservationStore.
type InvalidObservationalMemoryConfig = AssertMemoryConfig<{
	memory: BuiltMemory;
	lastMessages: 10;
	observationalMemory: ObservationalMemoryConfig;
}>;

export type { InvalidObservationalMemoryConfig, ObservationCapableMemoryConfig, PlainMemoryConfig };
