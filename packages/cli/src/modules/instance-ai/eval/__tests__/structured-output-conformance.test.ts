import {
	discoverStructuredOutputSchema,
	conformContentToSchema,
	applyStructuredOutputConformance,
} from '../structured-output-conformance';

const strict = (properties: Record<string, unknown>) => ({
	type: 'object',
	properties,
	additionalProperties: false,
});

/** Parse JSON, tolerating a ```json fenced code block. */
function parseMaybeFenced(text: string): unknown {
	const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
	return JSON.parse(fence ? fence[1].trim() : text);
}

describe('conformContentToSchema', () => {
	it('drops a field the strict schema does not declare', () => {
		const schema = strict({ category: { type: 'string' } });
		const out = conformContentToSchema('{"category":"bug","subject":"extra"}', schema);
		expect(parseMaybeFenced(out)).toEqual({ category: 'bug' });
	});

	it('unwraps a stray single-key wrapper the schema does not declare', () => {
		const schema = strict({ category: { type: 'string' } });
		const out = conformContentToSchema('{"output":{"category":"bug"}}', schema);
		expect(parseMaybeFenced(out)).toEqual({ category: 'bug' });
	});

	it('preserves a wrapper key the schema DOES declare (standalone parser) and prunes inside it', () => {
		const schema = strict({
			__structured__output: strict({ answer: { type: 'string' } }),
		});
		const out = conformContentToSchema(
			'{"__structured__output":{"answer":"yes","stray":1}}',
			schema,
		);
		expect(parseMaybeFenced(out)).toEqual({ __structured__output: { answer: 'yes' } });
	});

	it('prunes recursively inside nested strict objects', () => {
		const schema = strict({
			person: strict({ name: { type: 'string' } }),
		});
		const out = conformContentToSchema('{"person":{"name":"Ada","age":30},"junk":true}', schema);
		expect(parseMaybeFenced(out)).toEqual({ person: { name: 'Ada' } });
	});

	it('prunes items of an array property against the array item schema', () => {
		const schema = strict({
			rows: { type: 'array', items: strict({ id: { type: 'number' } }) },
		});
		const out = conformContentToSchema('{"rows":[{"id":1,"x":"a"},{"id":2,"x":"b"}]}', schema);
		expect(parseMaybeFenced(out)).toEqual({ rows: [{ id: 1 }, { id: 2 }] });
	});

	it('leaves extra keys intact when the schema is not strict', () => {
		const schema = { type: 'object', properties: { category: { type: 'string' } } };
		const out = conformContentToSchema('{"category":"bug","subject":"kept"}', schema);
		expect(parseMaybeFenced(out)).toEqual({ category: 'bug', subject: 'kept' });
	});

	it('re-wraps in a ```json code block when the input content was fenced', () => {
		const schema = strict({ category: { type: 'string' } });
		const out = conformContentToSchema('```json\n{"category":"bug","subject":"x"}\n```', schema);
		expect(out.trimStart().startsWith('```json')).toBe(true);
		expect(parseMaybeFenced(out)).toEqual({ category: 'bug' });
	});

	it('returns content unchanged when no schema is provided', () => {
		expect(conformContentToSchema('{"category":"bug","subject":"x"}', undefined)).toBe(
			'{"category":"bug","subject":"x"}',
		);
	});

	it('returns content unchanged when it is not JSON', () => {
		const schema = strict({ category: { type: 'string' } });
		expect(conformContentToSchema('just a plain answer', schema)).toBe('just a plain answer');
	});
});

describe('discoverStructuredOutputSchema', () => {
	it('reads the native Responses API schema at text.format.schema', () => {
		const schema = strict({ category: { type: 'string' } });
		const body = { text: { format: { type: 'json_schema', name: 'x', schema } } };
		expect(discoverStructuredOutputSchema(body)).toEqual(schema);
	});

	it('reads the native chat-completions schema at response_format.json_schema.schema', () => {
		const schema = strict({ category: { type: 'string' } });
		const body = { response_format: { type: 'json_schema', json_schema: { name: 'x', schema } } };
		expect(discoverStructuredOutputSchema(body)).toEqual(schema);
	});

	it('parses a fenced JSON-Schema block out of format_instructions in input[]', () => {
		const schema = strict({ category: { type: 'string' } });
		const instructions = [
			'You must format your output as a JSON value that adheres to the given "JSON Schema".',
			'Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:',
			'```json',
			JSON.stringify(schema),
			'```',
		].join('\n');
		const body = { input: [{ role: 'user', content: instructions }] };
		expect(discoverStructuredOutputSchema(body)).toEqual(schema);
	});

	it('returns undefined when no schema is present anywhere', () => {
		expect(
			discoverStructuredOutputSchema({ input: [{ role: 'user', content: 'hi' }] }),
		).toBeUndefined();
	});

	it('ignores a fenced json block that is not a JSON Schema', () => {
		const body = {
			input: [{ role: 'user', content: '```json\n{"just":"data","no":"schema"}\n```' }],
		};
		expect(discoverStructuredOutputSchema(body)).toBeUndefined();
	});
});

describe('applyStructuredOutputConformance', () => {
	it('discovers the schema from the body and conforms the content', () => {
		const schema = strict({ category: { type: 'string' } });
		const body = { text: { format: { type: 'json_schema', schema } } };
		const out = applyStructuredOutputConformance('{"category":"bug","subject":"x"}', body);
		expect(parseMaybeFenced(out)).toEqual({ category: 'bug' });
	});

	it('leaves content unchanged when the body declares no schema', () => {
		const out = applyStructuredOutputConformance('{"a":1,"b":2}', {
			input: [{ role: 'user', content: 'no schema here' }],
		});
		expect(out).toBe('{"a":1,"b":2}');
	});
});
