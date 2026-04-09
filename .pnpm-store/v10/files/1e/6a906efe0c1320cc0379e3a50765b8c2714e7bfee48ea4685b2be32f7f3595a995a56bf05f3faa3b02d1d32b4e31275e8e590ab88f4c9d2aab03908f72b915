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

type FileSizeOptionStringOrBase = FileSizeOptionsString | FileSizeOptionsBase;
type FileSizeOptions = FileSizeOptionsArray | FileSizeOptionsExponent | FileSizeOptionsObject | FileSizeOptionStringOrBase | undefined
type FileSizeReturnType<Options extends FileSizeOptions> =
    Options extends FileSizeOptionsArray
        ? FileSizeReturnArray
        : Options extends FileSizeOptionsExponent
        ? number
        : Options extends FileSizeOptionsObject
        ? FileSizeReturnObject
        : string;

export function filesize<Options extends FileSizeOptions = undefined>(byteCount: number | string | bigint, options?: Options): FileSizeReturnType<Options> 
export function partial<Options extends FileSizeOptions = undefined>(options?: Options): (byteCount: number | string | bigint) => FileSizeReturnType<Options>
