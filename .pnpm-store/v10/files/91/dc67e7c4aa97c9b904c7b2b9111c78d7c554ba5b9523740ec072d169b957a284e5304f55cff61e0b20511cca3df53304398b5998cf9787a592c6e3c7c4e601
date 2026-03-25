// Type definitions for ESTree AST specification
// Project: https://github.com/estree/estree
// Definitions by: RReverser <https://github.com/RReverser>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

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
// types, a base type which passes down inhereted fields, and a type union of
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
  loc?: SourceLocation | null;
  range?: [number, number];
}

interface BaseNode extends BaseNodeWithoutComments {
  leadingComments?: Array<Comment>;
  trailingComments?: Array<Comment>;
}

export type Node =
    Identifier | Literal | Program | Function | SwitchCase | CatchClause |
    VariableDeclarator | Statement | Expression | Property |
    AssignmentProperty | Super | TemplateElement | SpreadElement | Pattern |
    ClassBody | Class | MethodDefinition | ModuleDeclaration | ModuleSpecifier;

export interface Comment extends BaseNodeWithoutComments {
  type: "Line" | "Block";
  value: string;
}

interface SourceLocation {
  source?: string | null;
  start: Position;
  end: Position;
}

export interface Position {
  /** >= 1 */
  line: number;
  /** >= 0 */
  column: number;
}

export interface Program extends BaseNode {
  type: "Program";
  sourceType: "script" | "module";
  body: Array<Statement | ModuleDeclaration>;
  comments?: Array<Comment>;
}

interface BaseFunction extends BaseNode {
  params: Array<Pattern>;
  generator?: boolean;
  async?: boolean;
  // The body is either BlockStatement or Expression because arrow functions
  // can have a body that's either. FunctionDeclarations and
  // FunctionExpressions have only BlockStatement bodies.
  body: BlockStatement | Expression;
}

export type Function =
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

export type Statement =
    ExpressionStatement | BlockStatement | EmptyStatement |
    DebuggerStatement | WithStatement | ReturnStatement | LabeledStatement |
    BreakStatement | ContinueStatement | IfStatement | SwitchStatement |
    ThrowStatement | TryStatement | WhileStatement | DoWhileStatement |
    ForStatement | ForInStatement | ForOfStatement | Declaration;

interface BaseStatement extends BaseNode { }

export interface EmptyStatement extends BaseStatement {
  type: "EmptyStatement";
}

export interface BlockStatement extends BaseStatement {
  type: "BlockStatement";
  body: Array<Statement>;
  innerComments?: Array<Comment>;
}

export interface ExpressionStatement extends BaseStatement {
  type: "ExpressionStatement";
  expression: Expression;
}

export interface IfStatement extends BaseStatement {
  type: "IfStatement";
  test: Expression;
  consequent: Statement;
  alternate?: Statement | null;
}

export interface LabeledStatement extends BaseStatement {
  type: "LabeledStatement";
  label: Identifier;
  body: Statement;
}

export interface BreakStatement extends BaseStatement {
  type: "BreakStatement";
  label?: Identifier | null;
}

export interface ContinueStatement extends BaseStatement {
  type: "ContinueStatement";
  label?: Identifier | null;
}

export interface WithStatement extends BaseStatement {
  type: "WithStatement";
  object: Expression;
  body: Statement;
}

export interface SwitchStatement extends BaseStatement {
  type: "SwitchStatement";
  discriminant: Expression;
  cases: Array<SwitchCase>;
}

export interface ReturnStatement extends BaseStatement {
  type: "ReturnStatement";
  argument?: Expression | null;
}

export interface ThrowStatement extends BaseStatement {
  type: "ThrowStatement";
  argument: Expression;
}

export interface TryStatement extends BaseStatement {
  type: "TryStatement";
  block: BlockStatement;
  handler?: CatchClause | null;
  finalizer?: BlockStatement | null;
}

export interface WhileStatement extends BaseStatement {
  type: "WhileStatement";
  test: Expression;
  body: Statement;
}

export interface DoWhileStatement extends BaseStatement {
  type: "DoWhileStatement";
  body: Statement;
  test: Expression;
}

export interface ForStatement extends BaseStatement {
  type: "ForStatement";
  init?: VariableDeclaration | Expression | null;
  test?: Expression | null;
  update?: Expression | null;
  body: Statement;
}

interface BaseForXStatement extends BaseStatement {
  left: VariableDeclaration | Pattern;
  right: Expression;
  body: Statement;
}

export interface ForInStatement extends BaseForXStatement {
  type: "ForInStatement";
}

export interface DebuggerStatement extends BaseStatement {
  type: "DebuggerStatement";
}

