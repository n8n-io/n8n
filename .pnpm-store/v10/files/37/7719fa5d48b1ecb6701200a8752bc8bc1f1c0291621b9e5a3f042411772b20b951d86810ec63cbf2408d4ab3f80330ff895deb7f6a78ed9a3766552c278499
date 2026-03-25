import { types } from 'storybook/internal/babel';
import { CoreConfig } from 'storybook/internal/types';

// This definition file follows a somewhat unusual format. ESTree allows
// runtime type checks based on the `type` parameter. In order to explain this
// to typescript we want to use discriminated union types:
// https://github.com/Microsoft/TypeScript/pull/9163
//
// For ESTree this is a bit tricky because the high level interfaces like
// Node or Function are pulling double duty. We want to pass common fields down
// to the interfaces that extend them (like Identifier or
// ArrowFunctionExpression), but you can't extend a type union or enforce
// common fields on them. So we've split the high level interfaces into two
// types, a base type which passes down inherited fields, and a type union of
// all types which extend the base type. Only the type union is exported, and
// the union is how other types refer to the collection of inheriting types.
//
// This makes the definitions file here somewhat more difficult to maintain,
// but it has the notable advantage of making ESTree much easier to use as
// an end user.

interface BaseNodeWithoutComments {
    // Every leaf interface that extends BaseNode must specify a type property.
    // The type property should be a string literal. For example, Identifier
    // has: `type: "Identifier"`
    type: string;
    loc?: SourceLocation | null | undefined;
    range?: [number, number] | undefined;
}

interface BaseNode extends BaseNodeWithoutComments {
    leadingComments?: Comment[] | undefined;
    trailingComments?: Comment[] | undefined;
}

interface NodeMap {
    AssignmentProperty: AssignmentProperty;
    CatchClause: CatchClause;
    Class: Class;
    ClassBody: ClassBody;
    Expression: Expression;
    Function: Function;
    Identifier: Identifier;
    Literal: Literal;
    MethodDefinition: MethodDefinition;
    ModuleDeclaration: ModuleDeclaration;
    ModuleSpecifier: ModuleSpecifier;
    Pattern: Pattern;
    PrivateIdentifier: PrivateIdentifier;
    Program: Program;
    Property: Property;
    PropertyDefinition: PropertyDefinition;
    SpreadElement: SpreadElement;
    Statement: Statement;
    Super: Super;
    SwitchCase: SwitchCase;
    TemplateElement: TemplateElement;
    VariableDeclarator: VariableDeclarator;
}

type Node$1 = NodeMap[keyof NodeMap];

interface Comment extends BaseNodeWithoutComments {
    type: "Line" | "Block";
    value: string;
}

interface SourceLocation {
    source?: string | null | undefined;
    start: Position;
    end: Position;
}

interface Position {
    /** >= 1 */
    line: number;
    /** >= 0 */
    column: number;
}

interface Program extends BaseNode {
    type: "Program";
    sourceType: "script" | "module";
    body: Array<Directive | Statement | ModuleDeclaration>;
    comments?: Comment[] | undefined;
}

interface Directive extends BaseNode {
    type: "ExpressionStatement";
    expression: Literal;
    directive: string;
}

interface BaseFunction extends BaseNode {
    params: Pattern[];
    generator?: boolean | undefined;
    async?: boolean | undefined;
    // The body is either BlockStatement or Expression because arrow functions
    // can have a body that's either. FunctionDeclarations and
    // FunctionExpressions have only BlockStatement bodies.
    body: BlockStatement | Expression;
}

type Function = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

type Statement =
    | ExpressionStatement
    | BlockStatement
    | StaticBlock
    | EmptyStatement
    | DebuggerStatement
    | WithStatement
    | ReturnStatement
    | LabeledStatement
    | BreakStatement
    | ContinueStatement
    | IfStatement
    | SwitchStatement
    | ThrowStatement
    | TryStatement
    | WhileStatement
    | DoWhileStatement
    | ForStatement
    | ForInStatement
    | ForOfStatement
    | Declaration;

interface BaseStatement extends BaseNode {}

interface EmptyStatement extends BaseStatement {
    type: "EmptyStatement";
}

interface BlockStatement extends BaseStatement {
    type: "BlockStatement";
    body: Statement[];
    innerComments?: Comment[] | undefined;
}

interface StaticBlock extends Omit<BlockStatement, "type"> {
    type: "StaticBlock";
}

