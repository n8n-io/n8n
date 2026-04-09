import { EmojiItemRegex } from './base.mjs';

/**
 * Tree item
 */
interface TreeItem {
    regex: EmojiItemRegex;
    end?: true;
    children?: TreeItem[];
}
/**
 * Create tree
 */
declare function createEmojisTree(sequences: number[][]): TreeItem[];
/**
 * Parse tree
 */
declare function parseEmojiTree(items: TreeItem[]): EmojiItemRegex;

export { createEmojisTree, parseEmojiTree };
