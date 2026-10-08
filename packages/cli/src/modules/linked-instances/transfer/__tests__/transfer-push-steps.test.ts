import type { LinkedInstanceSummary } from '@n8n/api-types';
import fc from 'fast-check';

import { fakeToken } from '../../__tests__/linked-instances.test-helpers';
import { RemoteInstanceError } from '../../remote/remote-instance.errors';
import { textCleaner, type RemoteSession } from '../linked-instance-sessions';
import type { RemoteImportResult } from '../remote-transfer-tools';
import { RemoteImportError, TRANSFER_WARNINGS } from '../transfer-errors';
import { importWithFallback, publishBlockers, publishCopy } from '../transfer-push-steps';
import { ALL_TOOLS, OPS } from './transfer.test-helpers';

const LINK: LinkedInstanceSummary = {
	id: 'link-1',
	name: 'Cloud',
	baseUrl: 'https://cloud.test',
	status: 'online',
	lastVerifiedAt: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	defaultRemoteProject: OPS,
};

const EDITOR_LOCK = 'Cannot modify workflow while it is being edited by a user in the editor.';
const REFUSED_PROJECT =
	'The project does not exist, or you do not have permission to create workflows in it.';
const STUB_CREDENTIAL = { id: 'cred-stub', name: 'Mailgun', type: 'httpHeaderAuth' };

type ToolHandler = (args: Record<string, unknown>) => unknown;

/** A session over a fake linked instance, with the cleaning of a real session. */
function stepSession(handlers: Record<string, ToolHandler>) {
	const callTool = vi.fn<RemoteSession['callTool']>(async (name, args) => {
		const handler = handlers[name];
		if (!handler) throw new Error(`Unexpected tool ${name}`);
		return handler(args);
	});
	const session: RemoteSession = {
		link: LINK,
		callTool,
		toolNames: new Set(ALL_TOOLS),
		clean: textCleaner(fakeToken()),
	};
	const callsOf = (name: string) =>
		callTool.mock.calls.filter(([tool]) => tool === name).map(([, args]) => args);
	return { session, callsOf };
}

/** The result of a re-import into a copy that was live there. */
const reimported = (fields: Partial<RemoteImportResult> = {}): RemoteImportResult => ({
	workflowId: 'remote1',
	created: false,
	published: true,
	newVersionLive: false,
	credentialsNeedingSetup: [],
	missingNodeTypes: [],
	warnings: [],
	...fields,
});

const publishRefuses = (error: string) => () => ({ success: false, error });

describe('publishCopy', () => {
	it('does not publish again when the import put the new version live, also while someone edits the copy', async () => {
		const { session, callsOf } = stepSession({ publish_workflow: publishRefuses(EDITOR_LOCK) });

		const outcome = await publishCopy(session, reimported({ newVersionLive: true }));

		expect(outcome).toEqual({ published: true, failed: false, warnings: [] });
		expect(callsOf('publish_workflow')).toEqual([]);
	});

	it('does not block a new version that is live with an empty credential that the copy used before', async () => {
		const { session, callsOf } = stepSession({});

		const outcome = await publishCopy(
			session,
			reimported({ newVersionLive: true, credentialsNeedingSetup: [STUB_CREDENTIAL] }),
		);

		expect(outcome).toEqual({ published: true, failed: false, warnings: [] });
		expect(callsOf('publish_workflow')).toEqual([]);
	});

	it('publishes when an earlier version stays live, and reports a refusal with that version still live', async () => {
		const { session, callsOf } = stepSession({ publish_workflow: publishRefuses(EDITOR_LOCK) });

		const outcome = await publishCopy(session, reimported());

		expect(callsOf('publish_workflow')).toEqual([{ workflowId: 'remote1' }]);
		expect(outcome).toEqual({
			published: true,
			failed: true,
			warnings: [TRANSFER_WARNINGS.publishFailed('Cloud', EDITOR_LOCK)],
		});
	});

	it('keeps the publish step for an older instance that does not tell which version is live', async () => {
		const { session, callsOf } = stepSession({ publish_workflow: () => ({ success: true }) });

		const outcome = await publishCopy(
			session,
			reimported({ created: true, published: false, newVersionLive: undefined }),
		);

		expect(outcome).toEqual({ published: true, failed: false, warnings: [] });
		expect(callsOf('publish_workflow')).toEqual([{ workflowId: 'remote1' }]);
	});

	it('does not publish a new version that is not live and has an empty credential', async () => {
		const { session, callsOf } = stepSession({});

		const outcome = await publishCopy(
			session,
			reimported({ credentialsNeedingSetup: [STUB_CREDENTIAL] }),
		);

		expect(outcome).toEqual({
			published: true,
			failed: true,
			warnings: [TRANSFER_WARNINGS.credentialsNeedSetup('Cloud', 1)],
		});
		expect(callsOf('publish_workflow')).toEqual([]);
	});
});

