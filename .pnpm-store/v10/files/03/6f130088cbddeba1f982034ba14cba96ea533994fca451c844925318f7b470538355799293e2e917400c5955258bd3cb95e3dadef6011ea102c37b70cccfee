import { EmojiComponentType } from '../data.cjs';
import { SimilarEmojiTestData, CombinedEmojiTestDataItem } from './similar.cjs';
import './components.cjs';
import './parse.cjs';
import './name.cjs';

/**
 * List of components
 */
type ComponentsCount = Required<Record<EmojiComponentType, number>>;
/**
 * Extended tree item
 */
interface TreeSplitEmojiTestDataItem extends CombinedEmojiTestDataItem {
    components: ComponentsCount;
    componentsKey: string;
}
/**
 * Tree item
 */
interface EmojiComponentsTreeItem {
    item: TreeSplitEmojiTestDataItem;
    children?: Record<EmojiComponentType, EmojiComponentsTreeItem>;
}
type EmojiComponentsTree = Record<string, EmojiComponentsTreeItem>;
/**
 * Convert test data to dependencies tree, based on components
 */
declare function getEmojiTestDataTree(data: SimilarEmojiTestData): EmojiComponentsTree;

export { type EmojiComponentsTree, type EmojiComponentsTreeItem, getEmojiTestDataTree };
