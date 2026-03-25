import { SheetOptions } from './types';
/** Create a CSSStyleSheet-like tag depending on the environment */
export declare const makeTag: ({ isServer, useCSSOMInjection, target }: SheetOptions) => {
    element: HTMLStyleElement;
    sheet: CSSStyleSheet;
    length: number;
    insertRule(index: number, rule: string): boolean;
    deleteRule(index: number): void;
    getRule(index: number): string;
} | {
    element: HTMLStyleElement;
    nodes: NodeListOf<Node>;
    length: number;
    insertRule(index: number, rule: string): boolean;
    deleteRule(index: number): void;
    getRule(index: number): string;
} | {
    rules: string[];
    length: number;
    insertRule(index: number, rule: string): boolean;
    deleteRule(index: number): void;
    getRule(index: number): string;
};
export declare const CSSOMTag: {
    new (target?: HTMLElement | undefined): {
        element: HTMLStyleElement;
        sheet: CSSStyleSheet;
        length: number;
        insertRule(index: number, rule: string): boolean;
        deleteRule(index: number): void;
        getRule(index: number): string;
    };
};
/** A Tag that emulates the CSSStyleSheet API but uses text nodes */
export declare const TextTag: {
    new (target?: HTMLElement | undefined): {
        element: HTMLStyleElement;
        nodes: NodeListOf<Node>;
        length: number;
        insertRule(index: number, rule: string): boolean;
        deleteRule(index: number): void;
        getRule(index: number): string;
    };
};
/** A completely virtual (server-side) Tag that doesn't manipulate the DOM */
export declare const VirtualTag: {
    new (_target?: HTMLElement | undefined): {
        rules: string[];
        length: number;
        insertRule(index: number, rule: string): boolean;
        deleteRule(index: number): void;
        getRule(index: number): string;
    };
};
