import { compile } from '../../compiler/index.ts';
import { NODE_INDEX } from '../../generated/sources.generated.ts';
import { operationKey } from '../check.ts';
import { libraryNodeTypes, selectNodeSources } from '../node-sources.ts';

const workflowWith = (call: string) => `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ text: string; op: string }>({ path: 'x' })],
	async run(ctx, trigger) {
		return await ctx.node(${call});
	},
});
`;

describe('selectNodeSources', () => {
	it('picks only the library nodes that the source names', () => {
		const picked = selectNodeSources(
			'ctx.node({ type: \'n8n-nodes-base.telegram\' }); ctx.node({ type: "n8n-nodes-base.notion" })',
		);
		expect(Object.keys(picked).sort()).toEqual([
			NODE_INDEX['n8n-nodes-base.notion'],
			NODE_INDEX['n8n-nodes-base.telegram'],
		]);
	});

	it('picks nothing for a workflow without library nodes', () => {
		expect(
			selectNodeSources("ctx.http({ name: 'x', method: 'GET', url: 'https://example.com' })"),
		).toEqual({});
	});

	it('lists every library node type', () => {
		expect(libraryNodeTypes()).toEqual(
			expect.arrayContaining([
				'n8n-nodes-base.httpRequest',
				'n8n-nodes-base.googleSheets',
				'n8n-nodes-base.perplexity',
				'@n8n/n8n-nodes-langchain.openAi',
			]),
		);
	});
});

/** The diagnostic codes, the warning codes and the step kinds of a compile. */
function outcome(source: string) {
	const result = compile(source);
	return {
		errors: result.diagnostics.map((d) => d.code),
		warnings: (result.warnings ?? []).map((d) => d.code),
		linked: (result.manifest?.nodeTypes ?? []).map((n) => n.library),
		native: result.manifest?.native,
	};
}

const call = (parameters: string, extra = '') =>
	workflowWith(
		`{ name: 'Step', type: 'n8n-nodes-base.telegram', parameters: ${parameters}${extra} }`,
	);

describe('library node linking and fallback (WL060, WL061)', () => {
	it('links a call that the library node supports', () => {
		expect(
			outcome(
				call("{ chatId: '1', text: trigger.body.text, additionalFields: { parse_mode: 'HTML' } }"),
			),
		).toEqual({
			errors: [],
			warnings: [],
			linked: [true],
			native: true,
		});
	});

	it('runs a call with an unsupported parameter in the fallback host, with a warning', () => {
		const result = compile(call("{ chatId: '1', text: 'x', replyMarkup: 'inlineKeyboard' }"));
		expect(result.ok).toBe(true);
		expect(result.warnings?.[0]).toMatchObject({
			code: 'WL061',
			message: expect.stringContaining('does not support the parameter "replyMarkup"'),
		});
		expect(result.manifest?.nodeTypes).toEqual([
			{ type: 'n8n-nodes-base.telegram', version: null, library: false },
		]);
		expect(result.manifest?.native).toBe(false);
	});

	it('falls back for an unsupported member of a collection', () => {
		expect(
			outcome(call("{ chatId: '1', text: 'x', additionalFields: { reply_markup: '{}' } }")),
		).toMatchObject({
			errors: [],
			warnings: ['WL061'],
			linked: [false],
		});
	});

	it('rejects unsupported parameters when the call asks for the library', () => {
		const result = compile(
			call("{ chatId: '1', text: 'x', replyMarkup: 'inlineKeyboard' }", ", host: 'library'"),
		);
		expect(result.ok).toBe(false);
		expect(result.diagnostics[0]).toMatchObject({ code: 'WL060' });
	});

	it('runs a supported call in the fallback host when the call asks for it', () => {
		expect(outcome(call("{ chatId: '1', text: 'x' }", ", host: 'fallback'"))).toEqual({
			errors: [],
			warnings: [],
			linked: [false],
			native: false,
		});
	});

	it('rejects a host that is not a literal', () => {
		expect(outcome(call("{ chatId: '1' }", ', host: trigger.body.op as "library"')).errors).toEqual(
			['WL060'],
		);
	});

	it('names the supported operations', () => {
		const result = compile(
			workflowWith(
				"{ name: 'Get', type: 'n8n-nodes-base.airtable', parameters: { resource: 'record', operation: 'deleteRecord' } }",
			),
		);
		expect(result.warnings?.[0].message).toContain(
			'It supports: record.create, record.update, record.upsert, record.search',
		);
	});

	it('checks the default operation when the call names none', () => {
		// The default operation of Airtable records is "get", which the port does not have.
		expect(
			outcome(
				workflowWith("{ name: 'Get', type: 'n8n-nodes-base.airtable', parameters: { base: 'b' } }"),
			).warnings,
		).toEqual(['WL061']);
	});

	it('leaves a non-literal operation to the run time check', () => {
		expect(outcome(call("{ operation: trigger.body.op, chatId: '1' }"))).toMatchObject({
			warnings: [],
			linked: [true],
		});
	});

	it('checks generated declarative nodes', () => {
		expect(
			outcome(
				workflowWith(
					"{ name: 'Search', type: 'n8n-nodes-base.perplexity', parameters: { resource: 'search', operation: 'search', query: 'q', options: { unknownOption: 1 } } }",
				),
			).warnings,
		).toEqual(['WL061']);
	});

	it('builds operation keys', () => {
		expect(operationKey('record', 'create')).toBe('record.create');
		expect(operationKey('', 'getMany')).toBe('getMany');
		expect(operationKey('', '')).toBe('default');
	});
});

describe('value-limited library parameters (`name=value` in supports)', () => {
	const gmail = (parameters: string) =>
		workflowWith(`{ name: 'Mail', type: 'n8n-nodes-base.gmail', parameters: ${parameters} }`);

	it('links Gmail getAll when simple is on or left out', () => {
		expect(outcome(gmail("{ operation: 'getAll', simple: true, limit: 5 }")).linked).toEqual([
			true,
		]);
		expect(outcome(gmail("{ operation: 'getAll', filters: { q: 'x' } }")).linked).toEqual([true]);
	});

	it('runs Gmail getAll with simple off in the fallback host', () => {
		expect(outcome(gmail("{ operation: 'getAll', simple: false }"))).toMatchObject({
			warnings: ['WL061'],
			linked: [false],
		});
	});

	it('checks the value in the converter too', async () => {
		const { librarySupports } = await import('../../convert/library.ts');
		const support = {
			resource: 'message',
			operation: { message: 'send' },
			operations: { 'message.getAll': ['simple=true', 'limit'] },
		};
		expect(librarySupports(support, { operation: 'getAll', simple: true, limit: 3 })).toBe(true);
		expect(librarySupports(support, { operation: 'getAll', limit: 3 })).toBe(true);
		expect(librarySupports(support, { operation: 'getAll', simple: false })).toBe(false);
		expect(librarySupports(support, { operation: 'getAll', simple: '={{ $json.s }}' })).toBe(false);
	});
});
