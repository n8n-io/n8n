import { ITSAndTypeAndStringLiteral, ITSTypeAndStringLiteral } from 'ts-type/lib/helper/string';

export const enum EnumLineBreak
{
	CR = "\r",
	CRLF = "\r\n",
	LF = "\n",
}

export const enum EnumLineBreakCharCode
{
	CR = 0x0d,
	LF = 0x0a,
}

const CR = EnumLineBreak.CR as const;
const CRLF = EnumLineBreak.CRLF as const;
const LF = EnumLineBreak.LF as const;

const R_CRLF = /\r\n|\r(?!\n)|\n/g;
const R_CRLF_MATCH = new RegExp(`(${R_CRLF.source})`, R_CRLF.flags);

export { CR, CRLF, LF, R_CRLF, R_CRLF_MATCH }

export type ILineBreak = ITSTypeAndStringLiteral<EnumLineBreak>;

export type ILineBreakInput = ITSAndTypeAndStringLiteral<EnumLineBreak>;

export interface IOptions
{
	disable?: {
		lf?: boolean,
		crlf?: boolean,
		cr?: boolean,
	}
}

export function crlf(text: string, newline: ILineBreakInput = EnumLineBreak.LF): string
{
	return text.replace(R_CRLF, newline);
}

export function chkcrlf(text: string, options?: IOptions)
{
	const disable = options?.disable ?? {};

	return {
		lf: !disable.lf && /\n/.test(text.replace(/\r\n/g, '')),
		crlf: !disable.crlf && /\r\n/.test(text),
		cr: !disable.cr && /\r(?!\n)/.test(text),
	} as const;
}

export type IChkCrlf = ReturnType<typeof chkcrlf>;

export function detectLineBreak(text: string, options?: IOptions)
{
	const _lb = chkcrlf(text, options);
	return _detectLineBreakCore(_lb)
}

export function _detectLineBreakCore(_lb: IChkCrlf)
{
	return _lb.crlf ? EnumLineBreak.CRLF : (_lb.lf || !_lb.cr) ? EnumLineBreak.LF : EnumLineBreak.CR
}

export function isCRLF(newline: string): newline is EnumLineBreak.CRLF
{
	return newline === EnumLineBreak.CRLF
}

export function isLF(newline: string): newline is EnumLineBreak.LF
{
	return newline === EnumLineBreak.LF
}

export function isCR(newline: string): newline is EnumLineBreak.CR
{
	return newline === EnumLineBreak.CR
}

export function charCodeIsLF(charCode: number): charCode is EnumLineBreakCharCode.LF
{
	return charCode === EnumLineBreakCharCode.LF
}

export function charCodeIsCR(charCode: number): charCode is EnumLineBreakCharCode.CR
{
	return charCode === EnumLineBreakCharCode.CR
}

export function lineSplit(text: string)
{
	return text.split(R_CRLF);
}

export function crlf_unicode_normalize(text: string, newline: ILineBreakInput = EnumLineBreak.LF): string
{
	const ln3 = newline + newline + newline;
	const ln2 = newline + newline;

	return text
		.replace(/\u000C/g, ln3)
		.replace(/\u2028/g, newline)
		.replace(/\u2029/g, ln2)
		;
}

export function isEqualWithIgnoreLineSeparators(a: string, b: string)
{
	const _lb_a: IChkCrlf = chkcrlf(a);
	const _lb_b: IChkCrlf = chkcrlf(b);

	let bool = false;

	if (_lb_a.cr === _lb_b.cr && _lb_a.crlf === _lb_b.crlf && _lb_a.lf === _lb_b.lf)
	{
		bool = crlf(a) === crlf(b);
	}

	return {
		bool,
		_lb_a,
		_lb_b,
	}
}

export type ILineBreakName = keyof typeof EnumLineBreak;

export function toLineBreakName(newline: ILineBreakInput): ILineBreakName
{
	switch (newline)
	{
		case EnumLineBreak.LF:
			return 'LF'
		case EnumLineBreak.CR:
			return 'CR'
		case EnumLineBreak.CRLF:
			return 'CRLF'
	}

	throw new TypeError(`Invalid line break`);
}

export function nameToLineBreak(name: ILineBreakName | Lowercase<ILineBreakName> | Capitalize<Lowercase<ILineBreakName>> | string): EnumLineBreak
{
	switch (name?.toUpperCase())
	{
		case 'LF':
			return EnumLineBreak.LF
		case 'CR':
			return EnumLineBreak.CR
		case 'CRLF':
			return EnumLineBreak.CRLF
	}

	throw new TypeError(`Invalid line break name: ${name}`);
}

export function detectCurrentIndexLineBreakFromBufferLike<T extends number, A extends {
	[n: number]: number
}>(buffer: A, index: T)
{
	const cur = buffer[index];
	const next = index + 1;
	if (charCodeIsLF(cur))
	{
		return {
			newline: EnumLineBreak.LF as const,
			cur: cur as EnumLineBreakCharCode.LF,
			index,
			next,
			length: 1 as const,
		} as const
	}
	else if (charCodeIsCR(cur))
	{
		if (charCodeIsLF(buffer[next]))
		{
			return {
				newline: EnumLineBreak.CRLF as const,
				cur: cur as EnumLineBreakCharCode.CR,
				index,
				next: next + 1,
				length: 2 as const,
			} as const
		}

		return {
			newline: EnumLineBreak.CR as const,
			cur: cur as EnumLineBreakCharCode.CR,
			index,
			next,
			length: 1 as const,
		} as const
	}

	return {
		newline: void 0 as undefined,
		cur,
		index,
		next,
		length: 0 as const,
	} as const
}

export function detectCurrentIndexLineBreak<T extends number, A extends {
	[n: number]: string
}>(buffer: A, index: T)
{
	const cur = buffer[index];
	const next = index + 1;
	if (isLF(cur))
	{
		return {
			newline: EnumLineBreak.LF as const,
			cur: cur as EnumLineBreak.LF,
			index,
			next,
			length: 1 as const,
		} as const
	}
	else if (isCR(cur))
	{
		if (isLF(buffer[next]))
		{
			return {
				newline: EnumLineBreak.CRLF as const,
				cur: cur as EnumLineBreak.CR,
				index,
				next: next + 1,
				length: 2 as const,
			} as const
		}

		return {
			newline: EnumLineBreak.CR as const,
			cur: cur as EnumLineBreak.CR,
			index,
			next,
			length: 1 as const,
		} as const
	}

	return {
		newline: void 0 as void,
		cur,
		index,
		next,
		length: 0 as const,
	} as const
}

export default crlf;
