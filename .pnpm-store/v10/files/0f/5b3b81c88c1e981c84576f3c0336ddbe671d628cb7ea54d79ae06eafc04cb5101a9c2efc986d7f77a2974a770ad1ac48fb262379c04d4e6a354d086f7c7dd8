import type { ParserServices, TSESTree } from '../ts-estree';
import type { ParserOptions } from './ParserOptions';
import type { Scope } from './Scope';
export declare namespace Parser {
    interface ParserMeta {
        /**
         * The unique name of the parser.
         */
        name: string;
        /**
         * The a string identifying the version of the parser.
         */
        version?: string;
    }
    /**
     * A loose definition of the ParserModule type for use with configs
     * This type intended to relax validation of configs so that parsers that have
     * different AST types or scope managers can still be passed to configs
     */
    type LooseParserModule = {
        /**
         * Information about the parser to uniquely identify it when serializing.
         */
        meta?: ParserMeta;
        /**
         * Parses the given text into an ESTree AST
         */
        parse(text: string, options?: unknown): unknown;
    } | {
        /**
         * Information about the parser to uniquely identify it when serializing.
         */
        meta?: ParserMeta;
        /**
         * Parses the given text into an AST
         */
        parseForESLint(text: string, options?: unknown): {
            [k in keyof ParseResult]: unknown;
        };
    };
    type ParserModule = {
        /**
         * Information about the parser to uniquely identify it when serializing.
         */
        meta?: ParserMeta;
        /**
         * Parses the given text into an ESTree AST
         */
        parse(text: string, options?: ParserOptions): TSESTree.Program;
    } | {
        /**
         * Information about the parser to uniquely identify it when serializing.
         */
        meta?: ParserMeta;
        /**
         * Parses the given text into an AST
         */
        parseForESLint(text: string, options?: ParserOptions): ParseResult;
    };
    interface ParseResult {
        /**
         * The ESTree AST
         */
        ast: TSESTree.Program;
        /**
         * Any parser-dependent services (such as type checkers for nodes).
         * The value of the services property is available to rules as `context.sourceCode.parserServices`.
         * The default is an empty object.
         */
        services?: ParserServices;
        /**
         * A `ScopeManager` object.
         * Custom parsers can use customized scope analysis for experimental/enhancement syntaxes.
         * The default is the `ScopeManager` object which is created by `eslint-scope`.
         */
        scopeManager?: Scope.ScopeManager;
        /**
         * An object to customize AST traversal.
         * The keys of the object are the type of AST nodes.
         * Each value is an array of the property names which should be traversed.
         * The default is `KEYS` of `eslint-visitor-keys`.
         */
        visitorKeys?: VisitorKeys;
    }
    interface VisitorKeys {
        [nodeType: string]: readonly string[];
    }
}
//# sourceMappingURL=Parser.d.ts.map