import { getCommandHeader, printCommandHeader } from './prompts';

describe('prompts utils', () => {
	describe('getCommandHeader', () => {
		it('should return command header with version', async () => {
			const header = await getCommandHeader('n8n-node dev');
			expect(header).toContain('n8n-node dev');
			expect(header).toMatch(/v\d+\.\d+\.\d+|vunknown/);
		});

		it('should handle different command names', async () => {
			const header = await getCommandHeader('test-command');
			expect(header).toContain('test-command');
		});
	});

	describe('printCommandHeader', () => {
		it('should write header to stdout', async () => {
			const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

			await printCommandHeader('test-command');

			expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('test-command'));
			writeSpy.mockRestore();
		});
	});
});
