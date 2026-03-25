import type { OpenAPIExternalDocumentation, OpenAPITag } from '../../types';
import type { ContentItemModel, IMenuItem, MarkdownHeading, MenuItemGroupType } from '../types';
/**
 * Operations Group model ready to be used by components
 */
export declare class GroupModel implements IMenuItem {
    id: string;
    absoluteIdx?: number;
    name: string;
    sidebarLabel: string;
    description?: string;
    type: MenuItemGroupType;
    items: ContentItemModel[];
    parent?: GroupModel;
    externalDocs?: OpenAPIExternalDocumentation;
    active: boolean;
    expanded: boolean;
    depth: number;
    level: number;
    constructor(type: MenuItemGroupType, tagOrGroup: OpenAPITag | MarkdownHeading, parent?: GroupModel);
    activate(): void;
    expand(): void;
    collapse(): void;
    deactivate(): void;
}
