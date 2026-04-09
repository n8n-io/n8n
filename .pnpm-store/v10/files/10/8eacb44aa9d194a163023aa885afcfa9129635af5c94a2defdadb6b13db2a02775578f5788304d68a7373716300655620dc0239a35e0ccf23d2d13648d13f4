import type { Parser } from '@typescript-eslint/utils/ts-eslint';
export declare const RULE_TESTER_PARAMETERS: readonly ["after", "before", "code", "defaultFilenames", "dependencyConstraints", "errors", "filename", "name", "only", "options", "output", "skip"];
export declare const ERROR_OBJECT_PARAMETERS: ReadonlySet<string>;
export declare const FRIENDLY_ERROR_OBJECT_PARAMETER_LIST: string;
export declare const SUGGESTION_OBJECT_PARAMETERS: ReadonlySet<string>;
export declare const FRIENDLY_SUGGESTION_OBJECT_PARAMETER_LIST: string;
/**
 * Replace control characters by `\u00xx` form.
 */
export declare function sanitize(text: string): string;
/**
 * Wraps the given parser in order to intercept and modify return values from the `parse` and `parseForESLint` methods, for test purposes.
 * In particular, to modify ast nodes, tokens and comments to throw on access to their `start` and `end` properties.
 */
export declare function wrapParser(parser: Parser.LooseParserModule): Parser.LooseParserModule;
export declare const REQUIRED_SCENARIOS: readonly ["valid", "invalid"];