interface ExpressionStatement extends BaseStatement {
    type: "ExpressionStatement";
    expression: Expression;
}

interface IfStatement extends BaseStatement {
    type: "IfStatement";
    test: Expression;
    consequent: Statement;
    alternate?: Statement | null | undefined;
}

interface LabeledStatement extends BaseStatement {
    type: "LabeledStatement";
    label: Identifier;
    body: Statement;
}

interface BreakStatement extends BaseStatement {
    type: "BreakStatement";
    label?: Identifier | null | undefined;
}

interface ContinueStatement extends BaseStatement {
    type: "ContinueStatement";
    label?: Identifier | null | undefined;
}

interface WithStatement extends BaseStatement {
    type: "WithStatement";
    object: Expression;
    body: Statement;
}

interface SwitchStatement extends BaseStatement {
    type: "SwitchStatement";
    discriminant: Expression;
    cases: SwitchCase[];
}

interface ReturnStatement extends BaseStatement {
    type: "ReturnStatement";
    argument?: Expression | null | undefined;
}

interface ThrowStatement extends BaseStatement {
    type: "ThrowStatement";
    argument: Expression;
}

interface TryStatement extends BaseStatement {
    type: "TryStatement";
    block: BlockStatement;
    handler?: CatchClause | null | undefined;
    finalizer?: BlockStatement | null | undefined;
}

interface WhileStatement extends BaseStatement {
    type: "WhileStatement";
    test: Expression;
    body: Statement;
}

interface DoWhileStatement extends BaseStatement {
    type: "DoWhileStatement";
    body: Statement;
    test: Expression;
}

interface ForStatement extends BaseStatement {
    type: "ForStatement";
    init?: VariableDeclaration | Expression | null | undefined;
    test?: Expression | null | undefined;
    update?: Expression | null | undefined;
    body: Statement;
}

interface BaseForXStatement extends BaseStatement {
    left: VariableDeclaration | Pattern;
    right: Expression;
    body: Statement;
}

interface ForInStatement extends BaseForXStatement {
    type: "ForInStatement";
}

interface DebuggerStatement extends BaseStatement {
    type: "DebuggerStatement";
}

type Declaration = FunctionDeclaration | VariableDeclaration | ClassDeclaration;

interface BaseDeclaration extends BaseStatement {}

interface MaybeNamedFunctionDeclaration extends BaseFunction, BaseDeclaration {
    type: "FunctionDeclaration";
    /** It is null when a function declaration is a part of the `export default function` statement */
    id: Identifier | null;
    body: BlockStatement;
}

interface FunctionDeclaration extends MaybeNamedFunctionDeclaration {
    id: Identifier;
}

interface VariableDeclaration extends BaseDeclaration {
    type: "VariableDeclaration";
    declarations: VariableDeclarator[];
    kind: "var" | "let" | "const" | "using" | "await using";
}

interface VariableDeclarator extends BaseNode {
    type: "VariableDeclarator";
    id: Pattern;
    init?: Expression | null | undefined;
}

interface ExpressionMap {
    ArrayExpression: ArrayExpression;
    ArrowFunctionExpression: ArrowFunctionExpression;
    AssignmentExpression: AssignmentExpression;
    AwaitExpression: AwaitExpression;
    BinaryExpression: BinaryExpression;
    CallExpression: CallExpression;
    ChainExpression: ChainExpression;
    ClassExpression: ClassExpression;
    ConditionalExpression: ConditionalExpression;
    FunctionExpression: FunctionExpression;
    Identifier: Identifier;
    ImportExpression: ImportExpression;
    Literal: Literal;
    LogicalExpression: LogicalExpression;
    MemberExpression: MemberExpression;
    MetaProperty: MetaProperty;
    NewExpression: NewExpression;
    ObjectExpression: ObjectExpression;
    SequenceExpression: SequenceExpression;
    TaggedTemplateExpression: TaggedTemplateExpression;
    TemplateLiteral: TemplateLiteral;
    ThisExpression: ThisExpression;
    UnaryExpression: UnaryExpression;
    UpdateExpression: UpdateExpression;
    YieldExpression: YieldExpression;
}

type Expression = ExpressionMap[keyof ExpressionMap];

interface BaseExpression extends BaseNode {}

type ChainElement = SimpleCallExpression | MemberExpression;

interface ChainExpression extends BaseExpression {
    type: "ChainExpression";
    expression: ChainElement;
}

interface ThisExpression extends BaseExpression {
    type: "ThisExpression";
}

