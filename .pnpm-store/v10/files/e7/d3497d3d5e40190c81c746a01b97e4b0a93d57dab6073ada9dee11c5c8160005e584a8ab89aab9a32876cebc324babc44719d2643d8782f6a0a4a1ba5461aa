import { ParserOptions, NodeTransform, SourceLocation, CompilerError, DirectiveTransform, RootNode, CompilerOptions, CodegenResult } from '@vue/compiler-core';
export * from '@vue/compiler-core';

export declare const parserOptions: ParserOptions;

export declare const V_MODEL_RADIO: unique symbol;
export declare const V_MODEL_CHECKBOX: unique symbol;
export declare const V_MODEL_TEXT: unique symbol;
export declare const V_MODEL_SELECT: unique symbol;
export declare const V_MODEL_DYNAMIC: unique symbol;
export declare const V_ON_WITH_MODIFIERS: unique symbol;
export declare const V_ON_WITH_KEYS: unique symbol;
export declare const V_SHOW: unique symbol;
export declare const TRANSITION: unique symbol;
export declare const TRANSITION_GROUP: unique symbol;

export declare const transformStyle: NodeTransform;

interface DOMCompilerError extends CompilerError {
    code: DOMErrorCodes;
}
export declare function createDOMCompilerError(code: DOMErrorCodes, loc?: SourceLocation): DOMCompilerError;
export declare enum DOMErrorCodes {
    X_V_HTML_NO_EXPRESSION = 54,
    X_V_HTML_WITH_CHILDREN = 55,
    X_V_TEXT_NO_EXPRESSION = 56,
    X_V_TEXT_WITH_CHILDREN = 57,
    X_V_MODEL_ON_INVALID_ELEMENT = 58,
    X_V_MODEL_ARG_ON_ELEMENT = 59,
    X_V_MODEL_ON_FILE_INPUT_ELEMENT = 60,
    X_V_MODEL_UNNECESSARY_VALUE = 61,
    X_V_SHOW_NO_EXPRESSION = 62,
    X_TRANSITION_INVALID_CHILDREN = 63,
    X_IGNORED_SIDE_EFFECT_TAG = 64,
    __EXTEND_POINT__ = 65
}
export declare const DOMErrorMessages: {
    [code: number]: string;
};

export declare const DOMNodeTransforms: NodeTransform[];
export declare const DOMDirectiveTransforms: Record<string, DirectiveTransform>;
export declare function compile(src: string | RootNode, options?: CompilerOptions): CodegenResult;
export declare function parse(template: string, options?: ParserOptions): RootNode;

