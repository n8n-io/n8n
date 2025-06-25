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