export type Declaration =
      FunctionDeclaration | VariableDeclaration | ClassDeclaration;

interface BaseDeclaration extends BaseStatement { }

export interface FunctionDeclaration extends BaseFunction, BaseDeclaration {
  type: "FunctionDeclaration";
  /** It is null when a function declaration is a part of the `export default function` statement */
  id: Identifier | null;
  body: BlockStatement;
}

export interface VariableDeclaration extends BaseDeclaration {
  type: "VariableDeclaration";
  declarations: Array<VariableDeclarator>;
  kind: "var" | "let" | "const";
}

export interface VariableDeclarator extends BaseNode {
  type: "VariableDeclarator";
  id: Pattern;
  init?: Expression | null;
}

type Expression =
    ThisExpression | ArrayExpression | ObjectExpression | FunctionExpression |
    ArrowFunctionExpression | YieldExpression | Literal | UnaryExpression |
    UpdateExpression | BinaryExpression | AssignmentExpression |
    LogicalExpression | MemberExpression | ConditionalExpression |
    CallExpression | NewExpression | SequenceExpression | TemplateLiteral |
    TaggedTemplateExpression | ClassExpression | MetaProperty | Identifier |
    AwaitExpression;

export interface BaseExpression extends BaseNode { }

export interface ThisExpression extends BaseExpression {
  type: "ThisExpression";
}

export interface ArrayExpression extends BaseExpression {
  type: "ArrayExpression";
  elements: Array<Expression | SpreadElement>;
}

export interface ObjectExpression extends BaseExpression {
  type: "ObjectExpression";
  properties: Array<Property>;
}

export interface Property extends BaseNode {
  type: "Property";
  key: Expression;
  value: Expression | Pattern; // Could be an AssignmentProperty
  kind: "init" | "get" | "set";
  method: boolean;
  shorthand: boolean;
  computed: boolean;
}

export interface FunctionExpression extends BaseFunction, BaseExpression {
  id?: Identifier | null;
  type: "FunctionExpression";
  body: BlockStatement;
}

export interface SequenceExpression extends BaseExpression {
  type: "SequenceExpression";
  expressions: Array<Expression>;
}

export interface UnaryExpression extends BaseExpression {
  type: "UnaryExpression";
  operator: UnaryOperator;
  prefix: true;
  argument: Expression;
}

