import dateformat from 'dateformat';
import { IDataObject, jsonParse } from 'n8n-workflow';

/*
	Constants and utility functions than can be used to manipulate different data types and objects
*/

const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];

export const omit = (keyToOmit: string, { [keyToOmit]: _, ...remainder }) => remainder;

export function isObjectLiteral(maybeObject: unknown): maybeObject is { [key: string]: string } {
	return typeof maybeObject === 'object' && maybeObject !== null && !Array.isArray(maybeObject);
}

export function isJsonKeyObject(item: unknown): item is {
	json: unknown;
	[otherKeys: string]: unknown;
} {
	if (!isObjectLiteral(item)) return false;

	return Object.keys(item).includes('json');
}

export const isEmpty = (value?: unknown): boolean => {
	if (!value && value !== 0) return true;
	if(Array.isArray(value)){
		if(!value.length) return true;
		return value.every(isEmpty);
	}
	if (typeof value === 'object') {
		return Object.values(value).every(isEmpty);
	}
	return false;
};

export const intersection = <T>(...arrays: T[][]): T[] => {
	const [a, b, ...rest] = arrays;
	const ab = a.filter(v => b.includes(v));
	return [...new Set(rest.length ? intersection(ab, ...rest) : ab)];
};


export function abbreviateNumber(num: number) {
	const tier = (Math.log10(Math.abs(num)) / 3) | 0;

	if (tier === 0) return num;

	const suffix = SI_SYMBOL[tier];
	const scale = Math.pow(10, tier * 3);
	const scaled = num / scale;

	return Number(scaled.toFixed(1)) + suffix;
}

export function convertToDisplayDate (epochTime: number) {
	return dateformat(epochTime, 'yyyy-mm-dd HH:MM:ss');
}

export function convertToHumanReadableDate (epochTime: number) {
	return dateformat(epochTime, 'd mmmm, yyyy @ HH:MM Z');
}

export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function isStringNumber(value: unknown): value is string {
	return !isNaN(Number(value));
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number';
}

export function stringSizeInBytes(input: string | IDataObject | IDataObject[] | undefined): number {
	if (input === undefined) return 0;

	return new Blob([typeof input === 'string' ? input : JSON.stringify(input)]).size;
}

export function shorten(s: string, limit: number, keep: number) {
	if (s.length <= limit) {
		return s;
	}

	const first = s.slice(0, limit - keep);
	const last = s.slice(s.length - keep, s.length);

	return `${first}...${last}`;
}

export const convertPath = (path: string): string => {
	// TODO: That can for sure be done fancier but for now it works
	const placeholder = '*___~#^#~___*';
	let inBrackets = path.match(/\[(.*?)]/g);

	if (inBrackets === null) {
		inBrackets = [];
	} else {
		inBrackets = inBrackets.map(item => item.slice(1, -1)).map(item => {
			if (item.startsWith('"') && item.endsWith('"')) {
				return item.slice(1, -1);
			}
			return item;
		});
	}
	const withoutBrackets = path.replace(/\[(.*?)]/g, placeholder);
	const pathParts = withoutBrackets.split('.');
	const allParts = [] as string[];
	pathParts.forEach(part => {
		let index = part.indexOf(placeholder);
		while(index !== -1) {
			if (index === 0) {
				allParts.push(inBrackets!.shift() as string);
				part = part.substr(placeholder.length);
			} else {
				allParts.push(part.substr(0, index));
				part = part.substr(index);
			}
			index = part.indexOf(placeholder);
		}
		if (part !== '') {
			allParts.push(part);
		}
	});

	return '["' + allParts.join('"]["') + '"]';
};

export const clearJsonKey = (userInput: string | object) => {
	const parsedUserInput = typeof userInput === 'string' ? jsonParse(userInput) : userInput;

	if (!Array.isArray(parsedUserInput)) return parsedUserInput;

	return parsedUserInput.map(item => isJsonKeyObject(item) ? item.json : item);
};
