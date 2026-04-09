import { EmojiSequenceComponentEntry, EmojiTestDataComponentsMap } from './components.mjs';
import '../data.mjs';
import './parse.mjs';

/**
 * Split emoji name in base name and variations
 *
 * Variations are also split in strings and emoji components with indexes pointing to sequence
 */
interface SplitEmojiName {
    base: string;
    key: string;
    variations?: (string | EmojiSequenceComponentEntry)[];
    components?: number;
}
/**
 * Split emoji name to base name and variations
 *
 * Also finds indexes of each variation
 */
declare function splitEmojiNameVariations(name: string, sequence: number[], componentsData: EmojiTestDataComponentsMap): SplitEmojiName;

export { type SplitEmojiName, splitEmojiNameVariations };
