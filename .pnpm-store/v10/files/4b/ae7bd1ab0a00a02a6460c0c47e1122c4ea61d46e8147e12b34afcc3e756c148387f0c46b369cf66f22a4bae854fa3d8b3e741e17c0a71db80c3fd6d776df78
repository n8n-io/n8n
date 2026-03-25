import { ASTType } from '@ts-graphviz/common';
import { AttributeKey } from '@ts-graphviz/common';
import { Compass } from '@ts-graphviz/common';
import { DotObjectModel } from '@ts-graphviz/common';
import { EdgeModel } from '@ts-graphviz/common';
import { ModelsContext } from '@ts-graphviz/common';
import { NodeModel } from '@ts-graphviz/common';
import { RootGraphModel } from '@ts-graphviz/common';
import { SubgraphModel } from '@ts-graphviz/common';

/**
 * ASTBaseNode is an interface that serves as the base for all AST nodes.
 * It requires all leaf interfaces to specify a type property,
 * which is of type {@link ASTType}.
 *
 * @group AST
 */
export declare interface ASTBaseNode {
    /**
     * Every leaf interface that extends ASTBaseNode
     * must specify a type property.
     */
    type: ASTType;
}

/**
 * ASTBaseParentNode represents a parent node that has some child nodes.
 *
 * @template STMT The type of {@link ASTBaseNode} to be stored in the children array.
 * @group AST
 */
export declare interface ASTBaseParentNode<STMT extends ASTBaseNode = ASTBaseNode> extends ASTBaseNode {
    children: STMT[];
}

/**
 * This interface provides an ASTBuilder object with a createElement function.
 * @group Create AST
 */
export declare interface ASTBuilder {
    createElement: CreateElement;
}

/**
 * ASTChildNode is a type alias used to represent the child nodes of a given {@link ASTBaseParentNode}.
 * @group AST
 */
export declare type ASTChildNode<T> = T extends ASTBaseParentNode<infer C> ? C : never;

/**
 * This interface provides common properties to be used across all abstract syntax tree (AST) objects.
 *
 * @group AST
 */
export declare interface ASTCommonPropaties {
    /**
     * The start and end location of the AST object.
     */
    location?: FileRange;
}

/**
 * ASTNode is a type used to define a set of different types of AST nodes that can be used in a graph.
 *
 * @group AST
 */
export declare type ASTNode = LiteralASTNode | DotASTNode | GraphASTNode | AttributeASTNode | CommentASTNode | AttributeListASTNode | NodeRefASTNode | NodeRefGroupASTNode | EdgeASTNode | NodeASTNode | SubgraphASTNode;

/**
 * ASTToModel is a type that determines a model type from an AST.
 *
 * @group AST
 */
export declare type ASTToModel<T> = T extends {
    type: infer U;
} ? ModelOf<U> : never;

/**
 * AttributeASTNode is a type of AST node that represents an attribute.
 * @group AST
 */
export declare interface AttributeASTNode<T extends AttributeKey = AttributeKey> extends ASTBaseParentNode<never>, AttributeASTPropaties<T> {
    type: 'Attribute';
}

/**
 * AttributeASTPropaties interface defines the properties of an {@link AttributeASTNode}.
 * @group AST
 */
export declare interface AttributeASTPropaties<T extends AttributeKey = AttributeKey> extends ASTCommonPropaties {
    key: LiteralASTNode<T>;
    value: LiteralASTNode;
}

/**
 * AttributeListASTNode is a type of AST node that represents a list of attributes.
 * @group AST
 */
export declare interface AttributeListASTNode extends ASTBaseParentNode<AttributeASTNode | CommentASTNode>, AttributeListASTPropaties {
    type: 'AttributeList';
}

/**
 * AttributeListASTPropaties interface defines the properties of an {@link AttributeListASTNode}.
 * @group AST
 */
export declare interface AttributeListASTPropaties extends ASTCommonPropaties {
    kind: 'Graph' | 'Edge' | 'Node';
}

/**
 * Builder is an ASTBuilder that provides a method to create an ASTNode.
 *
 * @group Create AST
 */
