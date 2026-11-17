import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCredentialTypes, registryOf } from '../../credentials/types.ts';
import type { EquivalenceCase } from '../../nodes/__tests__/equivalence.ts';
import { disposeRecorder, recorderAvailable } from '../../nodes/__tests__/v1-recorder.ts';
import type { NodeSources } from '../convert.ts';
import { compileNodeInstance } from '../convert.ts';
import { flatNamespaces, hasExecuteMethod, routedEntry, singleItemSource } from '../routing.ts';
import { differenceFromV1 } from './verify.ts';

const base = join(dirname(fileURLToPath(import.meta.url)), '../../../../../nodes-base');
const built = existsSync(join(base, 'dist/known/nodes.json'));
const load = createRequire(join(base, 'package.json'));

const NODES: Record<string, { file: string; className: string }> = {
	'n8n-nodes-base.sendInBlue': { file: 'Brevo/Brevo.node', className: 'Brevo' },
	'n8n-nodes-base.whatsApp': { file: 'WhatsApp/WhatsApp.node', className: 'WhatsApp' },
	'n8n-nodes-base.googleBusinessProfile': {
		file: 'Google/BusinessProfile/GoogleBusinessProfile.node',
		className: 'GoogleBusinessProfile',
	},
};

function descriptionOf(type: string) {
	const node = NODES[type];
	const loaded = load(join(base, 'dist/nodes', `${node.file}.js`));
	return new loaded[node.className]().description;
}

const sources: NodeSources = {
	entry: (type) => (NODES[type] ? join(base, 'nodes', `${NODES[type].file}.ts`) : undefined),
	readFile: (path) =>
		existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined,
	description: (type) => (NODES[type] ? descriptionOf(type) : undefined),
	aliases: { '@utils/': `${base}/utils/` },
	verified: {},
};

const BREVO = { type: 'sendInBlueApi', data: { accessToken: 'brevo-key' } };
const WHATSAPP = {
	type: 'whatsAppApi',
	data: { accessToken: 'whatsapp-token', businessAccountId: '1001' },
};

const brevo = (
	name: string,
	parameters: Record<string, unknown>,
	responses: EquivalenceCase['responses'],
	more: Partial<EquivalenceCase> = {},
): EquivalenceCase => ({
	name: `routing brevo ${name}`,
	type: 'n8n-nodes-base.sendInBlue',
	typeVersion: 1.1,
	parameters,
	credential: BREVO,
	responses,
	...more,
});

const whatsApp = (
	name: string,
	parameters: Record<string, unknown>,
	responses: EquivalenceCase['responses'],
	more: Partial<EquivalenceCase> = {},
): EquivalenceCase => ({
	name: `routing whatsApp ${name}`,
	type: 'n8n-nodes-base.whatsApp',
	typeVersion: 1.1,
	parameters,
	credential: WHATSAPP,
	responses,
	...more,
});

const SEND_TEXT = {
	resource: 'message',
	operation: 'send',
	phoneNumberId: '2002',
	recipientPhoneNumber: '+1 (555) 010-0100',
	messageType: 'text',
	textBody: 'The order is ready',
};

