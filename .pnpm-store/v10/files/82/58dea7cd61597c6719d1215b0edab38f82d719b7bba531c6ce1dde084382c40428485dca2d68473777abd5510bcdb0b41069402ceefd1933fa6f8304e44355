import * as yamlAst from 'yaml-ast-parser';
import type { LineColLocationObject, LocationObject } from '../walk';
type YAMLMapping = yamlAst.YAMLMapping & {
    kind: yamlAst.Kind.MAPPING;
};
type YAMLMap = yamlAst.YamlMap & {
    kind: yamlAst.Kind.MAP;
};
type YAMLAnchorReference = yamlAst.YAMLAnchorReference & {
    kind: yamlAst.Kind.ANCHOR_REF;
};
type YAMLSequence = yamlAst.YAMLSequence & {
    kind: yamlAst.Kind.SEQ;
};
type YAMLScalar = yamlAst.YAMLScalar & {
    kind: yamlAst.Kind.SCALAR;
};
type YAMLNode = YAMLMapping | YAMLMap | YAMLAnchorReference | YAMLSequence | YAMLScalar;
export declare function getCodeframe(location: LineColLocationObject, color: boolean): string;
export declare function getLineColLocation(location: LocationObject): LineColLocationObject;
export declare function getAstNodeByPointer(root: YAMLNode, pointer: string, reportOnKey: boolean): YAMLMapping | YAMLMap | YAMLAnchorReference | YAMLSequence | yamlAst.YAMLScalar | undefined;
export {};
