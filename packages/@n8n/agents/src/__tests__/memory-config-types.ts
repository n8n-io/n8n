import type {
	BuiltMemory,
	MemoryConfig,
	ObservationCapableMemory,
	ObservationalMemoryConfig,
} from '../types';

type AssertMemoryConfig<T extends MemoryConfig> = T;

type PlainMemoryConfig = AssertMemoryConfig<{
	memory: BuiltMemory;
}>;

type ObservationCapableMemoryConfig = AssertMemoryConfig<{
	memory: ObservationCapableMemory;
	observationalMemory: ObservationalMemoryConfig;
}>;

// @ts-expect-error Observational memory requires a backend that also implements BuiltObservationLogStore.
type InvalidObservationalMemoryConfig = AssertMemoryConfig<{
	memory: BuiltMemory;
	observationalMemory: ObservationalMemoryConfig;
}>;

export type { InvalidObservationalMemoryConfig, ObservationCapableMemoryConfig, PlainMemoryConfig };
