import {
	createScopedWorkspace,
	Workspace,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';
import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { computeChatModelValidationIssues, type InstanceAiContext } from '@n8n/instance-ai';
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

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	computeChatModelValidationIssues: vi.fn(async () => ({})),
}));

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
					parameters: {
						authentication: 'genericCredentialType',
						genericAuthType: 'httpHeaderAuth',
						url: 'https://example.test/original',
						options: {},
					},
					credentials: { httpHeaderAuth: { id: 'credential-1', name: 'Request credential' } },
					continueOnFail: true,
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
		vi.mocked(computeChatModelValidationIssues).mockResolvedValue({});
		baseline = makeBaseline();
		directory = await mkdtemp(join(tmpdir(), 'n8n-candidate-test-'));
		const filesystem = mock<WorkspaceFilesystem>({
			provider: 'local',
			basePath: directory,
			readFile: async (path) => await readFile(path, 'utf-8'),
		});
		context = mock<InstanceAiContext>({
			workspace: createScopedWorkspace(new Workspace({ filesystem }), directory),
			nodeTypesProvider: undefined,
			workflowService: mock<InstanceAiContext['workflowService']>(),
			nodeService: mock<InstanceAiContext['nodeService']>(),
			credentialService: mock<InstanceAiContext['credentialService']>({
				list: async () => [
					{ id: 'credential-1', name: 'Request credential', type: 'httpHeaderAuth' },
					{ id: 'other-credential', name: 'Other credential', type: 'httpHeaderAuth' },
				],
				isAiGatewayCredentialType: undefined,
				isManagedOAuthCredentialType: undefined,
			}),
			logger: mock<InstanceAiContext['logger']>(),
		});
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
		expect(result.workflow).toMatchObject({
			name: baseline.original.name,
			description: baseline.original.description,
			settings: baseline.original.settings,
			meta: baseline.original.meta,
			pinData: baseline.original.pinData,
			connections: baseline.original.connections,
		});
		expect(result.workflow.nodes.find((node) => node.id === 'request')).toMatchObject({
			name: 'Request',
			position: [625, 173],
			parameters: { url: 'https://example.test/fixed' },
			credentials: baseline.original.nodes[0].credentials,
		});
		expect(result.workflow.nodes.find((node) => node.id === 'start')).toMatchObject({
			name: 'Start',
			position: [125, 173],
		});
		expect(baseline.original.nodes[0].parameters.url).toBe('https://example.test/original');
	});

	it('keeps node telemetry tags through source conversion and compilation', async () => {
		const tags = { tag: [{ key: 'department', value: 'operations' }] };
		baseline.original.nodes[0].customTelemetryTags = tags;
		const workflow = generatedWorkflow();
		changeUrl(workflow, 'https://example.test/fixed');
		await writeCandidate(workflow);

		const result = await compile();
		expect(result).toMatchObject({
			success: true,
			workflow: {
				nodes: expect.arrayContaining([
					expect.objectContaining({ id: 'request', customTelemetryTags: tags }),
				]),
			},
		});
	});

	it('accepts an unchanged candidate for verification', async () => {
		await writeCandidate(generatedWorkflow());

		expect(await compile()).toMatchObject({ success: true });
	});

	it.each(['added', 'changed', 'unchanged', 'disabled', 'restored'] as const)(
		'reports placeholders on %s nodes',
		async (kind) => {
			const placeholder = '<__PLACEHOLDER_VALUE__Request URL__>';
			if (kind === 'unchanged') baseline.original.nodes[0].parameters.url = placeholder;
			const workflow = generatedWorkflow();
			changeUrl(workflow, placeholder);
			const request = workflow.nodes.find((node) => node.name === 'Request')!;
			if (kind === 'changed') {
				request.parameters = { ...request.parameters, options: { timeout: placeholder } };
			}
			if (kind === 'added') {
				workflow.nodes.push({
					...structuredClone(request),
					id: 'new-request',
					name: 'New request',
				});
				changeUrl(workflow, 'https://example.test/original');
			}
			if (kind === 'disabled') request.disabled = true;
			await writeCandidate(workflow);

			const result = await compile();
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.warnings.filter(({ code }) => code === 'unresolved_placeholders')).toHaveLength(
				kind === 'added' || kind === 'changed' ? 1 : 0,
			);
		},
	);

	it.each(['unchanged', 'changed', 'restored'])('checks %s model settings', async (kind) => {
		const changed = kind === 'changed';
		baseline.original.nodes[0].type = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
		baseline.original.nodes[0].parameters = {
			model: 'existing-model',
			options: { temperature: 0.7 },
		};
		vi.mocked(computeChatModelValidationIssues).mockImplementation(
			async (_context, node): Promise<Record<string, string[]>> =>
				node.name === 'Request' ? { model: ['The selected model is unavailable.'] } : {},
		);
		const workflow = generatedWorkflow();
		if (kind === 'restored') {
			const request = workflow.nodes.find((node) => node.name === 'Request')!;
			request.parameters = {
				...request.parameters,
				options: { temperature: '<__PLACEHOLDER_VALUE__Temperature__>' },
			};
		}
		if (changed) {
			workflow.nodes.find((node) => node.name === 'Request')!.parameters = {
				model: 'unavailable-model',
			};
		}
		await writeCandidate(workflow);

		const result = await compile();
		expect(result.success).toBe(!changed);
		if (changed) {
			expect(result).toMatchObject({
				reason: 'chat_model_validation_failed',
				errors: ['Request: The selected model is unavailable.'],
			});
		}
	});

	it('restores an existing webhook ID through the builder preparation', async () => {
		baseline.original.nodes[1].type = 'n8n-nodes-base.webhook';
		baseline.original.nodes[1].typeVersion = 2;
		baseline.original.nodes[1].parameters = { path: 'example' };
		baseline.original.nodes[1].webhookId = 'existing-webhook';
		const workflow = generatedWorkflow();
		delete workflow.nodes.find((node) => node.id === 'start')!.webhookId;
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow.nodes.find((node) => node.id === 'start')?.webhookId).toBe(
			'existing-webhook',
		);
	});

	it('removes the legacy error flag when the candidate removes its generated setting', async () => {
		const workflow = generatedWorkflow();
		const request = workflow.nodes.find((node) => node.id === 'request')!;
		delete request.onError;
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		const compiledRequest = result.workflow.nodes.find((node) => node.id === 'request');
		expect(compiledRequest).not.toHaveProperty('continueOnFail');
		expect(compiledRequest).not.toHaveProperty('onError');
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
		expect(result.workflow.nodes.map((node) => node.id)).toEqual(
			expect.arrayContaining(['request', 'start', 'finish']),
		);
		expect(result.workflow.connections).toEqual(workflow.connections);
	});

	it('keeps baseline workflow fields when source changes them', async () => {
		const workflow = generatedWorkflow();
		workflow.name = 'Candidate name';
		workflow.settings = { timezone: 'UTC' };
		await writeFile(
			join(directory, 'candidate.json'),
			JSON.stringify({
				...workflow,
				meta: null,
			}),
		);

		expect(await compile()).toMatchObject({
			success: true,
			workflow: {
				name: baseline.original.name,
				settings: baseline.original.settings,
				meta: baseline.original.meta,
			},
		});
	});

	it('recovers an existing node ID through the builder preparation', async () => {
		const workflow = generatedWorkflow();
		const request = workflow.nodes.find((node) => node.id === 'request')!;
		request.id = 'different-id';
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow.nodes.find((node) => node.name === 'Request')?.id).toBe('request');
	});

	it('accepts a credential reference available to the builder', async () => {
		const workflow = generatedWorkflow();
		const request = workflow.nodes.find((node) => node.id === 'request')!;
		request.credentials = { httpHeaderAuth: { id: 'other-credential', name: 'Other credential' } };
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.workflow.nodes.find((node) => node.id === 'request')?.credentials).toEqual(
			request.credentials,
		);
		expect(result.credentialResolution.mockedNodeNames).toEqual([]);
	});

	it('reports missing credentials for verification simulation', async () => {
		const workflow = generatedWorkflow();
		workflow.nodes.push({
			id: 'new-request',
			name: 'New request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [900, 173],
			parameters: {
				authentication: 'genericCredentialType',
				genericAuthType: 'httpBasicAuth',
				url: 'https://example.test/new',
			},
			credentials: { httpBasicAuth: { id: 'missing', name: 'Missing credential' } },
		});
		workflow.connections.Request = { main: [[{ node: 'New request', type: 'main', index: 0 }]] };
		await writeCandidate(workflow);

		const result = await compile();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.credentialResolution).toMatchObject({
			mockedNodeNames: ['New request'],
			mockedCredentialTypes: ['httpBasicAuth'],
			mockedCredentialsByNode: { 'New request': ['httpBasicAuth'] },
		});
		expect(result.workflow.nodes.find((node) => node.id === 'new-request')?.credentials).toEqual(
			{},
		);
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
		expect(result.workflow.nodes.find((node) => node.id === 'request')).toMatchObject({
			parameters: { url: 'https://example.test/typescript' },
			position: [625, 173],
		});

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
