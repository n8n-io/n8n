/**
 * Represents tokens that our language understands in parsing.
 */
export const TOKEN_TYPES = Object.freeze({
	Text: "Text", // The text between Jinja statements or expressions

	NumericLiteral: "NumericLiteral", // e.g., 123, 1.0
	StringLiteral: "StringLiteral", // 'string'
	Identifier: "Identifier", // Variables, functions, statements, booleans, etc.
	Equals: "Equals", // =
	OpenParen: "OpenParen", // (
	CloseParen: "CloseParen", // )
	OpenStatement: "OpenStatement", // {%
	CloseStatement: "CloseStatement", // %}
	OpenExpression: "OpenExpression", // {{
	CloseExpression: "CloseExpression", // }}
	OpenSquareBracket: "OpenSquareBracket", // [
	CloseSquareBracket: "CloseSquareBracket", // ]
	OpenCurlyBracket: "OpenCurlyBracket", // {
	CloseCurlyBracket: "CloseCurlyBracket", // }
	Comma: "Comma", // ,
	Dot: "Dot", // .
	Colon: "Colon", // :
	Pipe: "Pipe", // |

	CallOperator: "CallOperator", // ()
	AdditiveBinaryOperator: "AdditiveBinaryOperator", // + - ~
	MultiplicativeBinaryOperator: "MultiplicativeBinaryOperator", // * / %
	ComparisonBinaryOperator: "ComparisonBinaryOperator", // < > <= >= == !=
	UnaryOperator: "UnaryOperator", // ! - +
	Comment: "Comment", // {# ... #}
});

export type TokenType = keyof typeof TOKEN_TYPES;

/**
 * Represents a single token in the template.
 */
export class Token {
	/**
	 * Constructs a new Token.
	 * @param {string} value The raw value as seen inside the source code.
	 * @param {TokenType} type The type of token.
	 */
	constructor(
		public value: string,
		public type: TokenType,
	) {}
}

function isWord(char: string): boolean {
	return /\w/.test(char);
}

function isInteger(char: string): boolean {
	return /[0-9]/.test(char);
}

function isWhitespace(char: string): boolean {
	return /\s/.test(char);
}

/**
 * A data structure which contains a list of rules to test
 */
const ORDERED_MAPPING_TABLE: [string, TokenType][] = [
	// Control sequences
	["{%", TOKEN_TYPES.OpenStatement],
	["%}", TOKEN_TYPES.CloseStatement],
	["{{", TOKEN_TYPES.OpenExpression],
	["}}", TOKEN_TYPES.CloseExpression],
	// Single character tokens
	["(", TOKEN_TYPES.OpenParen],
	[")", TOKEN_TYPES.CloseParen],
	["{", TOKEN_TYPES.OpenCurlyBracket],
	["}", TOKEN_TYPES.CloseCurlyBracket],
	["[", TOKEN_TYPES.OpenSquareBracket],
	["]", TOKEN_TYPES.CloseSquareBracket],
	[",", TOKEN_TYPES.Comma],
	[".", TOKEN_TYPES.Dot],
	[":", TOKEN_TYPES.Colon],
	["|", TOKEN_TYPES.Pipe],
	// Comparison operators
	["<=", TOKEN_TYPES.ComparisonBinaryOperator],
	[">=", TOKEN_TYPES.ComparisonBinaryOperator],
	["==", TOKEN_TYPES.ComparisonBinaryOperator],
	["!=", TOKEN_TYPES.ComparisonBinaryOperator],
	["<", TOKEN_TYPES.ComparisonBinaryOperator],
	[">", TOKEN_TYPES.ComparisonBinaryOperator],
	// Arithmetic operators
	["+", TOKEN_TYPES.AdditiveBinaryOperator],
	["-", TOKEN_TYPES.AdditiveBinaryOperator],
	["~", TOKEN_TYPES.AdditiveBinaryOperator],
	["*", TOKEN_TYPES.MultiplicativeBinaryOperator],
	["/", TOKEN_TYPES.MultiplicativeBinaryOperator],
	["%", TOKEN_TYPES.MultiplicativeBinaryOperator],
	// Assignment operator
	["=", TOKEN_TYPES.Equals],
];

const ESCAPE_CHARACTERS = new Map([
	["n", "\n"], // New line
	["t", "\t"], // Horizontal tab
	["r", "\r"], // Carriage return
	["b", "\b"], // Backspace
	["f", "\f"], // Form feed
	["v", "\v"], // Vertical tab
	["'", "'"], // Single quote
	['"', '"'], // Double quote
	["\\", "\\"], // Backslash
]);

export interface PreprocessOptions {
	trim_blocks?: boolean;
	lstrip_blocks?: boolean;
}

