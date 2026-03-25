/**
 * @module
 * Body utility.
 */
import { HonoRequest } from '../request';
type BodyDataValueDot = {
    [x: string]: string | File | BodyDataValueDot;
};
type BodyDataValueDotAll = {
    [x: string]: string | File | (string | File)[] | BodyDataValueDotAll;
};
type SimplifyBodyData<T> = {
    [K in keyof T]: string | File | (string | File)[] | BodyDataValueDotAll extends T[K] ? string | File | (string | File)[] | BodyDataValueDotAll : string | File | BodyDataValueDot extends T[K] ? string | File | BodyDataValueDot : string | File | (string | File)[] extends T[K] ? string | File | (string | File)[] : string | File;
} & {};
type BodyDataValueComponent<T> = string | File | (T extends {
    all: false;
} ? never : T extends {
    all: true;
} | {
    all: boolean;
} ? (string | File)[] : never);
type BodyDataValueObject<T> = {
    [key: string]: BodyDataValueComponent<T> | BodyDataValueObject<T>;
};
type BodyDataValue<T> = BodyDataValueComponent<T> | (T extends {
    dot: false;
} ? never : T extends {
    dot: true;
} | {
    dot: boolean;
} ? BodyDataValueObject<T> : never);
export type BodyData<T extends Partial<ParseBodyOptions> = {}> = SimplifyBodyData<Record<string, BodyDataValue<T>>>;
export type ParseBodyOptions = {
    /**
     * Determines whether all fields with multiple values should be parsed as arrays.
     * @default false
     * @example
     * const data = new FormData()
     * data.append('file', 'aaa')
     * data.append('file', 'bbb')
     * data.append('message', 'hello')
     *
     * If all is false:
     * parseBody should return { file: 'bbb', message: 'hello' }
     *
     * If all is true:
     * parseBody should return { file: ['aaa', 'bbb'], message: 'hello' }
     */
    all: boolean;
    /**
     * Determines whether all fields with dot notation should be parsed as nested objects.
     * @default false
     * @example
     * const data = new FormData()
     * data.append('obj.key1', 'value1')
     * data.append('obj.key2', 'value2')
     *
     * If dot is false:
     * parseBody should return { 'obj.key1': 'value1', 'obj.key2': 'value2' }
     *
     * If dot is true:
     * parseBody should return { obj: { key1: 'value1', key2: 'value2' } }
     */
    dot: boolean;
};
/**
 * Parses the body of a request based on the provided options.
 *
 * @template T - The type of the parsed body data.
 * @param {HonoRequest | Request} request - The request object to parse.
 * @param {Partial<ParseBodyOptions>} [options] - Options for parsing the body.
 * @returns {Promise<T>} The parsed body data.
 */
interface ParseBody {
    <Options extends Partial<ParseBodyOptions>, T extends BodyData<Options>>(request: HonoRequest | Request, options?: Options): Promise<T>;
    <T extends BodyData>(request: HonoRequest | Request, options?: Partial<ParseBodyOptions>): Promise<T>;
}
export declare const parseBody: ParseBody;
export {};
