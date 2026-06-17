import { ExecutionError } from '../ExecutionError';

describe('ExecutionError', () => {
	describe('constructor', () => {
		it('should set message to "Unknown error" when stack is empty', () => {
			const error = new Error('test');
			error.stack = '';
			const executionError = new ExecutionError(error);
			expect(executionError.message).toBe('Unknown error');
		});

		it('should extract error details and type from stack', () => {
			const error = new Error('ErrorType: Error Details');
			error.stack = 'Error: ErrorType: Error Details\n    at Code:123';
			const executionError = new ExecutionError(error);
			expect(executionError.message).toBe('Error Details [line 123]');
			expect(executionError.description).toBe('ErrorType');
		});

		it('should extract error details when no error type is present', () => {
			const error = new Error('Error Details');
			error.stack = 'Error: Error Details\n    at Code:123';
			const executionError = new ExecutionError(error);
			expect(executionError.message).toBe('Error Details [line 123]');
			expect(executionError.description).toBe(null);
		});

		it('should handle stack with only "Error: " prefix', () => {
			const error = new Error('Error: ');
			error.stack = 'Error: Error: \n    at Code:123';
			const executionError = new ExecutionError(error);
			expect(executionError.message).toBe('Unknown error [line 123]');
			expect(executionError.description).toBe(null);
		});

		it('should handle stack with colon and space', () => {
			const error = new Error(': ');
			error.stack = 'Error: : \n    at Code:123';
			const executionError = new ExecutionError(error);
			expect(executionError.message).toBe('Unknown error [line 123]');
			expect(executionError.description).toBe(null);
		});

		it('should handle itemIndex', () => {
			const error = new Error('ErrorType: Error Details');
			error.stack = 'Error: ErrorType: Error Details\n    at Code:123';
			const executionError = new ExecutionError(error, 1);
			expect(executionError.message).toBe('Error Details [line 123, for item 1]');
			expect(executionError.description).toBe('ErrorType');
			expect(executionError.itemIndex).toBe(1);
			expect(executionError.context).toEqual({ itemIndex: 1 });
		});

		it('should handle stack without line number', () => {
			const error = new Error('ErrorType: Error Details');
			error.stack = 'Error: ErrorType: Error Details';
			const executionError = new ExecutionError(error, 1);
			expect(executionError.message).toBe('Error Details');
			expect(executionError.description).toBe('ErrorType');
			expect(executionError.itemIndex).toBe(1);
			expect(executionError.context).toEqual({ itemIndex: 1 });
		});
	});
});