export declare class Builder implements ASTBuilder {
    private options?;
    /* Excluded from this release type: getLocation */
    /**
     * Constructor of Builder
     * @param options - Options to initialize Builder
     */
    constructor(options?: Partial<BuilderOptions> | undefined);
    /**
     * Create an {@link ASTNode} of the specified type
     *
     * @param type - Type of the {@link ASTNode}
     * @param props - Properties of the {@link ASTNode}
     * @param children - Children of the {@link ASTNode}
     * @returns An {@link ASTNode}
     */
    createElement<T extends ASTNode>(type: T['type'], props: any, children?: ASTChildNode<T>[]): T;
}

/**
 * This interface is used to define the options for the builder.
 *
 * @group Create AST
 */
export declare interface BuilderOptions {
    /**
     * This is a function that returns a {@link FileRange} object.
     * It is used to specify the location of the builder.
     */
    locationFunction: () => FileRange;
}

/**
 * ClusterStatementASTNode is a type used to represent a statement in a cluster graph.
 * @group AST
 */
export declare type ClusterStatementASTNode = AttributeASTNode | AttributeListASTNode | EdgeASTNode | NodeASTNode | SubgraphASTNode | CommentASTNode;

/**
 * CommentASTNode is a type of AST node that represents a comment.
 * @group AST
 */
export declare interface CommentASTNode extends ASTBaseParentNode<never>, CommentASTPropaties {
    type: 'Comment';
}

/**
 * @group AST
 */
export declare interface CommentASTPropaties extends ASTCommonPropaties {
    /**
     * A string that specifies the kind of comment.
     */
    kind: CommentKind;
    /**
     * A string that contains the actual content of the comment.
     */
    value: string;
}

/**
 * CommentKind is an enum type that describes a type of comment.
 *
 * @group AST
 */
export declare type CommentKind = 'Block' | 'Slash' | 'Macro';

/**
 * CommonParseOptions is an interface that defines the properties needed in order to parse a file.
 * @group Convert DOT to AST
 */
export declare interface CommonParseOptions {
    /**
     * filename (optional): A string value that is used to identify the file to be parsed.
     */
    filename?: string;
}

/**
 * @group Convert Model to AST
 */
export declare interface ConvertFromModelContext extends Required<ConvertFromModelOptions> {
    convert<T extends DotObjectModel>(model: T): ModelToAST<T>;
}

/**
 * @group Convert Model to AST
 */
export declare interface ConvertFromModelOptions {
    commentKind?: CommentKind;
}

/**
 * @group Convert Model to AST
 */
export declare interface ConvertFromModelPlugin<T extends DotObjectModel> {
    match(model: T): boolean;
    convert(context: ConvertFromModelContext, model: T): ModelToAST<T>;
}

/**
 * @group Convert AST to Model
 */
export declare interface ConvertToModelContext {
    models: ModelsContext;
    convert<T extends ToModelConvertableASTNode>(ast: T): ASTToModel<T>;
}

/**
 * @group Convert AST to Model
 */
export declare interface ConvertToModelOptions {
    models?: Partial<ModelsContext>;
}

/**
 * @group Convert AST to Model
 */
export declare interface ConvertToModelPlugin<T extends ToModelConvertableASTNode = ToModelConvertableASTNode> {
    match(ast: T): boolean;
    convert(context: ConvertToModelContext, ast: T): ASTToModel<T>;
}

/**
 * This interface provides a method for creating an Abstract Syntax Tree (AST) for a given type.
 * @group Create AST
 */
