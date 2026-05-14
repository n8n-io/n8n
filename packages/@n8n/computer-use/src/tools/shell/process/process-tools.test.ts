jest.mock('../shell-execute', () => ({
	spawnCommand: jest.fn(),
}));

import { processKillTool, processWriteTool } from './process-tools';

const CONTEXT = { dir: '/base' };

describe('process tools', () => {
	describe('process_write', () => {
		it('includes the stdin payload in the approval preview', () => {
			const resources = processWriteTool.getAffectedResources(
				{ processId: 'proc_123', input: 'hello\n' },
				CONTEXT,
			);

			expect(resources).toEqual([
				{
					toolGroup: 'shell',
					resource: 'process:proc_123',
					description: 'Write to process: proc_123',
					preview: {
						kind: 'text',
						title: 'Input to process: proc_123',
						content: 'hello\n',
						truncated: false,
					},
				},
			]);
		});
	});

	describe('process_kill', () => {
		it('declares the target process as an affected resource', () => {
			const resources = processKillTool.getAffectedResources({ processId: 'proc_123' }, CONTEXT);

			expect(resources).toEqual([
				{
					toolGroup: 'shell',
					resource: 'process:proc_123',
					description: 'Stop process: proc_123',
				},
			]);
		});
	});
});
