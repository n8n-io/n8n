import { user } from '../../__tests__/linked-instances.test-helpers';
import { RemoteInstanceError } from '../../remote/remote-instance.errors';
import type { RemoteSession } from '../linked-instance-sessions';
import {
	exportFromRemote,
	findRemotePersonalProjectId,
	importOnRemote,
	listPersonalRemoteCredentials,
	listRemoteCredentials,
	publishOnRemote,
} from '../remote-transfer-tools';
import { ALL_TOOLS, REMOTE_PERSONAL_PROJECT_ID, transferSetup } from './transfer.test-helpers';

/** Runs the work in a real session over the fake instance, as the services do. */
async function inSession<T>(
	work: (session: RemoteSession, context: ReturnType<typeof transferSetup>) => Promise<T>,
	toolNames = ALL_TOOLS,
) {
	const context = transferSetup();
	const alice = user();
	const link = await context.link(alice);
	context.client.probe.mockResolvedValue({ ok: true, toolNames });
	const stored = await context.sessions.findLink(alice, link.id);
	return await context.sessions.withSession(
		stored,
		'push',
		async (session) => await work(session, context),
	);
}

const catchError = async (promise: Promise<unknown>) =>
	await promise.then(
		() => {
			throw new Error('Expected a rejection');
		},
		(error: unknown) => error,
	);

describe('importOnRemote', () => {
	it('sends the package with the source workflow id and the project, with the longest timeout', async () => {
		await inSession(async (session, { client }) => {
			await importOnRemote(session, {
				packageBase64: 'cGtn',
				sourceWorkflowId: 'wf1',
				projectId: 'p1',
			});

			expect(client.callTool).toHaveBeenCalledWith(
				'import_workflow_package',
				{ packageBase64: 'cGtn', sourceWorkflowId: 'wf1', projectId: 'p1' },
				{ timeoutMs: 60_000 },
			);
		});
	});

	it('reads a full result and keeps only the fields that it uses', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.import_workflow_package = () => ({
				workflowId: 'remote1',
				workflowName: 'Daily report',
				created: false,
				published: true,
				newVersionLive: true,
				credentialsNeedingSetup: [{ id: 'c1', name: 'Stripe', type: 'httpHeaderAuth', extra: 1 }],
				missingNodeTypes: ['n8n-nodes-acme.crm@2'],
				warnings: ['The import did not add 1 tag(s).'],
				futureField: 'ignored',
			});

			expect(
				await importOnRemote(session, { packageBase64: 'cGtn', sourceWorkflowId: 'wf1' }),
			).toEqual({
				workflowId: 'remote1',
				created: false,
				published: true,
				newVersionLive: true,
				credentialsNeedingSetup: [{ id: 'c1', name: 'Stripe', type: 'httpHeaderAuth' }],
				missingNodeTypes: ['n8n-nodes-acme.crm@2'],
				warnings: ['The import did not add 1 tag(s).'],
			});
		});
	});

	it('reads the result of an older instance without the lists and the publish state', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.import_workflow_package = () => ({ workflowId: 'remote1', created: true });

			const result = await importOnRemote(session, {
				packageBase64: 'cGtn',
				sourceWorkflowId: 'wf1',
			});

			expect(result).toStrictEqual({
				workflowId: 'remote1',
				created: true,
				published: false,
				newVersionLive: undefined,
				credentialsNeedingSetup: [],
				missingNodeTypes: [],
				warnings: [],
			});
		});
	});

	it.each([null, 'true', 1])(
		'does not tell which version is live for the value %j',
		async (newVersionLive) => {
			await inSession(async (session, { remote }) => {
				remote.handlers.import_workflow_package = () => ({
					workflowId: 'remote1',
					created: false,
					published: true,
					newVersionLive,
				});

				const result = await importOnRemote(session, {
					packageBase64: 'cGtn',
					sourceWorkflowId: 'wf1',
				});

				expect(result.newVersionLive).toBeUndefined();
				expect(result.published).toBe(true);
			});
		},
	);

	it('drops list items that it cannot use and puts remote text on one line', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.import_workflow_package = () => ({
				workflowId: 'remote1',
				created: true,
				credentialsNeedingSetup: [
					{ id: 'c/1', name: 'Bad id', type: 'x' },
					{ id: 'c2', name: 'Two\nlines‮', type: 'apiKey' },
					'not an object',
				],
				missingNodeTypes: [42, 'a@1', '   '],
				warnings: ['First\r\nSecond', null, '​'],
			});

			const result = await importOnRemote(session, {
				packageBase64: 'cGtn',
				sourceWorkflowId: 'wf1',
			});

			expect(result.credentialsNeedingSetup).toEqual([
				{ id: 'c2', name: 'Two lines', type: 'apiKey' },
			]);
			expect(result.missingNodeTypes).toEqual(['a@1']);
			expect(result.warnings).toEqual(['First Second']);
		});
	});

	it('cuts a long warning', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.import_workflow_package = () => ({
				workflowId: 'remote1',
				created: true,
				warnings: ['w'.repeat(2000)],
			});

			const [warning] = (
				await importOnRemote(session, { packageBase64: 'cGtn', sourceWorkflowId: 'wf1' })
			).warnings;

			expect(warning.length).toBeLessThanOrEqual(500);
			expect(warning.endsWith('...')).toBe(true);
		});
	});

	it.each([
		['no workflow id', { created: true }],
		['a workflow id with a slash', { workflowId: '../x', created: true }],
		['no created flag', { workflowId: 'remote1' }],
		['text', 'Imported.'],
	])('throws a tool error for a result with %s', async (_, result) => {
		await inSession(async (session, { remote }) => {
			remote.handlers.import_workflow_package = () => result;

			const error = await catchError(
				importOnRemote(session, { packageBase64: 'cGtn', sourceWorkflowId: 'wf1' }),
			);

			expect(error).toBeInstanceOf(RemoteInstanceError);
			expect(error).toHaveProperty('reason', 'tool-error');
		});
	});
});

