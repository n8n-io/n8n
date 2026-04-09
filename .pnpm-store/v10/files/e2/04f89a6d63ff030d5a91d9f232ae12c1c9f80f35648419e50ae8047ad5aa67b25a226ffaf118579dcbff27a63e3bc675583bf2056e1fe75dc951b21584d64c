import type { Processor, SharedConfig } from '@typescript-eslint/utils/ts-eslint';
interface ObjectPropertySchema<T = unknown> {
    merge: string | ((a: T, b: T) => T);
    validate: string | ((value: unknown) => asserts value is T);
}
export type ObjectLike = Record<string, unknown>;
type ConfigRules = Record<string, SharedConfig.RuleLevelAndOptions>;
export declare const flatConfigSchema: {
    language: ObjectPropertySchema<`${string}/${string}`>;
    languageOptions: {
        merge(first?: ObjectLike, second?: ObjectLike): object;
        validate: string;
    };
    linterOptions: {
        schema: {
            noInlineConfig: {
                merge: string;
                validate: string;
            };
            reportUnusedDisableDirectives: ObjectPropertySchema<SharedConfig.RuleLevel>;
        };
    };
    plugins: {
        merge(first?: ObjectLike, second?: ObjectLike): object;
        validate(value: unknown): void;
    };
    processor: ObjectPropertySchema<Processor.LooseProcessorModule>;
    rules: {
        merge(first?: ConfigRules, second?: ConfigRules): ConfigRules;
        validate(value: ConfigRules): void;
    };
    settings: {
        merge<First extends ObjectLike, Second extends ObjectLike>(first?: First, second?: Second): First & Second;
        validate: string;
    };
    defaultFilenames: {
        additionalProperties: boolean;
        properties: {
            ts: {
                type: string;
            };
            tsx: {
                type: string;
            };
        };
        required: string[];
        type: string;
    };
    dependencyConstraints: {
        additionalProperties: {
            type: string;
        };
        type: string;
    };
    files: {
        items: {
            type: string;
        };
        type: string;
    };
    $schema: {
        type: string;
    };
};
export {};
