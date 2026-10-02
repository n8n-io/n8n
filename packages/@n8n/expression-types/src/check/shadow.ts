// The shadow of a source file for the n8n expression check. Each expression span becomes a
// lambda in a copy of the file, so TypeScript types it in place, as it types a lambda: the
// lambda's parameters come from the field it sits in, and its result must fit the field. The
// caller finds the spans with its own TypeScript API and maps the shadow's errors back with
// `locate`. This module does not use a TypeScript API.

/**
 * An n8n expression in the source: a string literal, or a call whose one argument is it. Or the
 * JavaScript of a Code node (`kind: 'code'`), which is a literal.
 */
export interface ExpressionSpan {
	readonly kind?: 'expression' | 'code';
	/** The node to replace: the literal, or the call. */
	readonly start: number;
	readonly end: number;
	/** The literal, quotes included. */
	readonly literalStart: number;
	readonly literalEnd: number;
	/** The text of the literal after escapes. An expression without a leading `=` gets one. */
	readonly text: string;
	/** The offset of the property name the node is the value of. */
	readonly propertyName?: number;
}

/** What an expression and Code node JavaScript see, as global names and their declarations. */
export interface ExpressionScope {
	/** The global names of each scope. The shadow reads each from the scope object. */
	readonly globals: { readonly item: readonly string[]; readonly code: readonly string[] };
	/**
	 * Declares `__n8nExpression(args, body)` and, for Code spans, `__n8nCode(args, body)`. `args`
	 * holds the parameters that the field passes to a function in its place. `body` gets the
	 * scope object; an expression body returns the result.
	 */
	readonly trailer: string;
}

/** One `{{ }}` body inside a replacement. */
interface BodySpan {
	readonly shadowStart: number;
	readonly length: number;
	/** Offset of the body in the expression text. */
	readonly textStart: number;
}

export interface Replacement {
	readonly span: ExpressionSpan;
	readonly shadowStart: number;
	readonly shadowEnd: number;
	readonly bodies: readonly BodySpan[];
	/** The source offset of each character of the expression text, when the escapes allow it. */
	readonly offsets?: readonly number[];
	/** The shadow offset of the property name. */
	readonly propertyName?: number;
}

export interface Shadow {
	readonly text: string;
	/** Shadow offsets from here on are the trailer: an error there means the check cannot run. */
	readonly trailerStart: number;
	readonly replacements: readonly Replacement[];
}

const BLOCK = /\{\{([\s\S]*?)\}\}/g;

/** TypeScript's error code for a value that does not fit a property, reported at the name. */
const NOT_ASSIGNABLE = 2322;

/**
 * The source offset of each character of a literal's text. `undefined` for an escape that
 * does not map one to one; errors then point at the node.
 */
function textOffsets(raw: string, rawStart: number, length: number): number[] | undefined {
	const tokens = [...raw.matchAll(/\\[\s\S]|[\s\S]/g)];
	if (tokens.some(([token]) => /^\\[xu\r]$/.test(token))) return undefined;
	// A backslash before a line break continues the line and adds no character.
	const offsets = tokens.flatMap((match) =>
		match[0] === '\\\n' ? [] : [rawStart + (match.index ?? 0)],
	);
	return offsets.length === length ? offsets : undefined;
}

type Wrapper = { text: string; bodies: Array<{ at: number; length: number; textStart: number }> };

const locals = (names: readonly string[]) => `const { ${names.join(', ')} } = __scope;`;

/** The lambda that replaces Code node JavaScript: a nested function, so the code may declare `items` again. */
function codeWrapperOf(text: string, globals: readonly string[]): Wrapper {
	const head = `((...__args) => __n8nCode(__args, (__scope) => { ${locals(globals)} return (async () => {\n`;
	return {
		text: `${head}${text}\n})(); }))`,
		bodies: [{ at: head.length, length: text.length, textStart: 0 }],
	};
}

