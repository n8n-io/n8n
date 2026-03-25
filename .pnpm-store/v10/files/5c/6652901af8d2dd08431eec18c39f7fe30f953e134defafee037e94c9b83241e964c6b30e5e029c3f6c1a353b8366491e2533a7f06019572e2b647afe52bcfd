import { PatchFlags } from '@vue/shared';
export { generateCodeFrame } from '@vue/shared';
import { Node as Node$1, Identifier, Function, BlockStatement as BlockStatement$1, SwitchCase, Program, ObjectProperty } from '@babel/types';
import { ParserPlugin } from '@babel/parser';

export declare const FRAGMENT: unique symbol;
export declare const TELEPORT: unique symbol;
export declare const SUSPENSE: unique symbol;
export declare const KEEP_ALIVE: unique symbol;
export declare const BASE_TRANSITION: unique symbol;
export declare const OPEN_BLOCK: unique symbol;
export declare const CREATE_BLOCK: unique symbol;
export declare const CREATE_ELEMENT_BLOCK: unique symbol;
export declare const CREATE_VNODE: unique symbol;
export declare const CREATE_ELEMENT_VNODE: unique symbol;
export declare const CREATE_COMMENT: unique symbol;
export declare const CREATE_TEXT: unique symbol;
export declare const CREATE_STATIC: unique symbol;
export declare const RESOLVE_COMPONENT: unique symbol;
export declare const RESOLVE_DYNAMIC_COMPONENT: unique symbol;
export declare const RESOLVE_DIRECTIVE: unique symbol;
export declare const RESOLVE_FILTER: unique symbol;
export declare const WITH_DIRECTIVES: unique symbol;
export declare const RENDER_LIST: unique symbol;
export declare const RENDER_SLOT: unique symbol;
export declare const CREATE_SLOTS: unique symbol;
export declare const TO_DISPLAY_STRING: unique symbol;
export declare const MERGE_PROPS: unique symbol;
export declare const NORMALIZE_CLASS: unique symbol;
export declare const NORMALIZE_STYLE: unique symbol;
export declare const NORMALIZE_PROPS: unique symbol;
export declare const GUARD_REACTIVE_PROPS: unique symbol;
export declare const TO_HANDLERS: unique symbol;
export declare const CAMELIZE: unique symbol;
export declare const CAPITALIZE: unique symbol;
export declare const TO_HANDLER_KEY: unique symbol;
export declare const SET_BLOCK_TRACKING: unique symbol;
/**
 * @deprecated no longer needed in 3.5+ because we no longer hoist element nodes
 * but kept for backwards compat
 */
export declare const PUSH_SCOPE_ID: unique symbol;
/**
 * @deprecated kept for backwards compat
 */
export declare const POP_SCOPE_ID: unique symbol;
export declare const WITH_CTX: unique symbol;
export declare const UNREF: unique symbol;
export declare const IS_REF: unique symbol;
export declare const WITH_MEMO: unique symbol;
export declare const IS_MEMO_SAME: unique symbol;
export declare const helperNameMap: Record<symbol, string>;
export declare function registerRuntimeHelpers(helpers: Record<symbol, string>): void;

type OptionalOptions = 'decodeEntities' | 'whitespace' | 'isNativeTag' | 'isBuiltInComponent' | 'expressionPlugins' | keyof CompilerCompatOptions;
type MergedParserOptions = Omit<Required<ParserOptions>, OptionalOptions> & Pick<ParserOptions, OptionalOptions>;
export declare function baseParse(input: string, options?: ParserOptions): RootNode;

type CompilerCompatConfig = Partial<Record<CompilerDeprecationTypes, boolean | 'suppress-warning'>> & {
    MODE?: 2 | 3;
};
interface CompilerCompatOptions {
    compatConfig?: CompilerCompatConfig;
}
export declare enum CompilerDeprecationTypes {
    COMPILER_IS_ON_ELEMENT = "COMPILER_IS_ON_ELEMENT",
    COMPILER_V_BIND_SYNC = "COMPILER_V_BIND_SYNC",
    COMPILER_V_BIND_OBJECT_ORDER = "COMPILER_V_BIND_OBJECT_ORDER",
    COMPILER_V_ON_NATIVE = "COMPILER_V_ON_NATIVE",
    COMPILER_V_IF_V_FOR_PRECEDENCE = "COMPILER_V_IF_V_FOR_PRECEDENCE",
    COMPILER_NATIVE_TEMPLATE = "COMPILER_NATIVE_TEMPLATE",
    COMPILER_INLINE_TEMPLATE = "COMPILER_INLINE_TEMPLATE",
    COMPILER_FILTERS = "COMPILER_FILTERS"
}
export declare function checkCompatEnabled(key: CompilerDeprecationTypes, context: MergedParserOptions | TransformContext, loc: SourceLocation | null, ...args: any[]): boolean;
export declare function warnDeprecation(key: CompilerDeprecationTypes, context: MergedParserOptions | TransformContext, loc: SourceLocation | null, ...args: any[]): void;

