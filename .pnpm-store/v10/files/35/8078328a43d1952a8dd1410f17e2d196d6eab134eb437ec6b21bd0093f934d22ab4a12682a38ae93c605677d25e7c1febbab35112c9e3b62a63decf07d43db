import type { Linter, Parser, ParserOptions, SharedConfigurationSettings } from '@typescript-eslint/utils/ts-eslint';
import type { DependencyConstraint } from './DependencyConstraint';
export interface TestLanguageOptions {
    /**
     * Environments for the test case.
     */
    readonly env?: Readonly<Linter.EnvironmentConfig>;
    /**
     * The additional global variables.
     */
    readonly globals?: Readonly<Linter.GlobalsConfig>;
    /**
     * The absolute path for the parser.
     */
    readonly parser?: Readonly<Parser.LooseParserModule>;
    /**
     * Options for the parser.
     */
    readonly parserOptions?: Readonly<ParserOptions>;
}
export interface ValidTestCase<Options extends readonly unknown[]> {
    /**
     * Function to execute after testing the case regardless of its result.
     */
    readonly after?: () => void;
    /**
     * Function to execute before testing the case.
     */
    readonly before?: () => void;
    /**
     * Code for the test case.
     */
    readonly code: string;
    /**
     * Constraints that must pass in the current environment for the test to run
     */
    readonly dependencyConstraints?: DependencyConstraint;
    /**
     * The fake filename for the test case. Useful for rules that make assertion about filenames.
     */
    readonly filename?: string;
    /**
     * Language options for the test case.
     */
    readonly languageOptions?: TestLanguageOptions;
    /**
     * Name for the test case.
     */
    readonly name?: string;
    /**
     * Run this case exclusively for debugging in supported test frameworks.
     */
    readonly only?: boolean;
    /**
     * Options for the test case.
     */
    readonly options?: Readonly<Options>;
    /**
     * Settings for the test case.
     */
    readonly settings?: Readonly<SharedConfigurationSettings>;
    /**
     * Skip this case in supported test frameworks.
     */
    readonly skip?: boolean;
}
