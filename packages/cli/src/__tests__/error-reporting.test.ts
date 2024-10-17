import { QueryFailedError } from '@n8n/typeorm';
import { AxiosError } from 'axios';
import { mock } from 'jest-mock-extended';
import { ApplicationError } from 'n8n-workflow';

import { ErrorReporting } from '../error-reporting';

describe('ErrorReporting', () => {
	const errorReporting = new ErrorReporting(mock(), mock());

	describe('beforeSend', () => {
		it('should return null if originalException is an AxiosError', () => {
			const hint = { originalException: new AxiosError() };
			expect(errorReporting.beforeSend(mock(), hint)).toBeNull();
		});

		it('should return null if originalException is a QueryFailedError with SQLITE_FULL or SQLITE_IOERR message', () => {
			const hint = {
				originalException: new QueryFailedError('', [], new Error('SQLITE_FULL error')),
			};
			expect(errorReporting.beforeSend(mock(), hint)).toBeNull();

			hint.originalException = new QueryFailedError('', [], new Error('SQLITE_IOERR error'));
			expect(errorReporting.beforeSend(mock(), hint)).toBeNull();
		});

		it('should return null if originalException is an ApplicationError with level warning', () => {
			const hint = { originalException: new ApplicationError('Test error', { level: 'warning' }) };
			expect(errorReporting.beforeSend(mock(), hint)).toBeNull();
		});

		it('should return event if originalException is an ApplicationError with level error', () => {
			const hint = { originalException: new ApplicationError('Test error', { level: 'error' }) };
			expect(errorReporting.beforeSend(mock(), hint)).not.toBeNull();
		});

		it('should return null if originalException is an Error with a non-unique stack', () => {
			const hint = { originalException: new Error('Test error') };
			errorReporting.beforeSend(mock(), hint);
			expect(errorReporting.beforeSend(mock(), hint)).toBeNull();
		});

		it('should return event if originalException is an Error with a unique stack', () => {
			const hint = { originalException: new Error('Test error') };
			expect(errorReporting.beforeSend(mock(), hint)).not.toBeNull();
		});
	});
});
