type KeyType = string;
type ValueType = any;
type RawDict = object;

declare function caseless(dict?: RawDict): caseless.Caseless;

declare namespace caseless {
    function httpify(resp: object, headers: RawDict): Caseless;

    interface Caseless {
        set(name: KeyType, value: ValueType, clobber?: boolean): KeyType | false;
        set(dict: RawDict): void;
        has(name: KeyType): KeyType | false;
        get(name: KeyType): ValueType | undefined;
        swap(name: KeyType): void;
        del(name: KeyType): boolean;
    }

    interface Httpified {
        headers: RawDict;
        setHeader(name: KeyType, value: ValueType, clobber?: boolean): KeyType | false;
        setHeader(dict: RawDict): void;
        hasHeader(name: KeyType): KeyType | false;
        getHeader(name: KeyType): ValueType | undefined;
        removeHeader(name: KeyType): boolean;
    }
}

export = caseless;
