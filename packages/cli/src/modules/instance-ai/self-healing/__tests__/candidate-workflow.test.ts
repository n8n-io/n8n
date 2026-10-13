import {
	createScopedWorkspace,
	Workspace,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';
import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { InstanceAiContext } from '@n8n/instance-ai';
import {
	buildImports,
	generateWorkflowCode,
	parseWorkflowCode,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import { exec } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { toWorkflowJSON } from '../../workflow-json';
import { compileCandidateWorkflow } from '../candidate-workflow';

function makeBaseline(): WorkflowSuggestionBaseline {
	return {
		workflowId: 'workflow-1',
		projectId: 'project-1',
		backgroundUserId: 'user-1',
		expectedBaseline: {
			savedVersionId: 'version-1',
			publishedVersionId: 'version-1',
			checksum: 'checksum',
			versionCounter: 1,
			latestPublishHistoryEventId: null,
		},
		original: {
			name: 'Captured workflow',
			description: 'Keep this description.',
			settings: { timezone: 'Europe/Prague' },
			meta: { templateId: 'original-template' },
			pinData: { Start: [{ json: { original: true } }] },
			nodes: [
				{
					id: 'request',
					name: 'Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [625, 173],
					parameters: { url: 'https://example.test/original', options: {} },
					credentials: { httpHeaderAuth: { id: 'credential-1', name: 'Request credential' } },
					continueOnFail: true,
					forceCustomOperation: { resource: 'record', operation: 'read' },
				},
				{
					id: 'start',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [125, 173],
					parameters: {},
				},
			],
			connections: { Start: { main: [[{ node: 'Request', type: 'main', index: 0 }]] } },
		},
	};
}

describe('compileCandidateWorkflow', () => {
	let directory: string;
	let baseline: WorkflowSuggestionBaseline;
	let context: InstanceAiContext;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), 'n8n-candidate-test-'));
		const filesystem = mock<WorkspaceFilesystem>({
			provider: 'local',
			basePath: directory,
			readFile: async (path) => await readFile(path, 'utf-8'),
		});
		context = mock<InstanceAiContext>({
			workspace: createScopedWorkspace(new Workspace({ filesystem }), directory),
			nodeTypesProvider: undefined,
			credentialService: mock<InstanceAiContext['credentialService']>(),
			logger: mock<InstanceAiContext['logger']>(),
		});
		baseline = makeBaseline();
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	async function compile(filePath = 'candidate.json') {
		return await compileCandidateWorkflow({ baseline, context, filePath });
	}

	function generatedWorkflow(): WorkflowJSON {
		return parseWorkflowCode(
			generateWorkflowCode({
				workflow: toWorkflowJSON({ ...baseline.original, id: baseline.workflowId }),
				includeNodeIds: true,
				includePositions: false,
			}),
		);
	}

	async function writeCandidate(workflow: WorkflowJSON) {
		await writeFile(join(directory, 'candidate.json'), JSON.stringify(workflow));
	}

	function changeUrl(workflow: WorkflowJSON, url: string) {
		const request = workflow.nodes.find((node) => node.id === 'request');
		if (!request) throw new Error('The request node is missing.');
		request.parameters = { ...request.parameters, url };
	}

	it('keeps baseline fields and node identity when SDK source changes parameters', async () => {
		const workflow = generatedWorkflow();
		changeUrl(workflow, 'https://example.test/fixed');
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow).toEqual({
			...baseline.original,
			nodes: [
				{
					...baseline.original.nodes[0],
					parameters: { url: 'https://example.test/fixed', options: {} },
				},
				baseline.original.nodes[1],
			],
		});
		expect(result.candidateChecksum).toEqual(expect.any(String));
		expect(baseline.original.nodes[0].parameters.url).toBe('https://example.test/original');
	});

	it('keeps credential preferences informational when a candidate uses captured credentials', async () => {
		baseline.original.nodes[0].parameters = {
			url: 'https://api.stripe.com/v1/charges',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			options: {},
		};
		context.credentialService.listHttpCredentialHosts = vi
			.fn()
			.mockResolvedValue([{ type: 'stripeApi', hosts: ['api.stripe.com'] }]);
		const workflow = generatedWorkflow();
		changeUrl(workflow, 'https://api.stripe.com/v1/customers');
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow.nodes[0].parameters.url).toBe('https://api.stripe.com/v1/customers');
		expect(result.workflow.nodes[0].credentials).toEqual(baseline.original.nodes[0].credentials);
		expect(result.warnings).toContainEqual(
			expect.objectContaining({
				code: 'PREFER_PREDEFINED_CREDENTIAL',
				nodeName: 'Request',
				severity: 'informational',
			}),
		);
	});

	it('rejects an unchanged SDK roundtrip despite automatic layout and node order changes', async () => {
		await writeCandidate(generatedWorkflow());

		expect(await compile()).toMatchObject({ success: false, reason: 'candidate_unchanged' });
	});

	it('does not treat a generated webhook ID as a workflow change', async () => {
		baseline.original.nodes[1].type = 'n8n-nodes-base.webhook';
		baseline.original.nodes[1].typeVersion = 2;
		baseline.original.nodes[1].parameters = { path: 'example' };
		await writeCandidate(generatedWorkflow());

		expect(await compile()).toMatchObject({ success: false, reason: 'candidate_unchanged' });
	});

	it('rejects an unchanged JSON baseline with legacy node fields', async () => {
		await writeFile(
			join(directory, 'candidate.json'),
			JSON.stringify({
				...baseline.original,
				id: baseline.workflowId,
			}),
		);

		expect(await compile()).toMatchObject({ success: false, reason: 'candidate_unchanged' });
	});

	it('removes the legacy error flag when the candidate removes its generated setting', async () => {
		const workflow = generatedWorkflow();
		const request = workflow.nodes.find((node) => node.id === 'request')!;
		delete request.onError;
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow.nodes[0]).not.toHaveProperty('continueOnFail');
		expect(result.workflow.nodes[0]).not.toHaveProperty('onError');
	});

	it('reads each edit to the same file and identifies the actual compiled candidate', async () => {
		const workflow = generatedWorkflow();
		changeUrl(workflow, 'https://example.test/first');
		await writeCandidate(workflow);
		const first = await compile();
		changeUrl(workflow, 'https://example.test/second');
		await writeCandidate(workflow);
		const second = await compile();

		expect(first.success && second.success).toBe(true);
		if (!first.success || !second.success) return;
		expect(first.candidateChecksum).not.toBe(second.candidateChecksum);
		expect(second.workflow.nodes[0].parameters.url).toBe('https://example.test/second');
	});

	it('accepts added nodes and connection changes', async () => {
		const workflow = generatedWorkflow();
		workflow.nodes.push({
			id: 'finish',
			name: 'Finish',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [900, 173],
			parameters: {},
		});
		workflow.connections.Request = { main: [[{ node: 'Finish', type: 'main', index: 0 }]] };
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow.nodes.map((node) => node.id)).toEqual(['request', 'start', 'finish']);
		expect(result.workflow.connections).toEqual(workflow.connections);
	});

	it('rejects changes to workflow settings', async () => {
		const workflow = generatedWorkflow();
		workflow.settings = { timezone: 'UTC' };
		await writeCandidate(workflow);

		expect(await compile()).toMatchObject({
			success: false,
			errors: [expect.stringContaining('workflow field "settings"')],
		});
	});

	it('rejects an explicit removal of workflow metadata', async () => {
		await writeFile(
			join(directory, 'candidate.json'),
			JSON.stringify({
				...generatedWorkflow(),
				meta: null,
			}),
		);

		expect(await compile()).toMatchObject({
			success: false,
			errors: [expect.stringContaining('workflow field "meta"')],
		});
	});

	it('rejects changed identities and credential references', async () => {
		const workflow = generatedWorkflow();
		const request = workflow.nodes.find((node) => node.id === 'request')!;
		request.id = 'different-id';
		await writeCandidate(workflow);
		expect(await compile()).toMatchObject({
			success: false,
			errors: [expect.stringContaining('existing ID')],
		});

		request.id = 'request';
		request.credentials = { httpHeaderAuth: { id: 'other-credential', name: 'Other credential' } };
		await writeCandidate(workflow);
		expect(await compile()).toMatchObject({
			success: false,
			errors: [expect.stringContaining('Credential changes')],
		});
	});

	it('rejects a connection to a missing node', async () => {
		const workflow = generatedWorkflow();
		workflow.connections.Start = { main: [[{ node: 'Missing', type: 'main', index: 0 }]] };
		await writeCandidate(workflow);

		expect(await compile()).toMatchObject({ success: false, reason: 'candidate_invalid' });
	});

	it('rejects blocking compiler diagnostics for an edited node', async () => {
		const workflow = generatedWorkflow();
		changeUrl(workflow, '');
		await writeCandidate(workflow);

		expect(await compile()).toMatchObject({
			success: false,
			reason: 'candidate_invalid',
			errors: [expect.stringContaining('missing URL')],
		});
	});

	it('compiles a TypeScript candidate through the workspace sandbox', async () => {
		const localRequire = createRequire(__filename);
		await mkdir(join(directory, 'node_modules', '@n8n'), { recursive: true });
		await symlink(
			dirname(localRequire.resolve('@n8n/workflow-sdk/package.json')),
			join(directory, 'node_modules', '@n8n', 'workflow-sdk'),
		);
		await symlink(
			dirname(
				localRequire.resolve('tsx/package.json', {
					paths: [dirname(localRequire.resolve('@n8n/instance-ai'))],
				}),
			),
			join(directory, 'node_modules', 'tsx'),
		);
		await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
		await writeFile(
			join(directory, 'build.mjs'),
			`
try {
  const { default: workflow } = await import(process.argv[2]);
  console.log(JSON.stringify({ success: true, workflow: workflow.toJSON({ tidyUp: true }) }));
} catch (error) {
  console.log(JSON.stringify({ success: false, errors: [error.message] }));
}
`,
		);
		const sandbox = mock<WorkspaceSandbox>({
			executeCommand: async (command, _args, options) =>
				await new Promise((resolve) => {
					exec(
						command,
						{ cwd: options?.cwd, signal: options?.abortSignal },
						(error, stdout, stderr) => {
							resolve({
								success: !error,
								exitCode: error ? 1 : 0,
								stdout,
								stderr,
								executionTimeMs: 0,
							});
						},
					);
				}),
		});
		context.workspace = createScopedWorkspace(
			new Workspace({ filesystem: context.workspace?.filesystem, sandbox }),
			directory,
		);
		const workflow = toWorkflowJSON({ ...baseline.original, id: baseline.workflowId });
		changeUrl(workflow, 'https://example.test/typescript');
		const body = generateWorkflowCode({ workflow, includeNodeIds: true, includePositions: false });
		await writeFile(join(directory, 'candidate.workflow.ts'), `${buildImports(body)}\n\n${body}`);

		const result = await compile('candidate.workflow.ts');

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow.nodes[0].parameters.url).toBe('https://example.test/typescript');
		expect(result.workflow.nodes[0].position).toEqual([625, 173]);

		await writeFile(join(directory, 'candidate.workflow.ts'), 'export default broken;');
		expect(await compile('candidate.workflow.ts')).toMatchObject({
			success: false,
			reason: 'workflow_source_build_failed',
		});
	});

	it('returns a compile failure for invalid source', async () => {
		await writeFile(join(directory, 'candidate.json'), '{ invalid');

		expect(await compile()).toMatchObject({ success: false, reason: 'workflow_json_parse_failed' });
	});

	it('does not read candidates outside the scoped workspace', async () => {
		await writeCandidate(generatedWorkflow());

		expect(await compile('../candidate.json')).toMatchObject({
			success: false,
			reason: 'candidate_not_found',
		});
		expect(await compile('/candidate.json')).toMatchObject({
			success: false,
			reason: 'candidate_not_found',
		});
	});

	it('rejects verification when parameters are hidden', async () => {
		await writeCandidate(generatedWorkflow());
		context.allowSendingParameterValues = false;

		expect(await compile()).toMatchObject({
			success: false,
			reason: 'parameter_sharing_disabled',
		});
	});
});
