import { createMockTool } from '../../__tests__/helpers';
import { DirectExecutionStrategy } from '../DirectExecutionStrategy';

describe('DirectExecutionStrategy', () => {
	let strategy: DirectExecutionStrategy;

	beforeEach(() => {
		strategy = new DirectExecutionStrategy();
	});

	describe('executeTool', () => {
		it('should invoke tool with provided arguments', async () => {
			const tool = createMockTool('test-tool', { invokeReturn: { result: 'success' } });

			const result = await strategy.executeTool(
				tool,
				{ input: 'test' },
				{ sessionId: 'session-1' },
			);

			expect(tool.invoke).toHaveBeenCalledWith({ input: 'test' });
			expect(result).toEqual({ result: 'success' });
		});

		it('should propagate tool errors', async () => {
			const tool = createMockTool('failing-tool', {
				invokeError: new Error('Tool failed'),
			});

			await expect(strategy.executeTool(tool, {}, { sessionId: 'session-1' })).rejects.toThrow(
				'Tool failed',
			);
		});

		it('should pass empty arguments correctly', async () => {
			const tool = createMockTool('no-args-tool', { invokeReturn: 'result' });

			await strategy.executeTool(tool, {}, { sessionId: 'session-1' });

			expect(tool.invoke).toHaveBeenCalledWith({});
		});

		it('should handle complex arguments', async () => {
			const tool = createMockTool('complex-tool', { invokeReturn: 'result' });
			const complexArgs = {
				nested: { deep: { value: 123 } },
				array: [1, 2, 3],
				text: 'hello',
			};

			await strategy.executeTool(tool, complexArgs, { sessionId: 'session-1' });

			expect(tool.invoke).toHaveBeenCalledWith(complexArgs);
		});

		it('should handle various return types', async () => {
			const stringTool = createMockTool('string-tool', { invokeReturn: 'string result' });
			const numberTool = createMockTool('number-tool', { invokeReturn: 42 });
			const arrayTool = createMockTool('array-tool', { invokeReturn: [1, 2, 3] });
			const nullTool = createMockTool('null-tool', { invokeReturn: null });

			const context = { sessionId: 'session-1' };

			expect(await strategy.executeTool(stringTool, {}, context)).toBe('string result');
			expect(await strategy.executeTool(numberTool, {}, context)).toBe(42);
			expect(await strategy.executeTool(arrayTool, {}, context)).toEqual([1, 2, 3]);
			expect(await strategy.executeTool(nullTool, {}, context)).toBeNull();
		});

		it('should handle execution context with messageId', async () => {
			const tool = createMockTool('test-tool', { invokeReturn: 'result' });

			const result = await strategy.executeTool(
				tool,
				{ arg: 'value' },
				{ sessionId: 'session-1', messageId: 'msg-123' },
			);

			expect(result).toBe('result');
			expect(tool.invoke).toHaveBeenCalledWith({ arg: 'value' });
		});

		it('should propagate TypeError from tool', async () => {
			const tool = createMockTool('type-error-tool', {
				invokeError: new TypeError('Invalid type'),
			});

			await expect(strategy.executeTool(tool, {}, { sessionId: 'session-1' })).rejects.toThrow(
				TypeError,
			);
		});
	});
});