interface ArrayExpression extends BaseExpression {
    type: "ArrayExpression";
    elements: Array<Expression | SpreadElement | null>;
}

interface ObjectExpression extends BaseExpression {
    type: "ObjectExpression";
    properties: Array<Property | SpreadElement>;
}

interface PrivateIdentifier extends BaseNode {
    type: "PrivateIdentifier";
    name: string;
}

interface Property extends BaseNode {
    type: "Property";
    key: Expression | PrivateIdentifier;
    value: Expression | Pattern; // Could be an AssignmentProperty
    kind: "init" | "get" | "set";
    method: boolean;
    shorthand: boolean;
    computed: boolean;
}

interface PropertyDefinition extends BaseNode {
    type: "PropertyDefinition";
    key: Expression | PrivateIdentifier;
    value?: Expression | null | undefined;
    computed: boolean;
    static: boolean;
}

interface FunctionExpression extends BaseFunction, BaseExpression {
    id?: Identifier | null | undefined;
    type: "FunctionExpression";
    body: BlockStatement;
}

interface SequenceExpression extends BaseExpression {
    type: "SequenceExpression";
    expressions: Expression[];
}

interface UnaryExpression extends BaseExpression {
    type: "UnaryExpression";
    operator: UnaryOperator;
    prefix: true;
    argument: Expression;
}

interface BinaryExpression extends BaseExpression {
    type: "BinaryExpression";
    operator: BinaryOperator;
    left: Expression | PrivateIdentifier;
    right: Expression;
}

interface AssignmentExpression extends BaseExpression {
    type: "AssignmentExpression";
    operator: AssignmentOperator;
    left: Pattern | MemberExpression;
    right: Expression;
}

interface UpdateExpression extends BaseExpression {
    type: "UpdateExpression";
    operator: UpdateOperator;
    argument: Expression;
    prefix: boolean;
}

interface LogicalExpression extends BaseExpression {
    type: "LogicalExpression";
    operator: LogicalOperator;
    left: Expression;
    right: Expression;
}

interface ConditionalExpression extends BaseExpression {
    type: "ConditionalExpression";
    test: Expression;
    alternate: Expression;
    consequent: Expression;
}

interface BaseCallExpression extends BaseExpression {
    callee: Expression | Super;
    arguments: Array<Expression | SpreadElement>;
}
type CallExpression = SimpleCallExpression | NewExpression;

interface SimpleCallExpression extends BaseCallExpression {
    type: "CallExpression";
    optional: boolean;
}

interface NewExpression extends BaseCallExpression {
    type: "NewExpression";
}

interface MemberExpression extends BaseExpression, BasePattern {
    type: "MemberExpression";
    object: Expression | Super;
    property: Expression | PrivateIdentifier;
    computed: boolean;
    optional: boolean;
}

type Pattern = Identifier | ObjectPattern | ArrayPattern | RestElement | AssignmentPattern | MemberExpression;

interface BasePattern extends BaseNode {}

interface SwitchCase extends BaseNode {
    type: "SwitchCase";
    test?: Expression | null | undefined;
    consequent: Statement[];
}

interface CatchClause extends BaseNode {
    type: "CatchClause";
    param: Pattern | null;
    body: BlockStatement;
}

interface Identifier extends BaseNode, BaseExpression, BasePattern {
    type: "Identifier";
    name: string;
}

type Literal = SimpleLiteral | RegExpLiteral | BigIntLiteral;

interface SimpleLiteral extends BaseNode, BaseExpression {
    type: "Literal";
    value: string | boolean | number | null;
    raw?: string | undefined;
}

interface RegExpLiteral extends BaseNode, BaseExpression {
    type: "Literal";
    value?: RegExp | null | undefined;
    regex: {
        pattern: string;
        flags: string;
    };
    raw?: string | undefined;
}

interface BigIntLiteral extends BaseNode, BaseExpression {
    type: "Literal";
    value?: bigint | null | undefined;
    bigint: string;
    raw?: string | undefined;
}

type UnaryOperator = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

type BinaryOperator =
    | "=="
    | "!="
    | "==="
    | "!=="
    | "<"
    | "<="
    | ">"
    | ">="
    | "<<"
    | ">>"
    | ">>>"
    | "+"
    | "-"
    | "*"
    | "/"
    | "%"
    | "**"
    | "|"
    | "^"
    | "&"
    | "in"
    | "instanceof";

type LogicalOperator = "||" | "&&" | "??";

