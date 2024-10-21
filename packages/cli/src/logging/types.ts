import type { LogScope } from '@n8n/config';

import type { LOG_LEVELS } from './constants';

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogMetadata = {
	[key: string]: unknown;
	scope?: LogScope;
	file?: string;
	function?: string;
};

export type LogLocationMetadata = Pick<LogMetadata, 'file' | 'function'>;
