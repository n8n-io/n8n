/**
 * The Structured Output Parser at convert time, against the real parser of n8n
 * (`N8nStructuredOutputParser`, with LangChain, zod and `@n8n/json-schema-to-zod`).
 *
 * For each schema and each version of the parser node, the format instructions of
 * `structuredOutput` equal the text of the real parser, and `parseStructured` of the library
 * node gives the result or the error of the real `parse` for each answer. All data is made up.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The library node imports the package, which a test run does not build.
vi.mock('@n8n/workflow-lang', () => ({ defineNode: (node: unknown) => node }));

import { parseStructured } from '../../nodes/chain-llm.ts';
import { structuredOutput } from '../ai-output-schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const langchain = join(here, '../../../../nodes-langchain');
const built = existsSync(join(langchain, 'dist/utils/output_parsers/N8nStructuredOutputParser.js'));

interface RealParser {
	getFormatInstructions(): string;
	parse(text: string): Promise<unknown>;
}

/** The parser that the v1 node makes in `supplyData`, with a context that records nothing. */
async function realParser(
	version: number,
	schemaType: string,
	text: string,
): Promise<RealParser | undefined> {
	const load = createRequire(join(langchain, 'package.json'));
	const schemaParsing = load('./dist/utils/schemaParsing.js');
	const { N8nStructuredOutputParser } = load(
		'./dist/utils/output_parsers/N8nStructuredOutputParser.js',
	);
	const context = {
		addInputData: () => ({ index: 0 }),
		addOutputData: () => {},
		logAiEvent: () => {},
		getNode: () => ({ name: 'Parser', type: 'parser', typeVersion: version, parameters: {} }),
	};
	try {
		const jsonSchema =
			schemaType === 'fromJson'
				? schemaParsing.generateSchemaFromExample(text, version >= 1.3)
				: schemaParsing.parseJsonSchemaParameter(text);
		const zodSchema = schemaParsing.convertJsonSchemaToZod(jsonSchema);
		return await N8nStructuredOutputParser.fromZodJsonSchema(zodSchema, version, context);
	} catch {
		return undefined;
	}
}

function parametersOf(schemaType: string, text: string): Record<string, unknown> {
	return schemaType === 'fromJson'
		? { schemaType, jsonSchemaExample: text }
		: { schemaType, inputSchema: text };
}

const person = {
	type: 'object',
	properties: {
		name: { type: 'string', description: 'The name' },
		age: { type: 'integer' },
		score: { type: 'number' },
		active: { type: 'boolean' },
		nothing: { type: 'null' },
		tags: { type: 'array', items: { type: 'string' } },
		mood: { type: 'string', enum: ['good', 'bad'] },
		address: {
			type: 'object',
			properties: { city: { type: 'string' }, zip: { type: 'string' } },
			required: ['city'],
		},
		free: {},
		list: { type: 'array' },
		map: { type: 'object' },
	},
	required: ['name', 'address', 'free', 'missing'],
};

/** Schemas of the subset: `structuredOutput` gives the instructions and the shape. */
const SCHEMAS: unknown[] = [
	person,
	{ ...person, additionalProperties: false },
	{ ...person, additionalProperties: true, description: 'A person' },
	{ type: 'object', properties: {} },
	{ type: 'object' },
	{ type: 'object', description: 'Any object' },
	{ type: 'array', items: person },
	{ type: 'array', items: {}, description: 'A list' },
	{ type: 'string' },
	{ type: 'number', description: '' },
	{},
	{ description: 'Any value' },
	{
		$schema: 'http://json-schema.org/draft-07/schema#',
		title: 'Result',
		type: 'object',
		properties: {
			output: { type: 'object', properties: { output: { type: 'string' } } },
			2: { type: 'string', title: 'Two' },
			1: { type: 'string' },
		},
		required: ['output', '1'],
	},
	{
		type: 'object',
		properties: {
			rows: {
				type: 'array',
				description: 'The rows',
				items: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						cells: { type: 'array', items: { type: 'number' } },
					},
					required: ['id', 'cells'],
					additionalProperties: false,
				},
			},
			first: { type: 'object', properties: { deep: { type: 'object' } }, required: ['deep'] },
		},
		required: ['rows', 'first'],
	},
];