const CASES: EquivalenceCase[] = [
	brevo('contact get', { resource: 'contact', operation: 'get', identifier: 'ada@example.test' }, [
		{ body: { id: 7, email: 'ada@example.test' } },
	]),
	brevo(
		'contact get fails',
		{ resource: 'contact', operation: 'get', identifier: 'ada@example.test' },
		[{ status: 404, body: { code: 'document_not_found', message: 'Contact does not exist' } }],
		{ expectedError: 'The resource you are requesting could not be found' },
	),
	brevo(
		'contact get for two items',
		{ resource: 'contact', operation: 'get', identifier: '={{ $json.email }}' },
		[{ body: { id: 7 } }, { body: { id: 8 } }],
		{ items: [{ email: 'ada@example.test' }, { email: 'bob@example.test' }] },
	),
	brevo('contact get all', { resource: 'contact', operation: 'getAll', limit: 2 }, [
		{ body: { contacts: [{ id: 1 }, { id: 2 }, { id: 3 }], count: 3 } },
	]),
	brevo('attribute get all', { resource: 'attribute', operation: 'getAll', limit: 1 }, [
		{ body: { attributes: [{ name: 'A' }, { name: 'B' }] } },
	]),
	brevo('sender delete', { resource: 'sender', operation: 'delete', id: '12' }, [{ body: {} }]),
	whatsApp('send text', SEND_TEXT, [
		{ body: { messaging_product: 'whatsapp', messages: [{ id: 'wamid.1' }] } },
	]),
	whatsApp('send text fails', SEND_TEXT, [{ status: 500, body: { error: { message: 'down' } } }], {
		expectedError: 'Sending failed',
	}),
	whatsApp(
		'send text is refused',
		SEND_TEXT,
		[{ status: 400, body: { error: { message: '(#100) The parameter is not valid', code: 100 } } }],
		{ expectedError: 'Bad request - please check your parameters' },
	),
	brevo('contact upsert', { resource: 'contact', operation: 'upsert', email: 'ada@example.test' }, [
		{ body: { id: 9 } },
	]),
	brevo(
		'contact get all with members of collections',
		{
			resource: 'contact',
			operation: 'getAll',
			limit: 2,
			options: { sort: 'asc' },
			filters: { modifiedSince: '2024-01-01T00:00:00Z' },
		},
		[{ body: { contacts: [{ id: 1 }], count: 1 } }],
	),
	brevo(
		'contact get all with an expression in a member of a collection',
		{
			resource: 'contact',
			operation: 'getAll',
			limit: 2,
			filters: { modifiedSince: '={{ $json.since }}' },
		},
		[{ body: { contacts: [{ id: 1 }], count: 1 } }],
		{ items: [{ since: '2024-01-01T00:00:00Z' }, { since: '2024-02-01T00:00:00Z' }] },
	),
];

const registry = registryOf(loadCredentialTypes().types);

describe.skipIf(!built || !recorderAvailable())('declarative nodes against v1', () => {
	afterAll(async () => await disposeRecorder());

	for (const testCase of CASES) {
		it(`gives the requests and the result of v1: ${testCase.name}`, async () => {
			expect(await differenceFromV1(testCase, sources, registry)).toBeUndefined();
		}, 30000);
	}
});

describe.skipIf(!built)('the entry of a declarative node', () => {
	const compileOf = (
		type: string,
		version: number,
		parameters: Record<string, unknown>,
		limits?: Record<string, unknown>,
	) =>
		compileNodeInstance(sources, { type, version, parameters }, null, {
			whatsAppApi: { fields: {}, classes: [] },
			googleBusinessProfileOAuth2Api: { fields: {}, classes: [] },
			sendInBlueApi: { fields: limits ?? {}, classes: [] },
		});

	it('finds no execute method in a declarative node', () => {
		const entry = sources.entry('n8n-nodes-base.whatsApp', 1.1) ?? '';
		expect(hasExecuteMethod(sources.readFile(entry) ?? '')).toBe(false);
		expect(hasExecuteMethod('export class A { async execute() { return []; } }')).toBe(true);
	});

	it('compiles the hooks of a routed request with the index of the item', () => {
		const compiled = compileOf('n8n-nodes-base.whatsApp', 1.1, {
			...SEND_TEXT,
			recipientPhoneNumber: '={{ $json.phone }}',
		});
		expect('errors' in compiled ? compiled.errors : []).toEqual([]);
		const source = 'source' in compiled ? compiled.source : '';
		expect(source).toContain('await cleanPhoneNumber(i, requestOptions)');
		expect(source).toContain('__perItem[__routedItem]["recipientPhoneNumber"]');
	});

	it('keeps pagination by a function in the host', () => {
		const compiled = compileOf('n8n-nodes-base.googleBusinessProfile', 1, {
			resource: 'review',
			operation: 'getAll',
			account: { __rl: true, mode: 'id', value: 'accounts/1' },
			location: { __rl: true, mode: 'id', value: 'locations/2' },
			returnAll: true,
		});
		expect('errors' in compiled ? compiled.errors[0] : '').toContain('stays in the host');
	});

	it('keeps a node in the host when its credential limits the domains', () => {
		const contact = { resource: 'contact', operation: 'get', identifier: 'a' };
		const type = 'n8n-nodes-base.sendInBlue';
		for (const limit of ['domains', 'none']) {
			const compiled = compileOf(type, 1.1, contact, { allowedHttpRequestDomains: limit });
			expect('errors' in compiled ? compiled.errors[0] : '').toContain('limits its domains');
		}
		const open = compileOf(type, 1.1, contact, { allowedHttpRequestDomains: 'all' });
		expect('errors' in open ? open.errors : []).toEqual([]);
	});

	it('gives a hook without a name a name, and reads a hook in a namespace', () => {
		const upsert = compileOf('n8n-nodes-base.sendInBlue', 1.1, {
			resource: 'contact',
			operation: 'upsert',
			email: 'ada@example.test',
		});
		expect('source' in upsert ? upsert.source : '').toMatch(
			/await routedHook\w+\(i, requestOptions\)/,
		);
		const flat = flatNamespaces(
			'/acme/Hooks.ts',
			'export namespace Acme {\n\texport const LIMIT = 2;\n\texport namespace Checks {\n\t\texport function over(n: number) {\n\t\t\treturn n > Acme.LIMIT;\n\t\t}\n\t}\n}\nexport const first = Acme.Checks.over(3);\n',
		);
		expect(flat).not.toContain('namespace');
		expect(flat).toContain('return n > LIMIT;');
		expect(flat).toContain('export const first = over(3);');
	});

	it('keeps an operation that gets its results over several requests in the host', () => {
		const all = compileOf('n8n-nodes-base.sendInBlue', 1.1, {
			resource: 'contact',
			operation: 'getAll',
			returnAll: true,
		});
		expect('errors' in all ? all.errors[0] : '').toContain('over several requests');
		const some = compileOf('n8n-nodes-base.sendInBlue', 1.1, {
			resource: 'contact',
			operation: 'getAll',
			returnAll: false,
			limit: 2,
		});
		expect('errors' in some ? some.errors : []).toEqual([]);
	});

	it('keeps a node with request settings in the host', () => {
		const entry = sources.entry('n8n-nodes-base.sendInBlue', 1.1) ?? '';
		const routed = routedEntry({
			description: descriptionOf('n8n-nodes-base.sendInBlue'),
			parameters: {
				resource: 'contact',
				operation: 'get',
				identifier: 'a',
				requestOptions: { timeout: 10 },
			},
			version: 1.1,
			entry,
			readFile: sources.readFile,
			credentialFields: () => ({}),
		});
		expect('errors' in routed ? routed.errors[0] : '').toContain("'requestOptions'");
	});
});

