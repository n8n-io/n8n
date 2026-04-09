import { MetricAttributes } from '@opentelemetry/api';
export interface Hash<ValueType, HashCodeType> {
    (value: ValueType): HashCodeType;
}
export declare class HashMap<KeyType, ValueType, HashCodeType> {
    private _hash;
    private _valueMap;
    private _keyMap;
    constructor(_hash: Hash<KeyType, HashCodeType>);
    get(key: KeyType, hashCode?: HashCodeType): ValueType | undefined;
    getOrDefault(key: KeyType, defaultFactory: () => ValueType): ValueType | undefined;
    set(key: KeyType, value: ValueType, hashCode?: HashCodeType): void;
    has(key: KeyType, hashCode?: HashCodeType): boolean;
    keys(): IterableIterator<[KeyType, HashCodeType]>;
    entries(): IterableIterator<[KeyType, ValueType, HashCodeType]>;
    get size(): number;
}
export declare class AttributeHashMap<ValueType> extends HashMap<MetricAttributes, ValueType, string> {
    constructor();
}
//# sourceMappingURL=HashMap.d.ts.map