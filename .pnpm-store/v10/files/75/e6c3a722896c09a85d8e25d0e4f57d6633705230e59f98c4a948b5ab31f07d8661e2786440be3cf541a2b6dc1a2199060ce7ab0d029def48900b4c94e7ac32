import * as YAML from '../src/'

export interface NodeVisitor {
    visitScalar(node: YAML.YAMLScalar);
    visitMapping(node: YAML.YAMLMapping);
    visitSequence(node: YAML.YAMLSequence);
    visitMap(node: YAML.YamlMap);
    visitAnchorRef(node: YAML.YAMLAnchorReference);
    visitIncludeRef(node: YAML.YAMLNode);
}

export abstract class AbstractVisitor implements NodeVisitor {
    // Needed in lieu of `accept` method on nodes
    accept(node: YAML.YAMLNode) {
        switch (node.kind) {
            case YAML.Kind.SCALAR: {
                return this.visitScalar(<YAML.YAMLScalar>node);
            }
            case YAML.Kind.MAP: {
                return this.visitMap(<YAML.YamlMap>node);
            }
            case YAML.Kind.MAPPING: {
                return this.visitMapping(<YAML.YAMLMapping>node);
            }
            case YAML.Kind.SEQ: {
                return this.visitSequence(<YAML.YAMLSequence>node);
            }
            case YAML.Kind.ANCHOR_REF: {
                return this.visitAnchorRef(<YAML.YAMLAnchorReference>node);
            }
            case YAML.Kind.INCLUDE_REF: {
                return this.visitIncludeRef(node);
            }
        }

        throw new Error(`Kind, ${node.kind} not implemented.`);
    }
    abstract visitScalar(node: YAML.YAMLScalar);
    abstract visitMapping(node: YAML.YAMLMapping);
    abstract visitSequence(node: YAML.YAMLSequence);
    abstract visitMap(node: YAML.YamlMap);
    abstract visitAnchorRef(node: YAML.YAMLAnchorReference);
    abstract visitIncludeRef(node: YAML.YAMLNode);
}