/** Schemas outside the subset: the cluster stays in the host. */
const REFUSED: unknown[] = [
	{ type: 'string', minLength: 2 },
	{ type: 'string', format: 'email' },
	{ type: 'string', default: 'x' },
	{ type: 'string', enum: ['one'] },
	{ type: 'string', enum: ['a', 'a'] },
	{ type: 'string', enum: ['a', 1] },
	{ enum: ['a', 'b'] },
	{ const: 'a' },
	{ type: ['string', 'null'] },
	{ type: 'string', nullable: true },
	{ type: 'number', minimum: 1 },
	{ type: 'array', items: [{ type: 'string' }] },
	{ type: 'array', items: { type: 'string' }, minItems: 1 },
	{ type: 'object', additionalProperties: true },
	{ type: 'object', properties: {}, additionalProperties: false },
	{
		type: 'object',
		properties: { a: { type: 'string' } },
		additionalProperties: { type: 'string' },
	},
	{ type: 'object', properties: { a: { type: 'string', required: true } } },
	{ type: 'object', properties: { a: { type: 'string' } }, required: 'a' },
	{ type: 'object', properties: { constructor: { type: 'string' } } },
	{ type: 'object', properties: { a: { anyOf: [{ type: 'string' }, { type: 'number' }] } } },
	{ type: 'object', patternProperties: { '^a': { type: 'string' } } },
	{ type: 'object', properties: { a: { $ref: '#/definitions/a' } } },
	{ type: 'date' },
	'text',
	['list'],
];

/** Examples that the generator of v1 gives one schema for. */
const EXAMPLES: unknown[] = [
	{ state: 'California', cities: ['Los Angeles', 'San Francisco'] },
	{ a: 'x', b: 1.5, c: true, d: null, e: {}, f: [], g: [[1], [2]], h: { i: { j: [false] } } },
	{ list: [{ id: 1, name: 'x', deep: { more: [1, 2] } }] },
	{
		list: [
			{ id: 1, name: 'x' },
			{ id: 2, name: 'y' },
		],
	},
	{ list: [{}, {}] },
	[{ id: 1, ok: true }],
	['a', 'b'],
	[],
	5,
	null,
	{ output: { output: 'x' } },
	{ 2: 'b', 1: 'a', z: 'c' },
];

/** Examples that the generator merges: the cluster stays in the host. */
const REFUSED_EXAMPLES: unknown[] = [
	{ list: [1, 'a'] },
	{ list: [{ id: 1 }, { id: 'x' }] },
	{ list: [{ id: 1 }, { name: 'x' }] },
	{
		list: [
			{ id: 1, name: 'x' },
			{ name: 'y', id: 2 },
		],
	},
	{ list: [{ deep: { a: 1 } }, { deep: { a: 2 } }] },
	{ list: [[1], 'a'] },
	{ constructor: 'x' },
	'text',
];

const fine = {
	name: 'Ann',
	age: 30,
	score: 1.5,
	active: true,
	nothing: null,
	tags: ['a'],
	mood: 'good',
	address: { city: 'Paris', zip: '75' },
	free: [1],
	list: [1, 'a'],
	map: { k: 1 },
};

