import { publicCredential } from '../../credentials/public.ts';
import type { CredentialTypeInfo } from '../../credentials/types.ts';
import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import {
	CREDENTIAL_FLAG_MISSING,
	CREDENTIAL_FLAG_NAME,
	credentialFlagKey,
	MAX_CREDENTIAL_FLAGS,
} from '../../credentials/flags.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import {
	evaluateCredentialFlags,
	evaluateFlag,
	evaluateInSandbox,
	unprovenFlagNodes,
} from '../evaluate-node.ts';
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

	it('does not compile a statement that compares a secret with a value of the run', () => {
		const result = compileWith(
			NODE.replace(
				'const base =',
				"if (credentials.apiKey === this.getInputData()[0].json.key) throw new Error('no');\n\t\tconst base =",
			),
		);
		expect(result.source).toBeUndefined();
		expect(result.errors.join(' ')).toContain('compares or branches on a credential field');
	});
});

describe('a condition on a credential field', () => {
	const withStatement = (statement: string) =>
		compileWith(NODE.replace('const base =', `${statement}\n\t\tconst base =`), {
			acmeApi: { environment: 'production', baseUrl: 'https://api.acme.test' },
		});
	const flagsOf = (result: ReturnType<typeof compileWith>) =>
		(result.derivations ?? []).filter((d) => d.kind === 'flag');

	it('becomes a flag that node code reads, and the module holds no part of the secret', () => {
		const result = withStatement("if (credentials.apiKey === 'sk-live-1') throw new Error('no');");
		expect(result.errors).toEqual([]);
		const [flag] = flagsOf(result);
		expect(flag.name).toMatch(CREDENTIAL_FLAG_NAME);
		expect(flag.code).toBe("(c) => (c.apiKey === 'sk-live-1')");
		expect(result.source).toContain(`if (ctx.credentialFlag(credential, "${flag.name}"))`);
		expect(result.source).not.toContain('sk-live-1');
		expect(evaluateFlag(flag.code, { apiKey: 'sk-live-1' })).toBe(true);
		expect(evaluateFlag(flag.code, { apiKey: 'other' })).toBe(false);
	});

	it('is a boolean when the code tests a field that is set or empty', () => {
		const result = withStatement(
			'const headers = {};\n\t\tif (credentials.accountName) headers.account = credentials.accountName;',
		);
		expect(result.errors).toEqual([]);
		const [flag] = flagsOf(result);
		expect(flag.code).toBe('(c) => Boolean(c.accountName)');
		expect(evaluateFlag(flag.code, { accountName: 'Jo' })).toBe(true);
		expect(evaluateFlag(flag.code, { accountName: '' })).toBe(false);
		expect(evaluateFlag(flag.code, {})).toBe(false);
	});

	it('takes the length of a field, and gives no value when the field is not there', () => {
		const result = withStatement("if (credentials.apiKey.length < 64) throw new Error('short');");
		expect(result.errors).toEqual([]);
		const [flag] = flagsOf(result);
		expect(evaluateFlag(flag.code, { apiKey: 'k' })).toBe(true);
		expect(evaluateFlag(flag.code, { apiKey: 'k'.repeat(64) })).toBe(false);
		expect(evaluateFlag(flag.code, {})).toBeUndefined();
	});

	it('folds a condition on a public field, and makes no flag for it', () => {
		const result = withStatement(
			"if (credentials.environment === 'sandbox') throw new Error('no');",
		);
		expect(result.errors).toEqual([]);
		expect(flagsOf(result)).toEqual([]);
		expect(result.source).not.toContain('credentialFlag');
	});

	it('has a limit for each node instance', () => {
		const many = Array.from(
			{ length: MAX_CREDENTIAL_FLAGS + 1 },
			(_unused, k) => `if (credentials.apiKey === 'k${k}') throw new Error('e${k}');`,
		).join('\n\t\t');
		const result = withStatement(many);
		expect(result.source).toBeUndefined();
		expect(result.errors.join(' ')).toContain('more than 16 conditions on its credential');
	});

	it('does not give text: a value that is not a boolean has no flag', () => {
		expect(evaluateFlag('(c) => c.apiKey', { apiKey: 'sk-1' })).toBeUndefined();
		expect(evaluateFlag('(c) => (c.apiKey.length)', { apiKey: 'sk-1' })).toBeUndefined();
	});
});

