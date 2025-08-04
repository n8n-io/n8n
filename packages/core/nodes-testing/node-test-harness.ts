import { Memoized } from '@n8n/decorators';
import { Container } from '@n8n/di';
import callsites from 'callsites';
import glob from 'fast-glob';
import { mock } from 'jest-mock-extended';
import isEmpty from 'lodash/isEmpty';
import type {
	ICredentialDataDecryptedObject,
	IRun,
	IRunExecutionData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowTestData,
} from 'n8n-workflow';
import { createDeferredPromise, UnexpectedError, Workflow } from 'n8n-workflow';
import nock from 'nock';
import { readFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ExecutionLifecycleHooks } from '../dist/execution-engine/execution-lifecycle-hooks';
import { WorkflowExecute } from '../dist/execution-engine/workflow-execute';
import { CredentialsHelper } from './credentials-helper';
import { LoadNodesAndCredentials } from './load-nodes-and-credentials';
import { NodeTypes } from './node-types';

type NodeOutputs = WorkflowTestData['output']['nodeData'];

type TestHarnessOptions = {
	additionalPackagePaths?: string[];
};

type TestOptions = {
	credentials?: Record<string, ICredentialDataDecryptedObject>;
	assertBinaryData?: boolean;
	workflowFiles?: string[];
	nock?: WorkflowTestData['nock'];
	customAssertions?: () => void;
};

export class NodeTestHarness {
	private readonly testDir: string;

	private readonly packagePaths: string[];

	constructor({ additionalPackagePaths }: TestHarnessOptions = {}) {
		this.testDir = path.dirname(callsites()[1].getFileName()!);
		this.packagePaths = additionalPackagePaths ?? [];
		this.packagePaths.unshift(this.packageDir);

		beforeEach(() => nock.disableNetConnect());
	}

	readWorkflowJSON(filePath: string) {
		if (!filePath.startsWith(this.relativePath)) {
			filePath = path.join(this.testDir, filePath);
		}
		return JSON.parse(readFileSync(filePath, 'utf-8')) as IWorkflowBase &
			Pick<WorkflowTestData, 'trigger'>;
	}

	setupTests(options: TestOptions = {}) {
		const workflowFilenames =
			options.workflowFiles?.map((fileName) => path.join(this.relativePath, fileName)) ??
			this.workflowFilenames;

		const tests = this.workflowToTests(workflowFilenames, options);
		for (const testData of tests) {
			this.setupTest(testData, options);
		}
	}

	setupTest(testData: WorkflowTestData, options: TestOptions = {}) {
		if (options.assertBinaryData) testData.output.assertBinaryData = true;
		if (options.credentials) testData.credentials = options.credentials;
		if (options.nock) testData.nock = options.nock;

		test(testData.description, async () => {
			if (testData.nock) this.setupNetworkMocks(testData.nock);
			const { result, nodeExecutionOrder } = await this.executeWorkflow(testData);
			this.assertOutput(testData, result, nodeExecutionOrder);

			if (options.customAssertions) options.customAssertions();
		});
	}

	@Memoized
	get temporaryDir() {
		const dir = mkdtempSync(path.join(tmpdir(), 'n8n-'));
		afterAll(() => rmSync(dir, { recursive: true }));
		return dir;
	}

	private workflowToTests(workflowFiles: string[], options: TestOptions = {}) {
		const testCases: WorkflowTestData[] = [];
		for (const filePath of workflowFiles) {
			const description = filePath.replace('.json', '');
			const workflowData = this.readWorkflowJSON(filePath);
			workflowData.nodes.forEach((node) => {
				if (node.parameters) {
					node.parameters = JSON.parse(
						JSON.stringify(node.parameters).replace(/"C:\\\\Test\\\\(.*)"/, `"${this.testDir}/$1"`),
					);
				}
			});

			const { pinData } = workflowData;
			if (pinData === undefined) {
				throw new UnexpectedError('Workflow data does not contain pinData');
			}
			const nodeData = Object.keys(pinData).reduce((acc, key) => {
				const items = pinData[key];
				acc[key] = [items];
				return acc;
			}, {} as NodeOutputs);
			delete workflowData.pinData;

			const { trigger } = workflowData;
			delete workflowData.trigger;

			testCases.push({
				description,
				input: { workflowData },
				output: { nodeData },
				trigger,
				credentials: options.credentials,
			});
		}
		return testCases;
	}

	@Memoized
	private get packageDir() {
		let packageDir = this.testDir;
		while (packageDir !== '/') {
			if (existsSync(path.join(packageDir, 'package.json'))) break;
			packageDir = path.dirname(packageDir);
		}
		if (packageDir === '/') {
			throw new UnexpectedError('Invalid package');
		}
		return packageDir;
	}

	@Memoized
	private get relativePath() {
		return path.relative(this.packageDir, this.testDir);
	}

	@Memoized
	private get workflowFilenames() {
		return glob.sync(`${this.relativePath}/**/*.json`, { cwd: this.packageDir });
	}

