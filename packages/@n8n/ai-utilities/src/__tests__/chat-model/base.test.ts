import { BaseChatModel } from 'src/chat-model/base';
import type { GenerateResult, StreamChunk } from 'src/types/output';
import type { Tool } from 'src/types/tool';

class ToolsChatModel extends BaseChatModel {
	get boundTools(): string[] {
		return this.tools.map((tool) => tool.name);
	}

	async generate(): Promise<GenerateResult> {
		return { message: { role: 'assistant', content: [] } };
	}

	async *stream(): AsyncIterable<StreamChunk> {}
}

const tool = (name: string): Tool => ({ type: 'function', name, inputSchema: { type: 'object' } });

describe('BaseChatModel', () => {
	describe('withTools', () => {
		it('replaces the tools that are already bound', () => {
			const model = new ToolsChatModel('fake', 'fake-model');

			const bound = model.withTools([tool('first')]) as ToolsChatModel;
			const rebound = bound.withTools([tool('second')]) as ToolsChatModel;
			const cleared = rebound.withTools([]) as ToolsChatModel;

			expect(bound.boundTools).toEqual(['first']);
			expect(rebound.boundTools).toEqual(['second']);
			expect(cleared.boundTools).toEqual([]);
			expect(model.boundTools, 'binding returns a new instance').toEqual([]);
		});
	});
});
