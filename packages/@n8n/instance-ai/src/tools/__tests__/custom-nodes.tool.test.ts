import type { InstanceAiPermissions } from '@n8n/api-types';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { runInSandbox } from '../../workspace/sandbox-fs';
import { createCustomNodesTool } from '../custom-nodes.tool';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: async () => await Promise.resolve('/sandbox'),
}));
vi.mock('../../workspace/sandbox-fs', async (importOriginal) => ({
	...(await importOriginal<object>()),
	runInSandbox: vi.fn(),
}));

const manifest = {
	kind: 'action',
	id: 'acme.task.create',
	semver: '1.1.0',
	contract: { credentials: ['acmeApi'], egress: { hosts: ['api.acme.com'] } },
};
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Answers `check` with success and `pack --json` with `packStdout`. */
function sandboxAnswers(packStdout: string, packExitCode = 0) {
	vi.mocked(runInSandbox).mockImplementation(async (_workspace, command) =>
		command.includes('pack --json')
			? { exitCode: packExitCode, stdout: packStdout, stderr: 'pack stderr' }
			: { exitCode: 0, stdout: 'check passed', stderr: '' },
	);
}

const packLine = (bundle: string) =>
	JSON.stringify({ actions: [{ manifest, bundle, sdk: 'sdk-runtime' }] });

function createContext(
	threadId: string | undefined,
	permissions: Partial<InstanceAiPermissions> = {},
	userId = 'user-1',
): InstanceAiContext {
	return {
		userId,
		threadId,
		nodeContractsEnabled: true,
		workspace: mock<NonNullable<InstanceAiContext['workspace']>>(),
		permissions: permissions as InstanceAiPermissions,
		logger: mock(),
		customNodeService: {
			test: vi.fn().mockResolvedValue({
				status: 'success',
				items: [{ id: 1 }],
				fixture: { params: {}, responses: [] },
			}),
			publish: vi.fn().mockResolvedValue({ id: 'acme.task.create', semver: '1.1.0' }),
		},
	} as unknown as InstanceAiContext;
}

// The runtime suspend resolves to a marker object that the handler returns.
const suspendMock = () => vi.fn().mockResolvedValue({ suspended: true });
const noResume = (suspend = suspendMock()) => ({ resumeData: undefined, suspend }) as never;
const resumed = (approved: boolean, bundleHash?: string) =>
	({
		resumeData: { approved },
		suspend: vi.fn(),
		continuation: bundleHash === undefined ? undefined : { bundleHash },
	}) as never;

const publishInput = { action: 'publish', slug: 'acme', actionId: 'acme.task.create' };
const testInput = { action: 'test', slug: 'acme', actionId: 'acme.task.create', params: {} };
const runAllowed = { executeNode: 'always_allow' } as const;