export declare interface CreateElement {
    /**
     * Creates a LiteralASTNode with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link LiteralASTNode} with the given type, properties, and children.
     */
    <T extends string>(type: 'Literal', props: LiteralASTPropaties<T>, children?: ASTChildNode<LiteralASTNode>[]): LiteralASTNode<T>;
    /**
     * Creates a LiteralASTNode with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link LiteralASTNode} with the given type, properties, and children.
     */
    (type: 'Literal', props: LiteralASTPropaties, children?: ASTChildNode<LiteralASTNode>[]): LiteralASTNode;
    /**
     * Creates a {@link DotASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link DotASTNode} with the given type, properties, and children.
     */
    (type: 'Dot', props: DotASTPropaties, children?: ASTChildNode<DotASTNode>[]): DotASTNode;
    /**
     * Creates a {@link GraphASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {GraphASTNode} with the given type, properties, and children.
     */
    (type: 'Graph', props: GraphASTPropaties, children?: ASTChildNode<GraphASTNode>[]): GraphASTNode;
    /**
     * Creates an {@link AttributeASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns An {@link AttributeASTNode} with the given type, properties, and children.
     */
    <K extends AttributeKey>(type: 'Attribute', props: AttributeASTPropaties<K>, children?: ASTChildNode<AttributeASTNode>[]): AttributeASTNode<K>;
    (type: 'Attribute', props: AttributeASTPropaties, children?: ASTChildNode<AttributeASTNode>[]): AttributeASTNode;
    /**
     * Creates a {@link CommentASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link CommentASTNode} with the given type, properties, and children.
     */
    (type: 'Comment', props: CommentASTPropaties, children?: ASTChildNode<CommentASTNode>[]): CommentASTNode;
    /**
     * Creates an {@link AttributeListASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns An {@link AttributeListASTNode} with the given type, properties, and children.
     */
    (type: 'AttributeList', props: AttributeListASTPropaties, children?: ASTChildNode<AttributeListASTNode>[]): AttributeListASTNode;
    /**
     * Creates a {@link NodeRefASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link NodeRefASTNode} with the given type, properties, and children.
     */
    (type: 'NodeRef', props: NodeRefASTPropaties, children?: ASTChildNode<NodeRefASTNode>[]): NodeRefASTNode;
    /**
     * Creates a {@link NodeRefGroupASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link NodeRefGroupASTNode} with the given type, properties, and children.
     */
    (type: 'NodeRefGroup', props: NodeRefGroupASTPropaties, children?: ASTChildNode<NodeRefGroupASTNode>[]): NodeRefGroupASTNode;
    /**
     * Creates an {@link EdgeASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns An {@link EdgeASTNode} with the given type, properties, and children.
     */
    (type: 'Edge', props: EdgeASTPropaties, children?: ASTChildNode<EdgeASTNode>[]): EdgeASTNode;
    /**
     * Creates a {@link NodeASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link NodeASTNode} with the given type, properties, and children.
     */
    (type: 'Node', props: NodeASTPropaties, children?: ASTChildNode<NodeASTNode>[]): NodeASTNode;
    /**
     * Creates a {@link SubgraphASTNode} with the given type, properties, and children.
     *
     * @param type The type of the AST node.
     * @param props The properties of the AST node.
     * @param children The children of the AST node.
     * @returns A {@link SubgraphASTNode} with the given type, properties, and children.
     */
    (type: 'Subgraph', props: SubgraphASTPropaties, children?: ASTChildNode<SubgraphASTNode>[]): SubgraphASTNode;
}

/**
 * Create an {@link ASTNode} of the specified type
 *
 * @param type - Type of the {@link ASTNode}
 * @param props - Properties of the {@link ASTNode}
 * @param children - Children of the {@link ASTNode}
 * @group Create AST
 * @returns An {@link ASTNode}
 */
export declare const createElement: CreateElement;

/**
 * DotASTNode is a type of AST node that represents a dot in a graph.
 *
 * @group AST
 */
export declare interface DotASTNode extends ASTBaseParentNode<StatementASTNode>, DotASTPropaties {
    type: 'Dot';
}

/**
 * This interface represents the properties of a dot AST node.
 * @group AST
 */
export declare interface DotASTPropaties extends ASTCommonPropaties {
}

/**
 * DotSyntaxError is a class that extends the SyntaxError class and provides additional information about the syntax error.
 *
 * @group Convert DOT to AST
 *
 * @remarks
 * This error is thrown when a parsing error occurs.
 * The error provides additional information about the syntax error.
 *
 * This is in reference to the specification
 * that the error thrown when a parse error occurs in the {@link !JSON.parse} function is {@link !SyntaxError}.
 */
export declare class DotSyntaxError extends SyntaxError {
    constructor(...args: ConstructorParameters<typeof SyntaxError>);
}

/**
 * EdgeASTNode is a type of AST node that represents an edge in a graph.
 * @group AST
 */
export declare interface EdgeASTNode extends ASTBaseParentNode<AttributeASTNode | CommentASTNode>, EdgeASTPropaties {
    type: 'Edge';
}

/**
 * EdgeASTPropaties is an interface that defines the properties of an {@link EdgeASTNode}.
 * @group AST
 */
export declare interface EdgeASTPropaties extends ASTCommonPropaties {
    /**
     * An array of EdgeTargetASTNodes.
     * The {@link EdgeTargetASTNode} represents a node that is the target of an edge.
     */
    targets: [
    from: EdgeTargetASTNode,
    to: EdgeTargetASTNode,
    ...rest: EdgeTargetASTNode[]
    ];
}