describe('the source of a hook for one item', () => {
	const refusals: string[] = [];
	const rewrite = (text: string) =>
		singleItemSource(
			'/acme/Hooks.ts',
			text,
			() => undefined,
			(reason) => refusals.push(reason),
		);

	it('gives each read of the context the index of the item', () => {
		const out = rewrite(`export async function addId(this: IExecuteSingleFunctions, options: any) {
	options.body.id = this.getNodeParameter('id', '');
	options.body.item = this.getItemIndex();
	options.body.json = this.getInputData().json;
	await this.helpers.assertBinaryData('data');
	return await other.call(this, options);
}
async function other(this: IExecuteSingleFunctions, options: any) {
	return options;
}`);
		expect(out).toContain(
			'addId(this: IExecuteSingleFunctions, __routedItem: number, options: any)',
		);
		expect(out).toContain("this.getNodeParameter('id', __routedItem, '')");
		expect(out).toContain('options.body.item = __routedItem;');
		expect(out).toContain('this.getInputData()[__routedItem].json');
		expect(out).toContain("assertBinaryData(__routedItem, 'data')");
		expect(out).toContain('other.call(this, __routedItem, options)');
	});

	it('refuses a member of the context that has no form for one item', () => {
		refusals.length = 0;
		const out = rewrite(`export async function page(this: IExecutePaginationFunctions, data: any) {
	return await this.makeRoutingRequest(data);
}`);
		expect(out).toContain('this.routingUnsupported(data)');
		expect(refusals).toEqual(["page: 'this.makeRoutingRequest' has no form for one item"]);
	});

	it('refuses a call of a function that it cannot read', () => {
		refusals.length = 0;
		rewrite(`export async function hook(this: IExecuteSingleFunctions, data: any) {
	return await unknownHelper.call(this, data);
}`);
		expect(refusals).toEqual(["hook: the call of 'unknownHelper' has no form for one item"]);
	});

	it('leaves a file without a context for one item as it is', () => {
		const text =
			'export function plain(this: IExecuteFunctions) { return this.getNodeParameter("a", 0); }';
		expect(rewrite(text)).toBe(text);
	});
});