type AssignmentOperator =
    | "="
    | "+="
    | "-="
    | "*="
    | "/="
    | "%="
    | "**="
    | "<<="
    | ">>="
    | ">>>="
    | "|="
    | "^="
    | "&="
    | "||="
    | "&&="
    | "??=";

type UpdateOperator = "++" | "--";

interface ForOfStatement extends BaseForXStatement {
    type: "ForOfStatement";
    await: boolean;
}

interface Super extends BaseNode {
    type: "Super";
}

interface SpreadElement extends BaseNode {
    type: "SpreadElement";
    argument: Expression;
}

interface ArrowFunctionExpression extends BaseExpression, BaseFunction {
    type: "ArrowFunctionExpression";
    expression: boolean;
    body: BlockStatement | Expression;
}

interface YieldExpression extends BaseExpression {
    type: "YieldExpression";
    argument?: Expression | null | undefined;
    delegate: boolean;
}

interface TemplateLiteral extends BaseExpression {
    type: "TemplateLiteral";
    quasis: TemplateElement[];
    expressions: Expression[];
}

interface TaggedTemplateExpression extends BaseExpression {
    type: "TaggedTemplateExpression";
    tag: Expression;
    quasi: TemplateLiteral;
}

interface TemplateElement extends BaseNode {
    type: "TemplateElement";
    tail: boolean;
    value: {
        /** It is null when the template literal is tagged and the text has an invalid escape (e.g. - tag`\unicode and \u{55}`) */
        cooked?: string | null | undefined;
        raw: string;
    };
}

interface AssignmentProperty extends Property {
    value: Pattern;
    kind: "init";
    method: boolean; // false
}

interface ObjectPattern extends BasePattern {
    type: "ObjectPattern";
    properties: Array<AssignmentProperty | RestElement>;
}

interface ArrayPattern extends BasePattern {
    type: "ArrayPattern";
    elements: Array<Pattern | null>;
}

interface RestElement extends BasePattern {
    type: "RestElement";
    argument: Pattern;
}

interface AssignmentPattern extends BasePattern {
    type: "AssignmentPattern";
    left: Pattern;
    right: Expression;
}

type Class = ClassDeclaration | ClassExpression;
interface BaseClass extends BaseNode {
    superClass?: Expression | null | undefined;
    body: ClassBody;
}

interface ClassBody extends BaseNode {
    type: "ClassBody";
    body: Array<MethodDefinition | PropertyDefinition | StaticBlock>;
}

interface MethodDefinition extends BaseNode {
    type: "MethodDefinition";
    key: Expression | PrivateIdentifier;
    value: FunctionExpression;
    kind: "constructor" | "method" | "get" | "set";
    computed: boolean;
    static: boolean;
}

interface MaybeNamedClassDeclaration extends BaseClass, BaseDeclaration {
    type: "ClassDeclaration";
    /** It is null when a class declaration is a part of the `export default class` statement */
    id: Identifier | null;
}

interface ClassDeclaration extends MaybeNamedClassDeclaration {
    id: Identifier;
}

interface ClassExpression extends BaseClass, BaseExpression {
    type: "ClassExpression";
    id?: Identifier | null | undefined;
}

interface MetaProperty extends BaseExpression {
    type: "MetaProperty";
    meta: Identifier;
    property: Identifier;
}

type ModuleDeclaration =
    | ImportDeclaration
    | ExportNamedDeclaration
    | ExportDefaultDeclaration
    | ExportAllDeclaration;
interface BaseModuleDeclaration extends BaseNode {}

type ModuleSpecifier = ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier | ExportSpecifier;
interface BaseModuleSpecifier extends BaseNode {
    local: Identifier;
}

interface ImportDeclaration extends BaseModuleDeclaration {
    type: "ImportDeclaration";
    specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>;
    attributes: ImportAttribute[];
    source: Literal;
}

interface ImportSpecifier extends BaseModuleSpecifier {
    type: "ImportSpecifier";
    imported: Identifier | Literal;
}

interface ImportAttribute extends BaseNode {
    type: "ImportAttribute";
    key: Identifier | Literal;
    value: Literal;
}

interface ImportExpression extends BaseExpression {
    type: "ImportExpression";
    source: Expression;
    options?: Expression | null | undefined;
}

interface ImportDefaultSpecifier extends BaseModuleSpecifier {
    type: "ImportDefaultSpecifier";
}

interface ImportNamespaceSpecifier extends BaseModuleSpecifier {
    type: "ImportNamespaceSpecifier";
}

