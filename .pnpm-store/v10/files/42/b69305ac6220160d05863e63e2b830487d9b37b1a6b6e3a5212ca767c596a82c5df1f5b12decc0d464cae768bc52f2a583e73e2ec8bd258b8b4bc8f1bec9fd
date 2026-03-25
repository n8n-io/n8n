import type { SourceToken, Token } from '../parse/cst.js';
import type { ComposeErrorHandler } from './composer.js';
export interface ResolvePropsArg {
    flow?: 'flow map' | 'flow sequence';
    indicator: 'doc-start' | 'explicit-key-ind' | 'map-value-ind' | 'seq-item-ind';
    next: Token | null | undefined;
    offset: number;
    onError: ComposeErrorHandler;
    startOnNewline: boolean;
}
export declare function resolveProps(tokens: SourceToken[], { flow, indicator, next, offset, onError, startOnNewline }: ResolvePropsArg): {
    comma: SourceToken | null;
    found: SourceToken | null;
    spaceBefore: boolean;
    comment: string;
    hasNewline: boolean;
    hasNewlineAfterProp: boolean;
    anchor: SourceToken | null;
    tag: SourceToken | null;
    end: number;
    start: number;
};
