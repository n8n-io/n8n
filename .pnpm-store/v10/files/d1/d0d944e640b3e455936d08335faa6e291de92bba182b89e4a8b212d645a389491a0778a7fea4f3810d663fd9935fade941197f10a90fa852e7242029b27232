/**
 * @module
 * Language module for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
export type DetectorType = 'path' | 'querystring' | 'cookie' | 'header';
export type CacheType = 'cookie';
export interface DetectorOptions {
    /** Order of language detection strategies */
    order: DetectorType[];
    /** Query parameter name for language */
    lookupQueryString: string;
    /** Cookie name for language */
    lookupCookie: string;
    /** Index in URL path where language code appears */
    lookupFromPathIndex: number;
    /** Header key for language detection */
    lookupFromHeaderKey: string;
    /** Caching strategies */
    caches: CacheType[] | false;
    /** Cookie configuration options */
    cookieOptions?: {
        domain?: string;
        path?: string;
        sameSite?: 'Strict' | 'Lax' | 'None';
        secure?: boolean;
        maxAge?: number;
        httpOnly?: boolean;
    };
    /** Whether to ignore case in language codes */
    ignoreCase: boolean;
    /** Default language if none detected */
    fallbackLanguage: string;
    /** List of supported language codes */
    supportedLanguages: string[];
    /** Optional function to transform detected language codes */
    convertDetectedLanguage?: (lang: string) => string;
    /** Enable debug logging */
    debug?: boolean;
}
export interface LanguageVariables {
    language: string;
}
export declare const DEFAULT_OPTIONS: DetectorOptions;
/**
 * Parse Accept-Language header values with quality scores
 * @param header Accept-Language header string
 * @returns Array of parsed languages with quality scores
 */
export declare function parseAcceptLanguage(header: string): Array<{
    lang: string;
    q: number;
}>;
/**
 * Validate and normalize language codes
 * @param lang Language code to normalize
 * @param options Detector options
 * @returns Normalized language code or undefined
 */
export declare const normalizeLanguage: (lang: string | null | undefined, options: DetectorOptions) => string | undefined;
/**
 * Detects language from query parameter
 */
export declare const detectFromQuery: (c: Context, options: DetectorOptions) => string | undefined;
/**
 * Detects language from cookie
 */
export declare const detectFromCookie: (c: Context, options: DetectorOptions) => string | undefined;
/**
 * Detects language from Accept-Language header
 */
export declare function detectFromHeader(c: Context, options: DetectorOptions): string | undefined;
/**
 * Detects language from URL path
 */
export declare function detectFromPath(c: Context, options: DetectorOptions): string | undefined;
/**
 * Collection of all language detection strategies
 */
export declare const detectors: {
    readonly querystring: (c: Context, options: DetectorOptions) => string | undefined;
    readonly cookie: (c: Context, options: DetectorOptions) => string | undefined;
    readonly header: typeof detectFromHeader;
    readonly path: typeof detectFromPath;
};
/** Type for detector functions */
export type DetectorFunction = (c: Context, options: DetectorOptions) => string | undefined;
/** Type-safe detector map */
export type Detectors = Record<keyof typeof detectors, DetectorFunction>;
/**
 * Validate detector options
 * @param options Detector options to validate
 * @throws Error if options are invalid
 */
export declare function validateOptions(options: DetectorOptions): void;
/**
 * Language detector middleware factory
 * @param userOptions Configuration options for the language detector
 * @returns Hono middleware function
 */
export declare const languageDetector: (userOptions: Partial<DetectorOptions>) => MiddlewareHandler;