function preprocess(template: string, options: PreprocessOptions = {}): string {
	// According to https://jinja.palletsprojects.com/en/3.0.x/templates/#whitespace-control

	// In the default configuration:
	//  - a single trailing newline is stripped if present
	//  - other whitespace (spaces, tabs, newlines etc.) is returned unchanged
	if (template.endsWith("\n")) {
		template = template.slice(0, -1);
	}

	if (options.lstrip_blocks) {
		// The lstrip_blocks option can also be set to strip tabs and spaces from the
		// beginning of a line to the start of a block. (Nothing will be stripped if
		// there are other characters before the start of the block.)
		template = template.replace(/^[ \t]*({[#%-])/gm, "$1");
	}

	if (options.trim_blocks) {
		// If an application configures Jinja to trim_blocks, the first newline after
		// a template tag is removed automatically (like in PHP).
		template = template.replace(/([#%-]})\n/g, "$1");
	}

	// Handle the custom transformers-specific `generation` tag.
	// See https://github.com/huggingface/transformers/pull/30650 for more information.
	return template.replace(/{%\s*(end)?generation\s*%}/gs, "");
}

/**
 * Generate a list of tokens from a source string.
 */
export function tokenize(source: string, options: PreprocessOptions = {}): Token[] {
	const tokens: Token[] = [];
	const src: string = preprocess(source, options);

	let cursorPosition = 0;
	let curlyBracketDepth = 0;

	const consumeWhile = (predicate: (char: string) => boolean): string => {
		let str = "";
		while (predicate(src[cursorPosition])) {
			// Check for escaped characters
			if (src[cursorPosition] === "\\") {
				// Consume the backslash
				++cursorPosition;
				// Check for end of input
				if (cursorPosition >= src.length) throw new SyntaxError("Unexpected end of input");

				// Add the escaped character
				const escaped = src[cursorPosition++];
				const unescaped = ESCAPE_CHARACTERS.get(escaped);
				if (unescaped === undefined) {
					throw new SyntaxError(`Unexpected escaped character: ${escaped}`);
				}
				str += unescaped;
				continue;
			}

			str += src[cursorPosition++];
			if (cursorPosition >= src.length) throw new SyntaxError("Unexpected end of input");
		}
		return str;
	};

	const stripTrailingWhitespace = () => {
		const lastToken = tokens.at(-1);
		if (lastToken && lastToken.type === TOKEN_TYPES.Text) {
			lastToken.value = lastToken.value.trimEnd();
			if (lastToken.value === "") {
				tokens.pop(); // Remove empty text token
			}
		}
	};

	const skipLeadingWhitespace = () => {
		while (cursorPosition < src.length && isWhitespace(src[cursorPosition])) {
			++cursorPosition;
		}
	};

	// Build each token until end of input
	main: while (cursorPosition < src.length) {
		// First, consume all text that is outside of a Jinja statement or expression
		const lastTokenType = tokens.at(-1)?.type;
		if (
			lastTokenType === undefined ||
			lastTokenType === TOKEN_TYPES.CloseStatement ||
			lastTokenType === TOKEN_TYPES.CloseExpression ||
			lastTokenType === TOKEN_TYPES.Comment
		) {
			let text = "";
			while (
				cursorPosition < src.length &&
				// Keep going until we hit the next Jinja statement or expression
				!(
					src[cursorPosition] === "{" &&
					(src[cursorPosition + 1] === "%" || src[cursorPosition + 1] === "{" || src[cursorPosition + 1] === "#")
				)
			) {
				// Consume text
				text += src[cursorPosition++];
			}

			// There is some text to add
			if (text.length > 0) {
				tokens.push(new Token(text, TOKEN_TYPES.Text));
				continue;
			}
		}

		// Possibly consume a comment
		if (src[cursorPosition] === "{" && src[cursorPosition + 1] === "#") {
			cursorPosition += 2; // Skip the opening {#

			// Check for leading hyphen for whitespace control {#-
			const stripBefore = src[cursorPosition] === "-";
			if (stripBefore) {
				++cursorPosition; // Skip the hyphen
			}

			let comment = "";
			while (src[cursorPosition] !== "#" || src[cursorPosition + 1] !== "}") {
				// Check for end of input
				if (cursorPosition + 2 >= src.length) {
					throw new SyntaxError("Missing end of comment tag");
				}
				comment += src[cursorPosition++];
			}

			// Check for trailing hyphen for whitespace control -#}
			const stripAfter = comment.endsWith("-");
			if (stripAfter) {
				comment = comment.slice(0, -1); // Remove the trailing hyphen
			}

			// Apply whitespace stripping for leading hyphen
			if (stripBefore) {
				stripTrailingWhitespace();
			}

			tokens.push(new Token(comment, TOKEN_TYPES.Comment));
			cursorPosition += 2; // Skip the closing #}

			// Apply whitespace stripping for trailing hyphen
			if (stripAfter) {
				skipLeadingWhitespace();
			}

			continue;
		}

		// Check for opening statement with whitespace control {%-
		if (src.slice(cursorPosition, cursorPosition + 3) === "{%-") {
			stripTrailingWhitespace();
			tokens.push(new Token("{%", TOKEN_TYPES.OpenStatement));
			cursorPosition += 3; // Skip {%-
			continue;
		}

		// Check for opening expression with whitespace control {{-
		if (src.slice(cursorPosition, cursorPosition + 3) === "{{-") {
			stripTrailingWhitespace();
			tokens.push(new Token("{{", TOKEN_TYPES.OpenExpression));
			curlyBracketDepth = 0;
			cursorPosition += 3; // Skip {{-
			continue;
		}

		// Consume (and ignore) all whitespace inside Jinja statements or expressions
		consumeWhile(isWhitespace);

		// Check for closing statement with whitespace control -%}
		if (src.slice(cursorPosition, cursorPosition + 3) === "-%}") {
			tokens.push(new Token("%}", TOKEN_TYPES.CloseStatement));
			cursorPosition += 3; // Skip -%}
			skipLeadingWhitespace();
			continue;
		}

		// Check for closing expression with whitespace control -}}
		if (src.slice(cursorPosition, cursorPosition + 3) === "-}}") {
			tokens.push(new Token("}}", TOKEN_TYPES.CloseExpression));
			cursorPosition += 3; // Skip -}}
			skipLeadingWhitespace();
			continue;
		}

		// Handle multi-character tokens
		const char = src[cursorPosition];

		// Check for unary operators
		if (char === "-" || char === "+") {
			const lastTokenType = tokens.at(-1)?.type;
			if (lastTokenType === TOKEN_TYPES.Text || lastTokenType === undefined) {
				throw new SyntaxError(`Unexpected character: ${char}`);
			}
			switch (lastTokenType) {
				case TOKEN_TYPES.Identifier:
				case TOKEN_TYPES.NumericLiteral:
				case TOKEN_TYPES.StringLiteral:
				case TOKEN_TYPES.CloseParen:
				case TOKEN_TYPES.CloseSquareBracket:
					// Part of a binary operator
					// a - 1, 1 - 1, true - 1, "apple" - 1, (1) - 1, a[1] - 1
					// Continue parsing normally
					break;

				default: {
					// Is part of a unary operator
					// (-1), [-1], (1 + -1), not -1, -apple
					++cursorPosition; // consume the unary operator

					// Check for numbers following the unary operator
					const num = consumeWhile(isInteger);
					tokens.push(
						new Token(`${char}${num}`, num.length > 0 ? TOKEN_TYPES.NumericLiteral : TOKEN_TYPES.UnaryOperator),
					);
					continue;
				}
			}
		}

		// Try to match one of the tokens in the mapping table
		for (const [seq, type] of ORDERED_MAPPING_TABLE) {
			// inside an object literal, don't treat "}}" as expression-end
			if (seq === "}}" && curlyBracketDepth > 0) {
				continue;
			}
			const slice = src.slice(cursorPosition, cursorPosition + seq.length);
			if (slice === seq) {
				tokens.push(new Token(seq, type));

				// possibly adjust the curly bracket depth
				if (type === TOKEN_TYPES.OpenExpression) {
					curlyBracketDepth = 0;
				} else if (type === TOKEN_TYPES.OpenCurlyBracket) {
					++curlyBracketDepth;
				} else if (type === TOKEN_TYPES.CloseCurlyBracket) {
					--curlyBracketDepth;
				}
				cursorPosition += seq.length;
				continue main;
			}
		}

		if (char === "'" || char === '"') {
			++cursorPosition; // Skip the opening quote
			const str = consumeWhile((c) => c !== char);
			tokens.push(new Token(str, TOKEN_TYPES.StringLiteral));
			++cursorPosition; // Skip the closing quote
			continue;
		}

		if (isInteger(char)) {
			// Consume integer part
			let num = consumeWhile(isInteger);
			// Possibly, consume fractional part
			if (src[cursorPosition] === "." && isInteger(src[cursorPosition + 1])) {
				++cursorPosition; // consume '.'
				const frac = consumeWhile(isInteger);
				num = `${num}.${frac}`;
			}
			tokens.push(new Token(num, TOKEN_TYPES.NumericLiteral));
			continue;
		}
		if (isWord(char)) {
			// consume any word characters and always classify as Identifier
			const word = consumeWhile(isWord);
			tokens.push(new Token(word, TOKEN_TYPES.Identifier));
			continue;
		}

		throw new SyntaxError(`Unexpected character: ${char}`);
	}

	return tokens;
}
