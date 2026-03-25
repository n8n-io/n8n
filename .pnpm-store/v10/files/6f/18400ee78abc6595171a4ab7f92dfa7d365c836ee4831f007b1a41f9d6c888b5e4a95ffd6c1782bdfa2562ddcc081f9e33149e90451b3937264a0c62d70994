interface EsprimaError extends Error {
    name: string;
    message: string;
    index: number;
    lineNumber: number;
    column: number;
    description: string;
}

declare enum Syntax {
    AssignmentExpression = "AssignmentExpression",
    AssignmentPattern = "AssignmentPattern",
    ArrayExpression = "ArrayExpression",
    ArrayPattern = "ArrayPattern",
    ArrowFunctionExpression = "ArrowFunctionExpression",
    AwaitExpression = "AwaitExpression",
    BlockStatement = "BlockStatement",
    BinaryExpression = "BinaryExpression",
    BreakStatement = "BreakStatement",
    CallExpression = "CallExpression",
    CatchClause = "CatchClause",
    ChainExpression = "ChainExpression",
    ClassBody = "ClassBody",
    ClassDeclaration = "ClassDeclaration",
    ClassExpression = "ClassExpression",
    ConditionalExpression = "ConditionalExpression",
    ContinueStatement = "ContinueStatement",
    Decorator = "Decorator",
    DoWhileStatement = "DoWhileStatement",
    DebuggerStatement = "DebuggerStatement",
    EmptyStatement = "EmptyStatement",
    ExportAllDeclaration = "ExportAllDeclaration",
    ExportDefaultDeclaration = "ExportDefaultDeclaration",
    ExportNamedDeclaration = "ExportNamedDeclaration",
    ExportSpecifier = "ExportSpecifier",
    ExpressionStatement = "ExpressionStatement",
    ForStatement = "ForStatement",
    ForOfStatement = "ForOfStatement",
    ForInStatement = "ForInStatement",
    FunctionDeclaration = "FunctionDeclaration",
    FunctionExpression = "FunctionExpression",
    Identifier = "Identifier",
    IfStatement = "IfStatement",
    ImportAttribute = "ImportAttribute",
    ImportExpression = "ImportExpression",
    ImportDeclaration = "ImportDeclaration",
    ImportDefaultSpecifier = "ImportDefaultSpecifier",
    ImportNamespaceSpecifier = "ImportNamespaceSpecifier",
    ImportSpecifier = "ImportSpecifier",
    Literal = "Literal",
    LabeledStatement = "LabeledStatement",
    LogicalExpression = "LogicalExpression",
    MemberExpression = "MemberExpression",
    MetaProperty = "MetaProperty",
    MethodDefinition = "MethodDefinition",
    NewExpression = "NewExpression",
    ObjectExpression = "ObjectExpression",
    ObjectPattern = "ObjectPattern",
    Program = "Program",
    Property = "Property",
    PrivateIdentifier = "PrivateIdentifier",
    RestElement = "RestElement",
    ReturnStatement = "ReturnStatement",
    SequenceExpression = "SequenceExpression",
    SpreadElement = "SpreadElement",
    StaticBlock = "StaticBlock",
    Super = "Super",
    SwitchCase = "SwitchCase",
    SwitchStatement = "SwitchStatement",
    TaggedTemplateExpression = "TaggedTemplateExpression",
    TemplateElement = "TemplateElement",
    TemplateLiteral = "TemplateLiteral",
    ThisExpression = "ThisExpression",
    ThrowStatement = "ThrowStatement",
    TryStatement = "TryStatement",
    UnaryExpression = "UnaryExpression",
    UpdateExpression = "UpdateExpression",
    VariableDeclaration = "VariableDeclaration",
    VariableDeclarator = "VariableDeclarator",
    WhileStatement = "WhileStatement",
    WithStatement = "WithStatement",
    YieldExpression = "YieldExpression"
}

