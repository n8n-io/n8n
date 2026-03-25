import minIndent from 'min-indent';

export default function stripIndent(string) {
	const indent = minIndent(string);

	if (indent === 0) {
		return string;
	}

	const regex = new RegExp(`^[ \\t]{${indent}}`, 'gm');

	return string.replace(regex, '');
}
