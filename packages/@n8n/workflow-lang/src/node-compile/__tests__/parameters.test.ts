import type { ParameterKind } from '../specialise.ts';
import { specialiseNode } from '../specialise.ts';
import { parameterKindOf } from '../convert.ts';

const node = (body: string, helpers = '') => `${helpers}
export class Acme {
	async execute() {
		const items = this.getInputData();
		const out = [];
		for (let i = 0; i < items.length; i++) {
			const qs: any = {};
			let id: any = 'none';
			${body}
			out.push(await this.helpers.request({ method: 'GET', uri: 'https://acme.test/' + id, qs }));
		}
		return [this.helpers.returnJsonArray(out)];
	}
}`;

const ID_OF =
	'function idOf(this: any, name: string, i: number) { return this.getNodeParameter(name, i) as string; }';

const LOCATOR: ParameterKind = {
	type: 'resourceLocator',
	extract: false,
	modes: {
		id: null,
		list: null,
		url: { pattern: 'https://acme\\.test/b/([a-z0-9]+)', flags: '' },
	},
};

const compileWith = (
	body: string,
	parameters: Record<string, unknown>,
	kinds: Record<string, ParameterKind> = {},
	helpers = '',
) => {
	const source = node(body, helpers);
	return specialiseNode({
		type: 'n8n-nodes-acme.acme',
		version: 1,
		entry: '/acme/Acme.node.ts',
		readFile: (path) => (path === '/acme/Acme.node.ts' ? source : undefined),
		parameters,
		instanceId: null,
		parameterKind: (name) => kinds[name],
	});
};

const EXTRACT = "id = this.getNodeParameter('boardId', i, undefined, { extractValue: true });";
const NAME_ERROR =
	"'this.getNodeParameter' has no compiled form: the parameter name is not a constant for this node";
const OPTIONS_ERROR = "the options of 'this.getNodeParameter' have no compiled form";