export interface BinaryExpression extends BaseExpression {
  type: "BinaryExpression";
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface AssignmentExpression extends BaseExpression {
  type: "AssignmentExpression";
  operator: AssignmentOperator;
  left: Pattern | MemberExpression;
  right: Expression;
}

export interface UpdateExpression extends BaseExpression {
  type: "UpdateExpression";
  operator: UpdateOperator;
  argument: Expression;
  prefix: boolean;
}

export interface LogicalExpression extends BaseExpression {
  type: "LogicalExpression";
  operator: LogicalOperator;
  left: Expression;
  right: Expression;
}

export interface ConditionalExpression extends BaseExpression {
  type: "ConditionalExpression";
  test: Expression;
  alternate: Expression;
  consequent: Expression;
}

interface BaseCallExpression extends BaseExpression {
  callee: Expression | Super;
  arguments: Array<Expression | SpreadElement>;
}
export type CallExpression = SimpleCallExpression | NewExpression;

export interface SimpleCallExpression extends BaseCallExpression {
  type: "CallExpression";
}

export interface NewExpression extends BaseCallExpression {
  type: "NewExpression";
}

export interface MemberExpression extends BaseExpression, BasePattern {
  type: "MemberExpression";
  object: Expression | Super;
  property: Expression;
  computed: boolean;
}

export type Pattern =
    Identifier | ObjectPattern | ArrayPattern | RestElement |
    AssignmentPattern | MemberExpression;

interface BasePattern extends BaseNode { }

export interface SwitchCase extends BaseNode {
  type: "SwitchCase";
  test?: Expression | null;
  consequent: Array<Statement>;
}

export interface CatchClause extends BaseNode {
  type: "CatchClause";
  param: Pattern;
  body: BlockStatement;
}

export interface Identifier extends BaseNode, BaseExpression, BasePattern {
  type: "Identifier";
  name: string;
}

export type Literal = SimpleLiteral | RegExpLiteral;

export interface SimpleLiteral extends BaseNode, BaseExpression {
  type: "Literal";
  value: string | boolean | number | null;
  raw?: string;
}

export interface RegExpLiteral extends BaseNode, BaseExpression {
  type: "Literal";
  value?: RegExp | null;
  regex: {
    pattern: string;
    flags: string;
  };
  raw?: string;
}

export type UnaryOperator =
    "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

export type BinaryOperator =
    "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" |
    ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "**" | "|" | "^" | "&" | "in" |
    "instanceof";

export type LogicalOperator = "||" | "&&";

export type AssignmentOperator =
    "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "**=" | "<<=" | ">>=" | ">>>=" |
    "|=" | "^=" | "&=";

export type UpdateOperator = "++" | "--";

export interface ForOfStatement extends BaseForXStatement {
  type: "ForOfStatement";
}

export interface Super extends BaseNode {
  type: "Super";
}

export interface SpreadElement extends BaseNode {
  type: "SpreadElement";
  argument: Expression;
}

export interface ArrowFunctionExpression extends BaseExpression, BaseFunction {
  type: "ArrowFunctionExpression";
  expression: boolean;
  body: BlockStatement | Expression;
}

export interface YieldExpression extends BaseExpression {
  type: "YieldExpression";
  argument?: Expression | null;
  delegate: boolean;
}

export interface TemplateLiteral extends BaseExpression {
  type: "TemplateLiteral";
  quasis: Array<TemplateElement>;
  expressions: Array<Expression>;
}

export interface TaggedTemplateExpression extends BaseExpression {
  type: "TaggedTemplateExpression";
  tag: Expression;
  quasi: TemplateLiteral;
}

export interface TemplateElement extends BaseNode {
  type: "TemplateElement";
  tail: boolean;
  value: {
    cooked: string;
    raw: string;
  };
}

export interface AssignmentProperty extends Property {
  value: Pattern;
  kind: "init";
  method: boolean; // false
}

export interface ObjectPattern extends BasePattern {
  type: "ObjectPattern";
  properties: Array<AssignmentProperty>;
}

export interface ArrayPattern extends BasePattern {
  type: "ArrayPattern";
  elements: Array<Pattern>;
}

export interface RestElement extends BasePattern {
  type: "RestElement";
  argument: Pattern;
}

export interface AssignmentPattern extends BasePattern {
  type: "AssignmentPattern";
  left: Pattern;
  right: Expression;
}

export type Class = ClassDeclaration | ClassExpression;
interface BaseClass extends BaseNode {
  superClass?: Expression | null;
  body: ClassBody;
}

export interface ClassBody extends BaseNode {
  type: "ClassBody";
  body: Array<MethodDefinition>;
}

export interface MethodDefinition extends BaseNode {
  type: "MethodDefinition";
  key: Expression;
  value: FunctionExpression;
  kind: "constructor" | "method" | "get" | "set";
  computed: boolean;
  static: boolean;
}

export interface ClassDeclaration extends BaseClass, BaseDeclaration {
  type: "ClassDeclaration";
  /** It is null when a class declaration is a part of the `export default class` statement */
  id: Identifier | null;
}

export interface ClassExpression extends BaseClass, BaseExpression {
  type: "ClassExpression";
  id?: Identifier | null;
}

export interface MetaProperty extends BaseExpression {
  type: "MetaProperty";
  meta: Identifier;
  property: Identifier;
}

export type ModuleDeclaration =
    ImportDeclaration | ExportNamedDeclaration | ExportDefaultDeclaration |
    ExportAllDeclaration;
interface BaseModuleDeclaration extends BaseNode { }

export type ModuleSpecifier =
    ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier |
    ExportSpecifier;
interface BaseModuleSpecifier extends BaseNode {
  local: Identifier;
}

export interface ImportDeclaration extends BaseModuleDeclaration {
  type: "ImportDeclaration";
  specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>;
  source: Literal;
}

export interface ImportSpecifier extends BaseModuleSpecifier {
  type: "ImportSpecifier";
  imported: Identifier;
}

export interface ImportDefaultSpecifier extends BaseModuleSpecifier {
  type: "ImportDefaultSpecifier";
}

export interface ImportNamespaceSpecifier extends BaseModuleSpecifier {
  type: "ImportNamespaceSpecifier";
}

export interface ExportNamedDeclaration extends BaseModuleDeclaration {
  type: "ExportNamedDeclaration";
  declaration?: Declaration | null;
  specifiers: Array<ExportSpecifier>;
  source?: Literal | null;
}

export interface ExportSpecifier extends BaseModuleSpecifier {
  type: "ExportSpecifier";
  exported: Identifier;
}

export interface ExportDefaultDeclaration extends BaseModuleDeclaration {
  type: "ExportDefaultDeclaration";
  declaration: Declaration | Expression;
}

export interface ExportAllDeclaration extends BaseModuleDeclaration {
  type: "ExportAllDeclaration";
  source: Literal;
}

export interface AwaitExpression extends BaseExpression {
  type: "AwaitExpression";
  argument: Expression;
}
