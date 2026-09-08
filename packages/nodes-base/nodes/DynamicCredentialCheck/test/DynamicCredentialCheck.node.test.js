import { DynamicCredentialCheck } from '../DynamicCredentialCheck.node';
describe('DynamicCredentialCheck Node', () => {
    let node;
    beforeEach(() => {
        node = new DynamicCredentialCheck();
    });
    const inputItems = [{ json: { data: 'test' } }];
    const executionContext = {
        version: 1,
        establishedAt: Date.now(),
        source: 'webhook',
        credentials: 'encrypted-credentials',
    };
    const createMockExecuteFunctions = (opts) => {
        const helpers = {};
        if (opts.checkCredentialStatus !== null) {
            helpers.checkCredentialStatus = opts.checkCredentialStatus ?? vi.fn();
        }
        return {
            getInputData: () => inputItems,
            getExecutionContext: () => opts.hasExecutionContext === false ? undefined : executionContext,
            getWorkflow: () => ({ id: opts.workflowId }),
            getNode: () => ({
                name: 'Check Credential Status',
                type: 'n8n-nodes-base.dynamicCredentialCheck',
            }),
            helpers,
        };
    };
    describe('sensitiveOutputFields', () => {
        it('should declare authorizationUrl as sensitive', () => {
            expect(node.description.sensitiveOutputFields).toContain('credentials[*].authorizationUrl');
        });
        it('should declare revokeUrl as sensitive', () => {
            expect(node.description.sensitiveOutputFields).toContain('credentials[*].revokeUrl');
        });
    });
    describe('execute', () => {
        it('should route items to Ready output when all credentials are configured', async () => {
            const mockResult = {
                readyToExecute: true,
                credentials: [
                    {
                        credentialId: 'cred-1',
                        credentialName: 'OAuth2 API',
                        credentialType: 'oauth2Api',
                        resolverId: 'resolver-1',
                        status: 'configured',
                    },
                ],
            };
            const fns = createMockExecuteFunctions({
                workflowId: 'workflow-1',
                checkCredentialStatus: vi.fn().mockResolvedValue(mockResult),
            });
            const output = await node.execute.call(fns);
            expect(output[0]).toEqual(inputItems);
            expect(output[1]).toEqual([]);
        });
        it('should route items to Not Ready output with check result when credentials are missing', async () => {
            const mockResult = {
                readyToExecute: false,
                credentials: [
                    {
                        credentialId: 'cred-1',
                        credentialName: 'OAuth2 API',
                        credentialType: 'oauth2Api',
                        resolverId: 'resolver-1',
                        status: 'missing',
                        authorizationUrl: 'https://auth.example.com',
                    },
                ],
            };
            const fns = createMockExecuteFunctions({
                workflowId: 'workflow-1',
                checkCredentialStatus: vi.fn().mockResolvedValue(mockResult),
            });
            const output = await node.execute.call(fns);
            expect(output[0]).toEqual([]);
            expect(output[1]).toHaveLength(1);
            expect(output[1][0].json).toEqual(mockResult);
        });
        it('should route to Ready when no execution context is available', async () => {
            const fns = createMockExecuteFunctions({
                hasExecutionContext: false,
                workflowId: 'workflow-1',
            });
            const output = await node.execute.call(fns);
            expect(output[0]).toEqual(inputItems);
            expect(output[1]).toEqual([]);
        });
        it('should route to Ready when workflow ID is not available', async () => {
            const fns = createMockExecuteFunctions({
                workflowId: undefined,
            });
            const output = await node.execute.call(fns);
            expect(output[0]).toEqual(inputItems);
            expect(output[1]).toEqual([]);
        });
        it('should route to Ready when checkCredentialStatus helper is not available', async () => {
            const fns = createMockExecuteFunctions({
                workflowId: 'workflow-1',
                checkCredentialStatus: null,
            });
            const output = await node.execute.call(fns);
            expect(output[0]).toEqual(inputItems);
            expect(output[1]).toEqual([]);
        });
    });
});
//# sourceMappingURL=DynamicCredentialCheck.node.test.js.map