export type NodeTransform = (node: RootNode | TemplateChildNode, context: TransformContext) => void | (() => void) | (() => void)[];
export type DirectiveTransform = (dir: DirectiveNode, node: ElementNode, context: TransformContext, augmentor?: (ret: DirectiveTransformResult) => DirectiveTransformResult) => DirectiveTransformResult;
interface DirectiveTransformResult {
    props: Property[];
    needRuntime?: boolean | symbol;
    ssrTagParts?: TemplateLiteral['elements'];
}
export type StructuralDirectiveTransform = (node: ElementNode, dir: DirectiveNode, context: TransformContext) => void | (() => void);
interface ImportItem {
    exp: string | ExpressionNode;
    path: string;
}
export interface TransformContext extends Required<Omit<TransformOptions, keyof CompilerCompatOptions>>, CompilerCompatOptions {
    selfName: string | null;
    root: RootNode;
    helpers: Map<symbol, number>;
    components: Set<string>;
    directives: Set<string>;
    hoists: (JSChildNode | null)[];
    imports: ImportItem[];
    temps: number;
    cached: (CacheExpression | null)[];
    identifiers: {
        [name: string]: number | undefined;
    };
    scopes: {
        vFor: number;
        vSlot: number;
        vPre: number;
        vOnce: number;
    };
    parent: ParentNode | null;
    grandParent: ParentNode | null;
    childIndex: number;
    currentNode: RootNode | TemplateChildNode | null;
    inVOnce: boolean;
    helper<T extends symbol>(name: T): T;
    removeHelper<T extends symbol>(name: T): void;
    helperString(name: symbol): string;
    replaceNode(node: TemplateChildNode): void;
    removeNode(node?: TemplateChildNode): void;
    onNodeRemoved(): void;
    addIdentifiers(exp: ExpressionNode | string): void;
    removeIdentifiers(exp: ExpressionNode | string): void;
    hoist(exp: string | JSChildNode | ArrayExpression): SimpleExpressionNode;
    cache(exp: JSChildNode, isVNode?: boolean, inVOnce?: boolean): CacheExpression;
    constantCache: WeakMap<TemplateChildNode, ConstantTypes>;
    filters?: Set<string>;
}
export declare function createTransformContext(root: RootNode, { filename, prefixIdentifiers, hoistStatic, hmr, cacheHandlers, nodeTransforms, directiveTransforms, transformHoist, isBuiltInComponent, isCustomElement, expressionPlugins, scopeId, slotted, ssr, inSSR, ssrCssVars, bindingMetadata, inline, isTS, onError, onWarn, compatConfig, }: TransformOptions): TransformContext;
export declare function transform(root: RootNode, options: TransformOptions): void;
export declare function traverseNode(node: RootNode | TemplateChildNode, context: TransformContext): void;
export declare function createStructuralDirectiveTransform(name: string | RegExp, fn: StructuralDirectiveTransform): NodeTransform;

export declare const transformElement: NodeTransform;
export declare function resolveComponentType(node: ComponentNode, context: TransformContext, ssr?: boolean): string | symbol | CallExpression;
export type PropsExpression = ObjectExpression | CallExpression | ExpressionNode;
export declare function buildProps(node: ElementNode, context: TransformContext, props: ElementNode['props'] | undefined, isComponent: boolean, isDynamicComponent: boolean, ssr?: boolean): {
    props: PropsExpression | undefined;
    directives: DirectiveNode[];
    patchFlag: number;
    dynamicPropNames: string[];
    shouldUseBlock: boolean;
};
export declare function buildDirectiveArgs(dir: DirectiveNode, context: TransformContext): ArrayExpression;

export type Namespace = number;
export declare enum Namespaces {
    HTML = 0,
    SVG = 1,
    MATH_ML = 2
}
export declare enum NodeTypes {
    ROOT = 0,
    ELEMENT = 1,
    TEXT = 2,
    COMMENT = 3,
    SIMPLE_EXPRESSION = 4,
    INTERPOLATION = 5,
    ATTRIBUTE = 6,
    DIRECTIVE = 7,
    COMPOUND_EXPRESSION = 8,
    IF = 9,
    IF_BRANCH = 10,
    FOR = 11,
    TEXT_CALL = 12,
    VNODE_CALL = 13,
    JS_CALL_EXPRESSION = 14,
    JS_OBJECT_EXPRESSION = 15,
    JS_PROPERTY = 16,
    JS_ARRAY_EXPRESSION = 17,
    JS_FUNCTION_EXPRESSION = 18,
    JS_CONDITIONAL_EXPRESSION = 19,
    JS_CACHE_EXPRESSION = 20,
    JS_BLOCK_STATEMENT = 21,
    JS_TEMPLATE_LITERAL = 22,
    JS_IF_STATEMENT = 23,
    JS_ASSIGNMENT_EXPRESSION = 24,
    JS_SEQUENCE_EXPRESSION = 25,
    JS_RETURN_STATEMENT = 26
}
export declare enum ElementTypes {
    ELEMENT = 0,
    COMPONENT = 1,
    SLOT = 2,
    TEMPLATE = 3
}
export interface Node {
    type: NodeTypes;
    loc: SourceLocation;
}
export interface SourceLocation {
    start: Position;
    end: Position;
    source: string;
}
export interface Position {
    offset: number;
    line: number;
    column: number;
}
export type ParentNode = RootNode | ElementNode | IfBranchNode | ForNode;
export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode;
export type TemplateChildNode = ElementNode | InterpolationNode | CompoundExpressionNode | TextNode | CommentNode | IfNode | IfBranchNode | ForNode | TextCallNode;
export interface RootNode extends Node {
    type: NodeTypes.ROOT;
    source: string;
    children: TemplateChildNode[];
    helpers: Set<symbol>;
    components: string[];
    directives: string[];
    hoists: (JSChildNode | null)[];
    imports: ImportItem[];
    cached: (CacheExpression | null)[];
    temps: number;
    ssrHelpers?: symbol[];
    codegenNode?: TemplateChildNode | JSChildNode | BlockStatement;
    transformed?: boolean;
    filters?: string[];
}
export type ElementNode = PlainElementNode | ComponentNode | SlotOutletNode | TemplateNode;
export interface BaseElementNode extends Node {
    type: NodeTypes.ELEMENT;
    ns: Namespace;
    tag: string;
    tagType: ElementTypes;
    props: Array<AttributeNode | DirectiveNode>;
    children: TemplateChildNode[];
    isSelfClosing?: boolean;
    innerLoc?: SourceLocation;
}
export interface PlainElementNode extends BaseElementNode {
    tagType: ElementTypes.ELEMENT;
    codegenNode: VNodeCall | SimpleExpressionNode | CacheExpression | MemoExpression | undefined;
    ssrCodegenNode?: TemplateLiteral;
}
export interface ComponentNode extends BaseElementNode {
    tagType: ElementTypes.COMPONENT;
    codegenNode: VNodeCall | CacheExpression | MemoExpression | undefined;
    ssrCodegenNode?: CallExpression;
}
export interface SlotOutletNode extends BaseElementNode {
    tagType: ElementTypes.SLOT;
    codegenNode: RenderSlotCall | CacheExpression | undefined;
    ssrCodegenNode?: CallExpression;
}
export interface TemplateNode extends BaseElementNode {
    tagType: ElementTypes.TEMPLATE;
    codegenNode: undefined;
}
export interface TextNode extends Node {
    type: NodeTypes.TEXT;
    content: string;
}
export interface CommentNode extends Node {
    type: NodeTypes.COMMENT;
    content: string;
}
export interface AttributeNode extends Node {
    type: NodeTypes.ATTRIBUTE;
    name: string;
    nameLoc: SourceLocation;
    value: TextNode | undefined;
}
export interface DirectiveNode extends Node {
    type: NodeTypes.DIRECTIVE;
    /**
     * the normalized name without prefix or shorthands, e.g. "bind", "on"
     */
    name: string;
    /**
     * the raw attribute name, preserving shorthand, and including arg & modifiers
     * this is only used during parse.
     */
    rawName?: string;
    exp: ExpressionNode | undefined;
    arg: ExpressionNode | undefined;
    modifiers: SimpleExpressionNode[];
    /**
     * optional property to cache the expression parse result for v-for
     */
    forParseResult?: ForParseResult;
}
/**
 * Static types have several levels.
 * Higher levels implies lower levels. e.g. a node that can be stringified
 * can always be hoisted and skipped for patch.
 */
