import { isRecord, list, type JsonSchema } from '@n8n/node-sdk';

/**
 * The code point classes of change-case v5 in Unicode 17.0, as runs of one class with the run
 * length in base 36. `U` is `\p{Lu}`, `L` is `\p{Ll}`, `O` is another code point that its word
 * regex keeps (`\p{L}` with the `i` flag), and `N` is none. The JS engine of the sandbox has no
 * Unicode property escapes, so the regexes below use these ranges. The test regenerates the runs.
 */
export const CHANGE_CASE_RUNS =
	'N1tUqN6LqN1bO1NaL1N4O1N5UnN1U7LoN1L8U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L2U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L2U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U2L1U1L1U1L3U2L1U1L1U2L1U3L2U4L1U2L1U3L3U2L1U2L1U1L1U1L1U2L1U1L2U1L1U2L1U3L1U1L1U2L2O1U1L3O4U1O1L1U1O1L1U1O1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L2U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L2U1O1L1U1L1U3L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L7U2L1U2L2U1L1U4L1U1L1U1L1U1L1U1L1xO2LqOiN4OcNeO5N7O1N1O1N2eO1N16U1L1U1L1O1N1U1L1N2O1L3N1U1N6U1N1U3N1U1N1U2L1UhN1U9LzU1L2U3L3U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L5U1L1N1U1L1U2L2U1fL1cU1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1N8U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U2L1U1L1U1L1U1L1U1L1U1L1U1L2U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1N1U12N2O1N6L15N1zOrN4O4N19O17NzO2N1O2rN1O1NfO2N7O2NaO3N2O1NgO1N1OuNtO2hNbO1NoOxN9O2N4O1N5OmN4O1N9O1N3O1NnOpN7ObN5OoN1O7NgO16N1mO1iN3O1NiO1N7OaNfOgN4O8N2O2N2OmN1O7N1O1N3O4N3O1NgO1NdO2N1O3NeO2NaO1N8O6N4O2N2OmN1O7N1O2N1O2N1O2NvO4N1O1NjO3NgO9N1O3N1OmN1O7N1O2N1O5N3O1NiO1NfO2NnO1NbO8N2O2N2OmN1O7N1O2N1O5N3O1NuO2N1O3NfO1NhO1N1O6N3O3N1O4N3O2N1O1N1O2N3O2N3O3N3OcNmO1N1gO8N1O3N1OnN1OgN3O1NqO3N1O2N2O2NuO1N4O8N1O3N1OnN1OaN1O5N3O1NuO3N1O2NfO2NhO9N1O3N1O15N2O1NgO1N5O3N8O3NoO6N5OiN3OoN1O9N1O1N2O7N1mO1cN1O2NcO7N1mO2N1O1N1O5N1OoN1O1N1OaN1O2N9O1N2O5N1O1NlO4NwO1N1rO8N1O10NrO5N37O17NkO1NgO6N4O4N3O1N3O2N7O3N4OdNcO1NhU12N1U1N5U1N2L17N1O1L3O95N1O4N2O7N1O1N1O4N2O15N1O4N2OxN1O4N2O7N1O1N1O4N2OfN1O1lN1O4N2O1vN11OgNgU2eN2L6N3Oh8N2OhN1OqN5O23N6O8N7OiNdOjNeOiNeOdN1O3NfO1gNzO1N4O1N1vO2hN7O5N2OyN1O1N5O1yNaOvN1dOuN2O5NbO18N4OqN1iOnN9O1hN2aO1N2lO1bNhO8N1iOuNdO2NaO18NqO10N15O3NaO10N2L9U1L1N5U17N2U3N15O4N1O6N1O2N3O1N5L18O1rLdO1LyO11N1sU1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L9U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L9U8L6N2U6N2L8U8L8U8L6N2U6N2L8N1U1N1U1N1U1N1U1L8U8LeN2L8O8L8O8L8O8L5N1L2U4O1N1L1N3L3N1L2U4O1N3L4N2L2U4N4L8U5N5L3N1L2U4O1N38O1NdO1NgOdN2tU1N4U1N2L1U3L2U3L1N1U1N3U5N6U1N1U1N1U1N1U4N1L1U4L1O4L1N2L2U2N5U1L4N4L1N1gU1L1N22jU1cL1cU1L1U3L2U1L1U1L1U1L1U4L1U1L2U1L6O2U3L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L2N6U1L1U1L1N3U1L1NcL12N1L1N5L1N2O1kN7O1NgOnN9O7N1O7N1O7N1O7N1O7N1O7N1O7N1O7N28O1Nd1O2N16O5N5O2N4O2eN6O3N1O2iN1O4N5O17N1O2mNhOwN1cOgNe8O534N1sOh3hN1vO1aN2O7hN3OgNaO2NkU1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1O1NgO1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1O2N2O1yN1dO9N2U1L1U1L1U1L1U1L1U1L1U1L1U1L3U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1O1L8U1L1U1L1U2L1U1L1U1L1U1L1U1L1O1N2U1L1U1L1O1U1L1U1L3U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U5L1U5L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U4L1U1L1U2L1U1L1U1L1U1L1U1L1U1L1U1L1U1L1U1NkO4U1L1O3L1O7N1O3N1O4N1OnNtO1gNeO1eN1qO6N3O1N1O2NbOsNaOnNpOtN7O1bNsO1NgO5N1OaNaO5N1O15NnO3N1O8NkOnN3O1N3O1eN1O1N3O2N2O5N2O1N1O1NoO3N2ObN7O3NcO6N2O6N2O6N9O7N1O7N1L17N1O4L9O1N6L28OzNtO8mcNcOnN4O1dN6isOa6N2O2yN12L7NcL5N5O1N1OaN1OdN1O5N1O1N1O2N1O2N1O30NxOa3NiO1sN2O1iN14OcN38O5N1O3rN10UqN6LqNbO2hN3O6N2O6N2O6N2O3NzOcN1OqN1OjN1O2N1OfN2OeNyO3fNatOtN3O1dN1bOwNdOkN1O8N6O12NaOuN2O10N4O8N1cU14L14O26NiU10N4L10N4O14N8O1gNcUbN1UfN1U7N1U2N1LbN1LfN1L7N1L2N3O1gNcO8nN9OmNaO8NoO6N1O16N1O9N1xO6N2O1N1O18N1O2N3O1N2OnNaOnN9OvN1tOjN1O2NaOmNaOqN6OqN12O1kN6O2N1sO1NfO4N1O3N1OtN16OtN3OtNzO8N1OsNrO1iNaOmNaOjNdOiN32O21N1jU1fNdL1fNdO10N12O6UmN9O1LmN6yO16N6O2NgO6N1kOtNaO1N8OmN16OiN1aOlNrOnNcO1hN1lO2N2O1NdO19NwOpNqO10NtO1N2O1N8OzN3O1NcO1cNeO4NlO1N1O1NzOiN1OpNjO2N1rO7N1O1N1O4N1OfN1OaN7O1bN12O8N2O2N2OmN1O7N1O2N1O5N3O1NiO1NcO5NuOaN1O1N2O1N1O12N1O1NpO1N1O1N18O1hNiO4NkO3NuO1cNkO2N1O1N54O1bN15O4N10O1cNkO1N1nO17NdO1N1zOrN11O7N55O18N38UwLwNvO8N2O1N2O8N1O2N1OoNfO1N1O1N2mO8N2O13NgO1N1O1NsO1NaO14N7O1NlO1NbO1aNjO1NiO21N5jOxNvO9N1O11NhO1N1dOuN34O7N1O2N1O12NlO1NpO6N1O2N1OwNeO1NnO18N78OjNfO1N1OdN1OyN3gO1N27OpmN6eO5gN218O2pNfOtsNhO6NpO32zN5Og7N5a1OuN1cyOftN7OvNhO27NhOuNiO1cNgO4NvOlN5OjNc0O19N5vUwLwNwUpN2LpN18O23N5O1N1uOdN1sO2N1O1NeO2NcO5p2N15OwN2pO37N6ppO4N1O7N1O2N1O83NfO1NtO3N2O1NeO4N8Ob0N1s4O2zN5OdN3O9N7OaN4meUqLqUqL7N1LiUqLqU1N1U2N2U1N2U2N2U4N1U8L4N1L1N1L7N1LbUqLqU2N1U4N2U8N1U7N1LqU2N1U4N1U5N1U1N3U7N1LqUqLqUqLqUqLqUqLqUqLqUqLsN2UpN1LpN1L6UpN1LpN1L6UpN1LpN1L6UpN1LpN1L6UpN1LpN1L6U1L1N1f8LaO1LkN6L6N79O1qN42O19NaO7NgO1N8xOuNiO18NdgOsN6cOuN2O1N5rOvN1O3N1O2N1O7N2O5N9O2N68O7N1O4N1O2N1OfN1O5hN1nUyLyN7O1NxgO4N1OrN1O2N1O1N2O1N1OaN1O4N1O1N1O1N6O1N4O1N1O1N1O1N1O3N1O2N1O1N2O1N1O1N1O1N1O1N1O1N1O2N1O1N2O4N1O7N1O4N1O4N1O1N1OaN1OhN5O3N1O5N1OhN3esOwyoNwO3dqN2O4geN2O5rlNfOhaN1wiOf2N15uO3t7N5O6ju';

