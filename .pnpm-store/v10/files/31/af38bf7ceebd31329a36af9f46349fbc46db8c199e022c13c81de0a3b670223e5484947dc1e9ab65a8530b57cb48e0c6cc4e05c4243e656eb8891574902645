import type { OpenAPITag } from '../types';
import { GroupModel, OperationModel } from './models';
import type { OpenAPIParser } from './OpenAPIParser';
import type { RedocNormalizedOptions } from './RedocNormalizedOptions';
import type { ContentItemModel, TagGroup, TagInfo, TagsInfoMap } from './types';
export declare const GROUP_DEPTH = 0;
export declare class MenuBuilder {
    /**
     * Builds page content structure based on tags
     */
    static buildStructure(parser: OpenAPIParser, options: RedocNormalizedOptions): ContentItemModel[];
    /**
     * extracts items from markdown description
     * @param description - markdown source
     */
    static addMarkdownItems(description: string, parent: GroupModel | undefined, initialDepth: number, options: RedocNormalizedOptions): ContentItemModel[];
    /**
     * Returns array of OperationsGroup items for the tag groups (x-tagGroups vendor extension)
     * @param tags value of `x-tagGroups` vendor extension
     */
    static getTagGroupsItems(parser: OpenAPIParser, parent: GroupModel | undefined, groups: TagGroup[], tags: TagsInfoMap, options: RedocNormalizedOptions): GroupModel[];
    /**
     * Returns array of OperationsGroup items for the tags of the group or for all tags
     * @param parser
     * @param tagsMap tags info returned from `getTagsWithOperations`
     * @param parent parent item
     * @param group group which this tag belongs to. if not provided gets all tags
     * @param options normalized options
     */
    static getTagsItems(parser: OpenAPIParser, tagsMap: TagsInfoMap, parent: GroupModel | undefined, group: TagGroup | undefined, options: RedocNormalizedOptions): ContentItemModel[];
    /**
     * Returns array of Operation items for the tag
     * @param parser
     * @param parent parent OperationsGroup
     * @param tag tag info returned from `getTagsWithOperations`
     * @param depth items depth
     * @param options - normalized options
     */
    static getOperationsItems(parser: OpenAPIParser, parent: GroupModel | undefined, tag: TagInfo, depth: number, options: RedocNormalizedOptions): OperationModel[];
    /**
     * collects tags and maps each tag to list of operations belonging to this tag
     */
    static getTagsWithOperations(parser: OpenAPIParser, explicitTags: OpenAPITag[]): TagsInfoMap;
    static getTagRelatedSchema({ parser, tag, parent, schemaDefinitionsTagName, }: {
        parser: OpenAPIParser;
        tag: TagInfo;
        parent: GroupModel;
        schemaDefinitionsTagName?: string;
    }): GroupModel[];
}
