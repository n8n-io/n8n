import type { Directives } from '../doc/directives.js';
import type { ParsedNode } from '../nodes/Node.js';
import type { ParseOptions } from '../options.js';
import type { SourceToken, Token } from '../parse/cst.js';
import type { Schema } from '../schema/Schema.js';
import type { ComposeErrorHandler } from './composer.js';
export interface ComposeContext {
    atRoot: boolean;
    directives: Directives;
    options: Readonly<Required<Omit<ParseOptions, 'lineCounter'>>>;
    schema: Readonly<Schema>;
}
interface Props {
    spaceBefore: boolean;
    comment: string;
    anchor: SourceToken | null;
    tag: SourceToken | null;
    end: number;
}
declare const CN: {
    composeNode: typeof composeNode;
    composeEmptyNode: typeof composeEmptyNode;
};
export type ComposeNode = typeof CN;
export declare function composeNode(ctx: ComposeContext, token: Token, props: Props, onError: ComposeErrorHandler): ParsedNode;
export declare function composeEmptyNode(ctx: ComposeContext, offset: number, before: Token[] | undefined, pos: number | null, { spaceBefore, comment, anchor, tag, end }: Props, onError: ComposeErrorHandler): import("../index.js").Scalar.Parsed;
export {};