/** The regex class body of the runs of `classes`, as `\u{start}-\u{end}` ranges. */
const rangesOf = (classes: string) =>
	[...CHANGE_CASE_RUNS.matchAll(/([NULO])([\da-z]+)/g)].reduce(
		({ start, ranges }, [, kind = '', length = '']) => {
			const end = start + parseInt(length, 36);
			const range = `\\u{${start.toString(16)}}-\\u{${(end - 1).toString(16)}}`;
			return { start: end, ranges: classes.includes(kind) ? `${ranges}${range}` : ranges };
		},
		{ start: 0, ranges: '' },
	).ranges;

const UPPER = rangesOf('U');
const LOWER = rangesOf('L');
const LOWER_THEN_UPPER = new RegExp(`([${LOWER}\\d])([${UPPER}])`, 'gu');
const UPPER_THEN_WORD = new RegExp(`([${UPPER}])([${UPPER}][${LOWER}])`, 'gu');
const NOT_WORD = new RegExp(`[^${rangesOf('ULO')}\\d]+`, 'u');

/** change-case v5 `snakeCase`, which the v3 node uses for simplified keys. */
export const snakeCase = (name: string) =>
	name
		.replace(LOWER_THEN_UPPER, '$1 $2')
		.replace(UPPER_THEN_WORD, '$1 $2')
		.split(NOT_WORD)
		.filter(Boolean)
		.map((word) => word.toLowerCase())
		.join('_');

