import { Language } from '@volar/language-core';
import type * as ts from 'typescript';
/**
 * Creates and returns a Proxy around the base TypeScript LanguageService.
 *
 * This is used by the Volar TypeScript Plugin (which can be created by `createLanguageServicePlugin`
 * and `createAsyncLanguageServicePlugin`) as an adapter layer between the TypeScript Language Service
 * plugin API (see https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
 * and a Volar `Language`.
 *
 * Once the `initialize` method is called, the proxy will begin intercepting requests and
 * enhancing the default behavior of the LanguageService with enhancements based on
 * the Volar `Language` that has been passed to `initialize`.
 */
export declare function createProxyLanguageService(languageService: ts.LanguageService): {
    initialize(language: Language<string>): void;
    proxy: ts.LanguageService;
};
