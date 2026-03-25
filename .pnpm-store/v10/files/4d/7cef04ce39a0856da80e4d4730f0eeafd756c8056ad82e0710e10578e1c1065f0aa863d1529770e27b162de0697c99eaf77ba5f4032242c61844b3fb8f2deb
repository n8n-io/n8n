import { GoogleGenAIIstrumentedMethod } from './types';
/**
 * Check if a method path should be instrumented
 */
export declare function shouldInstrument(methodPath: string): methodPath is GoogleGenAIIstrumentedMethod;
/**
 * Check if a method is a streaming method
 */
export declare function isStreamingMethod(methodPath: string): boolean;
export type ContentListUnion = Content | Content[] | PartListUnion;
export type ContentUnion = Content | PartUnion[] | PartUnion;
export type Content = {
    parts?: Part[];
    role?: string;
};
export type PartUnion = Part | string;
export type Part = Record<string, unknown> & {
    inlineData?: {
        data?: string;
        displayName?: string;
        mimeType?: string;
    };
    text?: string;
};
export type PartListUnion = PartUnion[] | PartUnion;
export type Message = Record<string, unknown> & {
    role: string;
    content?: PartListUnion;
    parts?: PartListUnion;
};
/**
 *
 */
export declare function contentUnionToMessages(content: ContentListUnion, role?: string): Message[];
//# sourceMappingURL=utils.d.ts.map
