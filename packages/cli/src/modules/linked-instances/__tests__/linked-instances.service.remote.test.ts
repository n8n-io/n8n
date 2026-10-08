import { randomUUID } from 'node:crypto';

import type { LinkedInstanceSummary } from '@n8n/api-types';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { LINK_INPUT_MESSAGES } from '../link-input';
import {
	LINK_NOT_FOUND_MESSAGE,
	PROBE_FAILURE_MESSAGES,
	REMOTE_PROJECTS_MESSAGES,
} from '../linked-instances.service';
import { RemoteInstanceError } from '../remote/remote-instance.errors';
import {
	CLOUD,
	expectRejection,
	fakeToken,
	searchProjectsOutput,
	setup,
	user,
} from './linked-instances.test-helpers';

const OPS = { id: 'Xk3pQ9aZ1bC2dE4f', name: 'Ops', type: 'team' };
const SALES = { id: 'Sa1eS0pQ9aZ1bC2d', name: 'Sales', type: 'team' };
const PERSONAL = { id: 'Pm0rT8sU7vW6xY5z', name: 'Ada Lovelace <ada@acme.test>', type: 'personal' };
const WITH_PROJECTS = ['search_workflows', 'search_projects'];

const FAILURES = ['unreachable', 'mcp-disabled', 'unauthorised'] as const;

const ref = ({ id, name }: { id: string; name: string }) => ({ id, name });

/** A service with one link, made while the instance listed `projects`. */
async function linked(projects = [OPS, PERSONAL]) {
	const context = setup();
	const { service, client } = context;
	client.probe.mockResolvedValue({ ok: true, toolNames: WITH_PROJECTS });
	client.callTool.mockResolvedValue(searchProjectsOutput(projects));
	const alice = user();
	const token = fakeToken();
	const link = await service.link(alice, { name: 'Cloud', address: CLOUD, token });
	client.probe.mockClear();
	client.callTool.mockClear();
	client.close.mockClear();
	context.clientFactory.create.mockClear();
	return { ...context, alice, token, link };
}

