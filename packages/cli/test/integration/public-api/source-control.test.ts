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

describe('POST /source-control/pull (Public API)', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	mockInstance(Telemetry);

	let owner: User;

	beforeAll(async () => {
		owner = await createOwnerWithApiKey();
	});

	beforeEach(() => {
		testServer.license.reset();
		jest.restoreAllMocks();
	});

	const pullUrl = '/source-control/pull';
	const validBody = { autoPublish: 'none' as const };

	const sourceControlledFileFixture = (id: string): SourceControlledFile => ({
		file: `workflows/${id}.json`,
		id,
		name: `Workflow ${id}`,
		type: 'workflow',
		status: 'created',
		location: 'remote',
		conflict: false,
		updatedAt: '2024-01-01T00:00:00.000Z',
	});

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
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		const statusResult: SourceControlledFile[] = [
			sourceControlledFileFixture('wf-1'),
			sourceControlledFileFixture('wf-2'),
			sourceControlledFileFixture('wf-3'),
		];
		const pullSpy = jest
			.spyOn(Container.get(SourceControlService), 'pullWorkfolder')
			.mockResolvedValue({ statusCode: 200, statusResult });

		const emitSpy = jest.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

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
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		const statusResult: SourceControlledFile[] = [];
		jest.spyOn(Container.get(SourceControlService), 'pullWorkfolder').mockResolvedValue({
			statusCode: 409,
			statusResult,
		});

		const response = await testServer.publicApiAgentFor(owner).post(pullUrl).send({ force: false });

		expect(response.status).toBe(409);
		expect(response.body).toEqual(statusResult);
	});

	it('should return 400 as plain text when pullWorkfolder throws', async () => {
		testServer.license.enable('feat:sourceControl');
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		jest
			.spyOn(Container.get(SourceControlService), 'pullWorkfolder')
			.mockRejectedValue(new Error('Git operation failed'));

		const response = await testServer.publicApiAgentFor(owner).post(pullUrl).send(validBody);

		expect(response.status).toBe(400);
		expect(response.text).toBe('Git operation failed');
	});

	it('should return 400 as plain text when body fails PullWorkFolderRequestDto validation', async () => {
		testServer.license.enable('feat:sourceControl');
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		const response = await testServer
			.publicApiAgentFor(owner)
			.post(pullUrl)
			.send({ autoPublish: 'not-a-valid-mode' });

		expect(response.status).toBe(400);
		expect(response.text.length).toBeGreaterThan(0);
	});
});
