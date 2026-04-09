import type { Config } from '@jest/types';
import type { CompilerOptions } from 'typescript';
type TsPathMapping = Exclude<CompilerOptions['paths'], undefined>;
type JestPathMapping = Config.InitialOptions['moduleNameMapper'];
export declare const pathsToModuleNameMapper: (mapping: TsPathMapping, { prefix, useESM }?: {
    prefix?: string;
    useESM?: boolean;
}) => JestPathMapping;
export {};