/**
 * This type is used to represent a target of an edge in an AST (Abstract Syntax Tree).
 *
 * @group AST
 */
export declare type EdgeTargetASTNode = NodeRefASTNode | NodeRefGroupASTNode;

/**
 * This type represents the EndOfLine type which is used to determine the type of line ending to be used when writing to a file.
 * @group Convert AST to DOT
 */
export declare type EndOfLine = 'lf' | 'crlf';

/**
 * The FilePosition interface represents the position of a file in terms of its offset, line number, and column number.
 *
 * @group AST
 */
export declare interface FilePosition {
    /**
     * The offset of the file.
     */
    offset: number;
    /**
     * The line number of the file.
     */
    line: number;
    /**
     * The column number of the file.
     */
    column: number;
}

/**
 * FileRange interface represents a range of positions within a file.
 * @group AST
 */
export declare interface FileRange {
    /**
     * The start position of the range.
     */
    start: FilePosition;
    /**
     * The end position of the range.
     */
    end: FilePosition;
}

/**
 * A function used to convert a DotObjectModel into an AST.
 *
 * @param model - The {@link DotObjectModel} to be converted.
 * @param options - An optional {@link ConvertFromModelOptions} object.
 * @returns ModelToAST - The AST representation of the {@link DotObjectModel}.
 *
 * @group Convert Model to AST
 */
export declare function fromModel<T extends DotObjectModel>(model: T, options?: ConvertFromModelOptions): ModelToAST<T>;

/**
 * FromModelConverter is a class used to convert a {@link DotObjectModel} into an ASTNode.
 *
 * @group Convert Model to AST
 */
export declare class FromModelConverter {
    #private;
    private options;
    constructor(options?: ConvertFromModelOptions);
    /**
     * Converts a DotObjectModel into an AST.
     *
     * @param model The {@link DotObjectModel} to be converted.
     * @returns The AST generated from the model.
     */
    convert<T extends DotObjectModel>(model: T): ModelToAST<T>;
}

/**
 * GraphASTNode is a type of AST node that represents a graph.
 *
 * @group AST
 */
export declare interface GraphASTNode extends ASTBaseParentNode<ClusterStatementASTNode>, GraphASTPropaties {
    type: 'Graph';
}

/**
 * This interface defines the properties of a Graph AST Node.
 * @group AST
 */
export declare interface GraphASTPropaties extends ASTCommonPropaties {
    /**
     * An optional identifier for the Graph AST Node.
     */
    id?: LiteralASTNode;
    /**
     * A boolean indicating whether the graph is directed.
     */
    directed: boolean;
    /**
     * A boolean indicating whether the graph is strict.
     */
    strict: boolean;
}

/**
 * The IndentStyle type represents an indentation style for text. It can either be a `"space"` or a `"tab"`.
 * @group Convert AST to DOT
 */
export declare type IndentStyle = 'space' | 'tab';

/**
 * LiteralASTNode is a type of AST node that represents a literal value.
 *
 * @group AST
 */
export declare interface LiteralASTNode<T extends string = string> extends ASTBaseParentNode<never>, LiteralASTPropaties<T> {
    type: 'Literal';
}

/**
 * LiteralASTPropaties defines interface for literal AST nodes.
 *
 * @group AST
 */
export declare interface LiteralASTPropaties<T extends string = string> extends ASTCommonPropaties {
    /**
     * The value of the literal.
     */
    value: T;
    /**
     * A flag indicating whether the literal was quoted or not.
     * If 'html' then the literal is an html like value.
     */
    quoted: boolean | 'html';
}

/**
 *  ModelOf is a type that determines the type of model to use depending on the value of T.
 * @group AST
 */
export declare type ModelOf<T> = T extends 'Dot' | 'Graph' ? RootGraphModel : T extends 'Edge' ? EdgeModel : T extends 'Node' ? NodeModel : T extends 'Subgraph' ? SubgraphModel : never;

/**
 * ModelToAST is a type alias used to map a generic type T to a specific AST node type.
 *
 * If T is a DotObjectModel, the type U is inferred and used to determine which AST node type to map to.
 *
 * If U is 'Graph', the type is mapped to either a {@link GraphASTNode} or a {@link DotASTNode}.
 * If U is 'AttributeList', the type is mapped to an {@link AttributeListASTNode}.
 * If U is 'Edge', the type is mapped to an {@link EdgeASTNode}.
 * If U is 'Node', the type is mapped to a {@link NodeASTNode}.
 * If U is 'Subgraph', the type is mapped to a {@link SubgraphASTNode}.
 *
 * If T is not a DotObjectModel, the type is mapped to never.
 *
 * @group AST
 */
