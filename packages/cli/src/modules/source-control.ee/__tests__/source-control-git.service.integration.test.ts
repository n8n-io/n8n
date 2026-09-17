import { mock } from 'vitest-mock-extended';

import { startSelfSignedGitServer, TLS_VERIFICATION_ERROR } from '@test/self-signed-git-server';

import { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControlGitService TLS trust', () => {
	const originalEnv = process.env;
	let server: Awaited<ReturnType<typeof startSelfSignedGitServer>>;

	beforeAll(async () => {
		server = await startSelfSignedGitServer();
	});

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.GIT_SSL_CAINFO;
	});

	afterAll(async () => {
		process.env = originalEnv;
		await server.close();
	});

	const listRemote = async () => {
		const { repositoryUrl } = server;
		const preferences = mock<SourceControlPreferencesService>();
		preferences.getPreferences.mockReturnValue(
			mock<SourceControlPreferences>({ connectionType: 'https', repositoryUrl }),
		);
		preferences.getDecryptedHttpsCredentials.mockResolvedValue({ username: 'u', password: 'p' });
		const service = new SourceControlGitService(mock(), mock(), preferences);
		await service.setGitCommand(server.dir, server.dir);
		await service.git!.listRemote([repositoryUrl]);
	};

	it('rejects a self-signed certificate without GIT_SSL_CAINFO', async () => {
		await expect(listRemote()).rejects.toThrow(TLS_VERIFICATION_ERROR);
	});

	it('trusts the certificate when GIT_SSL_CAINFO names it', async () => {
		process.env.GIT_SSL_CAINFO = server.certPath;

		await expect(listRemote()).resolves.toBeUndefined();
	});
});
