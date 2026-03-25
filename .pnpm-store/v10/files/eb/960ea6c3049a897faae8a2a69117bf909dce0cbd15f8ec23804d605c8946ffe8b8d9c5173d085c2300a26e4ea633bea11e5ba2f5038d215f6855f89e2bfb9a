import type { OutputExtensions, Skips, VerifyConfigOptions } from '../types';
import type { CommandArgs } from '../wrapper';
export type BundleOptions = {
    apis?: string[];
    extends?: string[];
    output?: string;
    ext?: OutputExtensions;
    dereferenced?: boolean;
    force?: boolean;
    metafile?: string;
    'remove-unused-components'?: boolean;
    'keep-url-references'?: boolean;
} & Skips & VerifyConfigOptions;
export declare function handleBundle({ argv, config, version, collectSpecData, }: CommandArgs<BundleOptions>): Promise<void>;
