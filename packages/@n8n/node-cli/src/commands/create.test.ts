import { runCommand } from '@oclif/test';

describe('n8n-node create', () => {
	it('should print correct output', async () => {
		const { stdout } = await runCommand('create -f', { root: import.meta.dirname });
		expect(stdout).toEqual('hello from commands/create.ts (force=true)\n');
	});
});
