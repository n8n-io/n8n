import {
	defineNode,
	isRecord,
	t,
	UserError,
	validate,
	type BatchContext,
	type CodeRequest,
	type CodeRunner,
	type InputItem,
	type JsonSchema,
	type Lineage,
} from '@n8n/node-sdk';

/** User code in the n8n task runner. The runner has no network access. */
export const code = defineNode({ id: 'code', displayName: 'Code' });

export const mode = t
	.oneOf('allItems', 'eachItem')
	.default('allItems')
	.hint('allItems: one run for all items. eachItem: one run per item');

/**
 * The JSON Schema of each output item. Only an object schema types an item, so the shape is
 * fixed at the top and open below it.
 */
export const returns = t
	.obj({
		type: t.lit('object'),
		properties: t
			.record(t.json())
			.hint('A JSON Schema per field, e.g. { "id": { "type": "number" } }'),
		required: t.arr(t.str()).optional(),
	})
	.with({ additionalProperties: true })
	.optional()
	.hint('Types the output items and checks each one');

/** Without `returns`, the items are what the code returns. */
export const codeOutput = t.json().hint('Set returns to type these items');

const ITEM_KEYS = new Set(['json', 'binary', 'pairedItem', 'error', 'index']);

interface Words {
	/** What the language calls an object, e.g. `dictionary`. */
	readonly object: string;
	readonly objects: string;
}

const WORDS: Record<CodeRequest['language'], Words> = {
	javascript: { object: 'object', objects: 'objects' },
	python: { object: 'dictionary', objects: 'dictionaries' },
};

const article = (word: string) => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);

/** An error with the description n8n shows under the message. */
export const failure = (message: string, description: string, at?: number) =>
	new UserError(at === undefined ? message : `${message} [item ${at}]`, { description });

interface Returned {
	readonly json: Record<string, unknown>;
	readonly pairedItem?: unknown;
}

function checkKeys(value: Record<string, unknown>, at: number) {
	const keys = Object.keys(value);
	const reserved = keys.find((key) => ITEM_KEYS.has(key));
	const unknown = keys.find((key) => !ITEM_KEYS.has(key));
	if (unknown === undefined) return;
	if (reserved !== undefined) {
		throw failure(
			'Invalid output format',
			`An output item contains the reserved key ${reserved}. Wrap each item in an object under a key called json.`,
			at,
		);
	}
	throw failure(
		`Unknown top-level item key: ${unknown}`,
		'Access the properties of an item under `.json`, e.g. `item.json`',
		at,
	);
}

/** The items of what the code returned, with the rules of the Code node. */
function returnedItems(value: unknown, words: Words, each: boolean): readonly Returned[] {
	const list: readonly unknown[] = Array.isArray(value) ? value : [value];
	if (!each && !isRecord(value) && !Array.isArray(value)) {
		throw failure(
			"Code doesn't return items properly",
			`Please return an array of ${words.objects}, one for each item you would like to output.`,
		);
	}
	const entries = list.map((entry, at) => {
		if (!isRecord(entry)) {
			throw each
				? failure(
						`Code doesn't return ${article(words.object)}`,
						`Please return ${article(words.object)} representing the output item.`,
						at,
					)
				: failure(
						"Code doesn't return items properly",
						`Please return an array of ${words.objects}, one for each item you would like to output.`,
					);
		}
		return entry;
	});
	const wrapped = entries.filter((entry) => 'json' in entry).length;
	if (wrapped > 0 && wrapped < entries.length) throw new UserError('Inconsistent item format');
	// All items: one item key means every key must be one. Each item: only a wrapped item.
	const anyItemKey = entries.some((entry) => Object.keys(entry).some((key) => ITEM_KEYS.has(key)));
	entries.forEach((entry, at) => {
		if (each ? 'json' in entry : anyItemKey) checkKeys(entry, at);
	});
	return entries.map((entry, at) => {
		const { binary: _binary, ...fields } = entry;
		const itemJson = wrapped > 0 ? entry.json : fields;
		if (!isRecord(itemJson)) {
			throw failure(
				`A 'json' property isn't ${article(words.object)}`,
				`In the returned data, every key named 'json' must point to ${article(words.object)}.`,
				at,
			);
		}
		return {
			json: itemJson,
			...(wrapped > 0 && 'pairedItem' in entry ? { pairedItem: entry.pairedItem } : {}),
		};
	});
}

const indexOfPair = (pair: unknown): number | undefined =>
	typeof pair === 'number'
		? pair
		: isRecord(pair) && typeof pair.item === 'number'
			? pair.item
			: undefined;

/**
 * The lineage of output `at`: the `pairedItem` the code set, else the rules n8n applies to a
 * node without one. A case n8n cannot pair names every input item.
 */
function lineageOf(
	returned: Returned,
	at: number,
	count: number,
	items: readonly InputItem[],
	each: boolean,
): Lineage {
	const pairs = (Array.isArray(returned.pairedItem) ? returned.pairedItem : [returned.pairedItem])
		.map(indexOfPair)
		.flatMap((index) => (index === undefined || !items[index] ? [] : [items[index]]));
	const [first, ...more] = pairs;
	if (first) return more.length > 0 ? pairs : first;
	const single = items.length === 1 || (count === 1 && items.length > 1) ? items[0] : undefined;
	const same = each || count === items.length ? items[at] : undefined;
	return single ?? same ?? items;
}

/** Runs the code in the runner, checks what it returns, and gives one output per item. */
export async function* runCode(
	language: CodeRequest['language'],
	input: {
		readonly code: string;
		readonly mode?: 'allItems' | 'eachItem';
		readonly returns?: JsonSchema;
	},
	items: BatchContext<unknown>['items'],
	runner: CodeRunner,
) {
	const each = input.mode === 'eachItem';
	const value = await runner.run({ language, code: input.code, mode: each ? 'each' : 'all' });
	const returned = returnedItems(value, WORDS[language], each);
	const schema = input.returns;
	for (const [at, entry] of returned.entries()) {
		const issues = schema ? validate(entry.json, schema, { path: `item[${at}]` }) : [];
		if (issues.length > 0) {
			throw failure(
				`The code returned an item that does not match returns: ${issues.join('; ')}`,
				'Change the code or the returns schema so that they agree.',
			);
		}
		yield { json: entry.json, from: lineageOf(entry, at, returned.length, items, each) };
	}
}

export const codeText = t.str().with({ minLength: 1 });
