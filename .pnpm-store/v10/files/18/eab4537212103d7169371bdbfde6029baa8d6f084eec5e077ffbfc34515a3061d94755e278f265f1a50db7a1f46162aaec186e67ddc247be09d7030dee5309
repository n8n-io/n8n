import type { Oas3PathItem, Referenced } from '@redocly/openapi-core/lib/typings/openapi';
import type { CommandArgs } from '../../wrapper';
import type { VerifyConfigOptions } from '../../types';
export type SplitOptions = {
    api: string;
    outDir: string;
    separator: string;
} & VerifyConfigOptions;
export declare function handleSplit({ argv, collectSpecData }: CommandArgs<SplitOptions>): Promise<void>;
export declare function startsWithComponents(node: string): boolean;
export declare function crawl(object: unknown, visitor: (node: Record<string, unknown>) => void): void;
declare function iteratePathItems(pathItems: Record<string, Referenced<Oas3PathItem>> | undefined, openapiDir: string, outDir: string, componentsFiles: object, pathSeparator: string, codeSamplesPathPrefix: string | undefined, ext: string): void;
export { iteratePathItems };