declare type ArgumentListElement = Expression | SpreadElement;
declare type ArrayExpressionElement = Expression | SpreadElement | null;
declare type ArrayPatternElement = AssignmentPattern | BindingIdentifier | BindingPattern | RestElement | null;
declare type BindingPattern = ArrayPattern | ObjectPattern;
declare type BindingIdentifier = Identifier;
declare type ChainElement = CallExpression | MemberExpression | MemberExpression;
declare type Class = ClassDeclaration | ClassExpression;
declare type Declaration = FunctionDeclaration | VariableDeclaration | ClassDeclaration | ImportDeclaration | ExportDeclaration;
declare type ExportableDefaultDeclaration = BindingIdentifier | BindingPattern | ClassDeclaration | Expression | FunctionDeclaration;
declare type ExportableNamedDeclaration = AsyncFunctionDeclaration | ClassDeclaration | FunctionDeclaration | VariableDeclaration;
declare type ExportDeclaration = ExportAllDeclaration | ExportDefaultDeclaration | ExportNamedDeclaration;
declare type Expression = ArrayExpression | ArrowFunctionExpression | AssignmentExpression | AwaitExpression | BinaryExpression | CallExpression | ChainExpression | ClassExpression | MemberExpression | ConditionalExpression | Identifier | FunctionExpression | Literal | LogicalExpression | NewExpression | ObjectExpression | RegexLiteral | SequenceExpression | MemberExpression | TemplateLiteral | TaggedTemplateExpression | ThisExpression | UnaryExpression | UpdateExpression | YieldExpression | MetaProperty | ImportExpression;
declare type FunctionParameter = AssignmentPattern | BindingIdentifier | BindingPattern;
declare type Function = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;
declare type ImportDeclarationSpecifier = ImportDefaultSpecifier | ImportNamespaceSpecifier | ImportSpecifier;
declare type ObjectExpressionProperty = Property | SpreadElement;
declare type ObjectPatternProperty = Property | RestElement;
declare type Statement = BlockStatement | BreakStatement | LabeledStatement | ContinueStatement | DebuggerStatement | DoWhileStatement | EmptyStatement | ExpressionStatement | Directive | ForStatement | ForInStatement | ForOfStatement | IfStatement | ReturnStatement | SwitchStatement | ThrowStatement | TryStatement | VariableDeclaration | WhileStatement | WithStatement | Declaration;
declare type Pattern = Expression | ObjectPattern | ArrayPattern | Identifier | AssignmentPattern | RestElement;
declare type PropertyKey = Identifier | Literal | PrivateIdentifier;
declare type PropertyValue = AssignmentPattern | BindingIdentifier | BindingPattern | FunctionExpression;
declare type Node = Program | Function | Statement | VariableDeclarator | Expression | Property | PropertyKey | Pattern | SwitchCase | CatchClause | MethodDefinition | Class | ClassBody | ImportDeclaration | ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier | ExportNamedDeclaration | ExportSpecifier | ExportDefaultDeclaration | ExportAllDeclaration | TemplateElement | Super | ArgumentListElement;
declare class ArrayExpression {
    readonly type: Syntax.ArrayExpression;
    readonly elements: ArrayExpressionElement[];
    constructor(elements: ArrayExpressionElement[]);
}
declare class ArrayPattern {
    readonly type: Syntax.ArrayPattern;
    readonly elements: ArrayPatternElement[];
    constructor(elements: ArrayPatternElement[]);
}
declare class ArrowFunctionExpression {
    readonly type: Syntax.ArrowFunctionExpression;
    readonly id: Identifier | null;
    readonly params: FunctionParameter[];
    readonly body: BlockStatement | Expression;
    readonly generator: boolean;
    readonly expression: boolean;
    readonly async: boolean;
    constructor(params: FunctionParameter[], body: BlockStatement | Expression, expression: boolean, isAsync: boolean);
}
declare class AssignmentExpression {
    readonly type: Syntax.AssignmentExpression;
    readonly operator: string;
    readonly left: Expression;
    readonly right: Expression;
    constructor(operator: string, left: Expression, right: Expression);
}
declare class AssignmentPattern {
    readonly type: Syntax.AssignmentPattern;
    readonly left: BindingIdentifier | BindingPattern;
    readonly right: Expression;
    constructor(left: BindingIdentifier | BindingPattern, right: Expression);
}
declare class AsyncFunctionDeclaration {
    readonly type: Syntax.FunctionDeclaration;
    readonly id: Identifier | null;
    readonly params: FunctionParameter[];
    readonly body: BlockStatement;
    readonly generator: boolean;
    readonly expression: boolean;
    readonly async: boolean;
    constructor(id: Identifier | null, params: FunctionParameter[], body: BlockStatement, generator: boolean);
}
declare class AwaitExpression {
    readonly type: Syntax.AwaitExpression;
    readonly argument: Expression;
    constructor(argument: Expression);
}
declare class BigIntLiteral {
    readonly type: Syntax.Literal;
    readonly value: null | bigint;
    readonly raw: string;
    readonly bigint: string;
    constructor(value: null | bigint, raw: string, bigint: string);
}
declare class BinaryExpression {
    readonly type: Syntax.BinaryExpression;
    readonly operator: string;
    readonly left: Expression | PrivateIdentifier;
    readonly right: Expression;
    constructor(operator: string, left: Expression | PrivateIdentifier, right: Expression);
}
declare class BlockStatement {
    readonly type: Syntax.BlockStatement;
    readonly body: Statement[];
    constructor(body: any);
}
declare class BreakStatement {
    readonly type: Syntax.BreakStatement;
    readonly label: Identifier | null;
    constructor(label: Identifier | null);
}
declare class CallExpression {
    readonly type: Syntax.CallExpression;
    readonly callee: Expression | ImportExpression;
    readonly arguments: ArgumentListElement[];
    readonly optional: boolean;
    constructor(callee: Expression | ImportExpression, args: ArgumentListElement[], optional: boolean);
}
declare class CatchClause {
    readonly type: Syntax.CatchClause;
    readonly param: BindingIdentifier | BindingPattern | null;
    readonly body: BlockStatement;
    constructor(param: BindingIdentifier | BindingPattern | null, body: BlockStatement);
}
declare class ChainExpression {
    readonly type: Syntax.ChainExpression;
    readonly expression: ChainElement;
    constructor(expression: ChainElement);
}
declare class ClassBody {
    readonly type: Syntax.ClassBody;
    readonly body: (MethodDefinition | PropertyDefinition | StaticBlock)[];
    constructor(body: (MethodDefinition | PropertyDefinition | StaticBlock)[]);
}
declare class ClassDeclaration {
    readonly type: Syntax.ClassDeclaration;
    readonly id: Identifier | null;
    readonly superClass: Identifier | null;
    readonly body: ClassBody;
    readonly decorators: Decorator[] | null;
    constructor(id: Identifier | null, superClass: Identifier | null, body: ClassBody, decorators: Decorator[] | null);
}
declare class ClassExpression {
    readonly type: Syntax.ClassExpression;
    readonly id: Identifier | null;
    readonly superClass: Identifier | null;
    readonly body: ClassBody;
    readonly decorators: Decorator[] | null;
    constructor(id: Identifier | null, superClass: Identifier | null, body: ClassBody, decorators: Decorator[] | null);
}
declare class ConditionalExpression {
    readonly type: Syntax.ConditionalExpression;
    readonly test: Expression;
    readonly consequent: Expression;
    readonly alternate: Expression;
    constructor(test: Expression, consequent: Expression, alternate: Expression);
}
declare class ContinueStatement {
    readonly type: Syntax.ContinueStatement;
    readonly label: Identifier | null;
    constructor(label: Identifier | null);
}
declare class DebuggerStatement {
    readonly type: Syntax.DebuggerStatement;
    constructor();
}
declare class Decorator {
    readonly type: Syntax.Decorator;
    readonly expression: Expression;
    constructor(expression: Expression);
}
declare class Directive {
    readonly type: Syntax.ExpressionStatement;
    readonly expression: Expression;
    readonly directive: string;
    constructor(expression: Expression, directive: string);
}
declare class DoWhileStatement {
    readonly type: Syntax.DoWhileStatement;
    readonly body: Statement;
    readonly test: Expression;
    constructor(body: Statement, test: Expression);
}
declare class EmptyStatement {
    readonly type: Syntax.EmptyStatement;
    constructor();
}
declare class ExportAllDeclaration {
    readonly type: Syntax.ExportAllDeclaration;
    readonly source: Literal;
    readonly exported: Identifier | Literal | null;
    readonly assertions: ImportAttribute[] | null;
    constructor(source: Literal, exported: Identifier | Literal | null, assertions: ImportAttribute[] | null);
}
declare class ExportDefaultDeclaration {
    readonly type: Syntax.ExportDefaultDeclaration;
    readonly declaration: ExportableDefaultDeclaration;
    constructor(declaration: ExportableDefaultDeclaration);
}
declare class ExportNamedDeclaration {
    readonly type: Syntax.ExportNamedDeclaration;
    readonly declaration: ExportableNamedDeclaration | null;
    readonly specifiers: ExportSpecifier[];
    readonly source: Literal | null;
    readonly assertions: ImportAttribute[] | null;
    constructor(declaration: ExportableNamedDeclaration | null, specifiers: ExportSpecifier[], source: Literal | null, assertions: ImportAttribute[] | null);
}
declare class ExportSpecifier {
    readonly type: Syntax.ExportSpecifier;
    readonly exported: Identifier | Literal;
    readonly local: Identifier | Literal;
    constructor(local: Identifier | Literal, exported: Identifier | Literal);
}
declare class ExpressionStatement {
    readonly type: Syntax.ExpressionStatement;
    readonly expression: Expression;
    constructor(expression: Expression);
}
declare class ForInStatement {
    readonly type: Syntax.ForInStatement;
    readonly left: Expression;
    readonly right: Expression;
    readonly body: Statement;
    readonly each: boolean;
    constructor(left: Expression, right: Expression, body: Statement);
}
declare class ForOfStatement {
    readonly type: Syntax.ForOfStatement;
    readonly await: boolean;
    readonly left: Expression;
    readonly right: Expression;
    readonly body: Statement;
    constructor(left: Expression, right: Expression, body: Statement, _await: boolean);
}
declare class ForStatement {
    readonly type: Syntax.ForStatement;
    readonly init: Expression | null;
    readonly test: Expression | null;
    readonly update: Expression | null;
    body: Statement;
    constructor(init: Expression | null, test: Expression | null, update: Expression | null, body: Statement);
}
declare class FunctionDeclaration {
    readonly type: Syntax.FunctionDeclaration;
    readonly id: Identifier | null;
    readonly params: FunctionParameter[];
    readonly body: BlockStatement;
    readonly generator: boolean;
    readonly expression: boolean;
    readonly async: boolean;
    constructor(id: Identifier | null, params: FunctionParameter[], body: BlockStatement, generator: boolean);
}
declare class FunctionExpression {
    readonly type: Syntax.FunctionExpression;
    readonly id: Identifier | null;
    readonly params: FunctionParameter[];
    readonly body: BlockStatement;
    readonly generator: boolean;
    readonly expression: boolean;
    readonly async: boolean;
    constructor(id: Identifier | null, params: FunctionParameter[], body: BlockStatement, generator: boolean, isAsync: boolean);
}
declare class Identifier {
    readonly type: Syntax.Identifier;
    readonly name: string;
    constructor(name: any);
}
declare class IfStatement {
    readonly type: Syntax.IfStatement;
    readonly test: Expression;
    readonly consequent: Statement;
    readonly alternate: Statement | null;
    constructor(test: Expression, consequent: Statement, alternate: Statement | null);
}
declare class ImportAttribute {
    readonly type: Syntax.ImportAttribute;
    readonly key: Identifier | Literal;
    readonly value: Literal;
    constructor(key: Identifier | Literal, value: Literal);
}
declare class ImportExpression {
    readonly type: Syntax.ImportExpression;
    readonly source: Expression;
    readonly attributes: Expression | null;
    constructor(source: any, attributes: Expression | null);
}
declare class ImportDeclaration {
    readonly type: Syntax.ImportDeclaration;
    readonly specifiers: ImportDeclarationSpecifier[];
    readonly source: Literal;
    readonly assertions: ImportAttribute[] | null;
    constructor(specifiers: any, source: any, assertions: ImportAttribute[] | null);
}
declare class ImportDefaultSpecifier {
    readonly type: Syntax.ImportDefaultSpecifier;
    readonly local: Identifier;
    constructor(local: Identifier);
}
declare class ImportNamespaceSpecifier {
    readonly type: Syntax.ImportNamespaceSpecifier;
    readonly local: Identifier;
    constructor(local: Identifier);
}
declare class ImportSpecifier {
    readonly type: Syntax.ImportSpecifier;
    readonly local: Identifier;
    readonly imported: Identifier | Literal;
    constructor(local: Identifier, imported: Identifier | Literal);
}
declare class LabeledStatement {
    readonly type: Syntax.LabeledStatement;
    readonly label: Identifier;
    readonly body: Statement;
    constructor(label: Identifier, body: Statement);
}
declare class Literal {
    readonly type: Syntax.Literal;
    readonly value: boolean | number | string | null;
    readonly raw: string;
    constructor(value: boolean | number | string | null, raw: string);
}
declare class LogicalExpression {
    readonly type: Syntax.LogicalExpression;
    readonly operator: string;
    readonly left: Expression;
    readonly right: Expression;
    constructor(operator: string, left: Expression, right: Expression);
}
declare class MemberExpression {
    readonly type: Syntax.MemberExpression;
    readonly computed: boolean;
    readonly object: Expression;
    readonly property: Expression | PrivateIdentifier;
    readonly optional: boolean;
    constructor(computed: boolean, object: Expression, property: Expression, optional: boolean);
}
declare class MetaProperty {
    readonly type: Syntax.MetaProperty;
    readonly meta: Identifier;
    readonly property: Identifier;
    constructor(meta: Identifier, property: Identifier);
}
declare class MethodDefinition {
    readonly type: Syntax.MethodDefinition;
    readonly key: Expression | PrivateIdentifier | null;
    readonly computed: boolean;
    readonly value: FunctionExpression | null;
    readonly kind: string;
    readonly static: boolean;
    readonly decorators: Decorator[] | null;
    constructor(key: Expression | PrivateIdentifier | null, computed: boolean, value: FunctionExpression | null, kind: string, isStatic: boolean, decorators: Decorator[] | null);
}
declare class Module {
    readonly type: Syntax.Program;
    readonly body: Statement[];
    readonly sourceType: string;
    constructor(body: Statement[]);
}
declare class NewExpression {
    readonly type: Syntax.NewExpression;
    readonly callee: Expression;
    readonly arguments: ArgumentListElement[];
    constructor(callee: Expression, args: ArgumentListElement[]);
}
declare class ObjectExpression {
    readonly type: Syntax.ObjectExpression;
    readonly properties: ObjectExpressionProperty[];
    constructor(properties: ObjectExpressionProperty[]);
}
declare class ObjectPattern {
    readonly type: Syntax.ObjectPattern;
    readonly properties: ObjectPatternProperty[];
    constructor(properties: ObjectPatternProperty[]);
}
declare class PrivateIdentifier {
    readonly type: Syntax.PrivateIdentifier;
    readonly name: string;
    constructor(name: any);
}
declare class Program {
    readonly type: Syntax.Program;
    readonly body: Statement[];
    readonly sourceType: 'script' | 'module';
    constructor(sourceType: 'script' | 'module', body: Statement[]);
}
declare class Property {
    readonly type: Syntax.Property;
    readonly key: PropertyKey;
    readonly computed: boolean;
    readonly value: PropertyValue | null;
    readonly kind: string;
    readonly method: boolean;
    readonly shorthand: boolean;
    constructor(kind: string, key: PropertyKey, computed: boolean, value: PropertyValue | null, method: boolean, shorthand: boolean);
}
declare class PropertyDefinition {
    readonly type: Syntax.Property;
    readonly key: PropertyKey;
    readonly computed: boolean;
    readonly value: PropertyValue | null;
    readonly static: boolean;
    readonly decorators: Decorator[] | null;
    constructor(key: PropertyKey, computed: boolean, value: PropertyValue | null, isStatic: boolean, decorators: Decorator[] | null);
}
declare class RegexLiteral {
    readonly type: Syntax.Literal;
    readonly value: RegExp;
    readonly raw: string;
    readonly regex: {
        pattern: string;
        flags: string;
    };
    constructor(value: RegExp, raw: string, pattern: string, flags: string);
}
declare class RestElement {
    readonly type: Syntax.RestElement;
    readonly argument: BindingIdentifier | BindingPattern;
    constructor(argument: BindingIdentifier | BindingPattern);
}
declare class ReturnStatement {
    readonly type: Syntax.ReturnStatement;
    readonly argument: Expression | null;
    constructor(argument: Expression | null);
}
declare class Script {
    readonly type: Syntax.Program;
    readonly body: Statement[];
    readonly sourceType: string;
    constructor(body: Statement[]);
}
declare class SequenceExpression {
    readonly type: Syntax.SequenceExpression;
    readonly expressions: Expression[];
    constructor(expressions: Expression[]);
}
declare class SpreadElement {
    readonly type: Syntax.SpreadElement;
    readonly argument: Expression;
    constructor(argument: Expression);
}
declare class StaticBlock {
    readonly type: Syntax.StaticBlock;
    readonly body: Statement[];
    constructor(body: any);
}
declare class Super {
    readonly type: Syntax.Super;
    constructor();
}
declare class SwitchCase {
    readonly type: Syntax.SwitchCase;
    readonly test: Expression | null;
    readonly consequent: Statement[];
    constructor(test: Expression, consequent: Statement[]);
}
declare class SwitchStatement {
    readonly type: Syntax.SwitchStatement;
    readonly discriminant: Expression;
    readonly cases: SwitchCase[];
    constructor(discriminant: Expression, cases: SwitchCase[]);
}
declare class TaggedTemplateExpression {
    readonly type: Syntax.TaggedTemplateExpression;
    readonly tag: Expression;
    readonly quasi: TemplateLiteral;
    constructor(tag: Expression, quasi: TemplateLiteral);
}
interface TemplateElementValue {
    cooked: string | null;
    raw: string;
}
declare class TemplateElement {
    readonly type: Syntax.TemplateElement;
    readonly value: TemplateElementValue;
    readonly tail: boolean;
    constructor(value: TemplateElementValue, tail: boolean);
}
declare class TemplateLiteral {
    readonly type: Syntax.TemplateLiteral;
    readonly quasis: TemplateElement[];
    readonly expressions: Expression[];
    constructor(quasis: TemplateElement[], expressions: Expression[]);
}
declare class ThisExpression {
    readonly type: Syntax.ThisExpression;
    constructor();
}
declare class ThrowStatement {
    readonly type: Syntax.ThrowStatement;
    readonly argument: Expression;
    constructor(argument: Expression);
}
declare class TryStatement {
    readonly type: Syntax.TryStatement;
    readonly block: BlockStatement;
    readonly handler: CatchClause | null;
    readonly finalizer: BlockStatement | null;
    constructor(block: BlockStatement, handler: CatchClause | null, finalizer: BlockStatement | null);
}
declare class UnaryExpression {
    readonly type: Syntax.UnaryExpression;
    readonly operator: string;
    readonly argument: Expression;
    readonly prefix: boolean;
    constructor(operator: any, argument: any);
}
declare class UpdateExpression {
    readonly type: Syntax.UpdateExpression;
    readonly operator: string;
    readonly argument: Expression;
    readonly prefix: boolean;
    constructor(operator: any, argument: any, prefix: any);
}
declare class VariableDeclaration {
    readonly type: Syntax.VariableDeclaration;
    readonly declarations: VariableDeclarator[];
    readonly kind: string;
    constructor(declarations: VariableDeclarator[], kind: string);
}
declare class VariableDeclarator {
    readonly type: Syntax.VariableDeclarator;
    readonly id: BindingIdentifier | BindingPattern;
    readonly init: Expression | null;
    constructor(id: BindingIdentifier | BindingPattern, init: Expression | null);
}
declare class WhileStatement {
    readonly type: Syntax.WhileStatement;
    readonly test: Expression;
    readonly body: Statement;
    constructor(test: Expression, body: Statement);
}
declare class WithStatement {
    readonly type: Syntax.WithStatement;
    readonly object: Expression;
    readonly body: Statement;
    constructor(object: Expression, body: Statement);
}
declare class YieldExpression {
    readonly type: Syntax.YieldExpression;
    readonly argument: Expression | null;
    readonly delegate: boolean;
    constructor(argument: Expression | null, delegate: boolean);
}

