import type * as ts from 'typescript';
import type { createPluginCallbackAsync } from './languageServicePluginCommon';
/**
 * Creates and returns a TS Service Plugin that supports async initialization.
 * Essentially, this functions the same as `createLanguageServicePlugin`, but supports
 * use cases in which the plugin callback must be async. For example in mdx-analyzer
 * and Glint, this async variant is required because Glint + mdx-analyzer are written
 * in ESM and get transpiled to CJS, which requires usage of `await import()` to load
 * the necessary dependencies and fully initialize the plugin.
 *
 * To handle the period of time in which the plugin is initializing, this async
 * variant stubs a number of methods on the LanguageServiceHost to handle the uninitialized state.
 *
 * Additionally, this async variant requires a few extra args pertaining to
 * file extensions intended to be handled by the TS Plugin. In the synchronous variant,
 * these can be synchronously inferred from elsewhere but for the async variant, they
 * need to be passed in.
 *
 * See https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin for
 * more information.
 */
export declare function createAsyncLanguageServicePlugin(extensions: string[], getScriptKindForExtraExtensions: ts.ScriptKind | ((fileName: string) => ts.ScriptKind), createPluginCallbackAsync: createPluginCallbackAsync): ts.server.PluginModuleFactory;