const nameOf = (value: unknown) => (isRecord(value) ? (value.name ?? null) : null);

/**
 * Like v3, a count or percent rollup is a number (a percent times 100) and a show rollup is the
 * simplified elements. Other rollups give their value, where v3 gives nothing.
 */
function simplifyRollup(rollup: unknown): unknown {
	if (!isRecord(rollup) || typeof rollup.type !== 'string') return undefined;
	const name = typeof rollup.function === 'string' ? rollup.function : '';
	if (rollup.type === 'array') {
		const elements = list(rollup.array).flatMap((element) => [simplifyProperty(element)].flat());
		return name === 'show_unique' ? [...new Set(elements)] : elements;
	}
	const value = rollup[rollup.type];
	return typeof value === 'number' && name.includes('percent') ? value * 100 : value;
}

/** Mirrors `simplifyProperty` in nodes-base Notion/shared/GenericFunctions.ts. */
export function simplifyProperty(property: unknown): unknown {
	if (!isRecord(property) || typeof property.type !== 'string') return undefined;
	const { type } = property;
	const value = property[type];
	switch (type) {
		case 'text':
			return property.plain_text;
		case 'title':
		case 'rich_text':
			return list(value)
				.map((text) => (isRecord(text) ? text.plain_text : ''))
				.join('');
		case 'url':
		case 'created_time':
		case 'checkbox':
		case 'number':
		case 'last_edited_time':
		case 'email':
		case 'phone_number':
		case 'date':
			return value;
		case 'created_by':
		case 'last_edited_by':
		case 'select':
			return nameOf(value);
		case 'status':
			return isRecord(value) ? value.name : undefined;
		case 'people':
			// v3 gives `{}` for a bot or a user without an email; the output promises emails.
			return list(value).flatMap((person) =>
				isRecord(person) && isRecord(person.person) && typeof person.person.email === 'string'
					? [person.person.email]
					: [],
			);
		case 'multi_select':
			return list(value).map((option) => (isRecord(option) ? (option.name ?? {}) : {}));
		case 'relation':
			return list(value).map((relation) => (isRecord(relation) ? (relation.id ?? {}) : {}));
		case 'formula':
			return isRecord(value) && typeof value.type === 'string' ? value[value.type] : undefined;
		case 'rollup':
			return simplifyRollup(value);
		case 'unique_id':
			// v3 drops unique IDs. Notion shows them as prefix-number, e.g. TASK-42.
			if (!isRecord(value) || typeof value.number !== 'number') return undefined;
			return typeof value.prefix === 'string'
				? `${value.prefix}-${value.number}`
				: String(value.number);
		case 'files':
			return list(value).map((file) => {
				const hosted =
					isRecord(file) && typeof file.type === 'string' ? file[file.type] : undefined;
				return isRecord(hosted) ? hosted.url : undefined;
			});
		default:
			return undefined;
	}
}

