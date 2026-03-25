import * as NHParser from 'node-html-parser';
import { CommentNode, NodeType } from 'node-html-parser';
export { NodeType, CommentNode };
declare type NodeBase = {
    preserve?: boolean;
};
export declare type HtmlNode = (NHParser.Node | Node) & NodeBase;
export declare type ElementNode = (NHParser.HTMLElement | HTMLElement) & NodeBase;
export declare type TextNode = (NHParser.TextNode) & NodeBase;
export declare const isTextNode: (node: HtmlNode) => node is TextNode;
export declare const isCommentNode: (node: HtmlNode) => node is NHParser.CommentNode;
export declare const isElementNode: (node: HtmlNode) => node is ElementNode;
