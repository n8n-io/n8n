var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Memoized } from '@n8n/decorators';
import callsites from 'callsites';
import glob from 'fast-glob';
import { mock } from './mock-extended';
import isEmpty from 'lodash/isEmpty';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createRunExecutionData, UnexpectedError, Workflow } from 'n8n-workflow';
import nock from 'nock';
import { readFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect } from 'vitest';
import { ExecutionLifecycleHooks } from '../dist/execution-engine/execution-lifecycle-hooks';
import { WorkflowExecute } from '../dist/execution-engine/workflow-execute';
import { CredentialTypes } from './credential-types';
import { CredentialsHelper } from './credentials-helper';
import { LoadNodesAndCredentials } from './load-nodes-and-credentials';
import { NodeTypes } from './node-types';
export class NodeTestHarness {
    testDir;
    packagePaths;
    nodesLoadedPromise;
    loadNodesAndCredentials;
    constructor({ additionalPackagePaths } = {}) {
        this.testDir = path.dirname(callsites()[1].getFileName());
        this.packagePaths = additionalPackagePaths ?? [];
        this.packagePaths.unshift(this.packageDir);
        beforeAll(() => this.ensureNodesLoaded(), 30_000);
        beforeEach(() => nock.disableNetConnect());
    }
    readWorkflowJSON(filePath) {
        if (!filePath.startsWith(this.relativePath)) {
            filePath = path.join(this.testDir, filePath);
        }
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
    setupTests(options = {}) {
        const workflowFilenames = options.workflowFiles?.map((fileName) => path.join(this.relativePath, fileName)) ??
            this.workflowFilenames;
        const tests = this.workflowToTests(workflowFilenames, options);
        for (const testData of tests) {
            this.setupTest(testData, options);
        }
    }
    setupTest(testData, options = {}) {
        if (options.assertBinaryData)
            testData.output.assertBinaryData = true;
        if (options.credentials)
            testData.credentials = options.credentials;
        if (options.nock)
            testData.nock = options.nock;
        test(testData.description, async () => {
            if (testData.nock)
                this.setupNetworkMocks(testData.nock);
            const { result, nodeExecutionOrder } = await this.executeWorkflow(testData);
            this.assertOutput(testData, result, nodeExecutionOrder);
            if (options.customAssertions)
                options.customAssertions();
        }, 20_000);
    }
    get temporaryDir() {
        const dir = mkdtempSync(path.join(tmpdir(), 'n8n-'));
        afterAll(() => rmSync(dir, { recursive: true }));
        return dir;
    }
    workflowToTests(workflowFiles, options = {}) {
        const testCases = [];
        for (const filePath of workflowFiles) {
            const description = filePath.replace('.json', '');
            const workflowData = this.readWorkflowJSON(filePath);
            workflowData.nodes.forEach((node) => {
                if (node.parameters) {
                    node.parameters = JSON.parse(JSON.stringify(node.parameters).replace(/"C:\\\\Test\\\\(.*)"/, `"${this.testDir}/$1"`));
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
            }, {});
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
    get packageDir() {
        let packageDir = this.testDir;
        while (packageDir !== '/') {
            if (existsSync(path.join(packageDir, 'package.json')))
                break;
            packageDir = path.dirname(packageDir);
        }
        if (packageDir === '/') {
            throw new UnexpectedError('Invalid package');
        }
        return packageDir;
    }
    get relativePath() {
        return path.relative(this.packageDir, this.testDir);
    }
    get workflowFilenames() {
        return glob.sync(`${this.relativePath}/**/*.json`, { cwd: this.packageDir });
    }
    setupNetworkMocks({ baseUrl, mocks }) {
        const agent = nock(baseUrl);
        mocks.forEach(({ method, path, statusCode, requestBody, requestHeaders, responseBody, responseHeaders, }) => {
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
        });
    }
    async ensureNodesLoaded() {
        if (!this.nodesLoadedPromise) {
            this.nodesLoadedPromise = (async () => {
                this.loadNodesAndCredentials = new LoadNodesAndCredentials(this.packagePaths);
                await this.loadNodesAndCredentials.init();
            })();
        }
        return this.nodesLoadedPromise;
    }
    async executeWorkflow(testData) {
        await this.ensureNodesLoaded();
        const nodeTypes = new NodeTypes(this.loadNodesAndCredentials);
        const credentialTypes = new CredentialTypes(this.loadNodesAndCredentials);
        const credentialsHelper = new CredentialsHelper(credentialTypes);
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
        const nodeExecutionOrder = [];
        hooks.addHandler('nodeExecuteAfter', (nodeName) => {
            nodeExecutionOrder.push(nodeName);
        });
        const waitPromise = createDeferredPromise();
        hooks.addHandler('workflowExecuteAfter', (fullRunData) => waitPromise.resolve(fullRunData));
        const additionalData = mock({
            executionId: '1',
            webhookWaitingBaseUrl: 'http://localhost/waiting-webhook',
            formWaitingBaseUrl: 'http://localhost/waiting-form',
            hooks,
            // Get from node.parameters
            currentNodeParameters: undefined,
            parentCallbackManager: undefined,
            ssrfBridge: undefined,
            encryptedRunnerIdentity: undefined,
        });
        additionalData.credentialsHelper = credentialsHelper;
        // Prevent the auto-mocked property from being truthy so credential and
        // request helpers don't take the eval-mock code path.
        additionalData.evalLlmMockHandler = undefined;
        let executionData;
        const runExecutionData = createRunExecutionData({
            executionData: {
                waitingExecutionSource: null,
                nodeExecutionStack: [
                    {
                        node: workflowInstance.getStartNode(),
                        data: {
                            main: [[testData.trigger?.input ?? { json: {} }]],
                        },
                        source: null,
                    },
                ],
            },
        });
        const workflowExecute = new WorkflowExecute(additionalData, executionMode, runExecutionData);
        executionData = await workflowExecute.processRunExecutionData(workflowInstance);
        const result = await waitPromise.promise;
        return { executionData, result, nodeExecutionOrder };
    }
    getResultNodeData(result, testData) {
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
                return nodeData.data.main[0].map((entry) => {
                    if (entry.binary && isEmpty(entry.binary))
                        delete entry.binary;
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
    assertOutput(testData, result, nodeExecutionOrder) {
        const { output } = testData;
        // Check if the nodes did executed in the correct order (if the test defines this)
        if (output.nodeExecutionOrder?.length) {
            expect(nodeExecutionOrder).toEqual(output.nodeExecutionOrder);
        }
        const { finished, status, data: { executionData, resultData }, } = result;
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
                        }
                        else {
                            for (const key in binary) {
                                delete binary[key].directory;
                                delete binary[key].bytes;
                            }
                        }
                    }
                    // Convert errors to JSON so tests can compare
                    if (json?.error instanceof Error) {
                        json.error = JSON.parse(JSON.stringify(json.error, ['message', 'name', 'description', 'context']));
                    }
                });
            });
            const msg = `Equality failed for "${testData.description}" at node "${nodeName}"`;
            // When continue on fail is on the json wrapper is removed for some reason
            const runs = output.nodeData[nodeName];
            if (Array.isArray(runs)) {
                for (let runIndex = 0; runIndex < runs.length; runIndex++) {
                    const run = runs[runIndex];
                    if (!Array.isArray(run))
                        continue;
                    for (let itemIndex = 0; itemIndex < run.length; itemIndex++) {
                        const original = run[itemIndex];
                        if (original && !original.json) {
                            run[itemIndex] = { json: { ...original } };
                        }
                    }
                }
            }
            expect(resultData, msg).toEqual(output.nodeData[nodeName]);
        });
        if (finished) {
            expect(status).toEqual('success');
        }
        else {
            expect(status).toEqual('waiting');
        }
    }
}
__decorate([
    Memoized,
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], NodeTestHarness.prototype, "temporaryDir", null);
__decorate([
    Memoized,
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], NodeTestHarness.prototype, "packageDir", null);
__decorate([
    Memoized,
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], NodeTestHarness.prototype, "relativePath", null);
__decorate([
    Memoized,
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], NodeTestHarness.prototype, "workflowFilenames", null);
//# sourceMappingURL=node-test-harness.js.map