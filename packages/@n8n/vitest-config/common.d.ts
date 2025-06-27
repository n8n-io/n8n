import type { CoverageV8Options } from 'vitest/node';
import type { UserConfig } from 'vite';

export const coverage: CoverageV8Options;

export const enableCoverage: (vitestConfig: UserConfig) => void;