/** Answers of a model: each is the text that the parser gets. */
const ANSWERS: string[] = [
	'',
	'{}',
	'  {}  ',
	'not json',
	'null',
	'"text"',
	'5',
	'[]',
	'{"output":null}',
	'{"output":{}}',
	'{"output":[]}',
	'{"output":"text"}',
	'{"output":5}',
	'{"output":["a","b"]}',
	'{"output":[1]}',
	'{"other":1}',
	JSON.stringify({ output: fine }),
	JSON.stringify({ output: fine, more: 1 }),
	JSON.stringify({ output: { ...fine, extra: 1, zip: 2 } }),
	JSON.stringify({ output: { extra: 1, ...fine, address: { zip: '1', city: 'Rome', more: [] } } }),
	JSON.stringify({ output: { name: 'Ann', address: { city: 'Paris' } } }),
	JSON.stringify({ output: { name: 'Ann' } }),
	JSON.stringify({ output: { address: { city: 'Paris' } } }),
	JSON.stringify({ output: { name: 5, address: { city: 'Paris' } } }),
	JSON.stringify({ output: { name: 'Ann', address: { zip: '1' } } }),
	JSON.stringify({ output: { name: 'Ann', address: null } }),
	JSON.stringify({ output: { name: 'Ann', address: { city: 'Paris' }, age: 1.5 } }),
	JSON.stringify({ output: { name: 'Ann', address: { city: 'Paris' }, age: null } }),
	JSON.stringify({ output: { name: 'Ann', address: { city: 'Paris' }, mood: 'other' } }),
	JSON.stringify({ output: { name: 'Ann', address: { city: 'Paris' }, tags: ['a', 1] } }),
	JSON.stringify({ output: { name: 'Ann', address: { city: 'Paris' }, map: [] } }),
	JSON.stringify({ output: [fine, { name: 'Bob', address: { city: 'Rome' } }] }),
	JSON.stringify({ output: [fine, { name: 'Bob' }] }),
	JSON.stringify({ output: { output: 'x' } }),
	JSON.stringify({ output: { output: { output: 'x' } } }),
	JSON.stringify({ output: { output: { output: 'x' }, 1: 'a', 2: 'b' } }),
	JSON.stringify({ output: { rows: [{ id: 1, cells: [1, 2] }], first: { deep: {} } } }),
	JSON.stringify({ output: { rows: [{ id: 1, cells: [1, 2], more: 1 }], first: { deep: {} } } }),
	JSON.stringify({ output: { rows: [{ id: 1 }], first: { deep: {} } } }),
	JSON.stringify({ output: { rows: [], first: {} } }),
	JSON.stringify({ output: { first: {}, rows: 'x' } }),
	JSON.stringify({ output: { state: 'Texas', cities: ['Austin'] } }),
	JSON.stringify({ output: { state: 'Texas', cities: ['Austin'], more: true } }),
	JSON.stringify({ output: { state: 'Texas' } }),
	JSON.stringify({ output: { cities: [], state: 'Texas' } }),
	JSON.stringify({
		output: { a: 'x', b: 1, c: false, d: null, e: { k: 1 }, f: [1], g: [[]], h: { i: { j: [] } } },
	}),
	JSON.stringify({
		output: { a: 'x', b: 1, c: false, d: null, e: {}, f: [], g: [1], h: { i: {} } },
	}),
	JSON.stringify({
		output: { a: 'x', b: 1, c: false, d: null, f: [], g: [], h: { i: { j: [] } } },
	}),
	JSON.stringify({ output: { list: [{ id: 1, name: 'x', deep: { more: [] } }] } }),
	JSON.stringify({ output: { list: [{ id: 1, name: 'x' }] } }),
	JSON.stringify({
		output: {
			list: [
				{ name: 'x', id: 1, more: 2 },
				{ id: 2, name: 'y' },
			],
		},
	}),
	JSON.stringify({ output: { list: [{ id: 1 }] } }),
	JSON.stringify({ output: { list: [{}] } }),
	JSON.stringify({
		output: [
			{ id: 1, ok: true },
			{ ok: false, id: 2 },
		],
	}),
	JSON.stringify({ output: { 1: 'a', 2: 'b', z: 'c' } }),
	`Here is the answer:\n\`\`\`json\n${JSON.stringify({ output: fine })}\n\`\`\`\nDone.`,
	`\`\`\`\n${JSON.stringify({ output: fine })}\n\`\`\``,
	`  \`\`\`json  \n${JSON.stringify({ output: ['a'] })}\n  \`\`\`  \nand \`\`\` more`,
	`\`\`\`json\n${JSON.stringify({ output: fine })}`,
	`\`\`\`json\n\`\`\`json\n${JSON.stringify({ output: 'text' })}\n\`\`\``,
	`\`\`\`JSON\n${JSON.stringify({ output: 'text' })}\n\`\`\``,
	'```json\n\n```',
	'```json\n{}\n```',
	`${JSON.stringify({ output: 'text' })} \`\`\`json\n5\n\`\`\``,
];