export declare enum ConstantTypes {
    NOT_CONSTANT = 0,
    CAN_SKIP_PATCH = 1,
    CAN_CACHE = 2,
    CAN_STRINGIFY = 3
}
export interface SimpleExpressionNode extends Node {
    type: NodeTypes.SIMPLE_EXPRESSION;
    content: string;
    isStatic: boolean;
    constType: ConstantTypes;
    /**
     * - `null` means the expression is a simple identifier that doesn't need
     *    parsing
     * - `false` means there was a parsing error
     */
    ast?: Node$1 | null | false;
    /**
     * Indicates this is an identifier for a hoist vnode call and points to the
     * hoisted node.
     */
    hoisted?: JSChildNode;
    /**
     * an expression parsed as the params of a function will track
     * the identifiers declared inside the function body.
     */
    identifiers?: string[];
    isHandlerKey?: boolean;
}
export interface InterpolationNode extends Node {
    type: NodeTypes.INTERPOLATION;
    content: ExpressionNode;
}
export interface CompoundExpressionNode extends Node {
    type: NodeTypes.COMPOUND_EXPRESSION;
    /**
     * - `null` means the expression is a simple identifier that doesn't need
     *    parsing
     * - `false` means there was a parsing error
     */
    ast?: Node$1 | null | false;
    children: (SimpleExpressionNode | CompoundExpressionNode | InterpolationNode | TextNode | string | symbol)[];
    /**
     * an expression parsed as the params of a function will track
     * the identifiers declared inside the function body.
     */
    identifiers?: string[];
    isHandlerKey?: boolean;
}
export interface IfNode extends Node {
    type: NodeTypes.IF;
    branches: IfBranchNode[];
    codegenNode?: IfConditionalExpression | CacheExpression;
}
export interface IfBranchNode extends Node {
    type: NodeTypes.IF_BRANCH;
    condition: ExpressionNode | undefined;
    children: TemplateChildNode[];
    userKey?: AttributeNode | DirectiveNode;
    isTemplateIf?: boolean;
}
export interface ForNode extends Node {
    type: NodeTypes.FOR;
    source: ExpressionNode;
    valueAlias: ExpressionNode | undefined;
    keyAlias: ExpressionNode | undefined;
    objectIndexAlias: ExpressionNode | undefined;
    parseResult: ForParseResult;
    children: TemplateChildNode[];
    codegenNode?: ForCodegenNode;
}
export interface ForParseResult {
    source: ExpressionNode;
    value: ExpressionNode | undefined;
    key: ExpressionNode | undefined;
    index: ExpressionNode | undefined;
    finalized: boolean;
}
export interface TextCallNode extends Node {
    type: NodeTypes.TEXT_CALL;
    content: TextNode | InterpolationNode | CompoundExpressionNode;
    codegenNode: CallExpression | SimpleExpressionNode;
}
export type TemplateTextChildNode = TextNode | InterpolationNode | CompoundExpressionNode;
export interface VNodeCall extends Node {
    type: NodeTypes.VNODE_CALL;
    tag: string | symbol | CallExpression;
    props: PropsExpression | undefined;
    children: TemplateChildNode[] | TemplateTextChildNode | SlotsExpression | ForRenderListExpression | SimpleExpressionNode | CacheExpression | undefined;
    patchFlag: PatchFlags | undefined;
    dynamicProps: string | SimpleExpressionNode | undefined;
    directives: DirectiveArguments | undefined;
    isBlock: boolean;
    disableTracking: boolean;
    isComponent: boolean;
}
export type JSChildNode = VNodeCall | CallExpression | ObjectExpression | ArrayExpression | ExpressionNode | FunctionExpression | ConditionalExpression | CacheExpression | AssignmentExpression | SequenceExpression;
export interface CallExpression extends Node {
    type: NodeTypes.JS_CALL_EXPRESSION;
    callee: string | symbol;
    arguments: (string | symbol | JSChildNode | SSRCodegenNode | TemplateChildNode | TemplateChildNode[])[];
}
export interface ObjectExpression extends Node {
    type: NodeTypes.JS_OBJECT_EXPRESSION;
    properties: Array<Property>;
}
export interface Property extends Node {
    type: NodeTypes.JS_PROPERTY;
    key: ExpressionNode;
    value: JSChildNode;
}
export interface ArrayExpression extends Node {
    type: NodeTypes.JS_ARRAY_EXPRESSION;
    elements: Array<string | Node>;
}
export interface FunctionExpression extends Node {
    type: NodeTypes.JS_FUNCTION_EXPRESSION;
    params: ExpressionNode | string | (ExpressionNode | string)[] | undefined;
    returns?: TemplateChildNode | TemplateChildNode[] | JSChildNode;
    body?: BlockStatement | IfStatement;
    newline: boolean;
    /**
     * This flag is for codegen to determine whether it needs to generate the
     * withScopeId() wrapper
     */
    isSlot: boolean;
    /**
     * __COMPAT__ only, indicates a slot function that should be excluded from
     * the legacy $scopedSlots instance property.
     */
    isNonScopedSlot?: boolean;
}
export interface ConditionalExpression extends Node {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION;
    test: JSChildNode;
    consequent: JSChildNode;
    alternate: JSChildNode;
    newline: boolean;
}
export interface CacheExpression extends Node {
    type: NodeTypes.JS_CACHE_EXPRESSION;
    index: number;
    value: JSChildNode;
    needPauseTracking: boolean;
    inVOnce: boolean;
    needArraySpread: boolean;
}
export interface MemoExpression extends CallExpression {
    callee: typeof WITH_MEMO;
    arguments: [ExpressionNode, MemoFactory, string, string];
}
interface MemoFactory extends FunctionExpression {
    returns: BlockCodegenNode;
}
export type SSRCodegenNode = BlockStatement | TemplateLiteral | IfStatement | AssignmentExpression | ReturnStatement | SequenceExpression;
export interface BlockStatement extends Node {
    type: NodeTypes.JS_BLOCK_STATEMENT;
    body: (JSChildNode | IfStatement)[];
}
export interface TemplateLiteral extends Node {
    type: NodeTypes.JS_TEMPLATE_LITERAL;
    elements: (string | JSChildNode)[];
}
export interface IfStatement extends Node {
    type: NodeTypes.JS_IF_STATEMENT;
    test: ExpressionNode;
    consequent: BlockStatement;
    alternate: IfStatement | BlockStatement | ReturnStatement | undefined;
}
export interface AssignmentExpression extends Node {
    type: NodeTypes.JS_ASSIGNMENT_EXPRESSION;
    left: SimpleExpressionNode;
    right: JSChildNode;
}
export interface SequenceExpression extends Node {
    type: NodeTypes.JS_SEQUENCE_EXPRESSION;
    expressions: JSChildNode[];
}
export interface ReturnStatement extends Node {
    type: NodeTypes.JS_RETURN_STATEMENT;
    returns: TemplateChildNode | TemplateChildNode[] | JSChildNode;
}
export interface DirectiveArguments extends ArrayExpression {
    elements: DirectiveArgumentNode[];
}
export interface DirectiveArgumentNode extends ArrayExpression {
    elements: [string] | [string, ExpressionNode] | [string, ExpressionNode, ExpressionNode] | [string, ExpressionNode, ExpressionNode, ObjectExpression];
}
export interface RenderSlotCall extends CallExpression {
    callee: typeof RENDER_SLOT;
    arguments: [string, string | ExpressionNode] | [string, string | ExpressionNode, PropsExpression] | [
        string,
        string | ExpressionNode,
        PropsExpression | '{}',
        TemplateChildNode[]
    ];
}
export type SlotsExpression = SlotsObjectExpression | DynamicSlotsExpression;
export interface SlotsObjectExpression extends ObjectExpression {
    properties: SlotsObjectProperty[];
}
export interface SlotsObjectProperty extends Property {
    value: SlotFunctionExpression;
}
export interface SlotFunctionExpression extends FunctionExpression {
    returns: TemplateChildNode[] | CacheExpression;
}
export interface DynamicSlotsExpression extends CallExpression {
    callee: typeof CREATE_SLOTS;
    arguments: [SlotsObjectExpression, DynamicSlotEntries];
}
export interface DynamicSlotEntries extends ArrayExpression {
    elements: (ConditionalDynamicSlotNode | ListDynamicSlotNode)[];
}
export interface ConditionalDynamicSlotNode extends ConditionalExpression {
    consequent: DynamicSlotNode;
    alternate: DynamicSlotNode | SimpleExpressionNode;
}
export interface ListDynamicSlotNode extends CallExpression {
    callee: typeof RENDER_LIST;
    arguments: [ExpressionNode, ListDynamicSlotIterator];
}
export interface ListDynamicSlotIterator extends FunctionExpression {
    returns: DynamicSlotNode;
}
export interface DynamicSlotNode extends ObjectExpression {
    properties: [Property, DynamicSlotFnProperty];
}
export interface DynamicSlotFnProperty extends Property {
    value: SlotFunctionExpression;
}
export type BlockCodegenNode = VNodeCall | RenderSlotCall;
export interface IfConditionalExpression extends ConditionalExpression {
    consequent: BlockCodegenNode | MemoExpression;
    alternate: BlockCodegenNode | IfConditionalExpression | MemoExpression;
}
export interface ForCodegenNode extends VNodeCall {
    isBlock: true;
    tag: typeof FRAGMENT;
    props: undefined;
    children: ForRenderListExpression;
    patchFlag: PatchFlags;
    disableTracking: boolean;
}
export interface ForRenderListExpression extends CallExpression {
    callee: typeof RENDER_LIST;
    arguments: [ExpressionNode, ForIteratorExpression];
}
export interface ForIteratorExpression extends FunctionExpression {
    returns?: BlockCodegenNode;
}
export declare const locStub: SourceLocation;
export declare function createRoot(children: TemplateChildNode[], source?: string): RootNode;
export declare function createVNodeCall(context: TransformContext | null, tag: VNodeCall['tag'], props?: VNodeCall['props'], children?: VNodeCall['children'], patchFlag?: VNodeCall['patchFlag'], dynamicProps?: VNodeCall['dynamicProps'], directives?: VNodeCall['directives'], isBlock?: VNodeCall['isBlock'], disableTracking?: VNodeCall['disableTracking'], isComponent?: VNodeCall['isComponent'], loc?: SourceLocation): VNodeCall;
export declare function createArrayExpression(elements: ArrayExpression['elements'], loc?: SourceLocation): ArrayExpression;
export declare function createObjectExpression(properties: ObjectExpression['properties'], loc?: SourceLocation): ObjectExpression;
export declare function createObjectProperty(key: Property['key'] | string, value: Property['value']): Property;
export declare function createSimpleExpression(content: SimpleExpressionNode['content'], isStatic?: SimpleExpressionNode['isStatic'], loc?: SourceLocation, constType?: ConstantTypes): SimpleExpressionNode;
export declare function createInterpolation(content: InterpolationNode['content'] | string, loc: SourceLocation): InterpolationNode;
export declare function createCompoundExpression(children: CompoundExpressionNode['children'], loc?: SourceLocation): CompoundExpressionNode;
type InferCodegenNodeType<T> = T extends typeof RENDER_SLOT ? RenderSlotCall : CallExpression;
export declare function createCallExpression<T extends CallExpression['callee']>(callee: T, args?: CallExpression['arguments'], loc?: SourceLocation): InferCodegenNodeType<T>;
export declare function createFunctionExpression(params: FunctionExpression['params'], returns?: FunctionExpression['returns'], newline?: boolean, isSlot?: boolean, loc?: SourceLocation): FunctionExpression;
export declare function createConditionalExpression(test: ConditionalExpression['test'], consequent: ConditionalExpression['consequent'], alternate: ConditionalExpression['alternate'], newline?: boolean): ConditionalExpression;
export declare function createCacheExpression(index: number, value: JSChildNode, needPauseTracking?: boolean, inVOnce?: boolean): CacheExpression;
export declare function createBlockStatement(body: BlockStatement['body']): BlockStatement;
export declare function createTemplateLiteral(elements: TemplateLiteral['elements']): TemplateLiteral;
export declare function createIfStatement(test: IfStatement['test'], consequent: IfStatement['consequent'], alternate?: IfStatement['alternate']): IfStatement;
export declare function createAssignmentExpression(left: AssignmentExpression['left'], right: AssignmentExpression['right']): AssignmentExpression;
export declare function createSequenceExpression(expressions: SequenceExpression['expressions']): SequenceExpression;
export declare function createReturnStatement(returns: ReturnStatement['returns']): ReturnStatement;
export declare function getVNodeHelper(ssr: boolean, isComponent: boolean): typeof CREATE_VNODE | typeof CREATE_ELEMENT_VNODE;
export declare function getVNodeBlockHelper(ssr: boolean, isComponent: boolean): typeof CREATE_BLOCK | typeof CREATE_ELEMENT_BLOCK;
export declare function convertToBlock(node: VNodeCall, { helper, removeHelper, inSSR }: TransformContext): void;

