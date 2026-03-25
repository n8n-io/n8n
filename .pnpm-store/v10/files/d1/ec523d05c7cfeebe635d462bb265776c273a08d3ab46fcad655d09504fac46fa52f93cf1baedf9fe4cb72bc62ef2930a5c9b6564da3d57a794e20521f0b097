/**
 * Various codes
 */
declare const joinerEmoji = 8205;
declare const vs16Emoji = 65039;
declare const keycapEmoji = 8419;
/**
 * Variations, UTF-32
 *
 * First value in array is minimum, second value is maximum+1
 */
type EmojiComponentType = 'skin-tone' | 'hair-style';
type Range = [number, number];
declare const emojiComponents: Record<EmojiComponentType, Range>;
/**
 * Minimum UTF-32 number
 */
declare const minUTF32 = 65536;
/**
 * Codes for UTF-32 characters presented as UTF-16
 *
 * startUTF32Pair1 <= code < startUTF32Pair2 -> code for first character in pair
 * startUTF32Pair2 <= code < endUTF32Pair -> code for second character in pair
 */
declare const startUTF32Pair1 = 55296;
declare const startUTF32Pair2 = 56320;
declare const endUTF32Pair = 57344;
/**
 * Emoji version as string
 */
declare const emojiVersion = "15.1";

export { EmojiComponentType, emojiComponents, emojiVersion, endUTF32Pair, joinerEmoji, keycapEmoji, minUTF32, startUTF32Pair1, startUTF32Pair2, vs16Emoji };
