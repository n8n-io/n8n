import type { NamedDebugLogScope } from './types';

export const noOp = () => {};

export const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'silent'] as const;

export const NAMED_DEBUG_LOG_SCOPES: NamedDebugLogScope[] = ['n8n:concurrency', 'n8n:license'];

export const DEBUG_LOG_SCOPES = ['', '*', 'n8n:*', ...NAMED_DEBUG_LOG_SCOPES] as const;
