import type { Skips, VerifyConfigOptions } from '../../types';
import type { CommandArgs } from '../../wrapper';
export type PreviewDocsOptions = {
    port: number;
    host: string;
    'use-community-edition'?: boolean;
    config?: string;
    api?: string;
    force?: boolean;
} & Omit<Skips, 'skip-rule'> & VerifyConfigOptions;
export declare function previewDocs({ argv, config: configFromFile, }: CommandArgs<PreviewDocsOptions>): Promise<void>;
export declare function debounce(func: Function, wait: number, immediate?: boolean): (...args: any[]) => void;
