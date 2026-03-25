export = QueryString;
export as namespace qs;

declare namespace QueryString {
    type defaultEncoder = (str: any, defaultEncoder?: any, charset?: string) => string;
    type defaultDecoder = (str: string, decoder?: any, charset?: string) => string;

    type BooleanOptional = boolean | undefined;

    interface IStringifyBaseOptions {
        delimiter?: string | undefined;
        strictNullHandling?: boolean | undefined;
        skipNulls?: boolean | undefined;
        encode?: boolean | undefined;
        encoder?:
            | ((str: any, defaultEncoder: defaultEncoder, charset: string, type: "key" | "value") => string)
            | undefined;
        filter?: Array<string | number> | ((prefix: string, value: any) => any) | undefined;
        arrayFormat?: "indices" | "brackets" | "repeat" | "comma" | undefined;
        indices?: boolean | undefined;
        sort?: ((a: string, b: string) => number) | undefined;
        serializeDate?: ((d: Date) => string) | undefined;
        format?: "RFC1738" | "RFC3986" | undefined;
        encodeValuesOnly?: boolean | undefined;
        addQueryPrefix?: boolean | undefined;
        charset?: "utf-8" | "iso-8859-1" | undefined;
        charsetSentinel?: boolean | undefined;
        allowEmptyArrays?: boolean | undefined;
    }

    type IStringifyDynamicOptions<AllowDots extends BooleanOptional> = AllowDots extends true
        ? { allowDots?: AllowDots; encodeDotInKeys?: boolean }
        : { allowDots?: boolean; encodeDotInKeys?: false };

    type IStringifyOptions<AllowDots extends BooleanOptional = undefined> =
        & IStringifyBaseOptions
        & IStringifyDynamicOptions<AllowDots>;

    interface IParseBaseOptions {
        comma?: boolean | undefined;
        delimiter?: string | RegExp | undefined;
        depth?: number | false | undefined;
        decoder?:
            | ((str: string, defaultDecoder: defaultDecoder, charset: string, type: "key" | "value") => any)
            | undefined;
        arrayLimit?: number | undefined;
        parseArrays?: boolean | undefined;
        plainObjects?: boolean | undefined;
        allowPrototypes?: boolean | undefined;
        allowSparse?: boolean | undefined;
        parameterLimit?: number | undefined;
        strictNullHandling?: boolean | undefined;
        ignoreQueryPrefix?: boolean | undefined;
        charset?: "utf-8" | "iso-8859-1" | undefined;
        charsetSentinel?: boolean | undefined;
        interpretNumericEntities?: boolean | undefined;
        allowEmptyArrays?: boolean | undefined;
        duplicates?: "combine" | "first" | "last" | undefined;
    }

    type IParseDynamicOptions<AllowDots extends BooleanOptional> = AllowDots extends true
        ? { allowDots?: AllowDots; decodeDotInKeys?: boolean }
        : { allowDots?: boolean; decodeDotInKeys?: false };

    type IParseOptions<AllowDots extends BooleanOptional = undefined> =
        & IParseBaseOptions
        & IParseDynamicOptions<AllowDots>;

    interface ParsedQs {
        [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[];
    }

    function stringify(obj: any, options?: IStringifyOptions<BooleanOptional>): string;
    function parse(str: string, options?: IParseOptions<BooleanOptional> & { decoder?: never | undefined }): ParsedQs;
    function parse(
        str: string | Record<string, string>,
        options?: IParseOptions<BooleanOptional>,
    ): { [key: string]: unknown };
}
