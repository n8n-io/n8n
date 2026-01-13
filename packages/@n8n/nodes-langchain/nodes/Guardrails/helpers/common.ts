export const splitByComma = (str: string) => {
	return str
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s);
};

export const parseRegex = (input: string) => {
	const regexMatch = (input || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

	let regex: RegExp;
	if (!regexMatch) {
		regex = new RegExp((input || '').toString());
	} else if (regexMatch.length === 1) {
		regex = new RegExp(regexMatch[1]);
	} else {
		regex = new RegExp(regexMatch[1], regexMatch[2]);
	}

	return regex;
};
