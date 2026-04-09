/**
 * Regex in item
 */
interface BaseEmojiItemRegex {
    type: 'utf16' | 'sequence' | 'set' | 'optional';
    regex: string;
    group: boolean;
    length: number;
}
interface EmojiItemRegexWithNumbers {
    numbers?: number[];
}
interface UTF16EmojiItemRegex extends BaseEmojiItemRegex, Required<EmojiItemRegexWithNumbers> {
    type: 'utf16';
    group: true;
}
type SequenceEmojiItemRegexItem = UTF16EmojiItemRegex | SetEmojiItemRegex | OptionalEmojiItemRegex;
interface SequenceEmojiItemRegex extends BaseEmojiItemRegex, EmojiItemRegexWithNumbers {
    type: 'sequence';
    items: SequenceEmojiItemRegexItem[];
}
type SetEmojiItemRegexItem = UTF16EmojiItemRegex | SequenceEmojiItemRegex | OptionalEmojiItemRegex;
interface SetEmojiItemRegex extends BaseEmojiItemRegex, EmojiItemRegexWithNumbers {
    type: 'set';
    sets: SetEmojiItemRegexItem[];
}
type OptionalEmojiItemRegexItem = UTF16EmojiItemRegex | SequenceEmojiItemRegex | SetEmojiItemRegex;
interface OptionalEmojiItemRegex extends BaseEmojiItemRegex {
    type: 'optional';
    item: OptionalEmojiItemRegexItem;
    group: true;
}
type EmojiItemRegex = UTF16EmojiItemRegex | SequenceEmojiItemRegex | SetEmojiItemRegex | OptionalEmojiItemRegex;
/**
 * Wrap regex in group
 */
declare function wrapRegexInGroup(regex: string): string;
/**
 * Update UTF16 item, return regex
 */
declare function updateUTF16EmojiRegexItem(item: UTF16EmojiItemRegex): string;
/**
 * Create UTF-16 regex
 */
declare function createUTF16EmojiRegexItem(numbers: number[]): UTF16EmojiItemRegex;
/**
 * Update sequence regex. Does not update group
 */
declare function updateSequenceEmojiRegexItem(item: SequenceEmojiItemRegex): string;
/**
 * Create sequence regex
 */
declare function createSequenceEmojiRegexItem(sequence: EmojiItemRegex[], numbers?: number[]): SequenceEmojiItemRegex;
/**
 * Update set regex and group
 */
declare function updateSetEmojiRegexItem(item: SetEmojiItemRegex): string;
/**
 * Create set regex
 */
declare function createSetEmojiRegexItem(set: EmojiItemRegex[]): SetEmojiItemRegex;
/**
 * Update optional regex
 */
declare function updateOptionalEmojiRegexItem(item: OptionalEmojiItemRegex): string;
/**
 * Create optional item
 */
declare function createOptionalEmojiRegexItem(item: EmojiItemRegex): OptionalEmojiItemRegex;
/**
 * Clone item
 */
declare function cloneEmojiRegexItem<T extends BaseEmojiItemRegex>(item: T, shallow?: boolean): T;

export { type EmojiItemRegex, type OptionalEmojiItemRegex, type SequenceEmojiItemRegex, type SetEmojiItemRegex, type SetEmojiItemRegexItem, type UTF16EmojiItemRegex, cloneEmojiRegexItem, createOptionalEmojiRegexItem, createSequenceEmojiRegexItem, createSetEmojiRegexItem, createUTF16EmojiRegexItem, updateOptionalEmojiRegexItem, updateSequenceEmojiRegexItem, updateSetEmojiRegexItem, updateUTF16EmojiRegexItem, wrapRegexInGroup };