type nodes_d_ArgumentListElement = ArgumentListElement;
type nodes_d_ArrayExpressionElement = ArrayExpressionElement;
type nodes_d_ArrayPatternElement = ArrayPatternElement;
type nodes_d_BindingPattern = BindingPattern;
type nodes_d_BindingIdentifier = BindingIdentifier;
type nodes_d_ChainElement = ChainElement;
type nodes_d_Class = Class;
type nodes_d_Declaration = Declaration;
type nodes_d_ExportableDefaultDeclaration = ExportableDefaultDeclaration;
type nodes_d_ExportableNamedDeclaration = ExportableNamedDeclaration;
type nodes_d_ExportDeclaration = ExportDeclaration;
type nodes_d_Expression = Expression;
type nodes_d_FunctionParameter = FunctionParameter;
type nodes_d_Function = Function;
type nodes_d_ImportDeclarationSpecifier = ImportDeclarationSpecifier;
type nodes_d_ObjectExpressionProperty = ObjectExpressionProperty;
type nodes_d_ObjectPatternProperty = ObjectPatternProperty;
type nodes_d_Statement = Statement;
type nodes_d_Pattern = Pattern;
type nodes_d_PropertyKey = PropertyKey;
type nodes_d_PropertyValue = PropertyValue;
type nodes_d_Node = Node;
type nodes_d_ArrayExpression = ArrayExpression;
declare const nodes_d_ArrayExpression: typeof ArrayExpression;
type nodes_d_ArrayPattern = ArrayPattern;
declare const nodes_d_ArrayPattern: typeof ArrayPattern;
type nodes_d_ArrowFunctionExpression = ArrowFunctionExpression;
declare const nodes_d_ArrowFunctionExpression: typeof ArrowFunctionExpression;
type nodes_d_AssignmentExpression = AssignmentExpression;
declare const nodes_d_AssignmentExpression: typeof AssignmentExpression;
type nodes_d_AssignmentPattern = AssignmentPattern;
declare const nodes_d_AssignmentPattern: typeof AssignmentPattern;
type nodes_d_AsyncFunctionDeclaration = AsyncFunctionDeclaration;
declare const nodes_d_AsyncFunctionDeclaration: typeof AsyncFunctionDeclaration;
type nodes_d_AwaitExpression = AwaitExpression;
declare const nodes_d_AwaitExpression: typeof AwaitExpression;
type nodes_d_BigIntLiteral = BigIntLiteral;
declare const nodes_d_BigIntLiteral: typeof BigIntLiteral;
type nodes_d_BinaryExpression = BinaryExpression;
declare const nodes_d_BinaryExpression: typeof BinaryExpression;
type nodes_d_BlockStatement = BlockStatement;
declare const nodes_d_BlockStatement: typeof BlockStatement;
type nodes_d_BreakStatement = BreakStatement;
declare const nodes_d_BreakStatement: typeof BreakStatement;
type nodes_d_CallExpression = CallExpression;
declare const nodes_d_CallExpression: typeof CallExpression;
type nodes_d_CatchClause = CatchClause;
declare const nodes_d_CatchClause: typeof CatchClause;
type nodes_d_ChainExpression = ChainExpression;
declare const nodes_d_ChainExpression: typeof ChainExpression;
type nodes_d_ClassBody = ClassBody;
declare const nodes_d_ClassBody: typeof ClassBody;
type nodes_d_ClassDeclaration = ClassDeclaration;
declare const nodes_d_ClassDeclaration: typeof ClassDeclaration;
type nodes_d_ClassExpression = ClassExpression;
declare const nodes_d_ClassExpression: typeof ClassExpression;
type nodes_d_ConditionalExpression = ConditionalExpression;
declare const nodes_d_ConditionalExpression: typeof ConditionalExpression;
type nodes_d_ContinueStatement = ContinueStatement;
declare const nodes_d_ContinueStatement: typeof ContinueStatement;
type nodes_d_DebuggerStatement = DebuggerStatement;
declare const nodes_d_DebuggerStatement: typeof DebuggerStatement;
type nodes_d_Decorator = Decorator;
declare const nodes_d_Decorator: typeof Decorator;
type nodes_d_Directive = Directive;
declare const nodes_d_Directive: typeof Directive;
type nodes_d_DoWhileStatement = DoWhileStatement;
declare const nodes_d_DoWhileStatement: typeof DoWhileStatement;
type nodes_d_EmptyStatement = EmptyStatement;
declare const nodes_d_EmptyStatement: typeof EmptyStatement;
type nodes_d_ExportAllDeclaration = ExportAllDeclaration;
declare const nodes_d_ExportAllDeclaration: typeof ExportAllDeclaration;
type nodes_d_ExportDefaultDeclaration = ExportDefaultDeclaration;
declare const nodes_d_ExportDefaultDeclaration: typeof ExportDefaultDeclaration;
type nodes_d_ExportNamedDeclaration = ExportNamedDeclaration;
declare const nodes_d_ExportNamedDeclaration: typeof ExportNamedDeclaration;
type nodes_d_ExportSpecifier = ExportSpecifier;
declare const nodes_d_ExportSpecifier: typeof ExportSpecifier;
type nodes_d_ExpressionStatement = ExpressionStatement;
declare const nodes_d_ExpressionStatement: typeof ExpressionStatement;
type nodes_d_ForInStatement = ForInStatement;
declare const nodes_d_ForInStatement: typeof ForInStatement;
type nodes_d_ForOfStatement = ForOfStatement;
declare const nodes_d_ForOfStatement: typeof ForOfStatement;
type nodes_d_ForStatement = ForStatement;
declare const nodes_d_ForStatement: typeof ForStatement;
type nodes_d_FunctionDeclaration = FunctionDeclaration;
declare const nodes_d_FunctionDeclaration: typeof FunctionDeclaration;
type nodes_d_FunctionExpression = FunctionExpression;
declare const nodes_d_FunctionExpression: typeof FunctionExpression;
type nodes_d_Identifier = Identifier;
declare const nodes_d_Identifier: typeof Identifier;
type nodes_d_IfStatement = IfStatement;
declare const nodes_d_IfStatement: typeof IfStatement;
type nodes_d_ImportAttribute = ImportAttribute;
declare const nodes_d_ImportAttribute: typeof ImportAttribute;
type nodes_d_ImportExpression = ImportExpression;
declare const nodes_d_ImportExpression: typeof ImportExpression;
type nodes_d_ImportDeclaration = ImportDeclaration;
declare const nodes_d_ImportDeclaration: typeof ImportDeclaration;
type nodes_d_ImportDefaultSpecifier = ImportDefaultSpecifier;
declare const nodes_d_ImportDefaultSpecifier: typeof ImportDefaultSpecifier;
type nodes_d_ImportNamespaceSpecifier = ImportNamespaceSpecifier;
declare const nodes_d_ImportNamespaceSpecifier: typeof ImportNamespaceSpecifier;
type nodes_d_ImportSpecifier = ImportSpecifier;
declare const nodes_d_ImportSpecifier: typeof ImportSpecifier;
type nodes_d_LabeledStatement = LabeledStatement;
declare const nodes_d_LabeledStatement: typeof LabeledStatement;
type nodes_d_Literal = Literal;
declare const nodes_d_Literal: typeof Literal;
type nodes_d_LogicalExpression = LogicalExpression;
declare const nodes_d_LogicalExpression: typeof LogicalExpression;
type nodes_d_MemberExpression = MemberExpression;
declare const nodes_d_MemberExpression: typeof MemberExpression;
type nodes_d_MetaProperty = MetaProperty;
declare const nodes_d_MetaProperty: typeof MetaProperty;
type nodes_d_MethodDefinition = MethodDefinition;
declare const nodes_d_MethodDefinition: typeof MethodDefinition;
type nodes_d_Module = Module;
declare const nodes_d_Module: typeof Module;
type nodes_d_NewExpression = NewExpression;
declare const nodes_d_NewExpression: typeof NewExpression;
type nodes_d_ObjectExpression = ObjectExpression;
declare const nodes_d_ObjectExpression: typeof ObjectExpression;
type nodes_d_ObjectPattern = ObjectPattern;
declare const nodes_d_ObjectPattern: typeof ObjectPattern;
type nodes_d_PrivateIdentifier = PrivateIdentifier;
declare const nodes_d_PrivateIdentifier: typeof PrivateIdentifier;
type nodes_d_Program = Program;
declare const nodes_d_Program: typeof Program;
type nodes_d_Property = Property;
declare const nodes_d_Property: typeof Property;
type nodes_d_PropertyDefinition = PropertyDefinition;
declare const nodes_d_PropertyDefinition: typeof PropertyDefinition;
type nodes_d_RegexLiteral = RegexLiteral;
declare const nodes_d_RegexLiteral: typeof RegexLiteral;
type nodes_d_RestElement = RestElement;
declare const nodes_d_RestElement: typeof RestElement;
type nodes_d_ReturnStatement = ReturnStatement;
declare const nodes_d_ReturnStatement: typeof ReturnStatement;
type nodes_d_Script = Script;
declare const nodes_d_Script: typeof Script;
type nodes_d_SequenceExpression = SequenceExpression;
declare const nodes_d_SequenceExpression: typeof SequenceExpression;
type nodes_d_SpreadElement = SpreadElement;
declare const nodes_d_SpreadElement: typeof SpreadElement;
type nodes_d_StaticBlock = StaticBlock;
declare const nodes_d_StaticBlock: typeof StaticBlock;
type nodes_d_Super = Super;
declare const nodes_d_Super: typeof Super;
type nodes_d_SwitchCase = SwitchCase;
declare const nodes_d_SwitchCase: typeof SwitchCase;
type nodes_d_SwitchStatement = SwitchStatement;
declare const nodes_d_SwitchStatement: typeof SwitchStatement;
type nodes_d_TaggedTemplateExpression = TaggedTemplateExpression;
declare const nodes_d_TaggedTemplateExpression: typeof TaggedTemplateExpression;
type nodes_d_TemplateElement = TemplateElement;
declare const nodes_d_TemplateElement: typeof TemplateElement;
type nodes_d_TemplateLiteral = TemplateLiteral;
declare const nodes_d_TemplateLiteral: typeof TemplateLiteral;
type nodes_d_ThisExpression = ThisExpression;
declare const nodes_d_ThisExpression: typeof ThisExpression;
type nodes_d_ThrowStatement = ThrowStatement;
declare const nodes_d_ThrowStatement: typeof ThrowStatement;
type nodes_d_TryStatement = TryStatement;
declare const nodes_d_TryStatement: typeof TryStatement;
type nodes_d_UnaryExpression = UnaryExpression;
declare const nodes_d_UnaryExpression: typeof UnaryExpression;
type nodes_d_UpdateExpression = UpdateExpression;
declare const nodes_d_UpdateExpression: typeof UpdateExpression;
type nodes_d_VariableDeclaration = VariableDeclaration;
declare const nodes_d_VariableDeclaration: typeof VariableDeclaration;
type nodes_d_VariableDeclarator = VariableDeclarator;
declare const nodes_d_VariableDeclarator: typeof VariableDeclarator;
type nodes_d_WhileStatement = WhileStatement;
declare const nodes_d_WhileStatement: typeof WhileStatement;
type nodes_d_WithStatement = WithStatement;
declare const nodes_d_WithStatement: typeof WithStatement;
type nodes_d_YieldExpression = YieldExpression;
declare const nodes_d_YieldExpression: typeof YieldExpression;
declare namespace nodes_d {
  export {
    nodes_d_ArgumentListElement as ArgumentListElement,
    nodes_d_ArrayExpressionElement as ArrayExpressionElement,
    nodes_d_ArrayPatternElement as ArrayPatternElement,
    nodes_d_BindingPattern as BindingPattern,
    nodes_d_BindingIdentifier as BindingIdentifier,
    nodes_d_ChainElement as ChainElement,
    nodes_d_Class as Class,
    nodes_d_Declaration as Declaration,
    nodes_d_ExportableDefaultDeclaration as ExportableDefaultDeclaration,
    nodes_d_ExportableNamedDeclaration as ExportableNamedDeclaration,
    nodes_d_ExportDeclaration as ExportDeclaration,
    nodes_d_Expression as Expression,
    nodes_d_FunctionParameter as FunctionParameter,
    nodes_d_Function as Function,
    nodes_d_ImportDeclarationSpecifier as ImportDeclarationSpecifier,
    nodes_d_ObjectExpressionProperty as ObjectExpressionProperty,
    nodes_d_ObjectPatternProperty as ObjectPatternProperty,
    nodes_d_Statement as Statement,
    nodes_d_Pattern as Pattern,
    nodes_d_PropertyKey as PropertyKey,
    nodes_d_PropertyValue as PropertyValue,
    nodes_d_Node as Node,
    nodes_d_ArrayExpression as ArrayExpression,
    nodes_d_ArrayPattern as ArrayPattern,
    nodes_d_ArrowFunctionExpression as ArrowFunctionExpression,
    nodes_d_AssignmentExpression as AssignmentExpression,
    nodes_d_AssignmentPattern as AssignmentPattern,
    nodes_d_AsyncFunctionDeclaration as AsyncFunctionDeclaration,
    nodes_d_AwaitExpression as AwaitExpression,
    nodes_d_BigIntLiteral as BigIntLiteral,
    nodes_d_BinaryExpression as BinaryExpression,
    nodes_d_BlockStatement as BlockStatement,
    nodes_d_BreakStatement as BreakStatement,
    nodes_d_CallExpression as CallExpression,
    nodes_d_CatchClause as CatchClause,
    nodes_d_ChainExpression as ChainExpression,
    nodes_d_ClassBody as ClassBody,
    nodes_d_ClassDeclaration as ClassDeclaration,
    nodes_d_ClassExpression as ClassExpression,
    nodes_d_ConditionalExpression as ConditionalExpression,
    nodes_d_ContinueStatement as ContinueStatement,
    nodes_d_DebuggerStatement as DebuggerStatement,
    nodes_d_Decorator as Decorator,
    nodes_d_Directive as Directive,
    nodes_d_DoWhileStatement as DoWhileStatement,
    nodes_d_EmptyStatement as EmptyStatement,
    nodes_d_ExportAllDeclaration as ExportAllDeclaration,
    nodes_d_ExportDefaultDeclaration as ExportDefaultDeclaration,
    nodes_d_ExportNamedDeclaration as ExportNamedDeclaration,
    nodes_d_ExportSpecifier as ExportSpecifier,
    nodes_d_ExpressionStatement as ExpressionStatement,
    nodes_d_ForInStatement as ForInStatement,
    nodes_d_ForOfStatement as ForOfStatement,
    nodes_d_ForStatement as ForStatement,
    nodes_d_FunctionDeclaration as FunctionDeclaration,
    nodes_d_FunctionExpression as FunctionExpression,
    nodes_d_Identifier as Identifier,
    nodes_d_IfStatement as IfStatement,
    nodes_d_ImportAttribute as ImportAttribute,
    nodes_d_ImportExpression as ImportExpression,
    nodes_d_ImportDeclaration as ImportDeclaration,
    nodes_d_ImportDefaultSpecifier as ImportDefaultSpecifier,
    nodes_d_ImportNamespaceSpecifier as ImportNamespaceSpecifier,
    nodes_d_ImportSpecifier as ImportSpecifier,
    nodes_d_LabeledStatement as LabeledStatement,
    nodes_d_Literal as Literal,
    nodes_d_LogicalExpression as LogicalExpression,
    nodes_d_MemberExpression as MemberExpression,
    nodes_d_MetaProperty as MetaProperty,
    nodes_d_MethodDefinition as MethodDefinition,
    nodes_d_Module as Module,
    nodes_d_NewExpression as NewExpression,
    nodes_d_ObjectExpression as ObjectExpression,
    nodes_d_ObjectPattern as ObjectPattern,
    nodes_d_PrivateIdentifier as PrivateIdentifier,
    nodes_d_Program as Program,
    nodes_d_Property as Property,
    nodes_d_PropertyDefinition as PropertyDefinition,
    nodes_d_RegexLiteral as RegexLiteral,
    nodes_d_RestElement as RestElement,
    nodes_d_ReturnStatement as ReturnStatement,
    nodes_d_Script as Script,
    nodes_d_SequenceExpression as SequenceExpression,
    nodes_d_SpreadElement as SpreadElement,
    nodes_d_StaticBlock as StaticBlock,
    nodes_d_Super as Super,
    nodes_d_SwitchCase as SwitchCase,
    nodes_d_SwitchStatement as SwitchStatement,
    nodes_d_TaggedTemplateExpression as TaggedTemplateExpression,
    nodes_d_TemplateElement as TemplateElement,
    nodes_d_TemplateLiteral as TemplateLiteral,
    nodes_d_ThisExpression as ThisExpression,
    nodes_d_ThrowStatement as ThrowStatement,
    nodes_d_TryStatement as TryStatement,
    nodes_d_UnaryExpression as UnaryExpression,
    nodes_d_UpdateExpression as UpdateExpression,
    nodes_d_VariableDeclaration as VariableDeclaration,
    nodes_d_VariableDeclarator as VariableDeclarator,
    nodes_d_WhileStatement as WhileStatement,
    nodes_d_WithStatement as WithStatement,
    nodes_d_YieldExpression as YieldExpression,
  };
}

