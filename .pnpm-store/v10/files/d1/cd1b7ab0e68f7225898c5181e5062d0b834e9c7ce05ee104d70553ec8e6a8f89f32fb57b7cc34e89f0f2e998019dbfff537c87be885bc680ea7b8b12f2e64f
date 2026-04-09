import { capitalize } from './string.js';

export type Sep = '_' | '-';

export type Part = `${number}.${number}.${number}`;

export type WithPre = `${Part}${Sep}${string}${Sep | '.'}${Part | number}`;

export type Full = Part | WithPre;

type Type<S extends string, Acc extends string = ''> = S extends `${infer First}${infer Rest}`
	? First extends Sep | '.'
		? Acc
		: Type<Rest, `${Acc}${First}`>
	: Acc;

export type Parse<T extends Full, StripCore extends boolean> = T extends `${infer Core}${Sep}${infer Rest}`
	? Rest extends `${infer U}`
		? {
				full: T;
				core: Core;
				type: Type<U>;
				pre: U extends `${Type<U>}${Sep | '.'}${infer Pre}` ? Pre : '';
				display: `${StripCore extends true
					? Core extends '1.0.0'
						? ''
						: `${Core} `
					: `${Core} `}${Capitalize<Type<U>>}${U extends `${Type<U>}${Sep | '.'}${infer Pre}` ? ` ${Pre}` : ''}`;
			}
		: never
	: T extends Part
		? {
				full: T;
				core: T;
				display: T;
			}
		: never;

export const regex = /^(?<core>\d+\.\d+\.\d+)(?:[-_](?<type>[^-_.]+)[-_.](?<pre>\d*(?:\.\d+)*))?/;

/**
 * Parses a semver version, including compile-time results
 * @param full the full version to parse
 * @param stripCore Whether to strip the leading core version in the display version when the core version is 1.0.0 (default false)
 */
export function parse<const T extends Full>(full: T): Parse<T, false>;
export function parse<const T extends Full, const S extends boolean>(full: T, stripCore: S): Parse<T, S>;
export function parse<const T extends Full, const S extends boolean>(full: T, stripCore?: S): Parse<T, S> {
	const { type, pre, core } = regex.exec(full)!.groups!;
	const display = type
		? `${stripCore && core == '1.0.0' ? '' : core + ' '}${capitalize(type)}${pre ? ` ${pre}` : ''}`
		: core;
	return { full, core, pre, type, display } as Parse<T, S>;
}
