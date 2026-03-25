import type { SchemaRefDescription } from './schema';
export declare type ReferenceOptions<TValue = unknown> = {
    map?: (value: unknown) => TValue;
};
export declare function create<TValue = unknown>(key: string, options?: ReferenceOptions<TValue>): Reference<TValue>;
export default class Reference<TValue = unknown> {
    readonly key: string;
    readonly isContext: boolean;
    readonly isValue: boolean;
    readonly isSibling: boolean;
    readonly path: any;
    readonly getter: (data: unknown) => unknown;
    readonly map?: (value: unknown) => TValue;
    readonly __isYupRef: boolean;
    constructor(key: string, options?: ReferenceOptions<TValue>);
    getValue(value: any, parent?: {}, context?: {}): TValue;
    /**
     *
     * @param {*} value
     * @param {Object} options
     * @param {Object=} options.context
     * @param {Object=} options.parent
     */
    cast(value: any, options?: {
        parent?: {};
        context?: {};
    }): TValue;
    resolve(): this;
    describe(): SchemaRefDescription;
    toString(): string;
    static isRef(value: any): value is Reference;
}
