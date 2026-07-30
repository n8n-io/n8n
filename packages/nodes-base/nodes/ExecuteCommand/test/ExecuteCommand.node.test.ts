import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { execPromise } from '../ExecuteCommand.node';

describe('Execute Command Node', () => {
	new NodeTestHarness().setupTests();

	describe('execPromise', () => {
		it('should capture stdout from an external program', async () => {
			const result = await execPromise('node -e "process.stdout.write(\'hello from external\')"');

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe('hello from external');
			expect(result.stderr).toBe('');
			expect(result.error).toBeUndefined();
		});

		it('should capture multiline stdout', async () => {
			const result = await execPromise("node -e \"console.log('line1'); console.log('line2');\"");

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('line1');
			expect(result.stdout).toContain('line2');
		});

		it('should capture stderr separately from stdout', async () => {
			const result = await execPromise(
				"node -e \"process.stderr.write('err'); process.stdout.write('out');\"",
			);

			expect(result.stdout).toBe('out');
			expect(result.stderr).toBe('err');
			expect(result.exitCode).toBe(0);
		});

		it('should return non-zero exitCode and error on failure', async () => {
			const result = await execPromise('node -e "process.exit(1)"');
			expect(result.exitCode).toBe(1);
			expect(result.error).toBeDefined();
		});

		it('should reject if abortSignal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(execPromise('node -e "console.log(1)"', controller.signal)).rejects.toThrow();
		});
	});
});
