import fc from 'fast-check';

import { RemoteInstanceError } from '../remote/remote-instance.errors';
import { parseRemoteProjects } from '../remote-projects';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,36}$/;
// Control, format and separator characters, and half surrogate pairs. A clean name has none.
const UNSAFE_CHARACTER = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;
const UNSAFE_CHARACTERS = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu;
const WHITESPACE = /\s/gu;

/** The characters that a reader sees, in order: no unsafe characters and no whitespace. */
const visible = (text: string) => text.replace(UNSAFE_CHARACTERS, '').replace(WHITESPACE, '');

// Hard cases for a name that another instance sends.
const trickyCharacterArb = fc.constantFrom(
	' ',
	'\t',
	'\n',
	'\r',
	'\u0000',
	'\u0007',
	'\u0085',
	'\u00a0',
	'\u2028',
	'\u2029',
	'\u200b',
	'\u200d',
	'\u202e',
	'\u2066',
	'\u3000',
	'\ufeff',
	'\ud83d',
	'\udc00',
	'🚀',
	'é',
	'運',
);

// Any code point, also half surrogate pairs, with many of the hard cases.
const characterArb = fc.oneof(
	{ weight: 3, arbitrary: fc.integer({ min: 0, max: 0x10ffff }).map(String.fromCodePoint) },
	{ weight: 3, arbitrary: trickyCharacterArb },
	{ weight: 4, arbitrary: fc.constantFrom('a', 'Z', '7', '-', '.', '<', '"') },
);

const textArb = (maxLength: number) =>
	fc.array(characterArb, { maxLength }).map((characters) => characters.join(''));

// At least one letter that survives the cleaning, at any place in the name.
const usableNameArb = fc
	.tuple(textArb(150), fc.constantFrom('a', 'Z', '7', 'é', '運', '🚀'), textArb(150))
	.map(([before, letter, after]) => `${before}${letter}${after}`);

const idArb = fc.stringMatching(ID_PATTERN);
const typeArb = fc.constantFrom('personal' as const, 'team' as const);

const validItemArb = fc
	.tuple(
		fc.record({ id: idArb, name: usableNameArb, type: typeArb }),
		fc.record(
			{ matchType: fc.constantFrom('exact', 'partial'), role: fc.string() },
			{ requiredKeys: [] },
		),
	)
	.map(([project, extra]) => ({ ...extra, ...project }));

const badIdArb = fc.oneof(
	fc.constant(''),
	fc.stringMatching(/^[A-Za-z0-9_-]{37,60}$/),
	fc
		.tuple(fc.string({ maxLength: 10 }), fc.constantFrom('/', '.', ' ', 'é', '\n', ':', '%'))
		.map(([id, character]) => `${id}${character}`),
	fc.integer(),
	fc.constant(null),
);

const badTypeArb = fc.oneof(
	fc.string().filter((type) => type !== 'personal' && type !== 'team'),
	fc.constant(undefined),
	fc.integer(),
);

// Whitespace and characters without width. Two halves of a pair would make a visible character.
const blankCharacterArb = fc.constantFrom(
	...[' ', '\t', '\n', '\r', '\u0000', '\u0007', '\u0085', '\u00a0', '\u2028', '\u2029'],
	...['\u200b', '\u200d', '\u202e', '\u2066', '\u3000', '\ufeff'],
);

// Names that are empty after the cleaning, or not text.
const badNameArb = fc.oneof(
	fc
		.tuple(fc.array(blankCharacterArb, { maxLength: 20 }), fc.constantFrom('', '\ud83d', '\udc00'))
		.map(([characters, half]) => `${characters.join('')}${half}`),
	fc.integer(),
	fc.constant(null),
);

const invalidItemArb = fc.oneof(
	fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.string())),
	fc.tuple(validItemArb, badIdArb).map(([item, id]) => ({ ...item, id })),
	fc.tuple(validItemArb, badTypeArb).map(([item, type]) => ({ ...item, type })),
	fc.tuple(validItemArb, badNameArb).map(([item, name]) => ({ ...item, name })),
	validItemArb.map(({ id, type }) => ({ id, type })),
);

type ValidItem = { id: string; name: string; type: 'personal' | 'team' };

type Entry = { valid: true; item: ValidItem } | { valid: false; item: unknown };

const entriesArb: fc.Arbitrary<Entry[]> = fc.array(
	fc.oneof(
		{ weight: 2, arbitrary: validItemArb.map((item) => ({ valid: true as const, item })) },
		{ weight: 1, arbitrary: invalidItemArb.map((item) => ({ valid: false as const, item })) },
	),
	{ maxLength: 12 },
);