describe('custom-nodes tool', () => {
	afterEach(() => vi.resetAllMocks());

	it('pack reads the last stdout line and returns no bundle text', async () => {
		sandboxAnswers(`building...\n${packLine('bundle-a')}\n`);
		const context = createContext('thread-pack');

		const result = await executeTool(
			createCustomNodesTool(context),
			{ action: 'pack', slug: 'acme' },
			noResume(),
		);

		expect(result).toEqual({
			actions: [{ id: 'acme.task.create', semver: '1.1.0', bundleHash: sha256('bundle-a') }],
		});
		expect(JSON.stringify(result)).not.toContain('bundle-a');
		expect(runInSandbox).toHaveBeenCalledWith(
			context.workspace,
			'npx --no-install n8n-node-next pack --json',
			expect.objectContaining({ cwd: '/sandbox/nodes/acme' }),
		);
	});

	it('pack returns stderr when the CLI prints no JSON', async () => {
		sandboxAnswers('', 1);

		const result = await executeTool(
			createCustomNodesTool(createContext('thread-fail')),
			{ action: 'pack', slug: 'acme' },
			noResume(),
		);

		expect(result).toEqual({ error: expect.stringContaining('pack stderr') });
	});

	it('publish refuses code without a successful test', async () => {
		sandboxAnswers(packLine('bundle-untested'));
		const context = createContext('thread-untested', { publishCustomNode: 'always_allow' });

		const result = await executeTool(createCustomNodesTool(context), publishInput, noResume());

		expect(result).toEqual({ success: false, error: expect.stringContaining('first') });
		expect(context.customNodeService!.publish).not.toHaveBeenCalled();
	});

	it('publish suspends for approval and publishes the tested bundle after approval', async () => {
		sandboxAnswers(packLine('bundle-tested'));
		const context = createContext('thread-approve', runAllowed);
		const tool = createCustomNodesTool(context);

		const tested = await executeTool(
			tool,
			{ action: 'test', slug: 'acme', actionId: 'acme.task.create', params: { title: 'x' } },
			noResume(),
		);
		expect(tested).toMatchObject({ status: 'success', bundleHash: sha256('bundle-tested') });
		const packed = { manifest, bundle: 'bundle-tested', sdk: 'sdk-runtime' };
		expect(context.customNodeService!.test).toHaveBeenCalledWith(packed, { title: 'x' }, undefined);

		const suspend = suspendMock();
		await executeTool(tool, publishInput, noResume(suspend));
		const bundleHash = sha256('bundle-tested');
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				severity: 'destructive',
				resourceName: 'acme.task.create',
				message: expect.stringContaining(
					`Hosts: api.acme.com. Credential types: acmeApi. Bundle: ${bundleHash.slice(0, 12)}.`,
				),
			}),
			{ continuation: { bundleHash } },
		);
		expect(context.customNodeService!.publish).not.toHaveBeenCalled();

		const result = await executeTool(tool, publishInput, resumed(true, bundleHash));
		expect(context.customNodeService!.publish).toHaveBeenCalledWith(packed, {
			executions: [{ params: {}, responses: [] }],
		});
		expect(result).toEqual({ success: true, id: 'acme.task.create', semver: '1.1.0' });
	});

	it('publish does not publish when the user denies it', async () => {
		const context = createContext('thread-deny');

		const result = await executeTool(createCustomNodesTool(context), publishInput, resumed(false));

		expect(result).toMatchObject({ denied: true, reason: 'User denied the action' });
		expect(context.customNodeService!.publish).not.toHaveBeenCalled();
	});

	it('publish is denied in blocked mode', async () => {
		const context = createContext('thread-blocked', { publishCustomNode: 'blocked' });

		const result = await executeTool(createCustomNodesTool(context), publishInput, noResume());

		expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		expect(runInSandbox).not.toHaveBeenCalled();
		expect(context.customNodeService!.publish).not.toHaveBeenCalled();
	});

	it('returns a publish refusal of the host as an error', async () => {
		sandboxAnswers(packLine('bundle-refused'));
		const context = createContext('thread-refused', {
			publishCustomNode: 'always_allow',
			...runAllowed,
		});
		vi.mocked(context.customNodeService!.publish).mockRejectedValue(
			new Error('The change needs a minor bump: 1.1.0'),
		);
		const tool = createCustomNodesTool(context);
		await executeTool(tool, testInput, noResume());

		const result = await executeTool(tool, publishInput, noResume());

		expect(result).toEqual({ error: 'The change needs a minor bump: 1.1.0' });
	});

	it('test is denied when executeNode is blocked', async () => {
		const context = createContext('thread-test-blocked', { executeNode: 'blocked' });

		const result = await executeTool(createCustomNodesTool(context), testInput, noResume());

		expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		expect(runInSandbox).not.toHaveBeenCalled();
		expect(context.customNodeService!.test).not.toHaveBeenCalled();
	});

	it('test asks for approval with hosts, credential types, and bundle, then runs', async () => {
		sandboxAnswers(packLine('bundle-approve-test'));
		const context = createContext('thread-test-approve', { executeNode: 'require_approval' });
		const tool = createCustomNodesTool(context);
		const bundleHash = sha256('bundle-approve-test');

		const suspend = suspendMock();
		await executeTool(tool, { ...testInput, credentialId: 'cred-1' }, noResume(suspend));
		expect(suspend).toHaveBeenCalledWith(
			{
				requestId: expect.any(String),
				message:
					'Run acme.task.create@1.1.0 once against live APIs with credential cred-1. ' +
					`Hosts: api.acme.com. Credential types: acmeApi. Bundle: ${bundleHash.slice(0, 12)}.`,
				resourceName: 'acme.task.create',
				severity: 'warning',
			},
			{ continuation: { bundleHash } },
		);
		expect(context.customNodeService!.test).not.toHaveBeenCalled();

		const result = await executeTool(
			tool,
			{ ...testInput, credentialId: 'cred-1' },
			resumed(true, bundleHash),
		);
		expect(result).toMatchObject({ status: 'success', bundleHash });
		expect(context.customNodeService!.test).toHaveBeenCalledTimes(1);
	});

	it('publish refuses on resume when the code changed after approval', async () => {
		sandboxAnswers(packLine('bundle-changed'));
		const context = createContext('thread-changed', runAllowed);
		const tool = createCustomNodesTool(context);
		await executeTool(tool, testInput, noResume());

		const result = await executeTool(tool, publishInput, resumed(true, sha256('bundle-approved')));

		expect(result).toEqual({ success: false, error: expect.stringContaining('changed') });
		expect(context.customNodeService!.publish).not.toHaveBeenCalled();
	});

	it('test and publish refuse a call without a thread', async () => {
		const context = createContext(undefined, { ...runAllowed, publishCustomNode: 'always_allow' });
		const tool = createCustomNodesTool(context);

		const tested = await executeTool(tool, testInput, noResume());
		const published = await executeTool(tool, publishInput, noResume());

		expect(tested).toEqual({ error: expect.stringContaining('thread') });
		expect(published).toEqual({ error: expect.stringContaining('thread') });
		expect(runInSandbox).not.toHaveBeenCalled();
	});

	it('publish does not use a fixture that another user tested', async () => {
		sandboxAnswers(packLine('bundle-other-user'));
		const permissions = { ...runAllowed, publishCustomNode: 'always_allow' } as const;
		const tester = createContext('thread-shared', permissions, 'user-1');
		const publisher = createContext('thread-shared', permissions, 'user-2');
		await executeTool(createCustomNodesTool(tester), testInput, noResume());

		const result = await executeTool(createCustomNodesTool(publisher), publishInput, noResume());

		expect(result).toEqual({ success: false, error: expect.stringContaining('first') });
		expect(publisher.customNodeService!.publish).not.toHaveBeenCalled();
	});
});
