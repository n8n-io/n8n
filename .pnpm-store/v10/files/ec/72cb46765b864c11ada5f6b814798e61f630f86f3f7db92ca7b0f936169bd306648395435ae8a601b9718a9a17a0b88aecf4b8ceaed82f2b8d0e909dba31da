import { EmojiSequenceWithComponents, EmojiTestDataComponentsMap } from './components.mjs';
import { SplitEmojiName } from './name.mjs';
import { BaseEmojiTestDataItem, EmojiTestDataItem, EmojiTestData } from './parse.mjs';
import '../data.mjs';

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

export { type CombinedEmojiTestDataItem, type SimilarEmojiTestData, combineSimilarEmojiTestData, findComponentsInEmojiTestItem };
