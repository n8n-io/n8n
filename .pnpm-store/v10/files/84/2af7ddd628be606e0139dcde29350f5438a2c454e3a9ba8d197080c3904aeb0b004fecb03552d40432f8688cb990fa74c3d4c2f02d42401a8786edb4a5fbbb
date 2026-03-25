import type { Arguments } from 'yargs';
import type { BundleOutputFormat, StyleguideConfig, Region, Config, Oas3Definition, Oas2Definition } from '@redocly/openapi-core';
import type { RawConfigProcessor } from '@redocly/openapi-core/lib/config';
import type { Totals, Entrypoint, ConfigApis, CommandOptions, OutputExtensions } from '../types';
export declare function getFallbackApisOrExit(argsApis: string[] | undefined, config: ConfigApis): Promise<Entrypoint[]>;
export declare function getExecutionTime(startedAt: number): string;
export declare function printExecutionTime(commandName: string, startedAt: number, api: string): void;
export declare function pathToFilename(path: string, pathSeparator: string): string;
export declare function escapeLanguageName(lang: string): string;
export declare function langToExt(lang: string): any;
export declare class CircularJSONNotSupportedError extends Error {
    originalError: Error;
    constructor(originalError: Error);
}
export declare function dumpBundle(obj: any, format: BundleOutputFormat, dereference?: boolean): string;
export declare function saveBundle(filename: string, output: string): void;
export declare function promptUser(query: string, hideUserInput?: boolean): Promise<string>;
export declare function readYaml(filename: string): unknown;
export declare function writeToFileByExtension(data: unknown, filePath: string, noRefs?: boolean): void;
export declare function writeYaml(data: any, filename: string, noRefs?: boolean): void;
export declare function writeJson(data: unknown, filename: string): void;
export declare function getAndValidateFileExtension(fileName: string): NonNullable<OutputExtensions>;
export declare function handleError(e: Error, ref: string): void;
export declare class HandledError extends Error {
}
export declare function printLintTotals(totals: Totals, definitionsCount: number): void;
export declare function printConfigLintTotals(totals: Totals, command?: string | number): void;
export declare function getOutputFileName({ entrypoint, output, argvOutput, ext, entries, }: {
    entrypoint: string;
    output?: string;
    argvOutput?: string;
    ext?: BundleOutputFormat;
    entries: number;
}): {
    ext: BundleOutputFormat;
    outputFile?: undefined;
} | {
    outputFile: string;
    ext: BundleOutputFormat;
};
export declare function printUnusedWarnings(config: StyleguideConfig): void;
export declare function exitWithError(message: string): void;
/**
 * Checks if dir is subdir of parent
 */
export declare function isSubdir(parent: string, dir: string): boolean;
export declare function loadConfigAndHandleErrors(options?: {
    configPath?: string;
    customExtends?: string[];
    processRawConfig?: RawConfigProcessor;
    files?: string[];
    region?: Region;
}): Promise<Config | void>;
export declare function sortTopLevelKeysForOas(document: Oas3Definition | Oas2Definition): Oas3Definition | Oas2Definition;
export declare function checkIfRulesetExist(rules: typeof StyleguideConfig.prototype.rules): void;
export declare function cleanColors(input: string): string;
export declare function sendTelemetry(argv: Arguments | undefined, exit_code: ExitCode, has_config: boolean | undefined, spec_version: string | undefined, spec_keyword: string | undefined, spec_full_version: string | undefined): Promise<void>;
export type ExitCode = 0 | 1 | 2;
export type Analytics = {
    event: string;
    event_time: string;
    logged_in: boolean;
    command: string | number;
    arguments: Record<string, unknown>;
    node_version: string;
    npm_version: string;
    version: string;
    exit_code: ExitCode;
    environment?: string;
    environment_ci?: string;
    raw_input: string;
    has_config?: boolean;
    spec_version?: string;
    spec_keyword?: string;
    spec_full_version?: string;
};
export declare function cleanArgs(args: CommandOptions): Record<string, unknown>;
export declare function cleanRawInput(argv: string[]): string;
export declare function checkForDeprecatedOptions<T>(argv: T, deprecatedOptions: Array<keyof T>): void;
export declare function notifyAboutIncompatibleConfigOptions(themeOpenapiOptions: Record<string, unknown> | undefined): void;
export declare function formatPath(path: string): string;
