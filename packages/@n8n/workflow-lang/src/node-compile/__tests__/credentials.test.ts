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

	it('makes a value that code computes from a credential field a derived value of the credential', () => {
		const result = compileWith(BRANCH_ON_SECRET);
		expect(result.errors).toEqual([]);
		expect(result.derivations).toHaveLength(1);
		expect(result.derivations?.[0].code).toContain("c.apiKey === 'x'");
		expect(result.source).toContain(`{{$credentials.n8nDerived.${result.derivations?.[0].name}}}`);
		expect(result.source).not.toContain('sandbox.acme.test');
	});

	it('does not compile a statement that branches on a secret', () => {
		const result = compileWith(
			NODE.replace(
				'const base =',
				"if (credentials.apiKey === 'x') throw new Error('no');\n\t\tconst base =",
			),
		);
		expect(result.source).toBeUndefined();
		expect(result.errors.join(' ')).toContain('compares or branches on a credential field');
	});
});

describe('a credential as a whole value', () => {
	const node = (body: string, helpers = '') => `
${helpers}
export class Acme {
	async execute() {
${body}
		return [this.helpers.returnJsonArray(response)];
	}
}`;
	const request = (headers: string) =>
		`await this.helpers.request({ method: 'GET', uri: 'https://api.acme.test/v1/items', headers: ${headers} })`;

	it('folds a check that the credential is there, and reads fields by pattern and by key', () => {
		const result = compileWith(
			node(`
		const credentials = await this.getCredentials('acmeApi');
		if (credentials === undefined) throw new Error('No credentials got returned!');
		const { apiKey, accountName: account } = credentials;
		const response = ${request("{ 'X-Key': apiKey, 'X-Account': account, 'X-Hook': credentials['webhook-secret'] }")};`),
		);
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('No credentials got returned');
		expect(result.source).toContain('{{$credentials.apiKey}}');
		expect(result.source).toContain('{{$credentials.accountName}}');
		expect(result.source).toContain('{{$credentials.webhook-secret}}');
	});

	it('follows the credential into a function that reads its fields', () => {
		const result = compileWith(
			node(
				`
		const credentials = await this.getCredentials('acmeApi');
		const response = ${request('headersOf(credentials)')};`,
				`function headersOf(credentials) {
	if (credentials === undefined) throw new Error('No credentials got returned!');
	const { apiKey, accountName } = credentials;
	return { apiKey, 'X-Account': accountName };
}`,
			),
		);
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('No credentials got returned');
		expect(result.source).toContain('{{$credentials.apiKey}}');
		expect(result.source).toContain('{{$credentials.accountName}}');
	});

	it('keeps credentials with the same name in different branches apart', () => {
		const result = compileWith(
			node(`
		const headers = {};
		const items = this.getInputData();
		if (items.length > 1) {
			const credentials = await this.getCredentials('acmeApi');
			headers['X-Key'] = credentials.apiKey;
		} else {
			const credentials = await this.getCredentials('acmeTokenApi');
			headers['X-Token'] = credentials.token;
		}
		const response = ${request('headers')};`),
			{ acmeApi: { apiKey: 'not-read' }, acmeTokenApi: { token: 'https://public.acme.test' } },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('not-read');
		expect(result.source).toContain('https://public.acme.test');
	});

	it('takes the credential that a function returns', () => {
		const result = compileWith(
			node(
				`
		const { apiKey } = await pick.call(this);
		const response = ${request("{ 'X-Key': apiKey }")};`,
				`async function pick() {
	const authentication = this.getNodeParameter('authentication', 0, 'key');
	if (authentication === 'key') {
		return await this.getCredentials('acmeApi');
	} else {
		return await this.getCredentials('acmeOAuth2Api');
	}
}`,
			),
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('{{$credentials.apiKey}}');
	});

	it('knows the credential of a variable inside a loop when a branch before the loop set it', () => {
		const result = compileWith(
			node(`
		const authentication = this.getNodeParameter('authentication', 0, 'key');
		let credentials;
		if (authentication === 'key') {
			credentials = await this.getCredentials('acmeApi');
		} else {
			credentials = await this.getCredentials('acmeOAuth2Api');
		}
		let response;
		for (let i = 0; i < 1; i++) {
			response = ${request("{ 'X-Key': credentials.apiKey }")};
		}`),
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('{{$credentials.apiKey}}');
	});

	it.each([
		['a comparison with a value', "if (credentials === 'x') throw new Error('no');"],
		['a place in an object', 'const holder = { credentials };\n\t\tconsole.log(holder);'],
		['a pattern with a default', "const { apiKey = 'x' } = credentials;\n\t\tconsole.log(apiKey);"],
		['a computed key', 'console.log(credentials[this.getNodeParameter("field", 0)]);'],
	])('does not compile %s', (_, statement) => {
		const result = compileWith(
			node(`
		const credentials = await this.getCredentials('acmeApi');
		${statement}
		const response = ${request("{ 'X-Key': credentials.apiKey }")};`),
		);
		expect(result.source).toBeUndefined();
		expect(result.errors.join(' ')).toContain('used as a whole value');
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

describe('a credential type that authenticates in code', () => {
	const node = `
export class Acme {
	async execute() {
		const response = await this.helpers.requestWithAuthentication.call(this, 'acmeApi', { method: 'GET', uri: 'https://api.acme.test/v1/items', qs: { limit: 5 } });
		if (response.more) return [this.helpers.returnJsonArray(response.items)];
		return [this.helpers.returnJsonArray(response)];
	}
}`;
	const credential = `
export class AcmeApi {
	name = 'acmeApi';
	async authenticate(credentials, requestOptions) {
		requestOptions.qs = { ...requestOptions.qs, key: credentials.apiKey };
		requestOptions.headers = { ...requestOptions.headers, 'X-Account': credentials.account };
		return requestOptions;
	}
}`;
	const files: Record<string, string> = {
		'/acme/Acme.node.ts': node,
		'/acme/AcmeApi.credentials.ts': credential,
	};

	it('compiles the code of the credential type into the request, with templates for its fields', () => {
		const result = specialiseNode({
			type: 'n8n-nodes-acme.acme',
			version: 1,
			entry: '/acme/Acme.node.ts',
			readFile: (path) => files[path],
			parameters: {},
			instanceId: null,
			credentialEntry: (type) => (type === 'acmeApi' ? '/acme/AcmeApi.credentials.ts' : undefined),
		});
		expect(result.errors).toEqual([]);
		expect(result.linked).toContain('authenticate_acmeApi');
		expect(result.source).toContain('key: "{{$credentials.apiKey}}"');
		expect(result.source).toContain('"{{$credentials.account}}"');
	});
});
