import type { Logger } from '@n8n/backend-common';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

export const mockLogger = (): Logger =>
	mock<Logger>({ scoped: vi.fn().mockReturnValue(mock<Logger>()) });

export * from './random';
export * as testDb from './test-db';
export * as testModules from './test-modules';
export * from './db/workflows';
export * from './db/projects';
export * from './mocking';
export * from './migration-test-helpers';