interface ExportNamedDeclaration extends BaseModuleDeclaration {
    type: "ExportNamedDeclaration";
    declaration?: Declaration | null | undefined;
    specifiers: ExportSpecifier[];
    attributes: ImportAttribute[];
    source?: Literal | null | undefined;
}

interface ExportSpecifier extends Omit<BaseModuleSpecifier, "local"> {
    type: "ExportSpecifier";
    local: Identifier | Literal;
    exported: Identifier | Literal;
}

interface ExportDefaultDeclaration extends BaseModuleDeclaration {
    type: "ExportDefaultDeclaration";
    declaration: MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | Expression;
}

interface ExportAllDeclaration extends BaseModuleDeclaration {
    type: "ExportAllDeclaration";
    exported: Identifier | Literal | null;
    attributes: ImportAttribute[];
    source: Literal;
}

interface AwaitExpression extends BaseExpression {
    type: "AwaitExpression";
    argument: Expression;
}

interface SourceMapOptions {
	/**
	 * Whether the mapping should be high-resolution.
	 * Hi-res mappings map every single character, meaning (for example) your devtools will always
	 * be able to pinpoint the exact location of function calls and so on.
	 * With lo-res mappings, devtools may only be able to identify the correct
	 * line - but they're quicker to generate and less bulky.
	 * You can also set `"boundary"` to generate a semi-hi-res mappings segmented per word boundary
	 * instead of per character, suitable for string semantics that are separated by words.
	 * If sourcemap locations have been specified with s.addSourceMapLocation(), they will be used here.
	 */
	hires?: boolean | 'boundary';
	/**
	 * The filename where you plan to write the sourcemap.
	 */
	file?: string;
	/**
	 * The filename of the file containing the original source.
	 */
	source?: string;
	/**
	 * Whether to include the original content in the map's sourcesContent array.
	 */
	includeContent?: boolean;
}

type SourceMapSegment =
	| [number]
	| [number, number, number, number]
	| [number, number, number, number, number];

interface DecodedSourceMap {
	file: string;
	sources: string[];
	sourcesContent?: string[];
	names: string[];
	mappings: SourceMapSegment[][];
	x_google_ignoreList?: number[];
}

declare class SourceMap {
	constructor(properties: DecodedSourceMap);

	version: number;
	file: string;
	sources: string[];
	sourcesContent?: string[];
	names: string[];
	mappings: string;
	x_google_ignoreList?: number[];
	debugId?: string;

	/**
	 * Returns the equivalent of `JSON.stringify(map)`
	 */
	toString(): string;
	/**
	 * Returns a DataURI containing the sourcemap. Useful for doing this sort of thing:
	 * `generateMap(options?: SourceMapOptions): SourceMap;`
	 */
	toUrl(): string;
}

type ExclusionRange = [number, number];

interface MagicStringOptions {
	filename?: string;
	indentExclusionRanges?: ExclusionRange | Array<ExclusionRange>;
	offset?: number;
}

interface IndentOptions {
	exclude?: ExclusionRange | Array<ExclusionRange>;
	indentStart?: boolean;
}

interface OverwriteOptions {
	storeName?: boolean;
	contentOnly?: boolean;
}

interface UpdateOptions {
	storeName?: boolean;
	overwrite?: boolean;
}

declare class MagicString {
	constructor(str: string, options?: MagicStringOptions);
	/**
	 * Adds the specified character index (with respect to the original string) to sourcemap mappings, if `hires` is false.
	 */
	addSourcemapLocation(char: number): void;
	/**
	 * Appends the specified content to the end of the string.
	 */
	append(content: string): this;
	/**
	 * Appends the specified content at the index in the original string.
	 * If a range *ending* with index is subsequently moved, the insert will be moved with it.
	 * See also `s.prependLeft(...)`.
	 */
	appendLeft(index: number, content: string): this;
	/**
	 * Appends the specified content at the index in the original string.
	 * If a range *starting* with index is subsequently moved, the insert will be moved with it.
	 * See also `s.prependRight(...)`.
	 */
	appendRight(index: number, content: string): this;
	/**
	 * Does what you'd expect.
	 */
	clone(): this;
	/**
	 * Generates a version 3 sourcemap.
	 */
	generateMap(options?: SourceMapOptions): SourceMap;
	/**
	 * Generates a sourcemap object with raw mappings in array form, rather than encoded as a string.
	 * Useful if you need to manipulate the sourcemap further, but most of the time you will use `generateMap` instead.
	 */
	generateDecodedMap(options?: SourceMapOptions): DecodedSourceMap;
	getIndentString(): string;