interface Position {
    line: number;
    column: number;
}
interface SourceLocation {
    start: Position;
    end: Position;
    source?: string;
}

interface Config {
    range?: boolean;
    loc?: boolean;
    source?: string | null;
    tokens?: boolean;
    comment?: boolean;
    tolerant?: boolean;
    jsx?: boolean;
    sourceType?: 'script' | 'module';
    attachComment?: boolean;
}
interface TokenEntry {
    type: string;
    value: string;
    regex?: {
        pattern: string;
        flags: string;
    };
    range?: [number, number];
    loc?: SourceLocation;
}

declare function parse(code: string, options?: Config, delegate?: any): Program & {
    comments?: Comment[];
    tokens?: TokenEntry[];
    errors?: EsprimaError[];
};
declare function parseModule(code: string, options?: Config, delegate?: any): Program & {
    comments?: Comment[] | undefined;
    tokens?: TokenEntry[] | undefined;
    errors?: EsprimaError[] | undefined;
};
declare function parseScript(code: string, options?: Config, delegate?: any): Program & {
    comments?: Comment[] | undefined;
    tokens?: TokenEntry[] | undefined;
    errors?: EsprimaError[] | undefined;
};
declare function tokenize(code: string, options?: Config, delegate?: any): any;

declare const version = "5.7.1";
declare const _default: {
    parse: typeof parse;
    parseModule: typeof parseModule;
    parseScript: typeof parseScript;
    tokenize: typeof tokenize;
    Syntax: typeof Syntax;
    version: string;
};

