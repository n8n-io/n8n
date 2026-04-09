import { Tag } from './types';
/** Create a GroupedTag with an underlying Tag implementation */
export declare const makeGroupedTag: (tag: Tag) => {
    groupSizes: Uint32Array;
    length: number;
    tag: Tag;
    _cGroup: number;
    _cIndex: number;
    indexOfGroup(group: number): number;
    insertRules(group: number, rules: string[]): void;
    clearGroup(group: number): void;
    getGroup(group: number): string;
};
