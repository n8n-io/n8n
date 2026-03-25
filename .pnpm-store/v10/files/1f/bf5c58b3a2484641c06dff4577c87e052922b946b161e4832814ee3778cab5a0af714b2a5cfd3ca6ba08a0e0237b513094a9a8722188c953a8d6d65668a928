import { IconifyJSON } from '@iconify/types';

/**
 * Parsed icon
 */
interface PreparedEmojiIcon {
    icon: string;
    sequence: string;
}
/**
 * Parse
 */
interface PreparedEmojiResult {
    icons: PreparedEmojiIcon[];
    regex: string;
}
/**
 * Prepare emoji for icons list
 *
 * Test data should be fetched from 'https://unicode.org/Public/emoji/15.1/emoji-test.txt'
 * It is used to detect missing emojis and optimise regular expression
 */
declare function prepareEmojiForIconsList(icons: Record<string, string>, rawTestData?: string): PreparedEmojiResult;
/**
 * Prepare emoji for an icon set
 *
 * Test data should be fetched from 'https://unicode.org/Public/emoji/15.1/emoji-test.txt'
 * It is used to detect missing emojis and optimise regular expression
 */
declare function prepareEmojiForIconSet(iconSet: IconifyJSON, rawTestData?: string): PreparedEmojiResult;

export { PreparedEmojiIcon, PreparedEmojiResult, prepareEmojiForIconSet, prepareEmojiForIconsList };