export { ArgumentListElement, ArrayExpression, ArrayExpressionElement, ArrayPattern, ArrayPatternElement, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AsyncFunctionDeclaration, AwaitExpression, BigIntLiteral, BinaryExpression, BindingIdentifier, BindingPattern, BlockStatement, BreakStatement, CallExpression, CatchClause, ChainElement, ChainExpression, Class, ClassBody, ClassDeclaration, ClassExpression, ConditionalExpression, Config, ContinueStatement, DebuggerStatement, Declaration, Decorator, Directive, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExportableDefaultDeclaration, ExportableNamedDeclaration, Expression, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, Function, FunctionDeclaration, FunctionExpression, FunctionParameter, Identifier, IfStatement, ImportAttribute, ImportDeclaration, ImportDeclarationSpecifier, ImportDefaultSpecifier, ImportExpression, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, Module, NewExpression, Node, nodes_d as Nodes, ObjectExpression, ObjectExpressionProperty, ObjectPattern, ObjectPatternProperty, Pattern, PrivateIdentifier, Program, Property, PropertyDefinition, PropertyKey, PropertyValue, RegexLiteral, RestElement, ReturnStatement, Script, SequenceExpression, SpreadElement, Statement, StaticBlock, Super, SwitchCase, SwitchStatement, Syntax, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, _default as default, parse, parseModule, parseScript, tokenize, version };