describe('a parameter name that is not a string literal in the node source', () => {
	it('binds a template name when its parts are constants of the node instance', () => {
		const result = compileWith(
			"const resource = this.getNodeParameter('resource', 0) as string; id = this.getNodeParameter(`${resource}Id`, i);",
			{ resource: 'board', boardId: 'b1', cardId: 'c1' },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"https://acme.test/b1"');
		expect(result.source).not.toContain('c1');
	});

	it('binds a variable name that folds to a constant', () => {
		const result = compileWith(
			"const resource = this.getNodeParameter('resource', 0) as string; const name = resource === 'board' ? 'boardId' : 'cardId'; id = this.getNodeParameter(name, i);",
			{ resource: 'card', boardId: 'b1', cardId: 'c1' },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"https://acme.test/c1"');
	});

	it('binds each name of a loop over a constant list', () => {
		const result = compileWith(
			"for (const key of ['limit', 'offset']) { qs[key] = this.getNodeParameter(key, i); }",
			{ limit: 5, offset: 2 },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('qs["limit"] = 5');
		expect(result.source).toContain('qs["offset"] = 2');
	});

	it('does not unroll a loop that leaves an iteration early', () => {
		const result = compileWith(
			"for (const key of ['limit', 'offset']) { if (items.length > 5) continue; qs[key] = this.getNodeParameter(key, i); }",
			{ limit: 5, offset: 2 },
		);
		expect(result.errors).toEqual([`execute: ${NAME_ERROR}`]);
	});

	it('binds a name that a helper function gets as an argument', () => {
		const result = compileWith("id = idOf.call(this, 'boardId', i);", { boardId: 'b1' }, {}, ID_OF);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('return "b1"');
	});

	it('binds a name in a helper function after the code that is not reached is gone', () => {
		const result = compileWith(
			"const resource = this.getNodeParameter('resource', 0) as string; if (resource === 'board') id = idOf.call(this, 'boardId', i); else id = idOf.call(this, 'cardId', i);",
			{ resource: 'board', boardId: 'b1', cardId: 'c1' },
			{},
			ID_OF,
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('return "b1"');
	});

	it('does not compile a helper function that gets different names', () => {
		const result = compileWith(
			"id = idOf.call(this, 'boardId', i); qs.card = idOf.call(this, 'cardId', i);",
			{ boardId: 'b1', cardId: 'c1' },
			{},
			ID_OF,
		);
		expect(result.errors).toEqual([`idOf: ${NAME_ERROR}`]);
	});

	it('does not compile a name that comes from the input data', () => {
		const result = compileWith('id = this.getNodeParameter(items[i].json.name, i);', {
			boardId: 'b1',
		});
		expect(result.errors).toEqual([`execute: ${NAME_ERROR}`]);
	});

	it('does not compile a late name that the node instance does not have', () => {
		const result = compileWith(
			"const resource = this.getNodeParameter('resource', 0) as string; id = this.getNodeParameter(`${resource}Id`, i);",
			{ resource: 'list' },
		);
		expect(result.errors).toEqual([`execute: ${NAME_ERROR}`]);
	});
});

describe('the options argument of getNodeParameter', () => {
	it.each(['{}', 'undefined', '{ skipValidation: true }', '{ extractValue: false }'])(
		'reads the plain value with the options %s',
		(options) => {
			const result = compileWith(`id = this.getNodeParameter('boardId', i, '', ${options});`, {
				boardId: 'b1',
			});
			expect(result.errors).toEqual([]);
			expect(result.source).toContain('"https://acme.test/b1"');
		},
	);

	it('reads the plain value when the options fold to nothing', () => {
		const result = compileWith(
			"const typecast = this.getNodeParameter('typecast', 0) as boolean; const options = typecast ? { skipValidation: true } : undefined; id = this.getNodeParameter('boardId', i, '', options);",
			{ typecast: false, boardId: 'b1' },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"https://acme.test/b1"');
	});

	it.each([
		"{ ensureType: 'string' }",
		'{ rawExpressions: true }',
		'{ extractValue: items.length > 1 }',
	])('does not compile the options %s', (options) => {
		const result = compileWith(`id = this.getNodeParameter('boardId', i, '', ${options});`, {
			boardId: 'b1',
		});
		expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
	});
});

describe('extractValue', () => {
	const locator = (mode: string, value: unknown) => ({ boardId: { __rl: true, mode, value } });

	it('gives the value of a mode that has no extraction rule', () => {
		const result = compileWith(EXTRACT, locator('id', 'b1'), { boardId: LOCATOR });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"https://acme.test/b1"');
	});

	it('gives the value of a mode that the property does not list', () => {
		const result = compileWith(EXTRACT, locator('name', 'b1'), { boardId: LOCATOR });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"https://acme.test/b1"');
	});

	it('gives the group that the rule of the mode matches', () => {
		const result = compileWith(EXTRACT, locator('url', 'https://acme.test/b/abc9?x=1'), {
			boardId: LOCATOR,
		});
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"https://acme.test/abc9"');
	});

	it('does not compile a value that the rule of the mode does not match', () => {
		const result = compileWith(EXTRACT, locator('url', 'https://other.test/b/abc9'), {
			boardId: LOCATOR,
		});
		expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
	});

	it('does not compile a value that is not text for a mode with a rule', () => {
		const result = compileWith(EXTRACT, locator('url', 7), { boardId: LOCATOR });
		expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
	});

	it('does not compile a rule with more than one group', () => {
		const kind: ParameterKind = {
			...LOCATOR,
			modes: { url: { pattern: '(b)/([a-z0-9]+)', flags: '' } },
		};
		const result = compileWith(EXTRACT, locator('url', 'https://acme.test/b/abc9'), {
			boardId: kind,
		});
		expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
	});

	it('reads the resolved value of an expression in a mode that has no rule', () => {
		const result = compileWith(EXTRACT, locator('id', '={{ $json.id }}'), { boardId: LOCATOR });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__deepCopy(__perItem[i]["boardId"]?.value)');
	});

	it('does not compile an expression in a mode that has a rule', () => {
		const result = compileWith(EXTRACT, locator('url', '={{ $json.url }}'), { boardId: LOCATOR });
		expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
	});

	describe('with the label of the property', () => {
		const LABELLED: ParameterKind = { ...LOCATOR, label: 'Board' };
		const RULE = '"https://acme\\\\.test/b/([a-z0-9]+)", "", "Board")';

		it('checks at run time a value that the rule of the mode does not match', () => {
			const result = compileWith(EXTRACT, locator('url', 'https://other.test/b/abc9'), {
				boardId: LABELLED,
			});
			expect(result.errors).toEqual([]);
			expect(result.source).toContain(`__locatorValue("https://other.test/b/abc9", ${RULE}`);
			expect(result.source).toContain(
				"'ERROR: ' + label + \" parameter's value is invalid. This is likely because the URL entered is incorrect\"",
			);
		});

		it('checks at run time a value that is not text', () => {
			const result = compileWith(EXTRACT, locator('url', 7), { boardId: LABELLED });
			expect(result.errors).toEqual([]);
			expect(result.source).toContain(`__locatorValue(7, ${RULE}`);
		});

		it('extracts at run time the resolved value of an expression', () => {
			const result = compileWith(EXTRACT, locator('url', '={{ $json.url }}'), {
				boardId: LABELLED,
			});
			expect(result.errors).toEqual([]);
			expect(result.source).toContain(`__locatorValue(__perItem[i]["boardId"]?.value, ${RULE}`);
		});

		it('still gives the group of a value that the rule matches', () => {
			const result = compileWith(EXTRACT, locator('url', 'https://acme.test/b/abc9?x=1'), {
				boardId: LABELLED,
			});
			expect(result.errors).toEqual([]);
			expect(result.source).toContain('"https://acme.test/abc9"');
			expect(result.source).not.toContain('__locatorValue');
		});

		it('does not compile a rule with more than one group', () => {
			const kind: ParameterKind = {
				...LABELLED,
				modes: { url: { pattern: '(b)/([a-z0-9]+)', flags: '' } },
			};
			const result = compileWith(EXTRACT, locator('url', '={{ $json.url }}'), { boardId: kind });
			expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
		});
	});

	it('keeps the name that v1 shows when node code calls a text method on a locator value', () => {
		const body =
			"const board = this.getNodeParameter('boardId', i, {}) as any; id = (board.value as string).match(/b\\/([a-z]+)/)?.[1];";
		const result = compileWith(body, locator('url', '={{ $json.url }}'), { boardId: LOCATOR });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__textOf(board.value, "board.value.match")');
		expect(result.source).toContain("callee + ' is not a function'");
		const plain = compileWith(
			body,
			{ boardId: '={{ $json.url }}' },
			{
				boardId: { type: 'string', extract: false },
			},
		);
		expect(plain.source ?? '').not.toContain('__textOf');
	});

	it('does not compile an expression when the kind of the parameter is not known', () => {
		const result = compileWith(EXTRACT, { boardId: '={{ $json.board }}' });
		expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
	});

	it('does not compile a mode other than id or list when the rules are not known', () => {
		const result = compileWith(EXTRACT, locator('url', 'https://acme.test/b/abc9'));
		expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
	});

	it('does not compile a filter parameter or a parameter with its own rule', () => {
		for (const kind of [
			{ type: 'filter', extract: false },
			{ type: 'string', extract: true },
		]) {
			const result = compileWith(EXTRACT, { boardId: 'b1' }, { boardId: kind });
			expect(result.errors).toEqual([`execute: ${OPTIONS_ERROR}`]);
		}
	});

	it('gives a value that is not a locator as it is', () => {
		const result = compileWith(
			EXTRACT,
			{ boardId: 'b1' },
			{ boardId: { type: 'string', extract: false } },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"https://acme.test/b1"');
	});
});

describe('the kind of a parameter from the node description', () => {
	const property = (regex: string | RegExp, show?: Record<string, unknown[]>) => ({
		name: 'boardId',
		displayName: 'Board',
		type: 'resourceLocator',
		...(show === undefined ? {} : { displayOptions: { show } }),
		modes: [{ name: 'id' }, { name: 'url', extractValue: { type: 'regex', regex } }],
	});
	const kind = (pattern: string, flags = '') => ({
		type: 'resourceLocator',
		extract: false,
		label: 'Board',
		modes: { id: null, url: { pattern, flags } },
	});

	it('has the extraction rule of each mode', () => {
		const description = { name: 'acme', properties: [property(/b\/([a-z]+)/i)] };
		expect(parameterKindOf(description, 'boardId', {}, 1)).toEqual(kind('b\\/([a-z]+)', 'i'));
	});

	it('is the kind of the first property with the name that the parameters display', () => {
		const description = {
			name: 'acme',
			properties: [
				property('b/(x)', { operation: ['get'] }),
				property('b/(y)', { operation: ['update', 'delete'] }),
				property('b/(z)', { operation: ['delete'] }),
			],
		};
		expect(parameterKindOf(description, 'boardId', { operation: 'get' }, 1)).toEqual(kind('b/(x)'));
		expect(parameterKindOf(description, 'boardId', { operation: 'delete' }, 1)).toEqual(
			kind('b/(y)'),
		);
	});

	it('is not known when no property with the name is displayed and the rules are different', () => {
		const description = {
			name: 'acme',
			properties: [
				property('b/(x)', { operation: ['get'] }),
				property('b/(y)', { operation: ['update'] }),
			],
		};
		expect(parameterKindOf(description, 'boardId', { operation: 'list' }, 1)).toBeUndefined();
	});

	it('is not known when the description does not have the modes of a locator', () => {
		const description = {
			name: 'acme',
			properties: [{ name: 'boardId', type: 'resourceLocator' }],
		};
		expect(parameterKindOf(description, 'boardId', {}, 1)).toBeUndefined();
		expect(parameterKindOf(description, 'cardId', {}, 1)).toBeUndefined();
	});
});