	/**
	 * Prefixes each line of the string with prefix.
	 * If prefix is not supplied, the indentation will be guessed from the original content, falling back to a single tab character.
	 */
	indent(options?: IndentOptions): this;
	/**
	 * Prefixes each line of the string with prefix.
	 * If prefix is not supplied, the indentation will be guessed from the original content, falling back to a single tab character.
	 *
	 * The options argument can have an exclude property, which is an array of [start, end] character ranges.
	 * These ranges will be excluded from the indentation - useful for (e.g.) multiline strings.
	 */
	indent(indentStr?: string, options?: IndentOptions): this;
	indentExclusionRanges: ExclusionRange | Array<ExclusionRange>;

	/**
	 * Moves the characters from `start` and `end` to `index`.
	 */
	move(start: number, end: number, index: number): this;
	/**
	 * Replaces the characters from `start` to `end` with `content`, along with the appended/prepended content in
	 * that range. The same restrictions as `s.remove()` apply.
	 *
	 * The fourth argument is optional. It can have a storeName property — if true, the original name will be stored
	 * for later inclusion in a sourcemap's names array — and a contentOnly property which determines whether only
	 * the content is overwritten, or anything that was appended/prepended to the range as well.
	 *
	 * It may be preferred to use `s.update(...)` instead if you wish to avoid overwriting the appended/prepended content.
	 */
	overwrite(
		start: number,
		end: number,
		content: string,
		options?: boolean | OverwriteOptions,
	): this;
	/**
	 * Replaces the characters from `start` to `end` with `content`. The same restrictions as `s.remove()` apply.
	 *
	 * The fourth argument is optional. It can have a storeName property — if true, the original name will be stored
	 * for later inclusion in a sourcemap's names array — and an overwrite property which determines whether only
	 * the content is overwritten, or anything that was appended/prepended to the range as well.
	 */
	update(start: number, end: number, content: string, options?: boolean | UpdateOptions): this;
	/**
	 * Prepends the string with the specified content.
	 */
	prepend(content: string): this;
	/**
	 * Same as `s.appendLeft(...)`, except that the inserted content will go *before* any previous appends or prepends at index
	 */
	prependLeft(index: number, content: string): this;
	/**
	 * Same as `s.appendRight(...)`, except that the inserted content will go *before* any previous appends or prepends at `index`
	 */
	prependRight(index: number, content: string): this;
	/**
	 * Removes the characters from `start` to `end` (of the original string, **not** the generated string).
	 * Removing the same content twice, or making removals that partially overlap, will cause an error.
	 */
	remove(start: number, end: number): this;
	/**
	 * Reset the modified characters from `start` to `end` (of the original string, **not** the generated string).
	 */
	reset(start: number, end: number): this;
	/**
	 * Returns the content of the generated string that corresponds to the slice between `start` and `end` of the original string.
	 * Throws error if the indices are for characters that were already removed.
	 */
	slice(start: number, end: number): string;
	/**
	 * Returns a clone of `s`, with all content before the `start` and `end` characters of the original string removed.
	 */
	snip(start: number, end: number): this;
	/**
	 * Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the start and end.
	 */
	trim(charType?: string): this;
	/**
	 * Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the start.
	 */
	trimStart(charType?: string): this;
	/**
	 * Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the end.
	 */
	trimEnd(charType?: string): this;
	/**
	 * Removes empty lines from the start and end.
	 */
	trimLines(): this;
	/**
	 * String replacement with RegExp or string.
	 */
	replace(
		regex: RegExp | string,
		replacement: string | ((substring: string, ...args: any[]) => string),
	): this;
	/**
	 * Same as `s.replace`, but replace all matched strings instead of just one.
	 */
	replaceAll(
		regex: RegExp | string,
		replacement: string | ((substring: string, ...args: any[]) => string),
	): this;

	lastChar(): string;
	lastLine(): string;
	/**
	 * Returns true if the resulting source is empty (disregarding white space).
	 */
	isEmpty(): boolean;
	length(): number;

	/**
	 * Indicates if the string has been changed.
	 */
	hasChanged(): boolean;

	original: string;
	/**
	 * Returns the generated string.
	 */
	toString(): string;

	offset: number;
}