interface Outcome {
	value?: unknown;
	error?: string;
	description?: unknown;
}

async function realOutcome(parser: RealParser, text: string): Promise<Outcome> {
	try {
		return { value: await parser.parse(text) };
	} catch (error) {
		const read = (key: string): unknown =>
			typeof error === 'object' && error !== null ? Reflect.get(error, key) : undefined;
		return { error: String(read('message')), description: read('description') };
	}
}

const CASES = [
	...SCHEMAS.map((schema) => ({ schemaType: 'manual', text: JSON.stringify(schema) })),
	...EXAMPLES.map((example) => ({ schemaType: 'fromJson', text: JSON.stringify(example) })),
].flatMap((c) => [1.2, 1.3].map((version) => ({ ...c, version, label: `${version} ${c.text}` })));

describe.runIf(built)(
	'the Structured Output Parser at convert time, against the parser of n8n',
	() => {
		describe.each(CASES)('$schemaType $label', ({ schemaType, text, version }) => {
			it('gives the format instructions of LangChain', async () => {
				const real = await realParser(version, schemaType, text);
				const own = structuredOutput(version, parametersOf(schemaType, text));
				expect(typeof own).toBe('object');
				if (typeof own === 'string') return;
				expect(own.instructions).toBe(real?.getFormatInstructions());
			});

			it('parses each answer as the parser of n8n does', async () => {
				const real = await realParser(version, schemaType, text);
				const own = structuredOutput(version, parametersOf(schemaType, text));
				if (typeof own === 'string' || real === undefined) return;
				for (const answer of ANSWERS) {
					const expected = await realOutcome(real, answer);
					const got = parseStructured(answer, own);
					// The order of the keys is part of the result.
					expect(`${answer} => ${JSON.stringify(got)}`).toBe(
						`${answer} => ${JSON.stringify(expected)}`,
					);
				}
			});
		});

		it.each(
			[
				...REFUSED.map((schema) => ({ schemaType: 'manual', text: JSON.stringify(schema) })),
				...REFUSED_EXAMPLES.map((e) => ({ schemaType: 'fromJson', text: JSON.stringify(e) })),
				{ schemaType: 'manual', text: 'not json' },
				{ schemaType: 'fromJson', text: '={{ $json.example }}' },
			].map((c) => ({ ...c, label: c.text })),
		)('keeps $schemaType $label in the host', ({ schemaType, text }) => {
			expect(typeof structuredOutput(1.3, parametersOf(schemaType, text))).toBe('string');
		});

		it('keeps the other parsers in the host', () => {
			const example = { jsonSchemaExample: '{"a":1}' };
			expect(structuredOutput(1, example)).toBe('output parser version 1');
			expect(structuredOutput(1.1, example)).toBe('output parser version 1.1');
			expect(structuredOutput(1.3, { ...example, autoFix: true })).toBe(
				'auto-fixing output parser',
			);
			expect(structuredOutput(1.3, {})).toBe('output parser example');
			expect(typeof structuredOutput(1.3, example)).toBe('object');
		});
	},
);
