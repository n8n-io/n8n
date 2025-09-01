import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

jest.mock('fs/promises', () => ({
	readFile: jest.fn(),
}));

import { readFile } from 'fs/promises';
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('ThirdPartyLicensesController', () => {
	const testServer = setupTestServer({ endpointGroups: ['third-party-licenses'] });
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		const member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	describe('GET /third-party-licenses', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should require authentication', async () => {
			await testServer.authlessAgent.get('/third-party-licenses').expect(401);
		});

		describe('when license file exists', () => {
			beforeEach(() => {
				mockReadFile.mockResolvedValue('# Third Party Licenses\n\nSome license content...');
			});

			it('should allow authenticated owner to get third-party licenses', async () => {
				const response = await ownerAgent.get('/third-party-licenses');
				expect(response.status).toBe(200);
				expect(response.headers['content-type']).toMatch(/text\/markdown/);
				expect(response.text).toBe('# Third Party Licenses\n\nSome license content...');
			});

			it('should allow authenticated member to get third-party licenses', async () => {
				const response = await memberAgent.get('/third-party-licenses');
				expect(response.status).toBe(200);
				expect(response.headers['content-type']).toMatch(/text\/markdown/);
				expect(response.text).toBe('# Third Party Licenses\n\nSome license content...');
			});
		});

		describe('when license file does not exist', () => {
			beforeEach(() => {
				mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));
			});

			it('should return 404 for authenticated owner', async () => {
				const response = await ownerAgent.get('/third-party-licenses');
				expect(response.status).toBe(404);
				expect(response.text).toBe('Third-party licenses file not found');
			});

			it('should return 404 for authenticated member', async () => {
				const response = await memberAgent.get('/third-party-licenses');
				expect(response.status).toBe(404);
				expect(response.text).toBe('Third-party licenses file not found');
			});
		});

		describe('when file read fails with other errors', () => {
			beforeEach(() => {
				mockReadFile.mockRejectedValue(new Error('EACCES: permission denied'));
			});

			it('should return 404 for permission errors', async () => {
				const response = await ownerAgent.get('/third-party-licenses');
				expect(response.status).toBe(404);
				expect(response.text).toBe('Third-party licenses file not found');
			});
		});

		describe('file path resolution', () => {
			it('should request the correct file path', async () => {
				mockReadFile.mockResolvedValue('test content');

				await ownerAgent.get('/third-party-licenses');

				expect(mockReadFile).toHaveBeenCalledWith(
					expect.stringMatching(/THIRD_PARTY_LICENSES\.md$/),
					'utf-8',
				);
			});
		});
	});
});
