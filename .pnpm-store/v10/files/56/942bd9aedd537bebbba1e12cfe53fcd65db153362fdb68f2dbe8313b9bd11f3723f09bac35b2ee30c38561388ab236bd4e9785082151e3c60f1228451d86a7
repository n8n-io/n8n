import { EmojiComponentsTree } from './tree.js';
import '../data.js';
import './similar.js';
import './components.js';
import './parse.js';
import './name.js';

/**
 * Base type to extend
 */
interface BaseSequenceItem {
    sequence: number[];
    sequenceKey?: string;
}
/**
 * Find missing emojis
 *
 * Result includes missing items, which are extended from items that needs to
 * be copied. To identify which emojis to copy, source object should include
 * something like `iconName` key that points to icon sequence represents.
 */
declare function findMissingEmojis<T extends BaseSequenceItem>(sequences: T[], testDataTree: EmojiComponentsTree): T[];

export { findMissingEmojis };
