import type { LOG_LEVELS } from './constants';

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogLocationMetadata = Partial<{ file: string; function: string }>;

export type LogMetadata = Record<string, unknown> | Error;