describe('publishBlockers', () => {
	const credentials = (count: number) =>
		Array.from({ length: count }, (_, i) => ({ ...STUB_CREDENTIAL, id: `c${i}` }));

	it.each([
		[0, 0, []],
		[1, 0, [TRANSFER_WARNINGS.missingNodeTypes('Cloud')]],
		[0, 1, [TRANSFER_WARNINGS.credentialsNeedSetup('Cloud', 1)]],
		[
			2,
			3,
			[
				TRANSFER_WARNINGS.missingNodeTypes('Cloud'),
				TRANSFER_WARNINGS.credentialsNeedSetup('Cloud', 3),
			],
		],
	])(
		'gives the blockers for %i missing node types and %i empty credentials',
		(nodeTypes, credentialCount, expected) => {
			const imported = reimported({
				missingNodeTypes: Array.from({ length: nodeTypes }, (_, i) => `n8n-nodes-acme.n${i}@1`),
				credentialsNeedingSetup: credentials(credentialCount),
			});

			expect(publishBlockers('Cloud', imported)).toEqual(expected);
		},
	);

	it('is empty exactly when both lists are empty, with one entry for each list that is not', () => {
		fc.assert(
			fc.property(
				fc.array(fc.string(), { maxLength: 5 }),
				fc.nat({ max: 5 }),
				fc.boolean(),
				(missingNodeTypes, credentialCount, newVersionLive) => {
					const blockers = publishBlockers(
						'Cloud',
						reimported({
							missingNodeTypes,
							credentialsNeedingSetup: credentials(credentialCount),
							newVersionLive,
						}),
					);

					const nonEmptyLists = Number(missingNodeTypes.length > 0) + Number(credentialCount > 0);
					expect(blockers).toHaveLength(nonEmptyLists);
					if (missingNodeTypes.length > 0) {
						expect(blockers[0]).toBe(TRANSFER_WARNINGS.missingNodeTypes('Cloud'));
					}
					if (credentialCount > 0) {
						expect(blockers.at(-1)).toContain(`${credentialCount} credential`);
					}
				},
			),
		);
	});
});

describe('importWithFallback', () => {
	const args = { packageBase64: 'cGtn', sourceWorkflowId: 'wf1' };

	it('imports into the personal project only after the fixed refusal of the project', async () => {
		const { session, callsOf } = stepSession({
			import_workflow_package: (callArgs) => {
				if (callArgs.projectId !== undefined) {
					throw new RemoteInstanceError('tool-error', REFUSED_PROJECT);
				}
				return { workflowId: 'remote1', created: true };
			},
		});

		const sent = await importWithFallback(session, args);

		expect(sent.targetProject).toBeNull();
		expect(sent.warnings).toEqual([TRANSFER_WARNINGS.personalProjectFallback('Cloud', 'Ops')]);
		expect(callsOf('import_workflow_package')).toEqual([{ ...args, projectId: OPS.id }, args]);
	});

	it.each([
		'Workflow is not available in MCP. Enable MCP access from the workflow card in the workflows list.',
		"Workflow 'remote1' is archived and cannot be accessed.",
	])(
		'makes no second copy when the name of the copy holds the words of a project refusal (%s)',
		async (reason) => {
			const name = 'Invoices (permission to create workflows in it)';
			const { session, callsOf } = stepSession({
				import_workflow_package: () => {
					throw new RemoteInstanceError(
						'tool-error',
						`The package matches the workflow "${name}" (remote1) in the target project, so the import would update that workflow. ${reason} You can also import the package into another project.`,
					);
				},
			});

			const error = await importWithFallback(session, args).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(RemoteImportError);
			expect(error).toHaveProperty('project', OPS);
			expect(callsOf('import_workflow_package')).toEqual([{ ...args, projectId: OPS.id }]);
		},
	);
});
