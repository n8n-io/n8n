import { ElementType } from "domelementtype";
/**
 * This object will be used as the prototype for Nodes when creating a
 * DOM-Level-1-compliant structure.
 */
export declare class Node {
    type: ElementType;
    /** Parent of the node */
    parent: NodeWithChildren | null;
    /** Previous sibling */
    prev: Node | null;
    /** Next sibling */
    next: Node | null;
    /** The start index of the node. Requires `withStartIndices` on the handler to be `true. */
    startIndex: number | null;
    /** The end index of the node. Requires `withEndIndices` on the handler to be `true. */
    endIndex: number | null;
    /**
     *
     * @param type The type of the node.
     */
    constructor(type: ElementType);
    get nodeType(): number;
    get parentNode(): NodeWithChildren | null;
    set parentNode(parent: NodeWithChildren | null);
    get previousSibling(): Node | null;
    set previousSibling(prev: Node | null);
    get nextSibling(): Node | null;
    set nextSibling(next: Node | null);
    /**
     * Clone this node, and optionally its children.
     *
     * @param recursive Clone child nodes as well.
     * @returns A clone of the node.
     */
    cloneNode(recursive?: boolean): Node;
}
export declare class DataNode extends Node {
    data: string;
    /**
     * @param type The type of the node
     * @param data The content of the data node
     */
    constructor(type: ElementType.Comment | ElementType.Text | ElementType.Directive, data: string);
    get nodeValue(): string;
    set nodeValue(data: string);
}
export declare class Text extends DataNode {
    constructor(data: string);
}
export declare class Comment extends DataNode {
    constructor(data: string);
}
export declare class ProcessingInstruction extends DataNode {
    name: string;
    constructor(name: string, data: string);
}
export declare class NodeWithChildren extends Node {
    children: Node[];
    /**
     *
     * @param type Type of the node.
     * @param children Children of the node. Only certain node types can have children.
     */
    constructor(type: ElementType.CDATA | ElementType.Script | ElementType.Style | ElementType.Tag, children: Node[]);
    get firstChild(): Node | null;
    get lastChild(): Node | null;
    get childNodes(): Node[];
    set childNodes(children: Node[]);
}
export declare class Element extends NodeWithChildren {
    name: string;
    attribs: {
        [name: string]: string;
    };
    /**
     * @param name Name of the tag, eg. `div`, `span`.
     * @param attribs Object mapping attribute names to attribute values.
     * @param children Children of the node.
     */
    constructor(name: string, attribs: {
        [name: string]: string;
    }, children?: Node[]);
    get tagName(): string;
    set tagName(name: string);
    get attributes(): {
        name: string;
        value: string;
    }[];
}
/**
 * Clone a node, and optionally its children.
 *
 * @param recursive Clone child nodes as well.
 * @returns A clone of the node.
 */
export declare function cloneNode(node: Node, recursive?: boolean): Node;
//# sourceMappingURL=node.d.ts.map