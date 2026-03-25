import { SchemaOptions } from '../options.js';
import type { CollectionTag, ScalarTag } from './types.js';
declare const tagsByName: {
    binary: ScalarTag;
    bool: ScalarTag & {
        test: RegExp;
    };
    float: ScalarTag;
    floatExp: ScalarTag;
    floatNaN: ScalarTag;
    floatTime: ScalarTag;
    int: ScalarTag;
    intHex: ScalarTag;
    intOct: ScalarTag;
    intTime: ScalarTag;
    map: CollectionTag;
    null: ScalarTag & {
        test: RegExp;
    };
    omap: CollectionTag;
    pairs: CollectionTag;
    seq: CollectionTag;
    set: CollectionTag;
    timestamp: ScalarTag & {
        test: RegExp;
    };
};
export type TagId = keyof typeof tagsByName;
export type Tags = Array<ScalarTag | CollectionTag | TagId>;
export declare const coreKnownTags: {
    'tag:yaml.org,2002:binary': ScalarTag;
    'tag:yaml.org,2002:omap': CollectionTag;
    'tag:yaml.org,2002:pairs': CollectionTag;
    'tag:yaml.org,2002:set': CollectionTag;
    'tag:yaml.org,2002:timestamp': ScalarTag & {
        test: RegExp;
    };
};
export declare function getTags(customTags: SchemaOptions['customTags'] | undefined, schemaName: string): (CollectionTag | ScalarTag)[];
export {};
