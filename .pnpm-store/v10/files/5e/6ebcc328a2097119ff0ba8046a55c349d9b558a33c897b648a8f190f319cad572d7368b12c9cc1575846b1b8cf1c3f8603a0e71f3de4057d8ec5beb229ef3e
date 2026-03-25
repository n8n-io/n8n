import { EmojiSequenceWithComponents, EmojiTestDataComponentsMap } from './components.js';
import { SplitEmojiName } from './name.js';
import { BaseEmojiTestDataItem, EmojiTestDataItem, EmojiTestData } from './parse.js';
import '../data.js';

/**
 * Similar test data items as one item
 */
interface CombinedEmojiTestDataItem extends BaseEmojiTestDataItem {
    name: SplitEmojiName;
    sequenceKey: string;
    sequence: EmojiSequenceWithComponents;
}
type SimilarEmojiTestData = Record<string, CombinedEmojiTestDataItem>;
/**
 * Find components in item, generate CombinedEmojiTestDataItem
 */
declare function findComponentsInEmojiTestItem(item: EmojiTestDataItem, componentsData: EmojiTestDataComponentsMap): CombinedEmojiTestDataItem;
/**
 * Combine similar items in one iteratable item
 */
declare function combineSimilarEmojiTestData(data: EmojiTestData, componentsData?: EmojiTestDataComponentsMap): SimilarEmojiTestData;

export { CombinedEmojiTestDataItem, SimilarEmojiTestData, combineSimilarEmojiTestData, findComponentsInEmojiTestItem };