export declare type ModelToAST<T> = T extends DotObjectModel<infer U> ? U extends 'Graph' ? GraphASTNode | DotASTNode : U extends 'AttributeList' ? AttributeListASTNode : U extends 'Edge' ? EdgeASTNode : U extends 'Node' ? NodeASTNode : U extends 'Subgraph' ? SubgraphASTNode : never : never;

/**
 * NodeASTNode is a type of AST node that represents a node in a graph.
 * @group AST
 */
export declare interface NodeASTNode extends ASTBaseParentNode<AttributeASTNode | CommentASTNode>, NodeASTPropaties {
    type: 'Node';
}

/**
 * SubgraphASTPropaties describes the properties of an AST node representing a node.
 * @group AST
 */
export declare interface NodeASTPropaties extends ASTCommonPropaties {
    /**
     * The unique identifier of the node.
     */
    id: LiteralASTNode;
}

/**
 * NodeRefASTNode is a type of AST node that represents a reference to a node.
 * @group AST
 */
export declare interface NodeRefASTNode extends ASTBaseParentNode<never>, NodeRefASTPropaties {
    type: 'NodeRef';
}

/**
 * NodeRefASTPropaties is an interface that defines the properties of a {@link NodeRefASTNode}.
 * @group AST
 */
export declare interface NodeRefASTPropaties extends ASTCommonPropaties {
    id: LiteralASTNode;
    port?: LiteralASTNode;
    compass?: LiteralASTNode<Compass>;
}

/**
 * NodeRefGroupASTNode is a type of AST node that represents a group of nodes referenced together.
 * @group AST
 */
export declare interface NodeRefGroupASTNode extends ASTBaseParentNode<NodeRefASTNode>, NodeRefGroupASTPropaties {
    type: 'NodeRefGroup';
}

/**
 * NodeRefGroupASTPropaties is an interface that defines the properties of a {@link NodeRefGroupASTNode}.
 * @group AST
 */
export declare interface NodeRefGroupASTPropaties extends ASTCommonPropaties {
}

