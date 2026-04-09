type EmojiStatus = 'component' | 'fully-qualified' | 'minimally-qualified' | 'unqualified';
declare const componentStatus: EmojiStatus;
/**
 * Base item
 */
interface BaseEmojiTestDataItem {
    group: string;
    subgroup: string;
    version: string;
}
/**
 * Test data item
 */
interface EmojiTestDataItem extends BaseEmojiTestDataItem {
    sequence: number[];
    emoji: string;
    status: EmojiStatus;
    name: string;
}
type EmojiTestData = Record<string, EmojiTestDataItem>;
/**
 * Get all emoji sequences from test file
 *
 * Returns all emojis as UTF-32 sequences, where:
 * 	key = unqualified sequence (without \uFE0F)
 * 	value = qualified sequence (with \uFE0F)
 *
 * Duplicate items that have different versions with and without \uFE0F are
 * listed only once, with unqualified sequence as key and longest possible
 * qualified sequence as value
 *
 * Example of 3 identical entries:
 *  '1F441 FE0F 200D 1F5E8 FE0F'
 *  '1F441 200D 1F5E8 FE0F'
 *  '1F441 FE0F 200D 1F5E8'
 * 	'1F441 200D 1F5E8'
 *
 * Out of these entries, only one item will be returned with:
 * 	key = '1f441-200d-1f5e8' (converted to lower case, separated with dash)
 * 	value.sequence = [0x1F441, 0xFE0F, 0x200D, 0x1F5E8, 0xFE0F]
 * 	value.status = 'fully-qualified'
 * 	other properties in value are identical for all versions
 */
declare function parseEmojiTestFile(data: string): EmojiTestData;

export { type BaseEmojiTestDataItem, type EmojiStatus, type EmojiTestData, type EmojiTestDataItem, componentStatus, parseEmojiTestFile };
