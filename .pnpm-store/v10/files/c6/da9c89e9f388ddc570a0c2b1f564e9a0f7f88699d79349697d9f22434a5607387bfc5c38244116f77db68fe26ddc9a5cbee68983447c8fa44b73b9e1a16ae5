import {platform} from 'node:process';
import {stripVTControlCharacters} from 'node:util';

// Compute `result.command` and `result.escapedCommand`
export const joinCommand = (filePath, rawArguments) => {
	const fileAndArguments = [filePath, ...rawArguments];
	const command = fileAndArguments.join(' ');
	const escapedCommand = fileAndArguments
		.map(fileAndArgument => quoteString(escapeControlCharacters(fileAndArgument)))
		.join(' ');
	return {command, escapedCommand};
};

// Remove ANSI sequences and escape control characters and newlines
export const escapeLines = lines => stripVTControlCharacters(lines)
	.split('\n')
	.map(line => escapeControlCharacters(line))
	.join('\n');

const escapeControlCharacters = line => line.replaceAll(SPECIAL_CHAR_REGEXP, character => escapeControlCharacter(character));

const escapeControlCharacter = character => {
	const commonEscape = COMMON_ESCAPES[character];
	if (commonEscape !== undefined) {
		return commonEscape;
	}

	const codepoint = character.codePointAt(0);
	const codepointHex = codepoint.toString(16);
	return codepoint <= ASTRAL_START
		? `\\u${codepointHex.padStart(4, '0')}`
		: `\\U${codepointHex}`;
};

// Characters that would create issues when printed are escaped using the \u or \U notation.
// Those include control characters and newlines.
// The \u and \U notation is Bash specific, but there is no way to do this in a shell-agnostic way.
// Some shells do not even have a way to print those characters in an escaped fashion.
// Therefore, we prioritize printing those safely, instead of allowing those to be copy-pasted.
// List of Unicode character categories: https://www.fileformat.info/info/unicode/category/index.htm
const getSpecialCharRegExp = () => {
	try {
		// This throws when using Node.js without ICU support.
		// When using a RegExp literal, this would throw at parsing-time, instead of runtime.
		// eslint-disable-next-line prefer-regex-literals
		return new RegExp('\\p{Separator}|\\p{Other}', 'gu');
	} catch {
		// Similar to the above RegExp, but works even when Node.js has been built without ICU support.
		// Unlike the above RegExp, it only covers whitespaces and C0/C1 control characters.
		// It does not cover some edge cases, such as Unicode reserved characters.
		// See https://github.com/sindresorhus/execa/issues/1143
		// eslint-disable-next-line no-control-regex
		return /[\s\u0000-\u001F\u007F-\u009F\u00AD]/g;
	}
};

const SPECIAL_CHAR_REGEXP = getSpecialCharRegExp();

// Accepted by $'...' in Bash.
// Exclude \a \e \v which are accepted in Bash but not in JavaScript (except \v) and JSON.
const COMMON_ESCAPES = {
	' ': ' ',
	'\b': '\\b',
	'\f': '\\f',
	'\n': '\\n',
	'\r': '\\r',
	'\t': '\\t',
};

// Up until that codepoint, \u notation can be used instead of \U
const ASTRAL_START = 65_535;

// Some characters are shell-specific, i.e. need to be escaped when the command is copy-pasted then run.
// Escaping is shell-specific. We cannot know which shell is used: `process.platform` detection is not enough.
// For example, Windows users could be using `cmd.exe`, Powershell or Bash for Windows which all use different escaping.
// We use '...' on Unix, which is POSIX shell compliant and escape all characters but ' so this is fairly safe.
// On Windows, we assume cmd.exe is used and escape with "...", which also works with Powershell.
const quoteString = escapedArgument => {
	if (NO_ESCAPE_REGEXP.test(escapedArgument)) {
		return escapedArgument;
	}

	return platform === 'win32'
		? `"${escapedArgument.replaceAll('"', '""')}"`
		: `'${escapedArgument.replaceAll('\'', '\'\\\'\'')}'`;
};

const NO_ESCAPE_REGEXP = /^[\w./-]+$/;
