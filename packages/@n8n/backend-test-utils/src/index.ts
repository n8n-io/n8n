import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

export const mockLogger = (): Logger =>
	mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });

export * from './random';
export * as testDb from './test-db';
export * as testModules from './test-modules';
export * from './db/workflows';
export * from './db/projects';
export * from './mocking';