describe('the flags that n8n puts into the credentials document', () => {
	const short = { name: 'f00000001', code: '(c) => (c.apiKey.length < 64)', kind: 'flag' as const };
	const named = { name: 'f00000002', code: '(c) => Boolean(c.accountName)', kind: 'flag' as const };
	const guard = (allowed: string[]) => ({
		name: 'g1',
		code: '',
		kind: 'guard' as const,
		flags: [short.name, named.name],
		allowed,
	});
	const data = { apiKey: 'sk-1', accountName: '' };

	it('are the values that were checked against the v1 node together', () => {
		const key = credentialFlagKey([named.name, short.name], { f00000001: true, f00000002: false });
		expect(key).toBe('@flags=f00000001:1,f00000002:0');
		expect(evaluateCredentialFlags([short, named, guard([key])], data)).toEqual({
			flags: { f00000001: true, f00000002: false },
			withheld: [],
		});
	});

	it('are withheld for values that were not checked, and without a guard', () => {
		const other = '@flags=f00000001:1,f00000002:1';
		expect(evaluateCredentialFlags([short, named, guard([other])], data)).toEqual({
			flags: {},
			withheld: [short.name, named.name],
		});
		expect(evaluateCredentialFlags([short], data)).toEqual({ flags: {}, withheld: [short.name] });
	});

	it('name the nodes that must run in the host when their values were not checked', () => {
		const checked = '@flags=f00000001:1,f00000002:0';
		const other = '@flags=f00000001:1,f00000002:1';
		const proven = { ...guard([checked]), name: 'g1', node: 'Proven' };
		const unproven = { ...guard([other]), name: 'g2', node: 'Unproven' };
		const all = [short, named, proven, unproven];
		expect(unprovenFlagNodes(all, data)).toEqual(['Unproven']);
		expect(unprovenFlagNodes(all, { apiKey: 'sk-1', accountName: 'a' })).toEqual(['Proven']);
		expect(unprovenFlagNodes(all, undefined)).toEqual(['Proven', 'Unproven']);
		expect(unprovenFlagNodes([short, named, guard([other])], data)).toEqual([]);
	});

	it('are withheld when a condition gives no boolean, and never have another name', () => {
		const text = { name: 'f00000003', code: '(c) => c.apiKey', kind: 'flag' as const };
		const only = { ...guard(['@flags=f00000003:1']), flags: [text.name] };
		expect(evaluateCredentialFlags([text, only], data)).toEqual({
			flags: {},
			withheld: [text.name],
		});
		const renamed = { ...short, name: 'apiKey' };
		expect(evaluateCredentialFlags([renamed], data)).toEqual({ flags: {}, withheld: [] });
	});
});

