import { publicCredential } from '../../credentials/public.ts';
import type { CredentialTypeInfo } from '../../credentials/types.ts';
import { evaluateInSandbox } from '../evaluate-node.ts';
import { specialiseNode } from '../specialise.ts';

const NODE = `
export class Acme {
	async execute() {
		const credentials = await this.getCredentials('acmeApi');
		const base = credentials.environment === 'sandbox' ? 'https://sandbox.acme.test' : credentials.baseUrl;
		const response = await this.helpers.request({ method: 'GET', uri: base + '/v1/items', headers: { 'X-Key': credentials.apiKey } });
		return [this.helpers.returnJsonArray(response)];
	}
}`;

const BRANCH_ON_SECRET = NODE.replace(
	"credentials.environment === 'sandbox'",
	"credentials.apiKey === 'x'",
);

const compileWith = (source: string, credentialFields?: Record<string, Record<string, unknown>>) =>
	specialiseNode({
		type: 'n8n-nodes-acme.acme',
		version: 1,
		entry: '/acme/Acme.node.ts',
		readFile: (path) => (path === '/acme/Acme.node.ts' ? source : undefined),
		parameters: {},
		instanceId: null,
		credentialFields,
	});

const info: CredentialTypeInfo = {
	name: 'acmeApi',
	defaults: {
		environment: 'production',
		baseUrl: 'https://api.acme.test',
		apiKey: '',
		accountName: '',
	},
	fields: {
		environment: { type: 'options', password: false },
		baseUrl: { type: 'string', password: false },
		apiKey: { type: 'string', password: true },
		accountName: { type: 'string', password: false },

		webhookSecret: { type: 'string', password: false },
		useProxy: { type: 'boolean', password: false },
	},
};

describe('public credential fields', () => {
	it('are the choices, the flags and the addresses, and never a secret', () => {
		const { fields, classes } = publicCredential(info, {
			environment: 'sandbox',
			apiKey: 'sk-1',
			accountName: 'Jo',
			webhookSecret: 'w',
			useProxy: true,
		});
		expect(fields).toEqual({
			environment: 'sandbox',
			baseUrl: 'https://api.acme.test',
			useProxy: true,
		});
		expect(classes).toEqual([
			'@acmeApi.baseUrl=set',
			'@acmeApi.environment=sandbox',
			'@acmeApi.useProxy=true',
		]);
	});
});

describe('credentials in the node compiler', () => {
	it('folds a branch on a public field, and keeps the secret as a template', () => {
		const result = compileWith(NODE, {
			acmeApi: { environment: 'sandbox', baseUrl: 'https://api.acme.test' },
		});
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('https://sandbox.acme.test');
		expect(result.source).not.toContain('https://api.acme.test');
		expect(result.source).toContain('{{$credentials.apiKey}}');
	});

	it('does not compile a branch on a field when the caller gives no public fields', () => {
		const result = compileWith(NODE);
		expect(result.source).toBeUndefined();
		expect(result.errors.join(' ')).toContain('compares or branches on a credential field');
	});

	it('does not compile a branch on a secret, with or without public fields', () => {
		const result = compileWith(BRANCH_ON_SECRET, {
			acmeApi: { environment: 'sandbox', baseUrl: 'https://api.acme.test' },
		});
		expect(result.source).toBeUndefined();
		expect(result.errors.join(' ')).toContain('compares or branches on a credential field');
	});
});

describe('publish-time evaluation', () => {
	it('does not fold a call whose result JSON cannot hold', () => {
		const source = `
export class Acme {
	async execute() {
		const id = parseInt('v1', 10);
		const response = await this.helpers.request({ method: 'GET', uri: 'https://api.acme.test/items/' + id });
		return [this.helpers.returnJsonArray(response)];
	}
}`;
		const result = specialiseNode({
			type: 'n8n-nodes-acme.acme',
			version: 1,
			entry: '/acme/Acme.node.ts',
			readFile: (path) => (path === '/acme/Acme.node.ts' ? source : undefined),
			parameters: {},
			instanceId: null,
			evaluate: evaluateInSandbox,
		});
		expect(result.errors).toEqual([]);
		expect(result.source).toContain("parseInt('v1', 10)");
		expect(result.source).not.toContain('/items/null');
	});
});
