import { CommandTester } from '../test-utils/command-tester';

describe('prerelease command', () => {
	const originalEnv = process.env;
	const mockProcessStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.RELEASE_MODE;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	test('without RELEASE_MODE - exits with error and shows message', async () => {
		await expect(CommandTester.run('prerelease')).rejects.toThrow('EEXIT: 1');

		const stdoutCalls = mockProcessStdout.mock.calls.flat();
		const hasReleaseMessage = stdoutCalls.some(
			(call) => typeof call === 'string' && call.includes('run release` to publish the package'),
		);
		expect(hasReleaseMessage).toBe(true);
	});

	test('with RELEASE_MODE - succeeds without logging', async () => {
		process.env.RELEASE_MODE = 'true';

		const result = await CommandTester.run('prerelease');

		expect(result).toBeDefined();
		expect(mockProcessStdout).not.toHaveBeenCalled();
	});
});