describe('ctx.credentialFlag', () => {
	const node = (read: string) => `import { defineNode } from '@n8n/workflow-lang';

export default defineNode<Record<string, never>>({
	type: 'n8n-nodes-acme.flagged',
	version: 1,
	async run(ctx, _parameters, _items, credential) {
		const path: string = ${read} ? 'old' : 'new';
		return [{ path }];
	},
});
`;
	const WORKFLOW = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'flagged' })],
	credentials: { c: { type: 'acmeApi' } },
	async run(ctx) {
		return await ctx.node({ name: 'Node', type: 'n8n-nodes-acme.flagged', typeVersion: 1, parameters: {}, credential: 'c' });
	},
});
`;
	const READ = "ctx.credentialFlag(credential, 'f0123abcd')";
	const fixture = (credentialFlags: Record<string, Record<string, boolean>>) => ({
		trigger: { body: {}, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: {},
		credentialFlags,
	});
	const files = (read: string) => ({ extraNodes: { 'nodes/flagged.ts': node(read) } });

	it('gives the flag of the slot in the reference runner and in the module', async () => {
		const compiled = compile(WORKFLOW, files(READ));
		expect(compiled.diagnostics).toEqual([]);
		const module = decodeModule(compiled.module ?? new Uint8Array());
		expect(JSON.parse(module.meta).credentialFlags).toEqual(['f0123abcd']);
		for (const [value, path] of [
			[true, 'old'],
			[false, 'new'],
		] as const) {
			const given = fixture({ c: { f0123abcd: value } });
			expect((await runReference(WORKFLOW, given, files(READ))).result).toEqual([{ path }]);
			expect(runModule(module, given).result).toEqual([{ path }]);
		}
	});

	it('fails when the credential has no value for the flag', async () => {
		const compiled = compile(WORKFLOW, files(READ));
		const module = decodeModule(compiled.module ?? new Uint8Array());
		for (const given of [
			fixture({}),
			fixture({ c: {} }),
			fixture({ other: { f0123abcd: true } }),
		]) {
			const reference = await runReference(WORKFLOW, given, files(READ));
			expect(reference.status).toBe('error');
			expect(JSON.stringify(reference.result)).toContain(CREDENTIAL_FLAG_MISSING);
			const ran = runModule(module, given);
			expect(ran.status).toBe('error');
			expect(JSON.stringify(ran.result)).toContain(CREDENTIAL_FLAG_MISSING);
		}
	});

	it('does not compile with a name that is not a constant flag name', () => {
		for (const read of [
			"ctx.credentialFlag(credential, 'apiKey')",
			"ctx.credentialFlag(credential, 'n8nDerived.d0123abcd')",
			"ctx.credentialFlag(credential, ['f0123abcd'].join(''))",
			"ctx.credentialFlag('c', 'f0123abcd')",
		]) {
			const compiled = compile(WORKFLOW, files(read));
			expect(compiled.ok).toBe(false);
			expect(compiled.diagnostics.map((d) => d.code)).toContain('WL012');
		}
	});

	it('is not there for workflow code', () => {
		const direct = WORKFLOW.replace(
			'return await ctx.node(',
			"if (ctx.credentialFlag('c', 'f0123abcd')) return [];\n\t\treturn await ctx.node(",
		);
		const compiled = compile(direct, files(READ));
		expect(compiled.ok).toBe(false);
	});

	it('gives no flag that the module does not list', () => {
		const compiled = compile(WORKFLOW, files(READ));
		const module = decodeModule(compiled.module ?? new Uint8Array());
		const unlisted = {
			...module,
			meta: JSON.stringify({ ...JSON.parse(module.meta), credentialFlags: [] }),
		};
		const ran = runModule(unlisted, fixture({ c: { f0123abcd: true } }));
		expect(ran.status).toBe('error');
		expect(JSON.stringify(ran.result)).toContain(CREDENTIAL_FLAG_MISSING);
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

const GOOGLE_FUNCTIONS = `
import * as jwt from 'jsonwebtoken';
export const googleServiceAccountScopes = {
	docs: ['https://scopes.test/documents', 'https://scopes.test/drive'],
	chat: ['https://scopes.test/chat'],
} as const;
export async function getGoogleAccessToken(this: unknown, credentials: any, service: 'docs' | 'chat') {
	const scopes = googleServiceAccountScopes[service];
	const assertion = jwt.sign({ iss: credentials.email, scope: scopes.join(' ') }, credentials.privateKey);
	return await this.helpers.request({ method: 'POST', uri: 'https://oauth2.googleapis.com/token', form: { assertion } });
}`;

const GOOGLE_NODE = `
import { getGoogleAccessToken } from '../GenericFunctions';
export class Acme {
	async execute() {
		const credentials = await this.getCredentials('googleApi');
		const { access_token } = await getGoogleAccessToken.call(this, credentials, 'docs');
		const response = await this.helpers.request({ method: 'GET', uri: 'https://docs.acme.test/v1/items', headers: { Authorization: \`Bearer \${access_token}\` } });
		return [this.helpers.returnJsonArray(response)];
	}
}`;

const compileGoogle = (node: string, functionsFile = '/nodes/Google/GenericFunctions.ts') =>
	specialiseNode({
		type: 'n8n-nodes-acme.acme',
		version: 1,
		entry: '/nodes/Google/Acme/Acme.node.ts',
		readFile: (path) =>
			path === '/nodes/Google/Acme/Acme.node.ts'
				? node
				: path === functionsFile
					? GOOGLE_FUNCTIONS
					: undefined,
		parameters: {},
		instanceId: null,
		credentialFields: { googleApi: {} },
	});

describe('a Google service account token in the node compiler', () => {
	it('becomes a template of a token that n8n mints, with the scopes of the service', () => {
		const result = compileGoogle(GOOGLE_NODE);
		expect(result.errors).toEqual([]);
		expect(result.mints).toHaveLength(1);
		const mint = result.mints?.[0];
		expect(mint).toMatchObject({
			kind: 'google-service-account',
			service: 'docs',
			scopes: ['https://scopes.test/documents', 'https://scopes.test/drive'],
		});
		expect(result.source).toContain(`{{$credentials.n8nMinted.${mint?.name}.access_token}}`);
		expect(result.source).not.toContain('privateKey');
		expect(result.source).not.toContain('oauth2.googleapis.com');
	});

	it('gives two services with different scopes different names', () => {
		const other = compileGoogle(GOOGLE_NODE.replace("'docs')", "'chat')"));
		expect(other.errors).toEqual([]);
		expect(other.mints?.[0].name).not.toBe(compileGoogle(GOOGLE_NODE).mints?.[0].name);
	});

	it('does not take a function with the same name from another file', () => {
		const result = compileGoogle(
			GOOGLE_NODE.replace('../GenericFunctions', '../Other'),
			'/nodes/Google/Other.ts',
		);
		expect(result.source).toBeUndefined();
		expect(result.mints ?? []).toEqual([]);
	});

	it('does not compile a service that is not a constant', () => {
		const result = compileGoogle(
			GOOGLE_NODE.replace("'docs')", 'this.getInputData()[0].json.service)'),
		);
		expect(result.source).toBeUndefined();
		expect(result.errors.join('\n')).toContain('service that is not a constant');
	});

	it('does not compile a service that the scopes table does not have', () => {
		const result = compileGoogle(GOOGLE_NODE.replace("'docs')", "'sheets')"));
		expect(result.source).toBeUndefined();
		expect(result.errors.join('\n')).toContain("the Google service 'sheets' has no scopes");
	});

	it('does not compile code that keeps the whole token response', () => {
		const result = compileGoogle(
			GOOGLE_NODE.replace('const { access_token } =', 'const token =').replace(
				'${access_token}',
				'${token.access_token}${token.token_type}',
			),
		);
		expect(result.source).toBeUndefined();
		expect(result.errors.join('\n')).toContain('reads more than the access token');
	});
});