describe('LinkedInstancesService and the linked instance', () => {
	describe('link: default remote project', () => {
		it('stores the first team project that the instance lists', async () => {
			const { service, client, clientFactory } = setup();
			client.probe.mockResolvedValue({ ok: true, toolNames: WITH_PROJECTS });
			client.callTool.mockResolvedValue(searchProjectsOutput([SALES, OPS, PERSONAL]));

			const summary = await service.link(user(), {
				name: 'Cloud',
				address: CLOUD,
				token: fakeToken(),
			});

			expect(summary.defaultRemoteProject).toEqual(ref(SALES));
			expect(clientFactory.create).toHaveBeenCalledTimes(1);
			expect(client.probe.mock.invocationCallOrder[0]).toBeLessThan(
				client.callTool.mock.invocationCallOrder[0],
			);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('stores the personal project when the instance has no licence for team projects', async () => {
			const { service, client } = setup();
			client.probe.mockResolvedValue({ ok: true, toolNames: WITH_PROJECTS });
			client.callTool.mockResolvedValue(searchProjectsOutput([OPS, PERSONAL], false));

			const summary = await service.link(user(), {
				name: 'Cloud',
				address: CLOUD,
				token: fakeToken(),
			});

			expect(summary.defaultRemoteProject).toEqual(ref(PERSONAL));
		});

		it('links without a default project when the token cannot list projects', async () => {
			const { service, client } = setup();

			const summary = await service.link(user(), {
				name: 'Cloud',
				address: CLOUD,
				token: fakeToken(),
			});

			expect(summary).toMatchObject({ status: 'online', defaultRemoteProject: null });
			expect(client.callTool).not.toHaveBeenCalled();
		});

		it.each([
			['the tool fails', new RemoteInstanceError('tool-error')],
			['the instance does not answer in time', new RemoteInstanceError('timeout')],
		])('links without a default project when %s', async (_, failure) => {
			const { service, client, logger, rows } = setup();
			client.probe.mockResolvedValue({ ok: true, toolNames: WITH_PROJECTS });
			client.callTool.mockRejectedValue(failure);

			const summary = await service.link(user(), {
				name: 'Cloud',
				address: CLOUD,
				token: fakeToken(),
			});

			expect(summary.defaultRemoteProject).toBeNull();
			expect(rows).toHaveLength(1);
			expect(logger.warn).toHaveBeenCalledWith('Could not list the projects of a linked instance', {
				origin: CLOUD,
				reason: failure.reason,
			});
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('links without a default project when the project list has an unknown format', async () => {
			const { service, client } = setup();
			client.probe.mockResolvedValue({ ok: true, toolNames: WITH_PROJECTS });
			client.callTool.mockResolvedValue('Ops, Sales');

			const summary = await service.link(user(), {
				name: 'Cloud',
				address: CLOUD,
				token: fakeToken(),
			});

			expect(summary.defaultRemoteProject).toBeNull();
		});

		it('fails, stores nothing and closes the client on an unexpected error', async () => {
			const { service, client, rows } = setup();
			client.probe.mockResolvedValue({ ok: true, toolNames: WITH_PROJECTS });
			client.callTool.mockRejectedValue(new TypeError('bug'));

			await expect(
				service.link(user(), { name: 'Cloud', address: CLOUD, token: fakeToken() }),
			).rejects.toThrow(TypeError);
			expect(rows).toHaveLength(0);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('does not list projects when the probe fails', async () => {
			const { service, client } = setup();
			client.probe.mockResolvedValue({ ok: false, reason: 'unauthorised' });

			await expectRejection(
				service.link(user(), { name: 'Cloud', address: CLOUD, token: fakeToken() }),
				BadRequestError,
				PROBE_FAILURE_MESSAGES.unauthorised,
			);
			expect(client.callTool).not.toHaveBeenCalled();
		});
	});

	describe('list', () => {
		it('shows the default project only when both its id and its name are stored', async () => {
			const { service, alice, link, rows } = await linked();
			expect(link.defaultRemoteProject).toEqual(ref(OPS));

			rows[0].defaultRemoteProjectName = null;
			await expect(service.list(alice)).resolves.toEqual([{ ...link, defaultRemoteProject: null }]);

			rows[0].defaultRemoteProjectName = 'Ops';
			rows[0].defaultRemoteProjectId = null;
			await expect(service.list(alice)).resolves.toEqual([{ ...link, defaultRemoteProject: null }]);
		});
	});

	describe('verify', () => {
		it('probes with the stored token and records that the instance is online', async () => {
			const { service, client, clientFactory, alice, token, link, rows } = await linked();
			rows[0].status = 'offline';
			rows[0].lastVerifiedAt = new Date('2026-01-01T00:00:00.000Z');
			const before = Date.now();

			const summary = await service.verify(alice, link.id);

			expect(clientFactory.create).toHaveBeenCalledWith({ origin: CLOUD, token });
			expect(client.close).toHaveBeenCalledTimes(1);
			expect(summary).toEqual({ ...link, status: 'online', lastVerifiedAt: expect.any(String) });
			expect(Date.parse(summary.lastVerifiedAt ?? '')).toBeGreaterThanOrEqual(before);
		});

		it.each([
			['unreachable', 'offline'],
			['mcp-disabled', 'mcp-disabled'],
			['unauthorised', 'unauthorised'],
		] as const)('records a %s instance as %s and keeps the link', async (reason, status) => {
			const { service, client, alice, token, link } = await linked();
			client.probe.mockResolvedValue({ ok: false, reason });
			const before = Date.now();

			const summary = await service.verify(alice, link.id);

			expect(summary).toMatchObject({ status, defaultRemoteProject: link.defaultRemoteProject });
			expect(Date.parse(summary.lastVerifiedAt ?? '')).toBeGreaterThanOrEqual(before);
			await expect(service.getTokenForUse(alice, link.id)).resolves.toEqual({
				origin: CLOUD,
				token,
			});
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it("throws NotFoundError for another user's link without a probe", async () => {
			const { service, clientFactory, link } = await linked();

			await expectRejection(service.verify(user(), link.id), NotFoundError, LINK_NOT_FOUND_MESSAGE);
			expect(clientFactory.create).not.toHaveBeenCalled();
		});

		it.each(['not-a-uuid', randomUUID()])('throws NotFoundError for the id %j', async (id) => {
			const { service, alice, repository } = await linked();

			await expect(service.verify(alice, id)).rejects.toThrow(NotFoundError);
			expect(repository.updateStatus).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the link goes away during the probe', async () => {
			const { service, alice, link, repository } = await linked();
			repository.updateStatus.mockResolvedValueOnce(false);

			await expectRejection(service.verify(alice, link.id), NotFoundError, LINK_NOT_FOUND_MESSAGE);
		});
	});

	describe('update', () => {
		it('renames the link without a call to the instance', async () => {
			const { service, clientFactory, alice, link } = await linked();

			const summary = await service.update(alice, link.id, { name: ' Cloud (EU) ' });

			expect(summary).toEqual({ ...link, name: 'Cloud (EU)' });
			expect(clientFactory.create).not.toHaveBeenCalled();
		});

		it('rejects a change that changes nothing, or a name that is not valid', async () => {
			const { service, alice, link } = await linked();

			await expectRejection(
				service.update(alice, link.id, {}),
				BadRequestError,
				LINK_INPUT_MESSAGES.noChange,
			);
			await expectRejection(
				service.update(alice, link.id, { name: '<b>x</b>' }),
				BadRequestError,
				LINK_INPUT_MESSAGES.name,
			);
			await expect(service.list(alice)).resolves.toEqual([link]);
		});

		it('replaces the token after the new token passes the probe', async () => {
			const { service, client, clientFactory, alice, link, rows, cipher } = await linked();
			rows[0].status = 'unauthorised';
			const newToken = fakeToken();

			const summary = await service.update(alice, link.id, { token: ` ${newToken} ` });

			expect(clientFactory.create).toHaveBeenCalledWith({ origin: CLOUD, token: newToken });
			expect(summary).toMatchObject({ status: 'online', defaultRemoteProject: ref(OPS) });
			await expect(service.getTokenForUse(alice, link.id)).resolves.toEqual({
				origin: CLOUD,
				token: newToken,
			});
			expect(rows[0].tokenEncrypted).not.toContain(newToken);
			await expect(cipher.decryptV2(rows[0].tokenEncrypted)).resolves.toBe(newToken);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it.each(FAILURES)(
			'keeps the old token, the name and the status when the new token gets %s',
			async (reason) => {
				const { service, client, alice, token, link } = await linked();
				client.probe.mockResolvedValue({ ok: false, reason });

				await expectRejection(
					service.update(alice, link.id, { name: 'Renamed', token: fakeToken() }),
					BadRequestError,
					PROBE_FAILURE_MESSAGES[reason],
				);

				await expect(service.getTokenForUse(alice, link.id)).resolves.toEqual({
					origin: CLOUD,
					token,
				});
				await expect(service.list(alice)).resolves.toEqual([link]);
				expect(client.close).toHaveBeenCalledTimes(1);
			},
		);

		it('keeps the default project while the new token sees it, with its current name', async () => {
			const { service, client, alice, link } = await linked([OPS, PERSONAL]);
			client.callTool.mockResolvedValue(
				searchProjectsOutput([SALES, { ...OPS, name: 'Operations' }, PERSONAL]),
			);

			const summary = await service.update(alice, link.id, { token: fakeToken() });

			expect(summary.defaultRemoteProject).toEqual({ id: OPS.id, name: 'Operations' });
		});

		it('picks a new default project when the new token does not see the old one', async () => {
			const { service, client, alice, link } = await linked([OPS, PERSONAL]);
			const otherPersonal = {
				id: 'Bo8bT8sU7vW6xY5z',
				name: 'Bob <bob@acme.test>',
				type: 'personal',
			};
			client.callTool.mockResolvedValue(searchProjectsOutput([otherPersonal]));

			const summary = await service.update(alice, link.id, { token: fakeToken() });

			expect(summary.defaultRemoteProject).toEqual(ref(otherPersonal));
		});

		it.each([
			['cannot list projects', ['search_workflows'], undefined],
			['fails to list projects', WITH_PROJECTS, new RemoteInstanceError('tool-error')],
		])('keeps the default project when the new token %s', async (_, toolNames, failure) => {
			const { service, client, alice, link } = await linked();
			client.probe.mockResolvedValue({ ok: true, toolNames });
			if (failure) client.callTool.mockRejectedValue(failure);

			const summary = await service.update(alice, link.id, { token: fakeToken() });

			expect(summary).toMatchObject({ status: 'online', defaultRemoteProject: ref(OPS) });
		});

		it('sets a default project that the instance lists for the stored token', async () => {
			const { service, client, clientFactory, alice, token, link } = await linked();
			client.callTool.mockResolvedValue(
				searchProjectsOutput([OPS, { ...SALES, name: ' Sales\nEMEA ' }, PERSONAL]),
			);

			const summary = await service.update(alice, link.id, { defaultRemoteProjectId: SALES.id });

			expect(clientFactory.create).toHaveBeenCalledWith({ origin: CLOUD, token });
			expect(summary).toEqual({
				...link,
				defaultRemoteProject: { id: SALES.id, name: 'Sales EMEA' },
			});
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('checks a new default project with a new token sent with it', async () => {
			const { service, client, clientFactory, alice, link } = await linked();
			client.callTool.mockResolvedValue(searchProjectsOutput([PERSONAL]));
			const newToken = fakeToken();

			const summary = await service.update(alice, link.id, {
				token: newToken,
				defaultRemoteProjectId: PERSONAL.id,
			});

			expect(clientFactory.create).toHaveBeenCalledWith({ origin: CLOUD, token: newToken });
			expect(summary).toMatchObject({ status: 'online', defaultRemoteProject: ref(PERSONAL) });
			await expect(service.getTokenForUse(alice, link.id)).resolves.toHaveProperty(
				'token',
				newToken,
			);
		});

		it.each([
			[
				'a project that the instance does not list',
				{ toolNames: WITH_PROJECTS, result: searchProjectsOutput([OPS, PERSONAL]) },
				LINK_INPUT_MESSAGES.defaultRemoteProjectId,
			],
			[
				'a token that cannot list projects',
				{ toolNames: ['search_workflows'], result: undefined },
				REMOTE_PROJECTS_MESSAGES.unavailable,
			],
			[
				'a failed project list',
				{ toolNames: WITH_PROJECTS, result: new RemoteInstanceError('timeout') },
				REMOTE_PROJECTS_MESSAGES.failed,
			],
			[
				'a project list in an unknown format',
				{ toolNames: WITH_PROJECTS, result: 'Sales' },
				REMOTE_PROJECTS_MESSAGES.failed,
			],
		])('rejects %s and changes nothing', async (_, remote, message) => {
			const { service, client, alice, link } = await linked();
			client.probe.mockResolvedValue({ ok: true, toolNames: remote.toolNames });
			if (remote.result instanceof Error) client.callTool.mockRejectedValue(remote.result);
			else client.callTool.mockResolvedValue(remote.result);

			await expectRejection(
				service.update(alice, link.id, { name: 'Renamed', defaultRemoteProjectId: SALES.id }),
				BadRequestError,
				message,
			);
			await expect(service.list(alice)).resolves.toEqual([link]);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('rejects a default project when the stored token no longer works', async () => {
			const { service, client, alice, link } = await linked();
			client.probe.mockResolvedValue({ ok: false, reason: 'unauthorised' });

			await expectRejection(
				service.update(alice, link.id, { defaultRemoteProjectId: OPS.id }),
				BadRequestError,
				PROBE_FAILURE_MESSAGES.unauthorised,
			);
			expect(client.callTool).not.toHaveBeenCalled();
		});

		it('passes on an unexpected error from the project list and changes nothing', async () => {
			const { service, client, alice, link } = await linked();
			client.callTool.mockRejectedValue(new TypeError('bug'));

			await expect(
				service.update(alice, link.id, { defaultRemoteProjectId: OPS.id }),
			).rejects.toThrow(TypeError);
			await expect(service.list(alice)).resolves.toEqual([link]);
		});

		it("throws NotFoundError for another user's link without a call to the instance", async () => {
			const { service, clientFactory, link } = await linked();

			await expectRejection(
				service.update(user(), link.id, { token: fakeToken() }),
				NotFoundError,
				LINK_NOT_FOUND_MESSAGE,
			);
			await expect(service.update(user(), 'not-a-uuid', { name: 'x' })).rejects.toThrow(
				NotFoundError,
			);
			expect(clientFactory.create).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the link goes away during the change', async () => {
			const { service, alice, link, repository } = await linked();
			repository.updateForUser.mockResolvedValueOnce(false);

			await expectRejection(
				service.update(alice, link.id, { name: 'Renamed' }),
				NotFoundError,
				LINK_NOT_FOUND_MESSAGE,
			);
		});

		it('logs which fields changed, without their values', async () => {
			const { service, logger, alice, link } = await linked();
			const newToken = fakeToken();

			await service.update(alice, link.id, { name: 'Renamed', token: newToken });

			expect(logger.info).toHaveBeenLastCalledWith('Changed a linked instance', {
				userId: alice.id,
				linkedInstanceId: link.id,
				fields: ['name', 'token'],
			});
		});
	});

	describe('token secrecy', () => {
		type Outcome = { value?: unknown; error?: unknown };

		const settle = async (promise: Promise<unknown>) =>
			await promise.then(
				(value) => ({ value, error: undefined }),
				(error: unknown) => ({ value: undefined, error }),
			);

		it('never puts the old or the new token in logs, errors or return values', async () => {
			const { service, client, logger, alice, token, link } = await linked();
			const tokens = [token];
			const outcomes: Outcome[] = [{ value: link }];

			outcomes.push(await settle(service.verify(alice, link.id)));
			for (const reason of FAILURES) {
				client.probe.mockResolvedValueOnce({ ok: false, reason });
				outcomes.push(await settle(service.verify(alice, link.id)));
				const rejected = fakeToken();
				tokens.push(rejected);
				client.probe.mockResolvedValueOnce({ ok: false, reason });
				outcomes.push(await settle(service.update(alice, link.id, { token: rejected })));
			}
			const badToken = `${fakeToken()} x`;
			tokens.push(badToken.split(' ')[0]);
			outcomes.push(await settle(service.update(alice, link.id, { token: badToken })));
			client.callTool.mockRejectedValueOnce(new RemoteInstanceError('tool-error'));
			outcomes.push(
				await settle(service.update(alice, link.id, { defaultRemoteProjectId: OPS.id })),
			);
			const rotated = fakeToken();
			tokens.push(rotated);
			outcomes.push(await settle(service.update(alice, link.id, { token: rotated })));
			outcomes.push(await settle(service.update(user(), link.id, { token: fakeToken() })));

			const texts = [
				...outcomes.map(({ value }) => JSON.stringify(value) ?? ''),
				...outcomes.flatMap(({ error }) =>
					error instanceof Error ? [error.message, error.stack ?? '', JSON.stringify(error)] : [],
				),
				...[logger.info, logger.warn, logger.error, logger.debug].flatMap((fn) =>
					fn.mock.calls.map((call) => JSON.stringify(call)),
				),
			];
			expect(outcomes.filter(({ error }) => error).length).toBeGreaterThanOrEqual(6);
			const rotatedOutcome = outcomes[outcomes.length - 2].value as LinkedInstanceSummary;
			expect(rotatedOutcome.status).toBe('online');
			for (const text of texts) {
				for (const secret of tokens) expect(text).not.toContain(secret);
				expect(text).not.toContain('enc:');
			}
		});
	});
});