/**
 * parse is a function that takes a string input and optional parse options and
 * returns an ASTNode or an array of ClusterStatementASTNodes.
 *
 * Depending on the type of parse option specified, the function will return different types of ASTNodes.
 *
 * The types of ASTNodes that can be returned are:
 *
 * - {@link DotASTNode}
 * - {@link GraphASTNode}
 * - {@link NodeASTNode}
 * - {@link EdgeASTNode}
 * - {@link AttributeListASTNode}
 * - {@link AttributeASTNode}
 * - {@link SubgraphASTNode}
 * - {@link ClusterStatementASTNode}
 *
 * @throws {@link DotSyntaxError}
     * @group Convert DOT to AST
     */
 export declare function parse(input: string): DotASTNode;

 export declare function parse(input: string, options?: ParseOptions<'Dot'>): DotASTNode;

 export declare function parse(input: string, options?: ParseOptions<'Graph'>): GraphASTNode;

 export declare function parse(input: string, options?: ParseOptions<'Node'>): NodeASTNode;

 export declare function parse(input: string, options?: ParseOptions<'Edge'>): EdgeASTNode;

 export declare function parse(input: string, options?: ParseOptions<'AttributeList'>): AttributeListASTNode;

 export declare function parse(input: string, options?: ParseOptions<'Attribute'>): AttributeASTNode;

 export declare function parse(input: string, options?: ParseOptions<'Subgraph'>): SubgraphASTNode;

 export declare function parse(input: string, options?: ParseOptions<'ClusterStatements'>): ClusterStatementASTNode[];

 export declare function parse(input: string, options?: ParseOptions<Rule>): ASTNode | ClusterStatementASTNode[];

 /**
  * ParseOptions interface is used to provide additional information to the parser while parsing a rule.
  * @template T The type of the rule to be parsed.
  * @group Convert DOT to AST
  */
 export declare interface ParseOptions<T extends Rule> extends CommonParseOptions {
     startRule?: T;
 }

 /**
  * PrintContext interface provides an interface for printing an ASTNode with a set of options.
  * @group Convert AST to DOT
  */
 export declare interface PrintContext {
     /**
      * Indicates if the AST should be printed in a directed graph.
      */
     directed: boolean;
     readonly EOL: string;
     /**
      * A function to print an ASTNode, taking in an ASTNode as an argument. Returns a string.
      */
     print(ast: ASTNode): Iterable<string>;
     printChildren(children: ASTNode[]): Iterable<string>;
     join(children: ASTNode[], separator: string): Iterable<string>;
 }

 /**
  * Printer is a class responsible for converting an AST into a DOT string.
  * @group Convert AST to DOT
  */
 export declare class Printer {
     #private;
     private options;
     /**
      * @param options Options to be used when generating the DOT string.
      */
     constructor(options?: PrintOptions);
     /**
      * Generates a DOT string from an ASTNode.
      * @param ast The ASTNode to be converted into a DOT string.
      * @returns The DOT string generated from the ASTNode.
      */
     print(ast: ASTNode): string;
     private toChunks;
 }

 /**
  * This interface provides options for converting an abstract syntax tree (AST) to a DOT representation.
  * @group Convert AST to DOT
  */
 export declare interface PrintOptions {
     /**
      * The style of indentation to use when printing the AST.
      *
      * @default "space"
      */
     indentStyle?: IndentStyle;
     /**
      * The size of the indentation to use when printing the AST.
      *
      * @default 2
      */
     indentSize?: number;
     /**
      * The type of line ending to use when printing the AST.
      *
      * @default lf
      */
     endOfLine?: EndOfLine;
 }

 /**
  * PrintPlugin is an interface for plugins used for printing an {@link ASTNode}.
  * @template T T extends {@link ASTNode}
  * @group Convert AST to DOT
  */
 export declare interface PrintPlugin<T extends ASTNode = ASTNode> {
     /**
      * Checks if an ASTNode matches the plugin
      * @returns {boolean} true if the ASTNode matches the plugin
      */
     match(ast: ASTNode): boolean;
     /**
      * Prints an ASTNode
      * @param context PrintContext object
      * @param ast an ASTNode
      * @returns printed string
      * @memberof PrintPlugin
      */
     print(context: PrintContext, ast: T): Generator<string>;
 }

 /**
  * @group Convert DOT to AST
  */
 export declare type Rule = 'Dot' | 'Graph' | 'Node' | 'Edge' | 'AttributeList' | 'Attribute' | 'Subgraph' | 'ClusterStatements';

 /**
  * @group AST
  */
 export declare type StatementASTNode = GraphASTNode | CommentASTNode;

 /**
  * stringify is a function that converts a Graphviz AST Node into a string in DOT language.
  *
  * @param ast Graphviz AST node that is to be converted.
  * @param options PrintOptions object containing formatting options.
  * @returns A string in DOT language.
  * @group Convert AST to DOT
  */
 export declare function stringify(ast: ASTNode, options?: PrintOptions): string;

 /**
  * SubgraphASTNode is a type of AST node that represents a subgraph.
  * @group AST
  */
 export declare interface SubgraphASTNode extends ASTBaseParentNode<ClusterStatementASTNode>, SubgraphASTPropaties {
     type: 'Subgraph';
 }

 /**
  * SubgraphASTPropaties describes the properties of an AST node representing a subgraph.
  * @group AST
  */
 export declare interface SubgraphASTPropaties extends ASTCommonPropaties {
     /**
      * id is an optional {@link LiteralASTNode} that represents the identifier of the subgraph.
      */
     id?: LiteralASTNode;
 }

 /**
  * @group Convert AST to Model
  */
 export declare function toModel<T extends ToModelConvertableASTNode>(ast: T, options?: ConvertToModelOptions): ASTToModel<T>;

 /**
  * This type is used to define what AST nodes can be converted to a model.
  * @group Convert AST to Model
  */
 export declare type ToModelConvertableASTNode = DotASTNode | GraphASTNode | SubgraphASTNode | NodeASTNode | EdgeASTNode;

 /**
  * @group Convert AST to Model
  */
 export declare class ToModelConverter {
     private options;
     /** @hidden */
     protected plugins: ConvertToModelPlugin<ToModelConvertableASTNode>[];
     constructor(options?: ConvertToModelOptions);
     /**
      * Convert AST to Model.
      *
      * @param ast AST node.
      */
     convert<T extends ToModelConvertableASTNode>(ast: T): ASTToModel<T>;
 }

 export { }
