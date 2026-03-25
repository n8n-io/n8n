import * as YAML from '../src/';
export interface NodeVisitor {
    visitScalar(node: YAML.YAMLScalar): any;
    visitMapping(node: YAML.YAMLMapping): any;
    visitSequence(node: YAML.YAMLSequence): any;
    visitMap(node: YAML.YamlMap): any;
    visitAnchorRef(node: YAML.YAMLAnchorReference): any;
    visitIncludeRef(node: YAML.YAMLNode): any;
}
export declare abstract class AbstractVisitor implements NodeVisitor {
    accept(node: YAML.YAMLNode): any;
    abstract visitScalar(node: YAML.YAMLScalar): any;
    abstract visitMapping(node: YAML.YAMLMapping): any;
    abstract visitSequence(node: YAML.YAMLSequence): any;
    abstract visitMap(node: YAML.YamlMap): any;
    abstract visitAnchorRef(node: YAML.YAMLAnchorReference): any;
    abstract visitIncludeRef(node: YAML.YAMLNode): any;
}
