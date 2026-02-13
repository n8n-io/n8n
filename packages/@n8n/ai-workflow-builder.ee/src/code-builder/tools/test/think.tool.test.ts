import { createThinkTool } from '../think.tool';

describe('createThinkTool', () => {
	it('should create a tool named "think"', () => {
		const tool = createThinkTool();
		expect(tool.name).toBe('think');
	});

	it('should return acknowledgement when invoked', async () => {
		const tool = createThinkTool();
		const result = await tool.invoke({
			thought: 'I need to use the Gmail node for sending emails',
		});
		expect(typeof result).toBe('string');
		expect(result).toBeTruthy();
	});

	it('should accept any string as thought', async () => {
		const tool = createThinkTool();
		const result = await tool.invoke({ thought: '' });
		expect(typeof result).toBe('string');
	});
});
