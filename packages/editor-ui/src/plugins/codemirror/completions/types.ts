import { resolveParameter } from '@/mixins/workflowHelpers';

export type Resolved = ReturnType<typeof resolveParameter>;

export type ExtensionTypeName = 'number' | 'string' | 'date' | 'array' | 'object';