/** A database page as the v3 node emits it with `simple: true`. */
export function simplifyPage(page: unknown): Record<string, unknown> {
	if (!isRecord(page)) return {};
	const properties = isRecord(page.properties) ? page.properties : {};
	const title = Object.values(properties).find(
		(property) => isRecord(property) && property.type === 'title',
	);
	return {
		id: page.id,
		name: simplifyProperty(title) ?? '',
		url: page.url,
		...Object.fromEntries(
			Object.entries(properties).map(([name, property]) => [
				`property_${snakeCase(name)}`,
				simplifyProperty(property),
			]),
		),
	};
}

const str: JsonSchema = { type: 'string' };
const date: JsonSchema = { type: 'string', format: 'date' };
const nullable = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, { type: 'null' }] });
const strings: JsonSchema = { type: 'array', items: str };

/** Simplified value types by Notion property type. */
export const SIMPLIFIED: Record<string, JsonSchema> = {
	title: str,
	rich_text: str,
	email: nullable({ type: 'string', format: 'email' }),
	url: nullable({ type: 'string', format: 'uri' }),
	phone_number: nullable(str),
	select: { ...nullable(str), 'x-n8n-hint': 'option name' },
	status: { ...str, 'x-n8n-hint': 'option name' },
	created_by: nullable(str),
	last_edited_by: nullable(str),
	['number']: nullable({ type: 'number' }),
	checkbox: { type: 'boolean' },
	created_time: { type: 'string', format: 'date-time' },
	last_edited_time: { type: 'string', format: 'date-time' },
	date: nullable({
		type: 'object',
		properties: { start: date, end: nullable(date), time_zone: nullable(str) },
		required: ['start', 'end', 'time_zone'],
		additionalProperties: false,
	}),
	people: {
		type: 'array',
		items: { type: 'string', format: 'email' },
		'x-n8n-hint': 'emails; a person without an email is left out',
	},
	unique_id: {
		...str,
		'x-n8n-hint': 'prefix-number, e.g. TASK-42; the number alone without a prefix',
	},
	multi_select: { ...strings, 'x-n8n-hint': 'option names' },
	relation: { ...strings, 'x-n8n-hint': 'page IDs' },
	files: { ...strings, 'x-n8n-hint': 'file URLs' },
};
