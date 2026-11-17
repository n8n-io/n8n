export const PACKAGE_FORM_HELPERS: Record<string, string> = {
	__pathIsIndex: `function __pathIsIndex(key: string): boolean {
	if (key === '' || key.length > 16) return false;
	for (let k = 0; k < key.length; k++) {
		if (!'0123456789'.includes(key.charAt(k))) return false;
	}
	if (key.length > 1 && key.charAt(0) === '0') return false;
	return Number(key) < 9007199254740991;
}`,
	__pathQuoted: `function __pathQuoted(text: string, from: number): any {
	const quote: string = text.charAt(from);
	if (quote !== '"' && quote !== "'") return undefined;
	let content: string = '';
	let k: number = from + 1;
	while (k < text.length) {
		const c: string = text.charAt(k);
		if (c === quote) return text.charAt(k + 1) === ']' ? [content, k + 2] : undefined;
		if (c === '\\\\') {
			if (k + 1 >= text.length) return undefined;
			const code: number = text.charCodeAt(k + 1);
			if (code === 10 || code === 13 || code === 8232 || code === 8233) return undefined;
			content += text.charAt(k + 1);
			k += 2;
		} else {
			content += c;
			k += 1;
		}
	}
	return undefined;
}`,
	__pathNumber: `function __pathNumber(text: string, from: number): number {
	let k: number = from;
	if (text.charAt(k) === '-') k += 1;
	let digits: number = 0;
	while (k < text.length && '0123456789'.includes(text.charAt(k))) {
		k += 1;
		digits += 1;
	}
	if (digits === 0) return -1;
	if (text.charAt(k) === '.') {
		let part: number = 0;
		let j: number = k + 1;
		while (j < text.length && '0123456789'.includes(text.charAt(j))) {
			j += 1;
			part += 1;
		}
		if (part > 0) k = j;
	}
	return text.charAt(k) === ']' ? k : -1;
}`,
	__pathIsKey: `function __pathIsKey(text: string): boolean {
	let plain: boolean = true;
	for (let k = 0; k < text.length; k++) {
		if (!'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_'.includes(text.charAt(k))) plain = false;
	}
	if (plain) return true;
	if (text.includes('.')) return false;
	for (let k = 0; k < text.length; k++) {
		if (text.charAt(k) !== '[') continue;
		let j: number = k + 1;
		while (j < text.length && text.charAt(j) !== '[' && text.charAt(j) !== ']') j += 1;
		if (j < text.length && text.charAt(j) === ']') return false;
		if (__pathQuoted(text, k + 1) !== undefined) return false;
	}
	return true;
}`,
	__pathKeys: `function __pathKeys(text: string): string[] {
	const keys: string[] = [];
	if (text.charAt(0) === '.') keys.push('');
	let k: number = 0;
	while (k < text.length) {
		const c: string = text.charAt(k);
		if (c !== '.' && c !== '[' && c !== ']') {
			let j: number = k;
			while (j < text.length && text.charAt(j) !== '.' && text.charAt(j) !== '[' && text.charAt(j) !== ']') j += 1;
			keys.push(text.slice(k, j));
			k = j;
			continue;
		}
		if (c === '[') {
			const end: number = __pathNumber(text, k + 1);
			if (end !== -1) {
				keys.push(text.slice(k + 1, end));
				k = end + 1;
				continue;
			}
			const quoted: any = __pathQuoted(text, k + 1);
			if (quoted !== undefined) {
				keys.push(quoted[0]);
				k = quoted[1];
				continue;
			}
		}
		const empty: boolean = c === '[' && text.charAt(k + 1) === ']';
		if (c === '.' || empty) {
			const j: number = empty ? k + 2 : k + 1;
			if (j === text.length || text.charAt(j) === '.' || (text.charAt(j) === '[' && text.charAt(j + 1) === ']')) keys.push('');
		}
		k += 1;
	}
	return keys;
}`,
	__setPath: `function __setPath(target: any, path: any, value: any): any {
	if (target === null || typeof target !== 'object') return target;
	let keys: string[] = [];
	if (Array.isArray(path)) {
		for (const part of path) {
			if (typeof part !== 'string') throw new Error('a path with a part that is not text has no compiled form');
			keys.push(part);
		}
	} else if (typeof path !== 'string') throw new Error('a path that is not text or a list has no compiled form');
	else if (__pathIsKey(path) || Object.keys(target).includes(path)) keys.push(path);
	else keys = __pathKeys(path);
	let current: any = target;
	for (let k = 0; k < keys.length; k++) {
		const key: string = keys[k];
		if (key === '__proto__' || key === 'constructor' || key === 'prototype') return target;
		let next: any = value;
		if (Array.isArray(current)) {
			if (!__pathIsIndex(key) || Number(key) > current.length) throw new Error('a path that sets a member of a list that is not an index of the list or the next index has no compiled form');
			const index: number = Number(key);
			if (k < keys.length - 1) {
				const held: any = index < current.length ? current[index] : undefined;
				next = held !== null && held !== undefined && typeof held === 'object' ? held : __pathIsIndex(keys[k + 1]) ? [] : {};
			}
			if (index === current.length) current.push(next);
			else current[index] = next;
		} else {
			if (k < keys.length - 1) {
				const held: any = current[key];
				next = held !== null && held !== undefined && typeof held === 'object' ? held : __pathIsIndex(keys[k + 1]) ? [] : {};
			}
			current[key] = next;
		}
		current = next;
	}
	return target;
}`,
	__sheetColumnIndex: `function __sheetColumnIndex(column: any): number {
	if (typeof column !== 'string') throw new Error('a sheet column that is not text has no compiled form');
	const first: string = column.charAt(1);
	const text: string = column.charAt(0) === '$' && first !== '' && 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(first) ? column.slice(1) : column;
	let index: number = 0;
	for (let k = 0; k < text.length; k++) index = 26 * index + text.charCodeAt(k) - 64;
	return index - 1;
}`,
	__sheetColumnName: `function __sheetColumnName(index: any): string {
	if (typeof index !== 'number' || index === Infinity) throw new Error('a sheet column index that is not a finite number has no compiled form');
	if (index < 0) throw new Error('invalid column ' + index);
	let name: string = '';
	let column: number = index + 1;
	while (column !== 0 && column === column) {
		name = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor((column - 1) % 26)) + name;
		column = Math.floor((column - 1) / 26);
	}
	return name;
}`,
};

export const PACKAGE_FORM_HELPER_USES: Record<string, string[]> = {
	__pathKeys: ['__pathNumber', '__pathQuoted'],
	__pathIsKey: ['__pathQuoted'],
	__setPath: ['__pathIsKey', '__pathQuoted', '__pathKeys', '__pathNumber', '__pathIsIndex'],
};

export const PACKAGE_MEMBER_HELPERS: Record<string, Record<string, string>> = {
	'@e965/xlsx:utils': { decode_col: '__sheetColumnIndex', encode_col: '__sheetColumnName' },
};
