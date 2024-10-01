import type { LOG_LEVELS, DEBUG_LOG_SCOPES } from './constants';

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogLocationMetadata = Partial<{ file: string; function: string }>;

export type LogMetadata = Record<string, unknown> | Error;

export type NamedDebugLogScope = 'n8n:concurrency' | 'n8n:license';

export type DebugLogScope = (typeof DEBUG_LOG_SCOPES)[number];