type ParseFn = (code: string) => Program;
declare const __STORYBOOK_GLOBAL_THIS_ACCESSOR__ = "__vitest_mocker__";
declare function getAutomockCode(originalCode: string, isSpy: boolean, parse: ParseFn): MagicString;
/**
 * Copyright (c) Vitest
 * https://github.com/vitest-dev/vitest/blob/v3.2.4/packages/mocker/src/node/automockPlugin.ts#L36C17-L36C31
 * MIT License
 *
 * Copyright (c) 2021-Present Vitest Team
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
declare function automockModule(code: string, mockType: 'automock' | 'autospy', parse: (code: string) => any, options?: any): MagicString;

interface GeneratorResult {
    code: string;
    map: {
        version: number;
        sources: string[];
        names: string[];
        sourceRoot?: string | undefined;
        sourcesContent?: string[] | undefined;
        mappings: string;
        file: string;
    } | null;
}

declare function isModuleDirectory(path: string): boolean;
type MockCall = {
    path: string;
    absolutePath: string;
    redirectPath: string | null;
    spy: boolean;
};
interface ExtractMockCallsOptions {
    /** The absolute path to the preview.tsx file where mocks are defined. */
    previewConfigPath: string;
    /** The absolute path to the Storybook config directory. */
    coreOptions?: CoreConfig;
    /** Configuration directory */
    configDir: string;
}
/**
 * A wrapper around the babel parser that enables the necessary plugins to handle modern JavaScript
 * features, including TSX.
 *
 * @param code - The code to parse.
 * @returns The parsed code.
 */
declare const babelParser: (code: string) => types.Program;
/** Utility to rewrite sb.mock(import('...'), ...) to sb.mock('...', ...) */
declare function rewriteSbMockImportCalls(code: string): GeneratorResult;
/**
 * Extracts all sb.mock() calls from the preview config file.
 *
 * @param this PluginContext
 */
declare function extractMockCalls(options: ExtractMockCallsOptions, parse: (input: string, options?: {
    allowReturnOutsideFunction?: boolean;
    jsx?: boolean;
}) => types.Node, root: string, findMockRedirect: (root: string, absolutePath: string, externalPath: string | null) => string | null): MockCall[];

/**
 * Resolves an external module path to its absolute path. It considers the "exports" map in the
 * package.json file.
 *
 * @param path The raw module path from the `sb.mock()` call.
 * @param root The project's root directory.
 * @returns The absolute path to the module.
 */
declare function resolveExternalModule(path: string, root: string): string;
declare function getIsExternal(path: string, importer: string): boolean;
/**
 * Resolves a mock path to its absolute path and checks for a `__mocks__` redirect. This function
 * uses `resolve.exports` to correctly handle modern ESM packages.
 *
 * @param path The raw module path from the `sb.mock()` call.
 * @param root The project's root directory.
 * @param importer The absolute path of the file containing the mock call (the preview file).
 */
declare function resolveMock(path: string, root: string, importer: string, findMockRedirect: (root: string, absolutePath: string, externalPath: string | null) => string | null): {
    absolutePath: string;
    redirectPath: string | null;
};
/**
 * External mean not absolute, and not relative
 *
 * We use `require.resolve` here, because import.meta.resolve needs a experimental node flag
 * (`--experimental-import-meta-resolve`) to be enabled to respect the context option.
 *
 * @param path - The path to the mock file
 * @param from - The root of the project, this should be an absolute path
 * @returns True if the mock path is external, false otherwise
 * @link https://nodejs.org/api/cli.html#--experimental-import-meta-resolve
 */
declare function isExternal(path: string, from: string): boolean;
/**
 * Normalizes a file path for comparison, resolving symlinks if possible. Falls back to the original
 * path if resolution fails.
 */
declare function getRealPath(path: string, preserveSymlinks: boolean): string;
/**
 * This is a wrapper around `require.resolve` that tries to resolve the path with different file
 * extensions.
 *
 * @param path - The path to the mock file
 * @param from - The root of the project, this should be an absolute path
 * @returns The resolved path
 */
declare function resolveWithExtensions(path: string, from: string): string;