const licenceArb = fc.option(fc.boolean(), { nil: undefined });

const resultFor = (items: unknown[], teamProjectsEnabled?: boolean) => ({
	data: items,
	count: items.length,
	...(teamProjectsEnabled === undefined ? {} : { teamProjectsEnabled }),
});

const namesOf = (items: unknown[]) =>
	parseRemoteProjects(resultFor(items)).projects.map(({ name }) => name);

describe('parseRemoteProjects properties', () => {
	it('never throws for a list, whatever its items', () => {
		fc.assert(
			fc.property(fc.array(fc.anything()), licenceArb, (items, licence) => {
				expect(() => parseRemoteProjects(resultFor(items, licence))).not.toThrow();
			}),
		);
	});

	it('keeps the valid items, in their order, and skips all others', () => {
		fc.assert(
			fc.property(entriesArb, (entries) => {
				const { projects } = parseRemoteProjects(resultFor(entries.map(({ item }) => item)));

				const expected = entries.flatMap((entry) => (entry.valid ? [entry.item] : []));
				expect(projects.map(({ id, type }) => ({ id, type }))).toEqual(
					expected.map(({ id, type }) => ({ id, type })),
				);
			}),
		);
	});

	it('returns only ids that are safe to send back, and names of 1 to 255 clean characters', () => {
		fc.assert(
			fc.property(entriesArb, fc.array(fc.anything(), { maxLength: 4 }), (entries, others) => {
				const items = [...entries.map(({ item }) => item), ...others];
				const { projects } = parseRemoteProjects(resultFor(items));

				for (const { id, name } of projects) {
					expect(id).toMatch(ID_PATTERN);
					expect(name.length).toBeGreaterThanOrEqual(1);
					expect(name.length).toBeLessThanOrEqual(255);
					expect(name).not.toMatch(UNSAFE_CHARACTER);
					expect(name).toBe(name.trim());
				}
			}),
		);
	});

	it('reads the team licence, and counts team projects as licensed when it is absent', () => {
		fc.assert(
			fc.property(entriesArb, licenceArb, (entries, licence) => {
				const items = entries.map(({ item }) => item);

				const result = parseRemoteProjects(resultFor(items, licence));

				expect(result.teamProjectsEnabled).toBe(licence ?? true);
			}),
		);
	});

	it('keeps a clean name of up to 255 characters, apart from the outer whitespace', () => {
		const cleanNameArb = usableNameArb
			.map((name) => name.replace(UNSAFE_CHARACTERS, ''))
			.filter((name) => name.length <= 255);

		fc.assert(
			fc.property(idArb, cleanNameArb, typeArb, (id, name, type) => {
				expect(namesOf([{ id, name, type }])).toEqual([name.trim()]);
			}),
		);
	});

	it('keeps every visible character in order, and cuts only the end of a long name', () => {
		fc.assert(
			fc.property(idArb, usableNameArb, typeArb, (id, name, type) => {
				const [cleaned] = namesOf([{ id, name, type }]);

				const shown = cleaned.endsWith('...') ? cleaned.slice(0, -3) : cleaned;
				expect(visible(name).startsWith(visible(shown))).toBe(true);
				if (!cleaned.endsWith('...')) expect(visible(cleaned)).toBe(visible(name));
			}),
		);
	});

	it('cuts a name with more than 255 visible characters to 254 or 255, with an ellipsis', () => {
		const longNameArb = fc
			.tuple(
				fc.array(fc.constantFrom('a', 'é', '運', '🚀'), { minLength: 256, maxLength: 400 }),
				textArb(20),
			)
			.map(([letters, tail]) => `${letters.join('')}${tail}`);

		fc.assert(
			fc.property(idArb, longNameArb, typeArb, (id, name, type) => {
				const [cleaned] = namesOf([{ id, name, type }]);

				expect(cleaned.endsWith('...')).toBe(true);
				expect(cleaned.length).toBeGreaterThanOrEqual(254);
				expect(cleaned.length).toBeLessThanOrEqual(255);
				expect(cleaned).not.toMatch(UNSAFE_CHARACTER);
			}),
		);
	});

	it('throws a tool error for a result without a project list', () => {
		const withoutListArb = fc
			.anything()
			.filter(
				(value) =>
					typeof value !== 'object' ||
					value === null ||
					!Array.isArray((value as { data?: unknown }).data),
			);

		fc.assert(
			fc.property(withoutListArb, (result) => {
				let error: unknown;
				try {
					parseRemoteProjects(result);
				} catch (e) {
					error = e;
				}
				expect(error).toBeInstanceOf(RemoteInstanceError);
				expect(error).toHaveProperty('reason', 'tool-error');
			}),
		);
	});
});
