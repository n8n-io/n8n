import YAMLException = require('./exception');
export declare enum Kind {
    SCALAR = 0,
    MAPPING = 1,
    MAP = 2,
    SEQ = 3,
    ANCHOR_REF = 4,
    INCLUDE_REF = 5,
}
export interface YAMLDocument {
    startPosition: number;
    endPosition: number;
    errors: YAMLException[];
}
export interface YAMLNode extends YAMLDocument {
    startPosition: number;
    endPosition: number;
    kind: Kind;
    anchorId?: string;
    valueObject?: any;
    parent: YAMLNode;
    errors: YAMLException[];
    value?: any;
    key?: any;
    mappings?: any;
}
export interface YAMLAnchorReference extends YAMLNode {
    referencesAnchor: string;
    value: YAMLNode;
}
export interface YAMLScalar extends YAMLNode {
    value: string;
    doubleQuoted?: boolean;
    singleQuoted?: boolean;
    plainScalar?: boolean;
    rawValue: string;
}
export interface YAMLMapping extends YAMLNode {
    key: YAMLScalar;
    value: YAMLNode;
}
export interface YAMLSequence extends YAMLNode {
    items: YAMLNode[];
}
export interface YamlMap extends YAMLNode {
    mappings: YAMLMapping[];
}
export declare function newMapping(key: YAMLScalar, value: YAMLNode): YAMLMapping;
export declare function newAnchorRef(key: string, start: number, end: number, value: YAMLNode): YAMLAnchorReference;
export declare function newScalar(v?: string | boolean | number): YAMLScalar;
export declare function newItems(): YAMLSequence;
export declare function newSeq(): YAMLSequence;
export declare function newMap(mappings?: YAMLMapping[]): YamlMap;
