/**
 * The node compiler reads the CommonJS JavaScript that `tsc` writes: the form
 * in which n8n and node packages ship nodes.
 */
import { commonJsToModule } from '../commonjs.ts';
import { specialiseNode } from '../specialise.ts';

const HELPERS = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRequest = apiRequest;
const n8n_workflow_1 = require("n8n-workflow");
async function apiRequest(method, path, body) {
    const credentials = await this.getCredentials('acmeApi');
    try {
        return await this.helpers.request({ method, uri: \`\${credentials.baseUrl}/v1/\${path}\`, headers: { 'X-Key': credentials.apiKey }, body, json: true });
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}`;

const NODE = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Acme = void 0;
const GenericFunctions_1 = require("./GenericFunctions");
class Acme {
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            if (operation === 'create') {
                const name = this.getNodeParameter('name', i);
                const responseData = await GenericFunctions_1.apiRequest.call(this, 'POST', 'items', { name });
                returnData.push(...this.helpers.returnJsonArray(responseData));
            }
            if (operation === 'remove') {
                await GenericFunctions_1.apiRequest.call(this, 'DELETE', 'items', {});
            }
        }
        return [returnData];
    }
}
exports.Acme = Acme;`;

describe('CommonJS node code', () => {
	it('becomes a module with imports and exports', () => {
		const text = commonJsToModule(HELPERS, (spec) => spec.startsWith('.'));
		expect(text).toContain('import { NodeApiError } from "n8n-workflow";');
		expect(text).toContain('new NodeApiError(this.getNode(), error)');
		expect(text).not.toContain('exports.');
		expect(commonJsToModule(NODE, (spec) => spec.startsWith('.'))).toContain(
			'import * as GenericFunctions_1 from "./GenericFunctions";',
		);
	});

	it('compiles a node from the JavaScript of a package, with no TypeScript source', () => {
		const files: Record<string, string> = {
			'/acme/dist/Acme.node.js': NODE,
			'/acme/dist/GenericFunctions.js': HELPERS,
		};
		const result = specialiseNode({
			type: 'n8n-nodes-acme.acme',
			version: 1,
			entry: '/acme/dist/Acme.node.js',
			readFile: (path) => files[path],
			parameters: { operation: 'create', name: 'Jo' },
			instanceId: null,
			credentialFields: { acmeApi: { baseUrl: 'https://api.acme.test' } },
		});
		expect(result.errors).toEqual([]);
		expect(result.linked).toEqual(['execute', 'GenericFunctions_1_apiRequest']);
		expect(result.source).toContain('https://api.acme.test/v1/');
		expect(result.source).toContain('{{$credentials.apiKey}}');
		// The other operation is not in the module.
		expect(result.source).not.toContain('DELETE');
	});
});