export interface CompilerError extends SyntaxError {
    code: number | string;
    loc?: SourceLocation;
}
export interface CoreCompilerError extends CompilerError {
    code: ErrorCodes;
}
type InferCompilerError<T> = T extends ErrorCodes ? CoreCompilerError : CompilerError;
export declare function createCompilerError<T extends number>(code: T, loc?: SourceLocation, messages?: {
    [code: number]: string;
}, additionalMessage?: string): InferCompilerError<T>;
export declare enum ErrorCodes {
    ABRUPT_CLOSING_OF_EMPTY_COMMENT = 0,
    CDATA_IN_HTML_CONTENT = 1,
    DUPLICATE_ATTRIBUTE = 2,
    END_TAG_WITH_ATTRIBUTES = 3,
    END_TAG_WITH_TRAILING_SOLIDUS = 4,
    EOF_BEFORE_TAG_NAME = 5,
    EOF_IN_CDATA = 6,
    EOF_IN_COMMENT = 7,
    EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT = 8,
    EOF_IN_TAG = 9,
    INCORRECTLY_CLOSED_COMMENT = 10,
    INCORRECTLY_OPENED_COMMENT = 11,
    INVALID_FIRST_CHARACTER_OF_TAG_NAME = 12,
    MISSING_ATTRIBUTE_VALUE = 13,
    MISSING_END_TAG_NAME = 14,
    MISSING_WHITESPACE_BETWEEN_ATTRIBUTES = 15,
    NESTED_COMMENT = 16,
    UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME = 17,
    UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE = 18,
    UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME = 19,
    UNEXPECTED_NULL_CHARACTER = 20,
    UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME = 21,
    UNEXPECTED_SOLIDUS_IN_TAG = 22,
    X_INVALID_END_TAG = 23,
    X_MISSING_END_TAG = 24,
    X_MISSING_INTERPOLATION_END = 25,
    X_MISSING_DIRECTIVE_NAME = 26,
    X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END = 27,
    X_V_IF_NO_EXPRESSION = 28,
    X_V_IF_SAME_KEY = 29,
    X_V_ELSE_NO_ADJACENT_IF = 30,
    X_V_FOR_NO_EXPRESSION = 31,
    X_V_FOR_MALFORMED_EXPRESSION = 32,
    X_V_FOR_TEMPLATE_KEY_PLACEMENT = 33,
    X_V_BIND_NO_EXPRESSION = 34,
    X_V_ON_NO_EXPRESSION = 35,
    X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET = 36,
    X_V_SLOT_MIXED_SLOT_USAGE = 37,
    X_V_SLOT_DUPLICATE_SLOT_NAMES = 38,
    X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN = 39,
    X_V_SLOT_MISPLACED = 40,
    X_V_MODEL_NO_EXPRESSION = 41,
    X_V_MODEL_MALFORMED_EXPRESSION = 42,
    X_V_MODEL_ON_SCOPE_VARIABLE = 43,
    X_V_MODEL_ON_PROPS = 44,
    X_V_MODEL_ON_CONST = 45,
    X_INVALID_EXPRESSION = 46,
    X_KEEP_ALIVE_INVALID_CHILDREN = 47,
    X_PREFIX_ID_NOT_SUPPORTED = 48,
    X_MODULE_MODE_NOT_SUPPORTED = 49,
    X_CACHE_HANDLER_NOT_SUPPORTED = 50,
    X_SCOPE_ID_NOT_SUPPORTED = 51,
    X_VNODE_HOOKS = 52,
    X_V_BIND_INVALID_SAME_NAME_ARGUMENT = 53,
    __EXTEND_POINT__ = 54
}
export declare const errorMessages: Record<ErrorCodes, string>;