	private setupNetworkMocks({ baseUrl, mocks }: NonNullable<WorkflowTestData['nock']>) {
		const agent = nock(baseUrl);
		mocks.forEach(
			({
				method,
				path,
				statusCode,
				requestBody,
				requestHeaders,
				responseBody,
				responseHeaders,
			}) => {
				let mock = agent[method](path, requestBody);

				// nock interceptor reqheaders option is ignored, so we chain matchHeader()
				// agent[method](path, requestBody, { reqheaders: requestHeaders }).reply(statusCode, responseBody, responseHeaders)
				// https://github.com/nock/nock/issues/2545
				if (requestHeaders && Object.keys(requestHeaders).length > 0) {
					Object.entries(requestHeaders).forEach(([key, value]) => {
						mock = mock.matchHeader(key, value);
					});
				}

				mock.reply(statusCode, responseBody, responseHeaders);
			},
		);
	}

	private async executeWorkflow(testData: WorkflowTestData) {
		const loadNodesAndCredentials = new LoadNodesAndCredentials(this.packagePaths);
		Container.set(LoadNodesAndCredentials, loadNodesAndCredentials);
		await loadNodesAndCredentials.init();
		const nodeTypes = Container.get(NodeTypes);
		const credentialsHelper = Container.get(CredentialsHelper);
		credentialsHelper.setCredentials(testData.credentials ?? {});

		const executionMode = testData.trigger?.mode ?? 'manual';
		const { connections, nodes, settings } = testData.input.workflowData;
		const workflowInstance = new Workflow({
			id: 'test',
			nodes,
			connections,
			nodeTypes,
			settings,
			active: false,
		});

		const hooks = new ExecutionLifecycleHooks('trigger', '1', mock());

		const nodeExecutionOrder: string[] = [];
		hooks.addHandler('nodeExecuteAfter', (nodeName) => {
			nodeExecutionOrder.push(nodeName);
		});

		const waitPromise = createDeferredPromise<IRun>();
		hooks.addHandler('workflowExecuteAfter', (fullRunData) => waitPromise.resolve(fullRunData));

		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			executionId: '1',
			webhookWaitingBaseUrl: 'http://localhost/waiting-webhook',
			hooks,
			// Get from node.parameters
			currentNodeParameters: undefined,
		});
		additionalData.credentialsHelper = credentialsHelper;

		let executionData: IRun;
		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
			executionData: {
				metadata: {},
				contextData: {},
				waitingExecution: {},
				waitingExecutionSource: null,
				nodeExecutionStack: [
					{
						node: workflowInstance.getStartNode()!,
						data: {
							main: [[testData.trigger?.input ?? { json: {} }]],
						},
						source: null,
					},
				],
			},
		};

		const workflowExecute = new WorkflowExecute(additionalData, executionMode, runExecutionData);
		executionData = await workflowExecute.processRunExecutionData(workflowInstance);

		const result = await waitPromise.promise;
		return { executionData, result, nodeExecutionOrder };
	}

	private getResultNodeData(result: IRun, testData: WorkflowTestData) {
		const { runData } = result.data.resultData;
		return Object.keys(testData.output.nodeData).map((nodeName) => {
			if (runData[nodeName] === undefined) {
				// log errors from other nodes
				Object.keys(runData).forEach((key) => {
					const error = runData[key][0]?.error;
					if (error) {
						console.log(`Node ${key}\n`, error);
					}
				});

				throw new UnexpectedError(`Data for node "${nodeName}" is missing!`);
			}
			const resultData = runData[nodeName].map((nodeData) => {
				if (nodeData.data === undefined) {
					return null;
				}
				// TODO: iterate all runIndexes
				return nodeData.data.main[0]!.map((entry) => {
					if (entry.binary && isEmpty(entry.binary)) delete entry.binary;
					delete entry.pairedItem;
					return entry;
				});
			});
			return {
				nodeName,
				resultData,
			};
		});
	}

	private assertOutput(testData: WorkflowTestData, result: IRun, nodeExecutionOrder: string[]) {
		const { output } = testData;

		// Check if the nodes did executed in the correct order (if the test defines this)
		if (output.nodeExecutionOrder?.length) {
			expect(nodeExecutionOrder).toEqual(output.nodeExecutionOrder);
		}

		const {
			finished,
			status,
			data: { executionData, resultData },
		} = result;
		if (output.nodeExecutionStack) {
			expect(executionData?.nodeExecutionStack).toEqual(output.nodeExecutionStack);
		}

		if (output.error) {
			const { error } = resultData;
			const errorMessage = (error?.cause ? error.cause : error)?.message;
			expect(errorMessage).toBeDefined();
			expect(output.error).toBe(errorMessage);
			expect(finished).toBeUndefined();
			return;
		}

		// check if result node data matches expected test data
		const resultNodeData = this.getResultNodeData(result, testData);
		resultNodeData.forEach(({ nodeName, resultData }) => {
			resultData.forEach((items) => {
				items?.forEach((item) => {
					const { binary, json } = item;
					if (binary) {
						if (!output.assertBinaryData) {
							delete item.binary;
						} else {
							for (const key in binary) {
								delete binary[key].directory;
							}
						}
					}

					// Convert errors to JSON so tests can compare
					if (json?.error instanceof Error) {
						json.error = JSON.parse(
							JSON.stringify(json.error, ['message', 'name', 'description', 'context']),
						);
					}
				});
			});

			const msg = `Equality failed for "${testData.description}" at node "${nodeName}"`;
			expect(resultData, msg).toEqual(output.nodeData[nodeName]);
		});

		if (finished) {
			expect(status).toEqual('success');
		} else {
			expect(status).toEqual('waiting');
		}
	}
}
