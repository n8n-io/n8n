interface FileSizeOptionsBase {
    base?: 10 | 2;
    bits?: boolean;
    exponent?: number;
    fullform?: boolean;
    fullforms?: string[];
    locale?: string | boolean;
    localeOptions?: Intl.DateTimeFormatOptions;
    pad?: boolean;
    precision?: number;
    round?: number;
    roundingMethod?: 'round' | 'floor' | 'ceil';
    separator?: string;
    spacer?: string;
    standard?: 'si' | 'iec' | 'jedec';
    symbols?: {};
}

interface FileSizeOptionsArray extends FileSizeOptionsBase {
    output: 'array'
}

interface FileSizeOptionsExponent extends FileSizeOptionsBase {
    output: 'exponent'
}

interface FileSizeOptionsObject extends FileSizeOptionsBase {
    output: 'object'
}

interface FileSizeOptionsString extends FileSizeOptionsBase {
    output: 'string'
}

interface FileSizeReturnObject {
    value: string,
    symbol: string,
    exponent: number,
    unit: string,
}

type FileSizeReturnArray = [ number, string ]

export function filesize(byteCount: number, options: FileSizeOptionsString | FileSizeOptionsBase): string
export function filesize(byteCount: number, options: FileSizeOptionsArray): FileSizeReturnArray
export function filesize(byteCount: number, options: FileSizeOptionsExponent): number
export function filesize(byteCount: number, options: FileSizeOptionsObject): FileSizeReturnObject
export function filesize(byteCount: number): string

export function partial(options: FileSizeOptionsString | FileSizeOptionsBase): (byteCount: number) => string
export function partial(options: FileSizeOptionsArray): (byteCount: number) => FileSizeReturnArray
export function partial(options: FileSizeOptionsExponent): (byteCount: number) => number
export function partial(options: FileSizeOptionsObject): (byteCount: number) => FileSizeReturnObject
export function partial(): (byteCount: number) => string
