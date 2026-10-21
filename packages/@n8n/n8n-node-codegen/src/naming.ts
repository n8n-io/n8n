const TRAILING_PREPOSITION = /(To|From|In|Of|For|On|By)$/;

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);
const upperFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function resourceName(tag: string) {
	const name = lowerFirst(tag.replace(/[^A-Za-z0-9]/g, ''));
	return name.endsWith('s') && !name.endsWith('ss') ? name.slice(0, -1) : name;
}

export function operationName(operationId: string, resource: string, paginated: boolean) {
	const [, verb, rest = ''] = /^([a-z]+)(.*)$/.exec(operationId) ?? [];
	if (!verb) return operationId;

	const singular = upperFirst(resource);
	let remainder = rest;
	for (const form of [`All${singular}s`, `${singular}es`, `${singular}s`, singular]) {
		if (remainder.includes(form)) {
			remainder = remainder.replace(form, '');
			break;
		}
	}
	remainder = remainder.replace(TRAILING_PREPOSITION, '');

	if (
		(verb === 'get' || verb === 'list') &&
		remainder === '' &&
		(paginated || rest.startsWith('All'))
	)
		return 'getAll';
	return remainder === '' ? verb : `${verb}${remainder}`;
}

export const words = (name: string) =>
	name
		.replace(/[_:-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(' ')
		.filter(Boolean)
		.map((word) => (/^id$/i.test(word) ? 'ID' : upperFirst(word)))
		.join(' ');

export const operationDisplayName = (operation: string) =>
	operation === 'getAll' ? 'Get Many' : words(operation);
