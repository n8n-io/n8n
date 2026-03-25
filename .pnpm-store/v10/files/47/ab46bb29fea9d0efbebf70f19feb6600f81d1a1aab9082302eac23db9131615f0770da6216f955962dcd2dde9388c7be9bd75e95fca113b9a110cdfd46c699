import type { TSDocConfiguration } from '../configuration/TSDocConfiguration';
/**
 * Indicates the type of {@link DocNode}.
 *
 * @remarks
 * When creating custom subclasses of `DocNode`, it's recommended to create your own enum to identify them.
 * To avoid naming conflicts between projects, the enum value should be a string comprised of your full
 * NPM package name, followed by a "#" symbol, followed by the class name (without the "Doc" prefix).
 */
export declare enum DocNodeKind {
    Block = "Block",
    BlockTag = "BlockTag",
    Excerpt = "Excerpt",
    FencedCode = "FencedCode",
    CodeSpan = "CodeSpan",
    Comment = "Comment",
    DeclarationReference = "DeclarationReference",
    ErrorText = "ErrorText",
    EscapedText = "EscapedText",
    HtmlAttribute = "HtmlAttribute",
    HtmlEndTag = "HtmlEndTag",
    HtmlStartTag = "HtmlStartTag",
    InheritDocTag = "InheritDocTag",
    InlineTag = "InlineTag",
    LinkTag = "LinkTag",
    MemberIdentifier = "MemberIdentifier",
    MemberReference = "MemberReference",
    MemberSelector = "MemberSelector",
    MemberSymbol = "MemberSymbol",
    Paragraph = "Paragraph",
    ParamBlock = "ParamBlock",
    ParamCollection = "ParamCollection",
    PlainText = "PlainText",
    Section = "Section",
    SoftBreak = "SoftBreak"
}
/**
 * Constructor parameters for {@link DocNode}.
 *
 * @remarks
 * There are two scenarios for constructing `DocNode` objects.  The "builder scenario" constructs the object based on
 * literal strings, does NOT create DocExcerpt child nodes, and generally uses the `IDocNodeParameters`
 * hierarchy for its constructor parameters.  The "parser scenario" constructs the object by parsing a TypeScript
 * source file, does create DocExcerpt child nodes, and generally uses the {@link IDocNodeParsedParameters} hierarchy.
 */
export interface IDocNodeParameters {
    configuration: TSDocConfiguration;
}
/**
 * Constructor parameters for {@link DocNode}.
 *
 * @remarks
 * There are two scenarios for constructing `DocNode` objects.  The "builder scenario" constructs the object based on
 * literal strings, does NOT create DocExcerpt child nodes, and generally uses the {@link IDocNodeParameters}
 * hierarchy for its constructor parameters.  The "parser scenario" constructs the object by parsing a TypeScript
 * source file, does create DocExcerpt child nodes, and generally uses the `IDocNodeParsedParameters` hierarchy.
 */
export interface IDocNodeParsedParameters {
    configuration: TSDocConfiguration;
    /**
     * This is a marker used by {@link DocNode.isParsedParameters} to determine whether the constructor was
     * invoked using `IDocNodeParameters` (builder scenario) or `IDocNodeParsedParameters` (parser scenario).
     */
    parsed: true;
}
/**
 * The base class for the parser's Abstract Syntax Tree nodes.
 */
export declare abstract class DocNode {
    readonly configuration: TSDocConfiguration;
    constructor(parameters: IDocNodeParameters | IDocNodeParsedParameters);
    /**
     * Returns a text string that uniquely identifies the child class type.  This is used for example by
     * switch statements to efficiently determine the kind of node.
     */
    abstract get kind(): DocNodeKind | string;
    /**
     * Returns the list of child nodes for this node.  This is useful for visitors that want
     * to scan the tree looking for nodes of a specific type, without having to process
     * intermediary nodes.
     */
    getChildNodes(): ReadonlyArray<DocNode>;
    /**
     * Overridden by child classes to implement {@link DocNode.getChildNodes}.
     * @virtual
     */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
    /**
     * A type guard that returns true if the input uses the `IDocNodeParsedParameters` (parser scenario).
     *
     * @remarks
     * There are two scenarios for constructing `DocNode` objects.  The "builder scenario" constructs the object based on
     * literal strings, does NOT create DocExcerpt child nodes, and generally uses the {@link IDocNodeParameters}
     * hierarchy for its constructor parameters.  The "parser scenario" constructs the object by parsing a TypeScript
     * source file, does create DocExcerpt child nodes, and generally uses the {@link IDocNodeParsedParameters} hierarchy.
     */
    static isParsedParameters(parameters: IDocNodeParameters | IDocNodeParsedParameters): parameters is IDocNodeParsedParameters;
}
//# sourceMappingURL=DocNode.d.ts.map