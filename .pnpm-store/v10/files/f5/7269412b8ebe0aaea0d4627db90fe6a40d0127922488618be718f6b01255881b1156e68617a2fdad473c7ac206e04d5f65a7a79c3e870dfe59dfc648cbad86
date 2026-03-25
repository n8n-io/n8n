/**
 * @module
 * Cookie Helper for Hono.
 */
import type { Context } from '../../context';
import type { Cookie, CookieOptions, CookiePrefixOptions, SignedCookie } from '../../utils/cookie';
interface GetCookie {
    (c: Context, key: string): string | undefined;
    (c: Context): Cookie;
    (c: Context, key: string, prefixOptions?: CookiePrefixOptions): string | undefined;
}
interface GetSignedCookie {
    (c: Context, secret: string | BufferSource, key: string): Promise<string | undefined | false>;
    (c: Context, secret: string | BufferSource): Promise<SignedCookie>;
    (c: Context, secret: string | BufferSource, key: string, prefixOptions?: CookiePrefixOptions): Promise<string | undefined | false>;
}
export declare const getCookie: GetCookie;
export declare const getSignedCookie: GetSignedCookie;
export declare const generateCookie: (name: string, value: string, opt?: CookieOptions) => string;
export declare const setCookie: (c: Context, name: string, value: string, opt?: CookieOptions) => void;
export declare const generateSignedCookie: (name: string, value: string, secret: string | BufferSource, opt?: CookieOptions) => Promise<string>;
export declare const setSignedCookie: (c: Context, name: string, value: string, secret: string | BufferSource, opt?: CookieOptions) => Promise<void>;
export declare const deleteCookie: (c: Context, name: string, opt?: CookieOptions) => string | undefined;
export {};
