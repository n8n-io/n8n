import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

export const mockLogger = (): Logger =>
	mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });
