import { IWindowStorage } from "./IWindowStorage.js";
export declare const SameSiteOptions: {
    readonly Lax: "Lax";
    readonly None: "None";
};
export type SameSiteOptions = (typeof SameSiteOptions)[keyof typeof SameSiteOptions];
export declare class CookieStorage implements IWindowStorage<string> {
    initialize(): Promise<void>;
    getItem(key: string): string | null;
    getUserData(): string | null;
    setItem(key: string, value: string, cookieLifeDays?: number, secure?: boolean, sameSite?: SameSiteOptions): void;
    setUserData(): Promise<void>;
    removeItem(key: string): void;
    getKeys(): string[];
    containsKey(key: string): boolean;
    decryptData(): Promise<object | null>;
}
/**
 * Get cookie expiration time
 * @param cookieLifeDays
 */
export declare function getCookieExpirationTime(cookieLifeDays: number): string;
//# sourceMappingURL=CookieStorage.d.ts.map