interface ErrorHandlingOptions {
    onWarn?: (warning: CompilerError) => void;
    onError?: (error: CompilerError) => void;
}
export interface ParserOptions extends ErrorHandlingOptions, CompilerCompatOptions {
    /**
     * Base mode is platform agnostic and only parses HTML-like template syntax,
     * treating all tags the same way. Specific tag parsing behavior can be
     * configured by higher-level compilers.
     *
     * HTML mode adds additional logic for handling special parsing behavior in
     * `<script>`, `<style>`,`<title>` and `<textarea>`.
     * The logic is handled inside compiler-core for efficiency.
     *
     * SFC mode treats content of all root-level tags except `<template>` as plain
     * text.
     */
    parseMode?: 'base' | 'html' | 'sfc';
    /**
     * Specify the root namespace to use when parsing a template.
     * Defaults to `Namespaces.HTML` (0).
     */
    ns?: Namespaces;
    /**
     * e.g. platform native elements, e.g. `<div>` for browsers
     */
    isNativeTag?: (tag: string) => boolean;
    /**
     * e.g. native elements that can self-close, e.g. `<img>`, `<br>`, `<hr>`
     */
    isVoidTag?: (tag: string) => boolean;
    /**
     * e.g. elements that should preserve whitespace inside, e.g. `<pre>`
     */
    isPreTag?: (tag: string) => boolean;
    /**
     * Elements that should ignore the first newline token per parinsg spec
     * e.g. `<textarea>` and `<pre>`
     */
    isIgnoreNewlineTag?: (tag: string) => boolean;
    /**
     * Platform-specific built-in components e.g. `<Transition>`
     */
    isBuiltInComponent?: (tag: string) => symbol | void;
    /**
     * Separate option for end users to extend the native elements list
     */
    isCustomElement?: (tag: string) => boolean | void;
    /**
     * Get tag namespace
     */
    getNamespace?: (tag: string, parent: ElementNode | undefined, rootNamespace: Namespace) => Namespace;
    /**
     * @default ['{{', '}}']
     */
    delimiters?: [string, string];
    /**
     * Whitespace handling strategy
     * @default 'condense'
     */
    whitespace?: 'preserve' | 'condense';
    /**
     * Only used for DOM compilers that runs in the browser.
     * In non-browser builds, this option is ignored.
     */
    decodeEntities?: (rawText: string, asAttr: boolean) => string;
    /**
     * Whether to keep comments in the templates AST.
     * This defaults to `true` in development and `false` in production builds.
     */
    comments?: boolean;
    /**
     * Parse JavaScript expressions with Babel.
     * @default false
     */
    prefixIdentifiers?: boolean;
    /**
     * A list of parser plugins to enable for `@babel/parser`, which is used to
     * parse expressions in bindings and interpolations.
     * https://babeljs.io/docs/en/next/babel-parser#plugins
     */
    expressionPlugins?: ParserPlugin[];
}
export type HoistTransform = (children: TemplateChildNode[], context: TransformContext, parent: ParentNode) => void;
export declare enum BindingTypes {
    /**
     * returned from data()
     */
    DATA = "data",
    /**
     * declared as a prop
     */
    PROPS = "props",
    /**
     * a local alias of a `<script setup>` destructured prop.
     * the original is stored in __propsAliases of the bindingMetadata object.
     */
    PROPS_ALIASED = "props-aliased",
    /**
     * a let binding (may or may not be a ref)
     */
    SETUP_LET = "setup-let",
    /**
     * a const binding that can never be a ref.
     * these bindings don't need `unref()` calls when processed in inlined
     * template expressions.
     */
    SETUP_CONST = "setup-const",
    /**
     * a const binding that does not need `unref()`, but may be mutated.
     */
    SETUP_REACTIVE_CONST = "setup-reactive-const",
    /**
     * a const binding that may be a ref.
     */
    SETUP_MAYBE_REF = "setup-maybe-ref",
    /**
     * bindings that are guaranteed to be refs
     */
    SETUP_REF = "setup-ref",
    /**
     * declared by other options, e.g. computed, inject
     */
    OPTIONS = "options",
    /**
     * a literal constant, e.g. 'foo', 1, true
     */
    LITERAL_CONST = "literal-const"
}
export type BindingMetadata = {
    [key: string]: BindingTypes | undefined;
} & {
    __isScriptSetup?: boolean;
    __propsAliases?: Record<string, string>;
};
interface SharedTransformCodegenOptions {
    /**
     * Transform expressions like {{ foo }} to `_ctx.foo`.
     * If this option is false, the generated code will be wrapped in a
     * `with (this) { ... }` block.
     * - This is force-enabled in module mode, since modules are by default strict
     * and cannot use `with`
     * @default mode === 'module'
     */
    prefixIdentifiers?: boolean;
    /**
     * Control whether generate SSR-optimized render functions instead.
     * The resulting function must be attached to the component via the
     * `ssrRender` option instead of `render`.
     *
     * When compiler generates code for SSR's fallback branch, we need to set it to false:
     *  - context.ssr = false
     *
     * see `subTransform` in `ssrTransformComponent.ts`
     */
    ssr?: boolean;
    /**
     * Indicates whether the compiler generates code for SSR,
     * it is always true when generating code for SSR,
     * regardless of whether we are generating code for SSR's fallback branch,
     * this means that when the compiler generates code for SSR's fallback branch:
     *  - context.ssr = false
     *  - context.inSSR = true
     */
    inSSR?: boolean;
    /**
     * Optional binding metadata analyzed from script - used to optimize
     * binding access when `prefixIdentifiers` is enabled.
     */
    bindingMetadata?: BindingMetadata;
    /**
     * Compile the function for inlining inside setup().
     * This allows the function to directly access setup() local bindings.
     */
    inline?: boolean;
    /**
     * Indicates that transforms and codegen should try to output valid TS code
     */
    isTS?: boolean;
    /**
     * Filename for source map generation.
     * Also used for self-recursive reference in templates
     * @default 'template.vue.html'
     */
    filename?: string;
}
export interface TransformOptions extends SharedTransformCodegenOptions, ErrorHandlingOptions, CompilerCompatOptions {
    /**
     * An array of node transforms to be applied to every AST node.
     */
    nodeTransforms?: NodeTransform[];
    /**
     * An object of { name: transform } to be applied to every directive attribute
     * node found on element nodes.
     */
    directiveTransforms?: Record<string, DirectiveTransform | undefined>;
    /**
     * An optional hook to transform a node being hoisted.
     * used by compiler-dom to turn hoisted nodes into stringified HTML vnodes.
     * @default null
     */
    transformHoist?: HoistTransform | null;
    /**
     * If the pairing runtime provides additional built-in elements, use this to
     * mark them as built-in so the compiler will generate component vnodes
     * for them.
     */
    isBuiltInComponent?: (tag: string) => symbol | void;
    /**
     * Used by some transforms that expects only native elements
     */
    isCustomElement?: (tag: string) => boolean | void;
    /**
     * Transform expressions like {{ foo }} to `_ctx.foo`.
     * If this option is false, the generated code will be wrapped in a
     * `with (this) { ... }` block.
     * - This is force-enabled in module mode, since modules are by default strict
     * and cannot use `with`
     * @default mode === 'module'
     */
    prefixIdentifiers?: boolean;
    /**
     * Cache static VNodes and props objects to `_hoisted_x` constants
     * @default false
     */
    hoistStatic?: boolean;
    /**
     * Cache v-on handlers to avoid creating new inline functions on each render,
     * also avoids the need for dynamically patching the handlers by wrapping it.
     * e.g `@click="foo"` by default is compiled to `{ onClick: foo }`. With this
     * option it's compiled to:
     * ```js
     * { onClick: _cache[0] || (_cache[0] = e => _ctx.foo(e)) }
     * ```
     * - Requires "prefixIdentifiers" to be enabled because it relies on scope
     * analysis to determine if a handler is safe to cache.
     * @default false
     */
    cacheHandlers?: boolean;
    /**
     * A list of parser plugins to enable for `@babel/parser`, which is used to
     * parse expressions in bindings and interpolations.
     * https://babeljs.io/docs/en/next/babel-parser#plugins
     */
    expressionPlugins?: ParserPlugin[];
    /**
     * SFC scoped styles ID
     */
    scopeId?: string | null;
    /**
     * Indicates this SFC template has used :slotted in its styles
     * Defaults to `true` for backwards compatibility - SFC tooling should set it
     * to `false` if no `:slotted` usage is detected in `<style>`
     */
    slotted?: boolean;
    /**
     * SFC `<style vars>` injection string
     * Should already be an object expression, e.g. `{ 'xxxx-color': color }`
     * needed to render inline CSS variables on component root
     */
    ssrCssVars?: string;
    /**
     * Whether to compile the template assuming it needs to handle HMR.
     * Some edge cases may need to generate different code for HMR to work
     * correctly, e.g. #6938, #7138
     */
    hmr?: boolean;
}
export interface CodegenOptions extends SharedTransformCodegenOptions {
    /**
     * - `module` mode will generate ES module import statements for helpers
     * and export the render function as the default export.
     * - `function` mode will generate a single `const { helpers... } = Vue`
     * statement and return the render function. It expects `Vue` to be globally
     * available (or passed by wrapping the code with an IIFE). It is meant to be
     * used with `new Function(code)()` to generate a render function at runtime.
     * @default 'function'
     */
    mode?: 'module' | 'function';
    /**
     * Generate source map?
     * @default false
     */
    sourceMap?: boolean;
    /**
     * SFC scoped styles ID
     */
    scopeId?: string | null;
    /**
     * Option to optimize helper import bindings via variable assignment
     * (only used for webpack code-split)
     * @default false
     */
    optimizeImports?: boolean;
    /**
     * Customize where to import runtime helpers from.
     * @default 'vue'
     */
    runtimeModuleName?: string;
    /**
     * Customize where to import ssr runtime helpers from/**
     * @default 'vue/server-renderer'
     */
    ssrRuntimeModuleName?: string;
    /**
     * Customize the global variable name of `Vue` to get helpers from
     * in function mode
     * @default 'Vue'
     */
    runtimeGlobalName?: string;
}
export type CompilerOptions = ParserOptions & TransformOptions & CodegenOptions;

