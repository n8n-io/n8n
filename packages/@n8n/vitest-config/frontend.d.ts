import type { InlineConfig } from 'vitest/node';
import type { UserConfig } from 'vite';

export const createVitestConfig: (options?: InlineConfig) => UserConfig;

export const vitestConfig: UserConfig;
