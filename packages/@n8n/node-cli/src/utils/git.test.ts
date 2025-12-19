import { execSync } from 'node:child_process';

import { tryReadGitUser } from './git';

vi.mock('node:child_process');

describe('git utils', () => {
	describe('tryReadGitUser', () => {
		const mockedExecSync = vi.mocked(execSync);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('returns name and email if git config is set', () => {
			mockedExecSync
				.mockReturnValueOnce(Buffer.from('Alice\n'))
				.mockReturnValueOnce(Buffer.from('alice@example.com\n'));

			const user = tryReadGitUser();

			expect(user).toEqual({ name: 'Alice', email: 'alice@example.com' });
			expect(mockedExecSync).toHaveBeenCalledWith('git config --get user.name', {
				stdio: ['pipe', 'pipe', 'ignore'],
			});
			expect(mockedExecSync).toHaveBeenCalledWith('git config --get user.email', {
				stdio: ['pipe', 'pipe', 'ignore'],
			});
		});

		it('handles missing git name', () => {
			mockedExecSync
				.mockImplementationOnce(() => {
					throw new Error('no name');
				})
				.mockReturnValueOnce(Buffer.from('alice@example.com\n'));

			const user = tryReadGitUser();
			expect(user).toEqual({ name: '', email: 'alice@example.com' });
		});

		it('handles missing git email', () => {
			mockedExecSync.mockReturnValueOnce(Buffer.from('Alice\n')).mockImplementationOnce(() => {
				throw new Error('no email');
			});

			const user = tryReadGitUser();
			expect(user).toEqual({ name: 'Alice', email: '' });
		});

		it('returns empty user if nothing is configured', () => {
			mockedExecSync.mockImplementation(() => {
				throw new Error('no config');
			});

			const user = tryReadGitUser();
			expect(user).toEqual({ name: '', email: '' });
		});
	});
});