/** The lambda that replaces an expression, and where each body sits in it. */
function expressionWrapperOf(text: string, globals: readonly string[]): Wrapper {
	const blocks = [...text.slice(1).matchAll(BLOCK)].map((match) => ({
		body: match[1] ?? '',
		textStart: (match.index ?? 0) + 3,
	}));
	// As @n8n/tournament: one block and no text returns its value, else the parts concatenate.
	const single = blocks.length === 1 && text.slice(1).replace(BLOCK, '') === '';
	const head = `((...__args) => __n8nExpression(__args, (__scope) => { ${locals(globals)} return `;
	const start = head.length + (single ? 0 : 1);
	const built = blocks.reduce<Wrapper>(
		(acc, { body, textStart }, index) => {
			const separator = index === 0 ? '' : ', ';
			if (body.trim() === '') return { ...acc, text: `${acc.text}${separator}undefined` };
			const at = start + acc.text.length + separator.length + 1;
			return {
				// The newline ends a line comment in the body.
				text: `${acc.text}${separator}(${body}\n)`,
				bodies: [...acc.bodies, { at, length: body.length, textStart }],
			};
		},
		{ text: '', bodies: [] },
	);
	const result = single ? built.text : `[${built.text}].join('')`;
	return { text: `${head}${result}; }))`, bodies: built.bodies };
}

/** The shadow of `source` with each span replaced. */
export function shadowOf(
	source: string,
	spans: readonly ExpressionSpan[],
	scope: ExpressionScope,
): Shadow {
	const built = [...spans]
		.sort((a, b) => a.start - b.start)
		.reduce<{ text: string; cursor: number; replacements: Replacement[] }>(
			(acc, span) => {
				const code = span.kind === 'code';
				const text = code || span.text.startsWith('=') ? span.text : `=${span.text}`;
				const before = `${acc.text}${source.slice(acc.cursor, span.start)}`;
				const wrapper = code
					? codeWrapperOf(text, scope.globals.code)
					: expressionWrapperOf(text, scope.globals.item);
				const offsets = textOffsets(
					source.slice(span.literalStart + 1, span.literalEnd - 1),
					span.literalStart + 1,
					span.text.length,
				);
				return {
					text: `${before}${wrapper.text}`,
					cursor: span.end,
					replacements: [
						...acc.replacements,
						{
							span,
							shadowStart: before.length,
							shadowEnd: before.length + wrapper.text.length,
							bodies: wrapper.bodies.map(({ at, length, textStart }) => ({
								shadowStart: before.length + at,
								length,
								textStart,
							})),
							// An added `=` has no place in the source: it maps to the node.
							offsets: offsets && (text === span.text ? offsets : [span.start, ...offsets]),
							// Only the node changes before the name, so the name moves as far.
							...(span.propertyName === undefined
								? {}
								: { propertyName: span.propertyName + before.length - span.start }),
						},
					],
				};
			},
			{ text: '', cursor: 0, replacements: [] },
		);
	const body = `${built.text}${source.slice(built.cursor)}`;
	return {
		text: `${body}\n${scope.trailer}`,
		trailerStart: body.length,
		replacements: built.replacements,
	};
}

/** Where an error of the shadow belongs in the source. */
export interface Located {
	readonly replacement: Replacement;
	/** The source offset of the error. */
	readonly start: number;
	/** The error is in an expression body. Else it is about the result, e.g. a type mismatch. */
	readonly inBody: boolean;
}

/** The source place of a shadow error, or `undefined` when no expression owns it. */
export function locate(shadow: Shadow, shadowPos: number, code: number): Located | undefined {
	const replacement = shadow.replacements.find(
		(each) =>
			(shadowPos >= each.shadowStart && shadowPos < each.shadowEnd) ||
			(shadowPos === each.propertyName && code === NOT_ASSIGNABLE),
	);
	if (!replacement) return undefined;
	const body = replacement.bodies.find(
		(span) => shadowPos >= span.shadowStart && shadowPos <= span.shadowStart + span.length,
	);
	if (!body) return { replacement, start: replacement.span.start, inBody: false };
	const index = body.textStart + (shadowPos - body.shadowStart);
	const start = replacement.offsets
		? (replacement.offsets[Math.min(index, replacement.offsets.length - 1)] ??
			replacement.span.start)
		: replacement.span.start;
	return { replacement, start, inBody: true };
}