/**
 * Copyright (c) Vitest
 * https://github.com/vitest-dev/vitest/blob/v3.2.4/packages/mocker/src/node/esmWalker.ts MIT
 * License
 *
 * Copyright (c) 2021-Present Vitest Team
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

type Positioned<T> = T & {
    start: number;
    end: number;
};
type Node = Positioned<Node$1>;
interface IdentifierInfo {
    /** If the identifier is used in a property shorthand { foo } -> { foo: **import_x**.foo } */
    hasBindingShortcut: boolean;
    /** The identifier is used in a class declaration */
    classDeclaration: boolean;
    /** The identifier is a name for a class expression */
    classExpression: boolean;
}
interface Visitors {
    onIdentifier?: (node: Positioned<Identifier>, info: IdentifierInfo, parentStack: Node[]) => void;
    onImportMeta?: (node: Node) => void;
    onDynamicImport?: (node: Positioned<ImportExpression>) => void;
    onCallExpression?: (node: Positioned<CallExpression>) => void;
}
declare function setIsNodeInPattern(node: Property): WeakSet<Node$1>;
declare function isNodeInPattern(node: Node$1): node is Property;
/** Same logic from @vue/compiler-core & @vue/compiler-sfc Except this is using acorn AST */
declare function esmWalker(root: Node, { onIdentifier, onImportMeta, onDynamicImport, onCallExpression }: Visitors): void;
declare function isStaticProperty(node: Node$1): node is Property;
declare function isStaticPropertyKey(node: Node$1, parent: Node$1): boolean;
declare function isFunctionNode(node: Node$1): node is Function;
declare function isInDestructuringAssignment(parent: Node$1, parentStack: Node$1[]): boolean;
declare function getArbitraryModuleIdentifier(node: Identifier | Literal): string;

declare function getMockerRuntime(): string;

export { type ArrayExpression, type ArrayPattern, type ArrowFunctionExpression, type AssignmentExpression, type AssignmentOperator, type AssignmentPattern, type AssignmentProperty, type AwaitExpression, type BaseCallExpression, type BaseClass, type BaseDeclaration, type BaseExpression, type BaseForXStatement, type BaseFunction, type BaseModuleDeclaration, type BaseModuleSpecifier, type BaseNode, type BaseNodeWithoutComments, type BasePattern, type BaseStatement, type BigIntLiteral, type BinaryExpression, type BinaryOperator, type BlockStatement, type BreakStatement, type CallExpression, type CatchClause, type ChainElement, type ChainExpression, type Class, type ClassBody, type ClassDeclaration, type ClassExpression, type Comment, type ConditionalExpression, type ContinueStatement, type DebuggerStatement, type Declaration, type Directive, type DoWhileStatement, type EmptyStatement, type ExportAllDeclaration, type ExportDefaultDeclaration, type ExportNamedDeclaration, type ExportSpecifier, type Expression, type ExpressionMap, type ExpressionStatement, type ForInStatement, type ForOfStatement, type ForStatement, type Function, type FunctionDeclaration, type FunctionExpression, type Identifier, type IfStatement, type ImportAttribute, type ImportDeclaration, type ImportDefaultSpecifier, type ImportExpression, type ImportNamespaceSpecifier, type ImportSpecifier, type LabeledStatement, type Literal, type LogicalExpression, type LogicalOperator, type MaybeNamedClassDeclaration, type MaybeNamedFunctionDeclaration, type MemberExpression, type MetaProperty, type MethodDefinition, type MockCall, type ModuleDeclaration, type ModuleSpecifier, type NewExpression, type Node, type NodeMap, type ObjectExpression, type ObjectPattern, type Pattern, type Position, type Positioned, type PrivateIdentifier, type Program, type Property, type PropertyDefinition, type RegExpLiteral, type RestElement, type ReturnStatement, type SequenceExpression, type SimpleCallExpression, type SimpleLiteral, type SourceLocation, type SpreadElement, type Statement, type StaticBlock, type Super, type SwitchCase, type SwitchStatement, type TaggedTemplateExpression, type TemplateElement, type TemplateLiteral, type ThisExpression, type ThrowStatement, type TryStatement, type UnaryExpression, type UnaryOperator, type UpdateExpression, type UpdateOperator, type VariableDeclaration, type VariableDeclarator, type WhileStatement, type WithStatement, type YieldExpression, __STORYBOOK_GLOBAL_THIS_ACCESSOR__, automockModule, babelParser, esmWalker, extractMockCalls, getArbitraryModuleIdentifier, getAutomockCode, getIsExternal, getMockerRuntime, getRealPath, isExternal, isFunctionNode, isInDestructuringAssignment, isModuleDirectory, isNodeInPattern, isStaticProperty, isStaticPropertyKey, resolveExternalModule, resolveMock, resolveWithExtensions, rewriteSbMockImportCalls, setIsNodeInPattern };