describe('exportFromRemote', () => {
	it('asks for the workflow and returns its package', async () => {
		await inSession(async (session, { client }) => {
			const packageBase64 = await exportFromRemote(session, 'r1');

			expect(packageBase64).toBe(Buffer.from('remote-package').toString('base64'));
			expect(client.callTool).toHaveBeenCalledWith(
				'export_workflow_package',
				{ workflowId: 'r1' },
				{ timeoutMs: 60_000 },
			);
		});
	});

	it.each([{}, { packageBase64: '' }, { packageBase64: 7 }])(
		'throws a tool error for the result %j',
		async (result) => {
			await inSession(async (session, { remote }) => {
				remote.handlers.export_workflow_package = () => result;

				expect(await catchError(exportFromRemote(session, 'r1'))).toHaveProperty(
					'reason',
					'tool-error',
				);
			});
		},
	);
});

describe('publishOnRemote', () => {
	it('publishes the copy', async () => {
		await inSession(async (session, { remote }) => {
			expect(await publishOnRemote(session, 'remote1')).toEqual({ ok: true });
			expect(remote.callsOf('publish_workflow')).toEqual([{ workflowId: 'remote1' }]);
		});
	});

	it('reports the tool as unavailable without calling it', async () => {
		await inSession(
			async (session, { remote }) => {
				expect(await publishOnRemote(session, 'remote1')).toEqual({
					ok: false,
					failure: 'unavailable',
				});
				expect(remote.callsOf('publish_workflow')).toEqual([]);
			},
			['import_workflow_package'],
		);
	});

	it.each([
		[{ success: false, error: 'No trigger.' }, 'No trigger.'],
		[{ success: false }, 'no reason given'],
		[{ success: false, error: 12 }, 'no reason given'],
		[{ done: true }, 'The linked instance sent a result in an unknown format.'],
	])('reads the refusal %j', async (result, reason) => {
		await inSession(async (session, { remote }) => {
			remote.handlers.publish_workflow = () => result;

			expect(await publishOnRemote(session, 'remote1')).toEqual({
				ok: false,
				failure: 'refused',
				reason,
			});
		});
	});

	it('gives the text of a tool error on one line and without characters without width', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.publish_workflow = () => {
				throw new RemoteInstanceError('tool-error', 'Locked\nby\u202E someone');
			};

			expect(await publishOnRemote(session, 'remote1')).toEqual({
				ok: false,
				failure: 'refused',
				reason: 'Locked by someone',
			});
		});
	});

	it('turns a remote failure into a refusal', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.publish_workflow = () => {
				throw new RemoteInstanceError('unreachable');
			};

			expect(await publishOnRemote(session, 'remote1')).toEqual({
				ok: false,
				failure: 'refused',
				reason: 'n8n could not reach the linked instance.',
			});
		});
	});

	it('passes an unexpected error on', async () => {
		await inSession(async (session, { remote }) => {
			const bug = new Error('bug');
			remote.handlers.publish_workflow = () => {
				throw bug;
			};

			expect(await catchError(publishOnRemote(session, 'remote1'))).toBe(bug);
		});
	});
});

describe('the calls of the preflight', () => {
	it('wait at most 10 seconds for each list, as the project picker does', async () => {
		await inSession(async (session, { client }) => {
			await findRemotePersonalProjectId(session);
			await listRemoteCredentials(session, 'p1');

			expect(client.callTool).toHaveBeenCalledWith(
				'search_projects',
				{ type: 'personal', limit: 1 },
				{ timeoutMs: 10_000 },
			);
			expect(client.callTool).toHaveBeenCalledWith(
				'list_credentials',
				{ limit: 200, projectId: 'p1' },
				{ timeoutMs: 10_000 },
			);
		});
	});
});

