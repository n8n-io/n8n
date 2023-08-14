import type { resolveParameter } from '@/mixins/workflowHelpers';
import type { DocMetadata } from 'n8n-workflow';

export type Resolved = ReturnType<typeof resolveParameter>;

export type ExtensionTypeName = 'number' | 'string' | 'date' | 'array' | 'object';

export type FnToDoc = { [fnName: string]: { doc?: DocMetadata } };

export type FunctionOptionType = 'native-function' | 'extension-function';
export type KeywordOptionType = 'keyword';
export type AutocompleteOptionType = FunctionOptionType | KeywordOptionType;
