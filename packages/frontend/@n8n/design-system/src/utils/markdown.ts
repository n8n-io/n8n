import type { SafeAttrValueHandler } from 'xss';
import xss from 'xss';

// `xss` is CJS with no `exports` map. Node's lexer cannot see `safeAttrValue` as
// a named export, so `import { safeAttrValue }` throws at link time under native
// ESM once a consumer loads our `dist`. At runtime `module.exports` is the filter
// function with the helpers hung off it, which the shipped typings don't model.
const { safeAttrValue } = xss as unknown as { safeAttrValue: SafeAttrValueHandler };

const checkedRegEx = /(\*|-) \[x\]/;
const uncheckedRegEx = /(\*|-) \[\s\]/;

/**
 * Toggles the checkbox at the specified index in the given markdown string.
 *
 * @param markdown - The markdown string containing checkboxes.
 * @param index - The index of the checkbox to toggle.
 * @returns The updated markdown string with the checkbox toggled.
 */
export const toggleCheckbox = (markdown: string, index: number) => {
	let cursor = 0;
	const lines = markdown.split('\n');

	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const line = lines[lineNumber];
		const checked = checkedRegEx.test(line);
		const unchecked = uncheckedRegEx.test(line);

		if (checked || unchecked) {
			if (cursor === index) {
				const regExp = checked ? checkedRegEx : uncheckedRegEx;
				const replacement = checked ? '[ ]' : '[x]';
				lines[lineNumber] = line.replace(regExp, `$1 ${replacement}`);
				break;
			}
			cursor++;
		}
	}

	return lines.join('\n');
};

export function serializeAttr(tag: string, name: string, value: string) {
	const safe = safeAttrValue(tag, name, value, { process: (v) => v });
	return safe ? `${name}="${safe}"` : '';
}