describe('listRemoteCredentials', () => {
	it('returns null without the tool', async () => {
		await inSession(
			async (session) => {
				expect(await listRemoteCredentials(session, 'p1')).toBeNull();
			},
			['import_workflow_package'],
		);
	});

	it('lists the names and types in the project', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.list_credentials = () => ({
				data: [
					{ id: 'c1', name: 'Stripe', type: 'httpHeaderAuth', scopes: [] },
					{ id: 'c2', name: 'No type' },
				],
				count: 2,
			});

			expect(await listRemoteCredentials(session, 'p1')).toEqual({
				credentials: [{ name: 'Stripe', type: 'httpHeaderAuth' }],
				complete: true,
			});
			expect(remote.callsOf('list_credentials')).toEqual([{ limit: 200, projectId: 'p1' }]);
		});
	});

	it('is complete below the result limit of the tool and partial at it', async () => {
		await inSession(async (session, { remote }) => {
			const list = (length: number) => () => ({
				data: Array.from({ length }, (_, i) => ({ name: `c${i}`, type: 't' })),
			});

			remote.handlers.list_credentials = list(199);
			expect((await listRemoteCredentials(session, 'p1'))?.complete).toBe(true);
			remote.handlers.list_credentials = list(200);
			expect((await listRemoteCredentials(session, 'p1'))?.complete).toBe(false);
		});
	});

	it('throws a tool error for a result without a list', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.list_credentials = () => ({ error: 'Forbidden' });

			expect(await catchError(listRemoteCredentials(session, 'p1'))).toHaveProperty(
				'reason',
				'tool-error',
			);
		});
	});
});

describe('listPersonalRemoteCredentials', () => {
	/** The credentials of the personal project, and the ones that other users shared with its owner. */
	const listing =
		(owned: unknown[], shared: unknown[]) =>
		(args: Record<string, unknown>): unknown => ({
			data: args.onlySharedWithMe === true ? shared : owned,
		});
	const named = (count: number, prefix: string) =>
		Array.from({ length: count }, (_, i) => ({ name: `${prefix}${i}`, type: 't' }));

	it('adds the credentials that other users shared with the token user, because the import uses them', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.list_credentials = listing(
				[{ id: 'c1', name: 'Stripe', type: 'httpHeaderAuth' }],
				[{ id: 'c2', name: 'Twilio', type: 'twilioApi' }],
			);

			expect(await listPersonalRemoteCredentials(session, 'p1')).toEqual({
				credentials: [
					{ name: 'Stripe', type: 'httpHeaderAuth' },
					{ name: 'Twilio', type: 'twilioApi' },
				],
				complete: true,
			});
			expect(remote.callsOf('list_credentials')).toEqual([
				{ limit: 200, projectId: 'p1' },
				{ limit: 200, onlySharedWithMe: true },
			]);
		});
	});

	it.each([
		[199, 199, true],
		[200, 0, false],
		[0, 200, false],
		[200, 200, false],
	])(
		'is complete only when both lists are (%i own, %i shared: %s)',
		async (owned, shared, complete) => {
			await inSession(async (session, { remote }) => {
				remote.handlers.list_credentials = listing(named(owned, 'o'), named(shared, 's'));

				const list = await listPersonalRemoteCredentials(session, 'p1');

				expect(list?.complete).toBe(complete);
				expect(list?.credentials).toHaveLength(owned + shared);
			});
		},
	);

	it('returns null and asks nothing without the tool', async () => {
		await inSession(
			async (session, { client }) => {
				expect(await listPersonalRemoteCredentials(session, 'p1')).toBeNull();
				expect(client.callTool).not.toHaveBeenCalled();
			},
			['import_workflow_package', 'search_projects'],
		);
	});

	it('throws a tool error when the list of shared credentials has an unknown format', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.list_credentials = (args) =>
				args.onlySharedWithMe === true ? { error: 'Forbidden' } : { data: [] };

			expect(await catchError(listPersonalRemoteCredentials(session, 'p1'))).toHaveProperty(
				'reason',
				'tool-error',
			);
		});
	});
});

describe('findRemotePersonalProjectId', () => {
	it('asks for the personal project of the token user and returns its id', async () => {
		await inSession(async (session, { remote }) => {
			expect(await findRemotePersonalProjectId(session)).toBe(REMOTE_PERSONAL_PROJECT_ID);
			expect(remote.callsOf('search_projects')).toEqual([{ type: 'personal', limit: 1 }]);
		});
	});

	it('returns undefined without the tool, and without a personal project in the list', async () => {
		await inSession(
			async (session, { remote }) => {
				expect(await findRemotePersonalProjectId(session)).toBeUndefined();
				expect(remote.callsOf('search_projects')).toEqual([]);
			},
			['import_workflow_package'],
		);
		await inSession(async (session, { remote }) => {
			remote.handlers.search_projects = () => ({
				data: [{ id: 'Tm1pQ2rS3tU4vW5x', name: 'Ops', type: 'team' }],
				count: 1,
			});

			expect(await findRemotePersonalProjectId(session)).toBeUndefined();
		});
	});

	it('throws a tool error for a result without a project list', async () => {
		await inSession(async (session, { remote }) => {
			remote.handlers.search_projects = () => ({ error: 'Forbidden' });

			expect(await catchError(findRemotePersonalProjectId(session))).toHaveProperty(
				'reason',
				'tool-error',
			);
		});
	});
});
