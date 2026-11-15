import { BaseError } from '../base.error';
import { OperationalError } from '../operational.error';

describe('OperationalError', () => {
	it('should be an instance of OperationalError', () => {
		const error = new OperationalError('test');
		expect(error).toBeInstanceOf(OperationalError);
	});

	it('should be an instance of BaseError', () => {
		const error = new OperationalError('test');
		expect(error).toBeInstanceOf(BaseError);
	});

	it('should set name to the class name', () => {
		const error = new OperationalError('test');
		expect(error.name).toBe('OperationalError');
	});

	it('should have correct defaults', () => {
		const error = new OperationalError('test');
		expect(error.level).toBe('warning');
		expect(error.shouldReport).toBe(false);
	});

	it('should allow overriding the default level and shouldReport', () => {
		const error = new OperationalError('test', { level: 'error', shouldReport: true });
		expect(error.level).toBe('error');
		expect(error.shouldReport).toBe(true);
	});
});
