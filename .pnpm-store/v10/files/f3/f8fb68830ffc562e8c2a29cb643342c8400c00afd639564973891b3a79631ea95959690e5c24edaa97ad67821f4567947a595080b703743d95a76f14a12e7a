/// <reference types="react" />
import { OpenAPIOperation, OpenAPIParameter, OpenAPISchema, OpenAPIServer, OpenAPITag, Referenced } from '../types';
import { AppStore } from './AppStore';
import { GroupModel } from './models';
import { OperationModel } from './models/Operation';
import { RedocRawOptions } from './RedocNormalizedOptions';
export interface StoreState {
    menu: {
        activeItemIdx: number;
    };
    spec: {
        url?: string;
        data: any;
    };
    searchIndex: any;
    options: RedocRawOptions;
}
export interface LabelsConfig {
    enum: string;
    enumSingleValue: string;
    enumArray: string;
    default: string;
    deprecated: string;
    example: string;
    examples: string;
    recursive: string;
    arrayOf: string;
    webhook: string;
    const: string;
    noResultsFound: string;
    download: string;
    downloadSpecification: string;
    responses: string;
    callbackResponses: string;
    requestSamples: string;
    responseSamples: string;
}
export type LabelsConfigRaw = Partial<LabelsConfig>;
export interface MDXComponentMeta {
    component: React.ComponentType;
    propsSelector: (store?: AppStore) => any;
    props?: object;
}
export interface MarkdownHeading {
    id: string;
    name: string;
    level: number;
    items?: MarkdownHeading[];
    description?: string;
}
export type ContentItemModel = GroupModel | OperationModel;
export type TagInfo = OpenAPITag & {
    operations: ExtendedOpenAPIOperation[];
    used?: boolean;
};
export type ExtendedOpenAPIOperation = {
    pointer: string;
    pathName: string;
    httpVerb: string;
    pathParameters: Array<Referenced<OpenAPIParameter>>;
    pathServers: Array<OpenAPIServer> | undefined;
    isWebhook: boolean;
} & OpenAPIOperation;
export type TagsInfoMap = Record<string, TagInfo>;
export interface TagGroup {
    name: string;
    tags: string[];
}
export type MenuItemGroupType = 'group' | 'tag' | 'section' | 'schema';
export type MenuItemType = MenuItemGroupType | 'operation';
export interface IMenuItem {
    id: string;
    absoluteIdx?: number;
    name: string;
    sidebarLabel: string;
    description?: string;
    depth: number;
    active: boolean;
    expanded: boolean;
    items: IMenuItem[];
    parent?: IMenuItem;
    deprecated?: boolean;
    type: MenuItemType;
    deactivate(): void;
    activate(): void;
    collapse(): void;
    expand(): void;
}
export interface SearchDocument {
    title: string;
    description: string;
    id: string;
}
export interface SearchResult<T = string> {
    meta: T;
    score: number;
}
export declare enum SideNavStyleEnum {
    SummaryOnly = "summary-only",
    PathOnly = "path-only",
    IdOnly = "id-only"
}
export type MergedOpenAPISchema = OpenAPISchema & {
    'x-refsStack'?: string[];
    'x-parentRefs'?: string[];
    'x-circular-ref'?: boolean;
};
