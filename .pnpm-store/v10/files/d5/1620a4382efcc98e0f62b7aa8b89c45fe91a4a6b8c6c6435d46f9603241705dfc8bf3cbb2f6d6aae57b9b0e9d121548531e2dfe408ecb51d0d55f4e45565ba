import { defaultFilter, equals, defaultChecker } from './util';

import { IOptions } from './types';

export * from './types';
export * from './util';

export function array_unique<T>(arr: T, options: IOptions<T> = {}): T
{
	if (!Array.isArray(arr))
	{
		throw new TypeError(`Expected an Array but got ${typeof arr}.`)
	}

	const cb = defaultFilter(options);

	if (options.overwrite)
	{
		let index = arr.length;

		while (index--)
		{
			let val = arr[index];

			if (!cb(val, index, arr))
			{
				arr.splice(index, 1);
			}
		}

		return arr;
	}

	// @ts-ignore
	return arr.filter(cb);
}

export function array_unique_overwrite<T>(arr: T, options: IOptions<T> = {}): T
{
	return array_unique(arr, {
		...options,
		overwrite: true,
	});
}

export function lazy_unique<T extends any[]>(arr: T): T
export function lazy_unique<T, T1, T2>(a1: T1, a2: T2, ...arr: T[]): Array<T | T1 | T2>
export function lazy_unique<T>(...arr: Array<T | T[]>): T | (T | T[])[]
// @ts-ignore
export function lazy_unique<T>(...arr: Array<T | T[]>)
{
	if (arr.length > 1)
	{
		return array_unique(arr);
	}

	return array_unique(arr[0]);
}

export function lazy_unique_overwrite<T>(...arr: Array<T | T[]>)
{
	if (arr.length > 1)
	{
		return array_unique_overwrite(arr);
	}

	return array_unique_overwrite(arr[0]);
}

export {
	equals,
	defaultFilter,
	defaultChecker,
}

if (process.env.TSDX_FORMAT !== 'esm')
{
	Object.defineProperty(lazy_unique, "array_unique", { value: array_unique });
	Object.defineProperty(lazy_unique, "array_unique_overwrite", { value: array_unique_overwrite });
	Object.defineProperty(lazy_unique, "lazy_unique_overwrite", { value: lazy_unique_overwrite });

	Object.defineProperty(lazy_unique, "equals", { value: equals });
	Object.defineProperty(lazy_unique, "defaultFilter", { value: defaultFilter });
	Object.defineProperty(lazy_unique, "defaultChecker", { value: defaultChecker });

	Object.defineProperty(lazy_unique, "lazy_unique", { value: lazy_unique });
	Object.defineProperty(lazy_unique, "default", { value: lazy_unique });

	Object.defineProperty(lazy_unique, "__esModule", { value: true });
}

export default lazy_unique
