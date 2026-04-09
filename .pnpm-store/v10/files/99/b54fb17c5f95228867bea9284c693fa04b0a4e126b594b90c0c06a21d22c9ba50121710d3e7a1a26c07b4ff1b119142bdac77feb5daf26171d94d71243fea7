import express = require("express");

declare module "express" {
    // Inject additional properties on express.Request
    interface Request {
        /**
         * This request's secret.
         * Optionally set by cookie-parser if secret(s) are provided.  Can be used by other middleware.
         * [Declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) can be used to add your own properties.
         */
        secret?: string | undefined;
        /** Parsed cookies that have not been signed */
        cookies: Record<string, any>;
        /** Parsed cookies that have been signed */
        signedCookies: Record<string, any>;
    }
}

declare function cookieParser(
    secret?: string | string[],
    options?: cookieParser.CookieParseOptions,
): express.RequestHandler;

declare namespace cookieParser {
    interface CookieParseOptions {
        decode?(val: string): string;
    }

    function JSONCookie(jsonCookie: string): object | undefined;

    function JSONCookies<T extends { [key: string]: string }>(jsonCookies: T): { [P in keyof T]: object | undefined };

    function signedCookie(cookie: string, secret: string | string[]): string | false;

    function signedCookies<T extends { [key: string]: string }>(
        cookies: T,
        secret: string | string[],
    ): { [P in keyof T]?: string | false };
}

export = cookieParser;
