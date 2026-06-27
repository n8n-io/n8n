import type { SourceControlledFile } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { PushResult } from 'simple-git';

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

describe('POST /source-control/push (Public API)', () => {
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

	const pushUrl = '/source-control/push';

	const sourceControlledFileFixture = (id: string): SourceControlledFile => ({
		file: `workflows/${id}.json`,
		id,
		name: `Workflow ${id}`,
		type: 'workflow',
		status: 'created',
		location: 'local',
		conflict: false,
		updatedAt: '2024-01-01T00:00:00.000Z',
		pushed: true,
	});

	const makePushResult = (statusResult: SourceControlledFile[]) => ({
		statusCode: 200 as const,
		pushResult: {
			update: { hash: { to: 'abc123' }, head: { local: 'main' } },
		} as unknown as PushResult,
		statusResult,
	});

	it('should return 401 when API key is missing', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().post(pushUrl).send({});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
	});

	it('should return 401 when API key is invalid', async () => {
		const response = await testServer
			.publicApiAgentWithApiKey('not-a-real-api-key')
			.post(pushUrl)
			.send({});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty('message');
	});

	it('should return 403 when API key lacks sourceControl:push scope', async () => {
		testServer.license.enable('feat:sourceControl');
		const member = await createMemberWithApiKey({ scopes: ['tag:list'] });

		const response = await testServer.publicApiAgentFor(member).post(pushUrl).send({});

		expect(response.status).toBe(403);
		expect(response.body).toEqual({ message: 'Forbidden' });
	});

	it('should return 401 when Source Control is not licensed', async () => {
		const response = await testServer.publicApiAgentFor(owner).post(pushUrl).send({});

		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			status: 'Error',
			message: 'Source Control feature is not licensed',
		});
	});

	it('should return 400 when licensed but Source Control is not connected', async () => {
		testServer.license.enable('feat:sourceControl');

		const response = await testServer.publicApiAgentFor(owner).post(pushUrl).send({});

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			status: 'Error',
			message: 'Source Control is not connected to a repository',
		});
	});

	it('should return 200 with files and commit when push succeeds', async () => {
		testServer.license.enable('feat:sourceControl');
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		const statusResult = [sourceControlledFileFixture('wf-1'), sourceControlledFileFixture('wf-2')];
		const service = Container.get(SourceControlService);
		jest.spyOn(service, 'setGitUserDetails').mockResolvedValue();
		jest.spyOn(service, 'pushWorkfolder').mockResolvedValue(makePushResult(statusResult));
		const emitSpy = jest.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

		const response = await testServer
			.publicApiAgentFor(owner)
			.post(pushUrl)
			.send({ commitMessage: 'Daily automated n8n workflow backup' });

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			files: statusResult,
			commit: { hash: 'abc123', message: 'Daily automated n8n workflow backup', branch: 'main' },
		});
		expect(emitSpy).toHaveBeenCalledWith(
			'source-control-user-pushed-api',
			expect.objectContaining({ forced: false }),
		);
	});

	it('should push all changes when body is omitted', async () => {
		testServer.license.enable('feat:sourceControl');
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		const service = Container.get(SourceControlService);
		jest.spyOn(service, 'setGitUserDetails').mockResolvedValue();
		const pushSpy = jest.spyOn(service, 'pushWorkfolder').mockResolvedValue(makePushResult([]));
		jest.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

		await testServer.publicApiAgentFor(owner).post(pushUrl).send({});

		expect(pushSpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ fileNames: [] }),
		);
	});

	it('should return 409 when conflicts are detected', async () => {
		testServer.license.enable('feat:sourceControl');
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		const conflictResult = [{ ...sourceControlledFileFixture('wf-conflict'), conflict: true }];
		const service = Container.get(SourceControlService);
		jest.spyOn(service, 'setGitUserDetails').mockResolvedValue();
		jest.spyOn(service, 'pushWorkfolder').mockResolvedValue({
			statusCode: 409,
			pushResult: undefined,
			statusResult: conflictResult,
		});
		const emitSpy = jest.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

		const response = await testServer.publicApiAgentFor(owner).post(pushUrl).send({});

		expect(response.status).toBe(409);
		expect(response.body).toEqual({ files: conflictResult, commit: null });
		expect(emitSpy).not.toHaveBeenCalledWith('source-control-user-pushed-api', expect.anything());
	});

	it('should return 400 as plain text when pushWorkfolder throws', async () => {
		testServer.license.enable('feat:sourceControl');
		const preferences = Container.get(SourceControlPreferencesService);
		jest.spyOn(preferences, 'isSourceControlConnected').mockReturnValue(true);

		const service = Container.get(SourceControlService);
		jest.spyOn(service, 'setGitUserDetails').mockResolvedValue();
		jest.spyOn(service, 'pushWorkfolder').mockRejectedValue(new Error('Git push failed'));

		const response = await testServer.publicApiAgentFor(owner).post(pushUrl).send({});

		expect(response.status).toBe(400);
		expect(response.text).toBe('Git push failed');
	});
});
