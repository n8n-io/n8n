import { IWindowStorage } from "./IWindowStorage.js";
export declare class MemoryStorage<T> implements IWindowStorage<T> {
    private cache;
    constructor();
    initialize(): Promise<void>;
    getItem(key: string): T | null;
    getUserData(key: string): T | null;
    setItem(key: string, value: T): void;
    setUserData(key: string, value: T): Promise<void>;
    removeItem(key: string): void;
    getKeys(): string[];
    containsKey(key: string): boolean;
    clear(): void;
    decryptData(): Promise<object | null>;
}
//# sourceMappingURL=MemoryStorage.d.ts.map