/**
 * The `SourceMapGenerator` type from `source-map-js` is a bit incomplete as it
 * misses `toJSON()`. We also need to add types for internal properties which we
 * need to access for better performance.
 *
 * Since TS 5.3, dts generation starts to strangely include broken triple slash
 * references for source-map-js, so we are inlining all source map related types
 * here to to workaround that.
 */
export interface CodegenSourceMapGenerator {
    setSourceContent(sourceFile: string, sourceContent: string): void;
    toJSON(): RawSourceMap;
    _sources: Set<string>;
    _names: Set<string>;
    _mappings: {
        add(mapping: MappingItem): void;
    };
}
export interface RawSourceMap {
    file?: string;
    sourceRoot?: string;
    version: string;
    sources: string[];
    names: string[];
    sourcesContent?: string[];
    mappings: string;
}
interface MappingItem {
    source: string;
    generatedLine: number;
    generatedColumn: number;
    originalLine: number;
    originalColumn: number;
    name: string | null;
}
type CodegenNode = TemplateChildNode | JSChildNode | SSRCodegenNode;
export interface CodegenResult {
    code: string;
    preamble: string;
    ast: RootNode;
    map?: RawSourceMap;
}
export interface CodegenContext extends Omit<Required<CodegenOptions>, 'bindingMetadata' | 'inline'> {
    source: string;
    code: string;
    line: number;
    column: number;
    offset: number;
    indentLevel: number;
    pure: boolean;
    map?: CodegenSourceMapGenerator;
    helper(key: symbol): string;
    push(code: string, newlineIndex?: number, node?: CodegenNode): void;
    indent(): void;
    deindent(withoutNewLine?: boolean): void;
    newline(): void;
}
export declare function generate(ast: RootNode, options?: CodegenOptions & {
    onContextCreated?: (context: CodegenContext) => void;
}): CodegenResult;

