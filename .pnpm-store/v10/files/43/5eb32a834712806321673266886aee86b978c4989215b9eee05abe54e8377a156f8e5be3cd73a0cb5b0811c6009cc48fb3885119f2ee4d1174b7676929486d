export declare class FileMap<T> extends Map<string, T> {
    private caseSensitive;
    private originalFileNames;
    constructor(caseSensitive: boolean);
    keys(): IterableIterator<string>;
    get(key: string): T | undefined;
    has(key: string): boolean;
    set(key: string, value: T): this;
    delete(key: string): boolean;
    clear(): void;
    normalizeId(id: string): string;
}
