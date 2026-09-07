import type { SourceControlledFile } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { Telemetry } from '@/telemetry';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const sourceControlledFileFixture = (
	id: string,
	overrides: Partial<SourceControlledFile> = {},
): SourceControlledFile => ({
	file: `workflows/${id}.json`,
	id,
	name: `Workflow ${id}`,
	type: 'workflow',
	status: 'created',
	location: 'remote',
	conflict: false,
	updatedAt: '2024-01-01T00:00:00.000Z',
	...overrides,
});

describe('Source Control (Public API)', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	mockInstance(Telemetry);

	let owner: User;

	beforeAll(async () => {
		owner = await createOwnerWithApiKey();
	});

	beforeEach(() => {
		testServer.license.reset();
		vi.restoreAllMocks();
	});

	const mockConnected = () => {
		const preferences = Container.get(SourceControlPreferencesService);
		vi.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);
	};

	describe('POST /source-control/pull', () => {
		const pullUrl = '/source-control/pull';
		const validBody = { autoPublish: 'none' as const };

		it('should return 401 when API key is missing', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().post(pullUrl).send(validBody);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('should return 401 when API key is invalid', async () => {
			const response = await testServer
				.publicApiAgentWithApiKey('not-a-real-api-key')
				.post(pullUrl)
				.send(validBody);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message');
		});

		it('should return 403 when API key lacks sourceControl:pull scope', async () => {
			testServer.license.enable('feat:sourceControl');
			const member = await createMemberWithApiKey({ scopes: ['tag:list'] });

			const response = await testServer.publicApiAgentFor(member).post(pullUrl).send(validBody);

			expect(response.status).toBe(403);
			expect(response.body).toEqual({ message: 'Forbidden' });
		});

		it('should return 401 when Source Control is not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).post(pullUrl).send(validBody);

			expect(response.status).toBe(401);
			expect(response.body).toEqual({
				status: 'Error',
				message: 'Source Control feature is not licensed',
			});
		});

		it('should return 400 when licensed but Source Control is not connected', async () => {
			testServer.license.enable('feat:sourceControl');

			const response = await testServer.publicApiAgentFor(owner).post(pullUrl).send(validBody);

			expect(response.status).toBe(400);
			expect(response.body).toEqual({
				status: 'Error',
				message: 'Source Control is not connected to a repository',
			});
		});

		it('should return 200 and import result when pull succeeds', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			const statusResult: SourceControlledFile[] = [
				sourceControlledFileFixture('wf-1'),
				sourceControlledFileFixture('wf-2'),
				sourceControlledFileFixture('wf-3'),
			];
			const pullSpy = vi
				.spyOn(Container.get(SourceControlService), 'pullWorkfolder')
				.mockResolvedValue({ statusCode: 200, statusResult });

			const emitSpy = vi.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

			const response = await testServer.publicApiAgentFor(owner).post(pullUrl).send(validBody);

			expect(response.status).toBe(200);
			expect(response.body).toEqual(statusResult);
			expect(pullSpy).toHaveBeenCalled();
			expect(emitSpy).toHaveBeenCalledWith(
				'source-control-user-pulled-api',
				expect.objectContaining({ forced: false }),
			);
		});

		it('should return 409 when pull reports conflicts', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			const statusResult: SourceControlledFile[] = [];
			vi.spyOn(Container.get(SourceControlService), 'pullWorkfolder').mockResolvedValue({
				statusCode: 409,
				statusResult,
			});

			const response = await testServer
				.publicApiAgentFor(owner)
				.post(pullUrl)
				.send({ force: false });

			expect(response.status).toBe(409);
			expect(response.body).toEqual(statusResult);
		});

		it('should return 400 as plain text when pullWorkfolder throws', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			vi.spyOn(Container.get(SourceControlService), 'pullWorkfolder').mockRejectedValue(
				new Error('Git operation failed'),
			);

			const response = await testServer.publicApiAgentFor(owner).post(pullUrl).send(validBody);

			expect(response.status).toBe(400);
			expect(response.text).toBe('Git operation failed');
		});

		it('should return 400 as plain text when body fails PullWorkFolderRequestDto validation', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			const response = await testServer
				.publicApiAgentFor(owner)
				.post(pullUrl)
				.send({ autoPublish: 'not-a-valid-mode' });

			expect(response.status).toBe(400);
			expect(response.text.length).toBeGreaterThan(0);
		});
	});

	describe('GET /source-control/status', () => {
		const statusUrl = '/source-control/status';

		it('should return 403 when API key lacks sourceControl:read scope', async () => {
			testServer.license.enable('feat:sourceControl');
			const member = await createMemberWithApiKey({ scopes: ['tag:list'] });

			const response = await testServer
				.publicApiAgentFor(member)
				.get(statusUrl)
				.query({ direction: 'push' });

			expect(response.status).toBe(403);
			expect(response.body).toEqual({ message: 'Forbidden' });
		});

		it('should return 403 when API key has sourceControl:pull but not sourceControl:read', async () => {
			testServer.license.enable('feat:sourceControl');
			const member = await createMemberWithApiKey({ scopes: ['sourceControl:pull'] });

			const response = await testServer
				.publicApiAgentFor(member)
				.get(statusUrl)
				.query({ direction: 'push' });

			expect(response.status).toBe(403);
			expect(response.body).toEqual({ message: 'Forbidden' });
		});

		it('should return 403 when Source Control is not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(statusUrl)
				.query({ direction: 'push' });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toContain('feat:sourceControl');
		});

		it('should return 400 when licensed but Source Control is not connected', async () => {
			testServer.license.enable('feat:sourceControl');

			const response = await testServer
				.publicApiAgentFor(owner)
				.get(statusUrl)
				.query({ direction: 'push' });

			expect(response.status).toBe(400);
			expect(response.body).toEqual({
				message: 'Source Control is not connected to a repository',
			});
		});

		it('should return 400 when direction is missing', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			const response = await testServer.publicApiAgentFor(owner).get(statusUrl);

			expect(response.status).toBe(400);
		});

		it('should return 400 when direction is invalid', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get(statusUrl)
				.query({ direction: 'sideways' });

			expect(response.status).toBe(400);
		});

		it('should return 403 for a member with a read-only key but no authorized project', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();
			const member = await createMemberWithApiKey({ scopes: ['sourceControl:read'] });

			const response = await testServer
				.publicApiAgentFor(member)
				.get(statusUrl)
				.query({ direction: 'push' });

			expect(response.status).toBe(403);
		});

		it('should authorize before revealing whether a repository is connected', async () => {
			testServer.license.enable('feat:sourceControl');
			// Source control deliberately left disconnected.
			const member = await createMemberWithApiKey({ scopes: ['sourceControl:read'] });

			const response = await testServer
				.publicApiAgentFor(member)
				.get(statusUrl)
				.query({ direction: 'push' });

			// 403 from RBAC, not the 400 that would disclose the connection state.
			expect(response.status).toBe(403);
		});

		it('should return 200 with the status envelope for direction=push', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			const files = [
				sourceControlledFileFixture('wf-1'),
				sourceControlledFileFixture('wf-2'),
				sourceControlledFileFixture('wf-3'),
			];
			const getStatusSpy = vi
				.spyOn(Container.get(SourceControlService), 'getStatus')
				.mockResolvedValue(files);

			const response = await testServer
				.publicApiAgentFor(owner)
				.get(statusUrl)
				.query({ direction: 'push' });

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ data: files });
			expect(getStatusSpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				expect.objectContaining({
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
					origin: 'publicApi',
				}),
			);
		});

		it('should return 200 with the status envelope for direction=pull', async () => {
			testServer.license.enable('feat:sourceControl');
			mockConnected();

			const files = [
				sourceControlledFileFixture('wf-1'),
				sourceControlledFileFixture('wf-2'),
				sourceControlledFileFixture('wf-3'),
			];
			const getStatusSpy = vi
				.spyOn(Container.get(SourceControlService), 'getStatus')
				.mockResolvedValue(files);

			const response = await testServer
				.publicApiAgentFor(owner)
				.get(statusUrl)
				.query({ direction: 'pull' });

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ data: files });
			expect(getStatusSpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				expect.objectContaining({
					direction: 'pull',
					// Pull previews the incoming side, matching what `pullWorkfolder` applies.
					preferLocalVersion: false,
					verbose: false,
					origin: 'publicApi',
				}),
			);
		});
	});
});