export type TransformPreset = [
    NodeTransform[],
    Record<string, DirectiveTransform>
];
export declare function getBaseTransformPreset(prefixIdentifiers?: boolean): TransformPreset;
export declare function baseCompile(source: string | RootNode, options?: CompilerOptions): CodegenResult;

export declare const isStaticExp: (p: JSChildNode) => p is SimpleExpressionNode;
export declare function isCoreComponent(tag: string): symbol | void;
export declare const isSimpleIdentifier: (name: string) => boolean;
export declare const validFirstIdentCharRE: RegExp;
/**
 * Simple lexer to check if an expression is a member expression. This is
 * lax and only checks validity at the root level (i.e. does not validate exps
 * inside square brackets), but it's ok since these are only used on template
 * expressions and false positives are invalid expressions in the first place.
 */
export declare const isMemberExpressionBrowser: (exp: ExpressionNode) => boolean;
export declare const isMemberExpressionNode: (exp: ExpressionNode, context: TransformContext) => boolean;
export declare const isMemberExpression: (exp: ExpressionNode, context: TransformContext) => boolean;
export declare const isFnExpressionBrowser: (exp: ExpressionNode) => boolean;
export declare const isFnExpressionNode: (exp: ExpressionNode, context: TransformContext) => boolean;
export declare const isFnExpression: (exp: ExpressionNode, context: TransformContext) => boolean;
export declare function advancePositionWithClone(pos: Position, source: string, numberOfCharacters?: number): Position;
export declare function advancePositionWithMutation(pos: Position, source: string, numberOfCharacters?: number): Position;
export declare function assert(condition: boolean, msg?: string): void;
export declare function findDir(node: ElementNode, name: string | RegExp, allowEmpty?: boolean): DirectiveNode | undefined;
export declare function findProp(node: ElementNode, name: string, dynamicOnly?: boolean, allowEmpty?: boolean): ElementNode['props'][0] | undefined;
export declare function isStaticArgOf(arg: DirectiveNode['arg'], name: string): boolean;
export declare function hasDynamicKeyVBind(node: ElementNode): boolean;
export declare function isText(node: TemplateChildNode): node is TextNode | InterpolationNode;
export declare function isVPre(p: ElementNode['props'][0]): p is DirectiveNode;
export declare function isVSlot(p: ElementNode['props'][0]): p is DirectiveNode;
export declare function isTemplateNode(node: RootNode | TemplateChildNode): node is TemplateNode;
export declare function isSlotOutlet(node: RootNode | TemplateChildNode): node is SlotOutletNode;
export declare function injectProp(node: VNodeCall | RenderSlotCall, prop: Property, context: TransformContext): void;
export declare function toValidAssetId(name: string, type: 'component' | 'directive' | 'filter'): string;
export declare function hasScopeRef(node: TemplateChildNode | IfBranchNode | ExpressionNode | CacheExpression | undefined, ids: TransformContext['identifiers']): boolean;
export declare function getMemoedVNodeCall(node: BlockCodegenNode | MemoExpression): VNodeCall | RenderSlotCall;
export declare const forAliasRE: RegExp;
export declare function isAllWhitespace(str: string): boolean;
export declare function isWhitespaceText(node: TemplateChildNode): boolean;
export declare function isCommentOrWhitespace(node: TemplateChildNode): boolean;

