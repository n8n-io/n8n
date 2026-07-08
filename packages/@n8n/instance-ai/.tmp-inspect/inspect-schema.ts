import { zodToJsonSchema } from '@n8n/agents';
import { createWorkflowsTool } from '../src/tools/workflows.tool';

const svc: any = new Proxy(() => {}, { get: () => () => {}, apply: () => Promise.resolve({}) });
const ctx: any = {
	userId: 'u',
	workflowService: svc,
	executionService: svc,
	credentialService: svc,
	nodeService: svc,
	dataTableService: svc,
	workspaceService: svc,
	logger: { debug() {}, info() {}, warn() {}, error() {} },
};
const tool = createWorkflowsTool(ctx, 'orchestrator');
const schema = zodToJsonSchema(tool.inputSchema);
const full = JSON.stringify(schema);
console.log('total chars:', full.length);
console.log(JSON.stringify(schema, null, 1));
