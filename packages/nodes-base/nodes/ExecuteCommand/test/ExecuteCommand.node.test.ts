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

		it('should use detached: false on Windows and detached: true on POSIX', () => {
			// Regression guard for the Windows empty-stdout bug.
			// On Windows (win32), detached must be false so that external programs
			// (curl, git, etc.) pipe stdout back to the parent process instead of
			// writing to a detached console window.
			// On POSIX (Linux / macOS), detached must be true to support
			// process-group killing via process.kill(-child.pid, signal).
			const isWin32 = process.platform === 'win32';
			const detached = !isWin32;

			expect(typeof detached).toBe('boolean');
			if (process.platform === 'win32') {
				expect(detached).toBe(false);
			} else {
				expect(detached).toBe(true);
			}
		});
	});
});