/**
 * Return value indicates whether the AST walked can be a constant
 */
export declare function walkIdentifiers(root: Node$1, onIdentifier: (node: Identifier, parent: Node$1 | null, parentStack: Node$1[], isReference: boolean, isLocal: boolean) => void, includeAll?: boolean, parentStack?: Node$1[], knownIds?: Record<string, number>): void;
export declare function isReferencedIdentifier(id: Identifier, parent: Node$1 | null, parentStack: Node$1[]): boolean;
export declare function isInDestructureAssignment(parent: Node$1, parentStack: Node$1[]): boolean;
export declare function isInNewExpression(parentStack: Node$1[]): boolean;
export declare function walkFunctionParams(node: Function, onIdent: (id: Identifier) => void): void;
export declare function walkBlockDeclarations(block: BlockStatement$1 | SwitchCase | Program, onIdent: (node: Identifier) => void): void;
export declare function extractIdentifiers(param: Node$1, nodes?: Identifier[]): Identifier[];
export declare const isFunctionType: (node: Node$1) => node is Function;
export declare const isStaticProperty: (node: Node$1) => node is ObjectProperty;
export declare const isStaticPropertyKey: (node: Node$1, parent: Node$1) => boolean;
export declare const TS_NODE_TYPES: string[];
export declare function unwrapTSNode(node: Node$1): Node$1;

export declare const transformModel: DirectiveTransform;

export declare const transformOn: DirectiveTransform;

export declare const transformBind: DirectiveTransform;

export declare const noopDirectiveTransform: DirectiveTransform;

export declare function processIf(node: ElementNode, dir: DirectiveNode, context: TransformContext, processCodegen?: (node: IfNode, branch: IfBranchNode, isRoot: boolean) => (() => void) | undefined): (() => void) | undefined;

export declare function processFor(node: ElementNode, dir: DirectiveNode, context: TransformContext, processCodegen?: (forNode: ForNode) => (() => void) | undefined): (() => void) | undefined;
export declare function createForLoopParams({ value, key, index }: ForParseResult, memoArgs?: ExpressionNode[]): ExpressionNode[];

export declare const transformExpression: NodeTransform;
export declare function processExpression(node: SimpleExpressionNode, context: TransformContext, asParams?: boolean, asRawStatements?: boolean, localVars?: Record<string, number>): ExpressionNode;
export declare function stringifyExpression(exp: ExpressionNode | string): string;

export declare const trackSlotScopes: NodeTransform;
export declare const trackVForSlotScopes: NodeTransform;
export type SlotFnBuilder = (slotProps: ExpressionNode | undefined, vFor: DirectiveNode | undefined, slotChildren: TemplateChildNode[], loc: SourceLocation) => FunctionExpression;
export declare function buildSlots(node: ElementNode, context: TransformContext, buildSlotFn?: SlotFnBuilder): {
    slots: SlotsExpression;
    hasDynamicSlots: boolean;
};

export declare const transformVBindShorthand: NodeTransform;

interface SlotOutletProcessResult {
    slotName: string | ExpressionNode;
    slotProps: PropsExpression | undefined;
}
export declare function processSlotOutlet(node: SlotOutletNode, context: TransformContext): SlotOutletProcessResult;

export declare function getConstantType(node: TemplateChildNode | SimpleExpressionNode | CacheExpression, context: TransformContext): ConstantTypes;


