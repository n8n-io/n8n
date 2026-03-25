import * as ESTree from "estree";
import { JSONSchema4 } from "json-schema";
import { LegacyESLint } from "./use-at-your-own-risk";

export namespace AST {
    type TokenType =
        | "Boolean"
        | "Null"
        | "Identifier"
        | "Keyword"
        | "Punctuator"
        | "JSXIdentifier"
        | "JSXText"
        | "Numeric"
        | "String"
        | "RegularExpression";

    interface Token {
        type: TokenType;
        value: string;
        range: Range;
        loc: SourceLocation;
    }

    interface SourceLocation {
        start: ESTree.Position;
        end: ESTree.Position;
    }

    type Range = [number, number];

    interface Program extends ESTree.Program {
        comments: ESTree.Comment[];
        tokens: Token[];
        loc: SourceLocation;
        range: Range;
    }
}

export namespace Scope {
    interface ScopeManager {
        scopes: Scope[];
        globalScope: Scope | null;

        acquire(node: ESTree.Node, inner?: boolean): Scope | null;

        getDeclaredVariables(node: ESTree.Node): Variable[];
    }

    interface Scope {
        type:
            | "block"
            | "catch"
            | "class"
            | "for"
            | "function"
            | "function-expression-name"
            | "global"
            | "module"
            | "switch"
            | "with"
            | "TDZ";
        isStrict: boolean;
        upper: Scope | null;
        childScopes: Scope[];
        variableScope: Scope;
        block: ESTree.Node;
        variables: Variable[];
        set: Map<string, Variable>;
        references: Reference[];
        through: Reference[];
        functionExpressionScope: boolean;
    }

    interface Variable {
        name: string;
        scope: Scope;
        identifiers: ESTree.Identifier[];
        references: Reference[];
        defs: Definition[];
    }

    interface Reference {
        identifier: ESTree.Identifier;
        from: Scope;
        resolved: Variable | null;
        writeExpr: ESTree.Node | null;
        init: boolean;

        isWrite(): boolean;

        isRead(): boolean;

        isWriteOnly(): boolean;

        isReadOnly(): boolean;

        isReadWrite(): boolean;
    }

    type DefinitionType =
        | { type: "CatchClause"; node: ESTree.CatchClause; parent: null }
        | { type: "ClassName"; node: ESTree.ClassDeclaration | ESTree.ClassExpression; parent: null }
        | { type: "FunctionName"; node: ESTree.FunctionDeclaration | ESTree.FunctionExpression; parent: null }
        | { type: "ImplicitGlobalVariable"; node: ESTree.Program; parent: null }
        | {
            type: "ImportBinding";
            node: ESTree.ImportSpecifier | ESTree.ImportDefaultSpecifier | ESTree.ImportNamespaceSpecifier;
            parent: ESTree.ImportDeclaration;
        }
        | {
            type: "Parameter";
            node: ESTree.FunctionDeclaration | ESTree.FunctionExpression | ESTree.ArrowFunctionExpression;
            parent: null;
        }
        | { type: "TDZ"; node: any; parent: null }
        | { type: "Variable"; node: ESTree.VariableDeclarator; parent: ESTree.VariableDeclaration };

    type Definition = DefinitionType & { name: ESTree.Identifier };
}

// #region SourceCode

export class SourceCode {
    text: string;
    ast: AST.Program;
    lines: string[];
    hasBOM: boolean;
    parserServices: SourceCode.ParserServices;
    scopeManager: Scope.ScopeManager;
    visitorKeys: SourceCode.VisitorKeys;

    constructor(text: string, ast: AST.Program);
    constructor(config: SourceCode.Config);

    static splitLines(text: string): string[];

    getText(node?: ESTree.Node, beforeCount?: number, afterCount?: number): string;

    getLines(): string[];

    getAllComments(): ESTree.Comment[];

    getAncestors(node: ESTree.Node): ESTree.Node[];

    getDeclaredVariables(node: ESTree.Node): Scope.Variable[];

    getJSDocComment(node: ESTree.Node): ESTree.Comment | null;

    getNodeByRangeIndex(index: number): ESTree.Node | null;

    isSpaceBetweenTokens(first: AST.Token, second: AST.Token): boolean;

    getLocFromIndex(index: number): ESTree.Position;

    getIndexFromLoc(location: ESTree.Position): number;

    // Inherited methods from TokenStore
    // ---------------------------------

    getTokenByRangeStart(offset: number, options?: { includeComments: false }): AST.Token | null;
    getTokenByRangeStart(offset: number, options: { includeComments: boolean }): AST.Token | ESTree.Comment | null;

    getFirstToken: SourceCode.UnaryNodeCursorWithSkipOptions;

    getFirstTokens: SourceCode.UnaryNodeCursorWithCountOptions;

    getLastToken: SourceCode.UnaryNodeCursorWithSkipOptions;

    getLastTokens: SourceCode.UnaryNodeCursorWithCountOptions;

    getTokenBefore: SourceCode.UnaryCursorWithSkipOptions;

    getTokensBefore: SourceCode.UnaryCursorWithCountOptions;

    getTokenAfter: SourceCode.UnaryCursorWithSkipOptions;

    getTokensAfter: SourceCode.UnaryCursorWithCountOptions;

    getFirstTokenBetween: SourceCode.BinaryCursorWithSkipOptions;

    getFirstTokensBetween: SourceCode.BinaryCursorWithCountOptions;

    getLastTokenBetween: SourceCode.BinaryCursorWithSkipOptions;

    getLastTokensBetween: SourceCode.BinaryCursorWithCountOptions;

    getTokensBetween: SourceCode.BinaryCursorWithCountOptions;

    getTokens:
        & ((node: ESTree.Node, beforeCount?: number, afterCount?: number) => AST.Token[])
        & SourceCode.UnaryNodeCursorWithCountOptions;

    commentsExistBetween(
        left: ESTree.Node | AST.Token | ESTree.Comment,
        right: ESTree.Node | AST.Token | ESTree.Comment,
    ): boolean;

    getCommentsBefore(nodeOrToken: ESTree.Node | AST.Token): ESTree.Comment[];

    getCommentsAfter(nodeOrToken: ESTree.Node | AST.Token): ESTree.Comment[];

    getCommentsInside(node: ESTree.Node): ESTree.Comment[];

    getScope(node: ESTree.Node): Scope.Scope;

    isSpaceBetween(
        first: ESTree.Node | AST.Token,
        second: ESTree.Node | AST.Token,
    ): boolean;

    markVariableAsUsed(name: string, refNode?: ESTree.Node): boolean;
}

export namespace SourceCode {
    interface Config {
        text: string;
        ast: AST.Program;
        parserServices?: ParserServices | undefined;
        scopeManager?: Scope.ScopeManager | undefined;
        visitorKeys?: VisitorKeys | undefined;
    }

    type ParserServices = any;

    interface VisitorKeys {
        [nodeType: string]: string[];
    }

    interface UnaryNodeCursorWithSkipOptions {
        <T extends AST.Token>(
            node: ESTree.Node,
            options:
                | ((token: AST.Token) => token is T)
                | {
                    filter: (token: AST.Token) => token is T;
                    includeComments?: false | undefined;
                    skip?: number | undefined;
                },
        ): T | null;
        <T extends AST.Token | ESTree.Comment>(
            node: ESTree.Node,
            options: {
                filter: (tokenOrComment: AST.Token | ESTree.Comment) => tokenOrComment is T;
                includeComments: boolean;
                skip?: number | undefined;
            },
        ): T | null;
        (
            node: ESTree.Node,
            options?:
                | {
                    filter?: ((token: AST.Token) => boolean) | undefined;
                    includeComments?: false | undefined;
                    skip?: number | undefined;
                }
                | ((token: AST.Token) => boolean)
                | number,
        ): AST.Token | null;
        (
            node: ESTree.Node,
            options: {
                filter?: ((token: AST.Token | ESTree.Comment) => boolean) | undefined;
                includeComments: boolean;
                skip?: number | undefined;
            },
        ): AST.Token | ESTree.Comment | null;
    }

    interface UnaryNodeCursorWithCountOptions {
        <T extends AST.Token>(
            node: ESTree.Node,
            options:
                | ((token: AST.Token) => token is T)
                | {
                    filter: (token: AST.Token) => token is T;
                    includeComments?: false | undefined;
                    count?: number | undefined;
                },
        ): T[];
        <T extends AST.Token | ESTree.Comment>(
            node: ESTree.Node,
            options: {
                filter: (tokenOrComment: AST.Token | ESTree.Comment) => tokenOrComment is T;
                includeComments: boolean;
                count?: number | undefined;
            },
        ): T[];
        (
            node: ESTree.Node,
            options?:
                | {
                    filter?: ((token: AST.Token) => boolean) | undefined;
                    includeComments?: false | undefined;
                    count?: number | undefined;
                }
                | ((token: AST.Token) => boolean)
                | number,
        ): AST.Token[];
        (
            node: ESTree.Node,
            options: {
                filter?: ((token: AST.Token | ESTree.Comment) => boolean) | undefined;
                includeComments: boolean;
                count?: number | undefined;
            },
        ): Array<AST.Token | ESTree.Comment>;
    }

    interface UnaryCursorWithSkipOptions {
        <T extends AST.Token>(
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options:
                | ((token: AST.Token) => token is T)
                | {
                    filter: (token: AST.Token) => token is T;
                    includeComments?: false | undefined;
                    skip?: number | undefined;
                },
        ): T | null;
        <T extends AST.Token | ESTree.Comment>(
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter: (tokenOrComment: AST.Token | ESTree.Comment) => tokenOrComment is T;
                includeComments: boolean;
                skip?: number | undefined;
            },
        ): T | null;
        (
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options?:
                | {
                    filter?: ((token: AST.Token) => boolean) | undefined;
                    includeComments?: false | undefined;
                    skip?: number | undefined;
                }
                | ((token: AST.Token) => boolean)
                | number,
        ): AST.Token | null;
        (
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter?: ((token: AST.Token | ESTree.Comment) => boolean) | undefined;
                includeComments: boolean;
                skip?: number | undefined;
            },
        ): AST.Token | ESTree.Comment | null;
    }

    interface UnaryCursorWithCountOptions {
        <T extends AST.Token>(
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options:
                | ((token: AST.Token) => token is T)
                | {
                    filter: (token: AST.Token) => token is T;
                    includeComments?: false | undefined;
                    count?: number | undefined;
                },
        ): T[];
        <T extends AST.Token | ESTree.Comment>(
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter: (tokenOrComment: AST.Token | ESTree.Comment) => tokenOrComment is T;
                includeComments: boolean;
                count?: number | undefined;
            },
        ): T[];
        (
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options?:
                | {
                    filter?: ((token: AST.Token) => boolean) | undefined;
                    includeComments?: false | undefined;
                    count?: number | undefined;
                }
                | ((token: AST.Token) => boolean)
                | number,
        ): AST.Token[];
        (
            node: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter?: ((token: AST.Token | ESTree.Comment) => boolean) | undefined;
                includeComments: boolean;
                count?: number | undefined;
            },
        ): Array<AST.Token | ESTree.Comment>;
    }

    interface BinaryCursorWithSkipOptions {
        <T extends AST.Token>(
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options:
                | ((token: AST.Token) => token is T)
                | {
                    filter: (token: AST.Token) => token is T;
                    includeComments?: false | undefined;
                    skip?: number | undefined;
                },
        ): T | null;
        <T extends AST.Token | ESTree.Comment>(
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter: (tokenOrComment: AST.Token | ESTree.Comment) => tokenOrComment is T;
                includeComments: boolean;
                skip?: number | undefined;
            },
        ): T | null;
        (
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options?:
                | {
                    filter?: ((token: AST.Token) => boolean) | undefined;
                    includeComments?: false | undefined;
                    skip?: number | undefined;
                }
                | ((token: AST.Token) => boolean)
                | number,
        ): AST.Token | null;
        (
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter?: ((token: AST.Token | ESTree.Comment) => boolean) | undefined;
                includeComments: boolean;
                skip?: number | undefined;
            },
        ): AST.Token | ESTree.Comment | null;
    }

    interface BinaryCursorWithCountOptions {
        <T extends AST.Token>(
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options:
                | ((token: AST.Token) => token is T)
                | {
                    filter: (token: AST.Token) => token is T;
                    includeComments?: false | undefined;
                    count?: number | undefined;
                },
        ): T[];
        <T extends AST.Token | ESTree.Comment>(
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter: (tokenOrComment: AST.Token | ESTree.Comment) => tokenOrComment is T;
                includeComments: boolean;
                count?: number | undefined;
            },
        ): T[];
        (
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options?:
                | {
                    filter?: ((token: AST.Token) => boolean) | undefined;
                    includeComments?: false | undefined;
                    count?: number | undefined;
                }
                | ((token: AST.Token) => boolean)
                | number,
        ): AST.Token[];
        (
            left: ESTree.Node | AST.Token | ESTree.Comment,
            right: ESTree.Node | AST.Token | ESTree.Comment,
            options: {
                filter?: ((token: AST.Token | ESTree.Comment) => boolean) | undefined;
                includeComments: boolean;
                count?: number | undefined;
            },
        ): Array<AST.Token | ESTree.Comment>;
    }
}

// #endregion

export namespace Rule {
    interface RuleModule {
        create(context: RuleContext): RuleListener;
        meta?: RuleMetaData | undefined;
    }

    type NodeTypes = ESTree.Node["type"];
    interface NodeListener {
        ArrayExpression?: ((node: ESTree.ArrayExpression & NodeParentExtension) => void) | undefined;
        "ArrayExpression:exit"?: ((node: ESTree.ArrayExpression & NodeParentExtension) => void) | undefined;
        ArrayPattern?: ((node: ESTree.ArrayPattern & NodeParentExtension) => void) | undefined;
        "ArrayPattern:exit"?: ((node: ESTree.ArrayPattern & NodeParentExtension) => void) | undefined;
        ArrowFunctionExpression?: ((node: ESTree.ArrowFunctionExpression & NodeParentExtension) => void) | undefined;
        "ArrowFunctionExpression:exit"?:
            | ((node: ESTree.ArrowFunctionExpression & NodeParentExtension) => void)
            | undefined;
        AssignmentExpression?: ((node: ESTree.AssignmentExpression & NodeParentExtension) => void) | undefined;
        "AssignmentExpression:exit"?: ((node: ESTree.AssignmentExpression & NodeParentExtension) => void) | undefined;
        AssignmentPattern?: ((node: ESTree.AssignmentPattern & NodeParentExtension) => void) | undefined;
        "AssignmentPattern:exit"?: ((node: ESTree.AssignmentPattern & NodeParentExtension) => void) | undefined;
        AwaitExpression?: ((node: ESTree.AwaitExpression & NodeParentExtension) => void) | undefined;
        "AwaitExpression:exit"?: ((node: ESTree.AwaitExpression & NodeParentExtension) => void) | undefined;
        BinaryExpression?: ((node: ESTree.BinaryExpression & NodeParentExtension) => void) | undefined;
        "BinaryExpression:exit"?: ((node: ESTree.BinaryExpression & NodeParentExtension) => void) | undefined;
        BlockStatement?: ((node: ESTree.BlockStatement & NodeParentExtension) => void) | undefined;
        "BlockStatement:exit"?: ((node: ESTree.BlockStatement & NodeParentExtension) => void) | undefined;
        BreakStatement?: ((node: ESTree.BreakStatement & NodeParentExtension) => void) | undefined;
        "BreakStatement:exit"?: ((node: ESTree.BreakStatement & NodeParentExtension) => void) | undefined;
        CallExpression?: ((node: ESTree.CallExpression & NodeParentExtension) => void) | undefined;
        "CallExpression:exit"?: ((node: ESTree.CallExpression & NodeParentExtension) => void) | undefined;
        CatchClause?: ((node: ESTree.CatchClause & NodeParentExtension) => void) | undefined;
        "CatchClause:exit"?: ((node: ESTree.CatchClause & NodeParentExtension) => void) | undefined;
        ChainExpression?: ((node: ESTree.ChainExpression & NodeParentExtension) => void) | undefined;
        "ChainExpression:exit"?: ((node: ESTree.ChainExpression & NodeParentExtension) => void) | undefined;
        ClassBody?: ((node: ESTree.ClassBody & NodeParentExtension) => void) | undefined;
        "ClassBody:exit"?: ((node: ESTree.ClassBody & NodeParentExtension) => void) | undefined;
        ClassDeclaration?: ((node: ESTree.ClassDeclaration & NodeParentExtension) => void) | undefined;
        "ClassDeclaration:exit"?: ((node: ESTree.ClassDeclaration & NodeParentExtension) => void) | undefined;
        ClassExpression?: ((node: ESTree.ClassExpression & NodeParentExtension) => void) | undefined;
        "ClassExpression:exit"?: ((node: ESTree.ClassExpression & NodeParentExtension) => void) | undefined;
        ConditionalExpression?: ((node: ESTree.ConditionalExpression & NodeParentExtension) => void) | undefined;
        "ConditionalExpression:exit"?: ((node: ESTree.ConditionalExpression & NodeParentExtension) => void) | undefined;
        ContinueStatement?: ((node: ESTree.ContinueStatement & NodeParentExtension) => void) | undefined;
        "ContinueStatement:exit"?: ((node: ESTree.ContinueStatement & NodeParentExtension) => void) | undefined;
        DebuggerStatement?: ((node: ESTree.DebuggerStatement & NodeParentExtension) => void) | undefined;
        "DebuggerStatement:exit"?: ((node: ESTree.DebuggerStatement & NodeParentExtension) => void) | undefined;
        DoWhileStatement?: ((node: ESTree.DoWhileStatement & NodeParentExtension) => void) | undefined;
        "DoWhileStatement:exit"?: ((node: ESTree.DoWhileStatement & NodeParentExtension) => void) | undefined;
        EmptyStatement?: ((node: ESTree.EmptyStatement & NodeParentExtension) => void) | undefined;
        "EmptyStatement:exit"?: ((node: ESTree.EmptyStatement & NodeParentExtension) => void) | undefined;
        ExportAllDeclaration?: ((node: ESTree.ExportAllDeclaration & NodeParentExtension) => void) | undefined;
        "ExportAllDeclaration:exit"?: ((node: ESTree.ExportAllDeclaration & NodeParentExtension) => void) | undefined;
        ExportDefaultDeclaration?: ((node: ESTree.ExportDefaultDeclaration & NodeParentExtension) => void) | undefined;
        "ExportDefaultDeclaration:exit"?:
            | ((node: ESTree.ExportDefaultDeclaration & NodeParentExtension) => void)
            | undefined;
        ExportNamedDeclaration?: ((node: ESTree.ExportNamedDeclaration & NodeParentExtension) => void) | undefined;
        "ExportNamedDeclaration:exit"?:
            | ((node: ESTree.ExportNamedDeclaration & NodeParentExtension) => void)
            | undefined;
        ExportSpecifier?: ((node: ESTree.ExportSpecifier & NodeParentExtension) => void) | undefined;
        "ExportSpecifier:exit"?: ((node: ESTree.ExportSpecifier & NodeParentExtension) => void) | undefined;
        ExpressionStatement?: ((node: ESTree.ExpressionStatement & NodeParentExtension) => void) | undefined;
        "ExpressionStatement:exit"?: ((node: ESTree.ExpressionStatement & NodeParentExtension) => void) | undefined;
        ForInStatement?: ((node: ESTree.ForInStatement & NodeParentExtension) => void) | undefined;
        "ForInStatement:exit"?: ((node: ESTree.ForInStatement & NodeParentExtension) => void) | undefined;
        ForOfStatement?: ((node: ESTree.ForOfStatement & NodeParentExtension) => void) | undefined;
        "ForOfStatement:exit"?: ((node: ESTree.ForOfStatement & NodeParentExtension) => void) | undefined;
        ForStatement?: ((node: ESTree.ForStatement & NodeParentExtension) => void) | undefined;
        "ForStatement:exit"?: ((node: ESTree.ForStatement & NodeParentExtension) => void) | undefined;
        FunctionDeclaration?: ((node: ESTree.FunctionDeclaration & NodeParentExtension) => void) | undefined;
        "FunctionDeclaration:exit"?: ((node: ESTree.FunctionDeclaration & NodeParentExtension) => void) | undefined;
        FunctionExpression?: ((node: ESTree.FunctionExpression & NodeParentExtension) => void) | undefined;
        "FunctionExpression:exit"?: ((node: ESTree.FunctionExpression & NodeParentExtension) => void) | undefined;
        Identifier?: ((node: ESTree.Identifier & NodeParentExtension) => void) | undefined;
        "Identifier:exit"?: ((node: ESTree.Identifier & NodeParentExtension) => void) | undefined;
        IfStatement?: ((node: ESTree.IfStatement & NodeParentExtension) => void) | undefined;
        "IfStatement:exit"?: ((node: ESTree.IfStatement & NodeParentExtension) => void) | undefined;
        ImportDeclaration?: ((node: ESTree.ImportDeclaration & NodeParentExtension) => void) | undefined;
        "ImportDeclaration:exit"?: ((node: ESTree.ImportDeclaration & NodeParentExtension) => void) | undefined;
        ImportDefaultSpecifier?: ((node: ESTree.ImportDefaultSpecifier & NodeParentExtension) => void) | undefined;
        "ImportDefaultSpecifier:exit"?:
            | ((node: ESTree.ImportDefaultSpecifier & NodeParentExtension) => void)
            | undefined;
        ImportExpression?: ((node: ESTree.ImportExpression & NodeParentExtension) => void) | undefined;
        "ImportExpression:exit"?: ((node: ESTree.ImportExpression & NodeParentExtension) => void) | undefined;
        ImportNamespaceSpecifier?: ((node: ESTree.ImportNamespaceSpecifier & NodeParentExtension) => void) | undefined;
        "ImportNamespaceSpecifier:exit"?:
            | ((node: ESTree.ImportNamespaceSpecifier & NodeParentExtension) => void)
            | undefined;
        ImportSpecifier?: ((node: ESTree.ImportSpecifier & NodeParentExtension) => void) | undefined;
        "ImportSpecifier:exit"?: ((node: ESTree.ImportSpecifier & NodeParentExtension) => void) | undefined;
        LabeledStatement?: ((node: ESTree.LabeledStatement & NodeParentExtension) => void) | undefined;
        "LabeledStatement:exit"?: ((node: ESTree.LabeledStatement & NodeParentExtension) => void) | undefined;
        Literal?: ((node: ESTree.Literal & NodeParentExtension) => void) | undefined;
        "Literal:exit"?: ((node: ESTree.Literal & NodeParentExtension) => void) | undefined;
        LogicalExpression?: ((node: ESTree.LogicalExpression & NodeParentExtension) => void) | undefined;
        "LogicalExpression:exit"?: ((node: ESTree.LogicalExpression & NodeParentExtension) => void) | undefined;
        MemberExpression?: ((node: ESTree.MemberExpression & NodeParentExtension) => void) | undefined;
        "MemberExpression:exit"?: ((node: ESTree.MemberExpression & NodeParentExtension) => void) | undefined;
        MetaProperty?: ((node: ESTree.MetaProperty & NodeParentExtension) => void) | undefined;
        "MetaProperty:exit"?: ((node: ESTree.MetaProperty & NodeParentExtension) => void) | undefined;
        MethodDefinition?: ((node: ESTree.MethodDefinition & NodeParentExtension) => void) | undefined;
        "MethodDefinition:exit"?: ((node: ESTree.MethodDefinition & NodeParentExtension) => void) | undefined;
        NewExpression?: ((node: ESTree.NewExpression & NodeParentExtension) => void) | undefined;
        "NewExpression:exit"?: ((node: ESTree.NewExpression & NodeParentExtension) => void) | undefined;
        ObjectExpression?: ((node: ESTree.ObjectExpression & NodeParentExtension) => void) | undefined;
        "ObjectExpression:exit"?: ((node: ESTree.ObjectExpression & NodeParentExtension) => void) | undefined;
        ObjectPattern?: ((node: ESTree.ObjectPattern & NodeParentExtension) => void) | undefined;
        "ObjectPattern:exit"?: ((node: ESTree.ObjectPattern & NodeParentExtension) => void) | undefined;
        PrivateIdentifier?: ((node: ESTree.PrivateIdentifier & NodeParentExtension) => void) | undefined;
        "PrivateIdentifier:exit"?: ((node: ESTree.PrivateIdentifier & NodeParentExtension) => void) | undefined;
        Program?: ((node: ESTree.Program) => void) | undefined;
        "Program:exit"?: ((node: ESTree.Program) => void) | undefined;
        Property?: ((node: ESTree.Property & NodeParentExtension) => void) | undefined;
        "Property:exit"?: ((node: ESTree.Property & NodeParentExtension) => void) | undefined;
        PropertyDefinition?: ((node: ESTree.PropertyDefinition & NodeParentExtension) => void) | undefined;
        "PropertyDefinition:exit"?: ((node: ESTree.PropertyDefinition & NodeParentExtension) => void) | undefined;
        RestElement?: ((node: ESTree.RestElement & NodeParentExtension) => void) | undefined;
        "RestElement:exit"?: ((node: ESTree.RestElement & NodeParentExtension) => void) | undefined;
        ReturnStatement?: ((node: ESTree.ReturnStatement & NodeParentExtension) => void) | undefined;
        "ReturnStatement:exit"?: ((node: ESTree.ReturnStatement & NodeParentExtension) => void) | undefined;
        SequenceExpression?: ((node: ESTree.SequenceExpression & NodeParentExtension) => void) | undefined;
        "SequenceExpression:exit"?: ((node: ESTree.SequenceExpression & NodeParentExtension) => void) | undefined;
        SpreadElement?: ((node: ESTree.SpreadElement & NodeParentExtension) => void) | undefined;
        "SpreadElement:exit"?: ((node: ESTree.SpreadElement & NodeParentExtension) => void) | undefined;
        StaticBlock?: ((node: ESTree.StaticBlock & NodeParentExtension) => void) | undefined;
        "StaticBlock:exit"?: ((node: ESTree.StaticBlock & NodeParentExtension) => void) | undefined;
        Super?: ((node: ESTree.Super & NodeParentExtension) => void) | undefined;
        "Super:exit"?: ((node: ESTree.Super & NodeParentExtension) => void) | undefined;
        SwitchCase?: ((node: ESTree.SwitchCase & NodeParentExtension) => void) | undefined;
        "SwitchCase:exit"?: ((node: ESTree.SwitchCase & NodeParentExtension) => void) | undefined;
        SwitchStatement?: ((node: ESTree.SwitchStatement & NodeParentExtension) => void) | undefined;
        "SwitchStatement:exit"?: ((node: ESTree.SwitchStatement & NodeParentExtension) => void) | undefined;
        TaggedTemplateExpression?: ((node: ESTree.TaggedTemplateExpression & NodeParentExtension) => void) | undefined;
        "TaggedTemplateExpression:exit"?:
            | ((node: ESTree.TaggedTemplateExpression & NodeParentExtension) => void)
            | undefined;
        TemplateElement?: ((node: ESTree.TemplateElement & NodeParentExtension) => void) | undefined;
        "TemplateElement:exit"?: ((node: ESTree.TemplateElement & NodeParentExtension) => void) | undefined;
        TemplateLiteral?: ((node: ESTree.TemplateLiteral & NodeParentExtension) => void) | undefined;
        "TemplateLiteral:exit"?: ((node: ESTree.TemplateLiteral & NodeParentExtension) => void) | undefined;
        ThisExpression?: ((node: ESTree.ThisExpression & NodeParentExtension) => void) | undefined;
        "ThisExpression:exit"?: ((node: ESTree.ThisExpression & NodeParentExtension) => void) | undefined;
        ThrowStatement?: ((node: ESTree.ThrowStatement & NodeParentExtension) => void) | undefined;
        "ThrowStatement:exit"?: ((node: ESTree.ThrowStatement & NodeParentExtension) => void) | undefined;
        TryStatement?: ((node: ESTree.TryStatement & NodeParentExtension) => void) | undefined;
        "TryStatement:exit"?: ((node: ESTree.TryStatement & NodeParentExtension) => void) | undefined;
        UnaryExpression?: ((node: ESTree.UnaryExpression & NodeParentExtension) => void) | undefined;
        "UnaryExpression:exit"?: ((node: ESTree.UnaryExpression & NodeParentExtension) => void) | undefined;
        UpdateExpression?: ((node: ESTree.UpdateExpression & NodeParentExtension) => void) | undefined;
        "UpdateExpression:exit"?: ((node: ESTree.UpdateExpression & NodeParentExtension) => void) | undefined;
        VariableDeclaration?: ((node: ESTree.VariableDeclaration & NodeParentExtension) => void) | undefined;
        "VariableDeclaration:exit"?: ((node: ESTree.VariableDeclaration & NodeParentExtension) => void) | undefined;
        VariableDeclarator?: ((node: ESTree.VariableDeclarator & NodeParentExtension) => void) | undefined;
        "VariableDeclarator:exit"?: ((node: ESTree.VariableDeclarator & NodeParentExtension) => void) | undefined;
        WhileStatement?: ((node: ESTree.WhileStatement & NodeParentExtension) => void) | undefined;
        "WhileStatement:exit"?: ((node: ESTree.WhileStatement & NodeParentExtension) => void) | undefined;
        WithStatement?: ((node: ESTree.WithStatement & NodeParentExtension) => void) | undefined;
        "WithStatement:exit"?: ((node: ESTree.WithStatement & NodeParentExtension) => void) | undefined;
        YieldExpression?: ((node: ESTree.YieldExpression & NodeParentExtension) => void) | undefined;
        "YieldExpression:exit"?: ((node: ESTree.YieldExpression & NodeParentExtension) => void) | undefined;
    }

    interface NodeParentExtension {
        parent: Node;
    }
    type Node = ESTree.Node & NodeParentExtension;

    interface RuleListener extends NodeListener {
        onCodePathStart?(codePath: CodePath, node: Node): void;

        onCodePathEnd?(codePath: CodePath, node: Node): void;

        onCodePathSegmentStart?(segment: CodePathSegment, node: Node): void;

        onCodePathSegmentEnd?(segment: CodePathSegment, node: Node): void;

        onCodePathSegmentLoop?(fromSegment: CodePathSegment, toSegment: CodePathSegment, node: Node): void;

        [key: string]:
            | ((codePath: CodePath, node: Node) => void)
            | ((segment: CodePathSegment, node: Node) => void)
            | ((fromSegment: CodePathSegment, toSegment: CodePathSegment, node: Node) => void)
            | ((node: Node) => void)
            | NodeListener[keyof NodeListener]
            | undefined;
    }

    type CodePathOrigin = "program" | "function" | "class-field-initializer" | "class-static-block";

    interface CodePath {
        id: string;
        origin: CodePathOrigin;
        initialSegment: CodePathSegment;
        finalSegments: CodePathSegment[];
        returnedSegments: CodePathSegment[];
        thrownSegments: CodePathSegment[];
        upper: CodePath | null;
        childCodePaths: CodePath[];
    }

    interface CodePathSegment {
        id: string;
        nextSegments: CodePathSegment[];
        prevSegments: CodePathSegment[];
        reachable: boolean;
    }

    interface RuleMetaData {
        /** Properties often used for documentation generation and tooling. */
        docs?: {
            /** Provides a short description of the rule. Commonly used when generating lists of rules. */
            description?: string | undefined;
            /** Historically used by some plugins that divide rules into categories in their documentation. */
            category?: string | undefined;
            /** Historically used by some plugins to indicate a rule belongs in their `recommended` configuration. */
            recommended?: boolean | undefined;
            /** Specifies the URL at which the full documentation can be accessed. Code editors often use this to provide a helpful link on highlighted rule violations. */
            url?: string | undefined;
        } | undefined;
        /** Violation and suggestion messages. */
        messages?: { [messageId: string]: string } | undefined;
        /**
         * Specifies if the `--fix` option on the command line automatically fixes problems reported by the rule.
         * Mandatory for fixable rules.
         */
        fixable?: "code" | "whitespace" | undefined;
        /**
         * Specifies the [options](https://eslint.org/docs/latest/extend/custom-rules#options-schemas)
         * so ESLint can prevent invalid [rule configurations](https://eslint.org/docs/latest/use/configure/rules#configuring-rules).
         * Mandatory for rules with options.
         */
        schema?: JSONSchema4 | JSONSchema4[] | false | undefined;

        /** Indicates whether the rule has been deprecated. Omit if not deprecated. */
        deprecated?: boolean | undefined;
        /** The name of the rule(s) this rule was replaced by, if it was deprecated. */
        replacedBy?: readonly string[];

        /**
         * Indicates the type of rule:
         * - `"problem"` means the rule is identifying code that either will cause an error or may cause a confusing behavior. Developers should consider this a high priority to resolve.
         * - `"suggestion"` means the rule is identifying something that could be done in a better way but no errors will occur if the code isn’t changed.
         * - `"layout"` means the rule cares primarily about whitespace, semicolons, commas, and parentheses,
         *   all the parts of the program that determine how the code looks rather than how it executes.
         *   These rules work on parts of the code that aren’t specified in the AST.
         */
        type?: "problem" | "suggestion" | "layout" | undefined;
        /**
         * Specifies whether the rule can return suggestions (defaults to `false` if omitted).
         * Mandatory for rules that provide suggestions.
         */
        hasSuggestions?: boolean | undefined;
    }

    interface RuleContext {
        id: string;
        options: any[];
        settings: { [name: string]: any };
        parserPath: string | undefined;
        languageOptions: Linter.LanguageOptions;
        parserOptions: Linter.ParserOptions;
        cwd: string;
        filename: string;
        physicalFilename: string;
        sourceCode: SourceCode;

        getAncestors(): ESTree.Node[];

        getDeclaredVariables(node: ESTree.Node): Scope.Variable[];

        /** @deprecated Use property `filename` directly instead */
        getFilename(): string;

        /** @deprecated Use property `physicalFilename` directly instead */
        getPhysicalFilename(): string;

        /** @deprecated Use property `cwd` directly instead */
        getCwd(): string;

        getScope(): Scope.Scope;

        /** @deprecated Use property `sourceCode` directly instead */
        getSourceCode(): SourceCode;

        markVariableAsUsed(name: string): boolean;

        report(descriptor: ReportDescriptor): void;
    }

    type ReportFixer = (fixer: RuleFixer) => null | Fix | IterableIterator<Fix> | Fix[];

    interface ReportDescriptorOptionsBase {
        data?: { [key: string]: string };

        fix?: null | ReportFixer;
    }

    interface SuggestionReportOptions {
        data?: { [key: string]: string };

        fix: ReportFixer;
    }

    type SuggestionDescriptorMessage = { desc: string } | { messageId: string };
    type SuggestionReportDescriptor = SuggestionDescriptorMessage & SuggestionReportOptions;

    interface ReportDescriptorOptions extends ReportDescriptorOptionsBase {
        suggest?: SuggestionReportDescriptor[] | null | undefined;
    }

    type ReportDescriptor = ReportDescriptorMessage & ReportDescriptorLocation & ReportDescriptorOptions;
    type ReportDescriptorMessage = { message: string } | { messageId: string };
    type ReportDescriptorLocation =
        | { node: ESTree.Node }
        | { loc: AST.SourceLocation | { line: number; column: number } };

    interface RuleFixer {
        insertTextAfter(nodeOrToken: ESTree.Node | AST.Token, text: string): Fix;

        insertTextAfterRange(range: AST.Range, text: string): Fix;

        insertTextBefore(nodeOrToken: ESTree.Node | AST.Token, text: string): Fix;

        insertTextBeforeRange(range: AST.Range, text: string): Fix;

        remove(nodeOrToken: ESTree.Node | AST.Token): Fix;

        removeRange(range: AST.Range): Fix;

        replaceText(nodeOrToken: ESTree.Node | AST.Token, text: string): Fix;

        replaceTextRange(range: AST.Range, text: string): Fix;
    }

    interface Fix {
        range: AST.Range;
        text: string;
    }
}

// #region Linter

export class Linter {
    static readonly version: string;

    version: string;

    constructor(options?: { cwd?: string | undefined; configType?: "flat" | "eslintrc" });

    verify(
        code: SourceCode | string,
        config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
        filename?: string,
    ): Linter.LintMessage[];
    verify(
        code: SourceCode | string,
        config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
        options: Linter.LintOptions,
    ): Linter.LintMessage[];

    verifyAndFix(
        code: string,
        config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
        filename?: string,
    ): Linter.FixReport;
    verifyAndFix(
        code: string,
        config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
        options: Linter.FixOptions,
    ): Linter.FixReport;

    getSourceCode(): SourceCode;

    defineRule(name: string, rule: Rule.RuleModule): void;

    defineRules(rules: { [name: string]: Rule.RuleModule }): void;

    getRules(): Map<string, Rule.RuleModule>;

    defineParser(name: string, parser: Linter.Parser): void;

    getTimes(): Linter.Stats["times"];

    getFixPassCount(): Linter.Stats["fixPasses"];
}

export namespace Linter {
    /**
     * The numeric severity level for a rule.
     *
     * - `0` means off.
     * - `1` means warn.
     * - `2` means error.
     *
     * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)
     */
    type Severity = 0 | 1 | 2;

    /**
     * The human readable severity level for a rule.
     *
     * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)
     */
    type StringSeverity = "off" | "warn" | "error";

    /**
     * The numeric or human readable severity level for a rule.
     *
     * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)
     */
    type RuleSeverity = Severity | StringSeverity;

    /**
     * An array containing the rule severity level, followed by the rule options.
     *
     * @see [Rules](https://eslint.org/docs/latest/use/configure/rules)
     */
    type RuleSeverityAndOptions<Options extends any[] = any[]> = [RuleSeverity, ...Partial<Options>];

    /**
     * The severity level for the rule or an array containing the rule severity level, followed by the rule options.
     *
     * @see [Rules](https://eslint.org/docs/latest/use/configure/rules)
     */
    type RuleEntry<Options extends any[] = any[]> = RuleSeverity | RuleSeverityAndOptions<Options>;

    /**
     * The rules config object is a key/value map of rule names and their severity and options.
     */
    interface RulesRecord {
        [rule: string]: RuleEntry;
    }

    /**
     * A configuration object that may have a `rules` block.
     */
    interface HasRules<Rules extends RulesRecord = RulesRecord> {
        rules?: Partial<Rules> | undefined;
    }

    /**
     * The ECMAScript version of the code being linted.
     */
    type EcmaVersion =
        | 3
        | 5
        | 6
        | 7
        | 8
        | 9
        | 10
        | 11
        | 12
        | 13
        | 14
        | 15
        | 16
        | 2015
        | 2016
        | 2017
        | 2018
        | 2019
        | 2020
        | 2021
        | 2022
        | 2023
        | 2024
        | 2025
        | "latest";

    /**
     * The type of JavaScript source code.
     */
    type SourceType = "script" | "module" | "commonjs";

    /**
     * ESLint legacy configuration.
     *
     * @see [ESLint Legacy Configuration](https://eslint.org/docs/latest/use/configure/)
     */
    interface BaseConfig<Rules extends RulesRecord = RulesRecord, OverrideRules extends RulesRecord = Rules>
        extends HasRules<Rules>
    {
        $schema?: string | undefined;

        /**
         * An environment provides predefined global variables.
         *
         * @see [Environments](https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-environments)
         */
        env?: { [name: string]: boolean } | undefined;

        /**
         * Extending configuration files.
         *
         * @see [Extends](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#extending-configuration-files)
         */
        extends?: string | string[] | undefined;

        /**
         * Specifying globals.
         *
         * @see [Globals](https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-globals)
         */
        globals?: Linter.Globals | undefined;

        /**
         * Disable processing of inline comments.
         *
         * @see [Disabling Inline Comments](https://eslint.org/docs/latest/use/configure/rules-deprecated#disabling-inline-comments)
         */
        noInlineConfig?: boolean | undefined;

        /**
         * Overrides can be used to use a differing configuration for matching sub-directories and files.
         *
         * @see [How do overrides work](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#how-do-overrides-work)
         */
        overrides?: Array<ConfigOverride<OverrideRules>> | undefined;

        /**
         * Parser.
         *
         * @see [Working with Custom Parsers](https://eslint.org/docs/latest/extend/custom-parsers)
         * @see [Specifying Parser](https://eslint.org/docs/latest/use/configure/parser-deprecated)
         */
        parser?: string | undefined;

        /**
         * Parser options.
         *
         * @see [Working with Custom Parsers](https://eslint.org/docs/latest/extend/custom-parsers)
         * @see [Specifying Parser Options](https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-parser-options)
         */
        parserOptions?: ParserOptions | undefined;

        /**
         * Which third-party plugins define additional rules, environments, configs, etc. for ESLint to use.
         *
         * @see [Configuring Plugins](https://eslint.org/docs/latest/use/configure/plugins-deprecated#configure-plugins)
         */
        plugins?: string[] | undefined;

        /**
         * Specifying processor.
         *
         * @see [processor](https://eslint.org/docs/latest/use/configure/plugins-deprecated#specify-a-processor)
         */
        processor?: string | undefined;

        /**
         * Report unused eslint-disable comments as warning.
         *
         * @see [Report unused eslint-disable comments](https://eslint.org/docs/latest/use/configure/rules-deprecated#report-unused-eslint-disable-comments)
         */
        reportUnusedDisableDirectives?: boolean | undefined;

        /**
         * Settings.
         *
         * @see [Settings](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#adding-shared-settings)
         */
        settings?: { [name: string]: any } | undefined;
    }

    /**
     * The overwrites that apply more differing configuration to specific files or directories.
     */
    interface ConfigOverride<Rules extends RulesRecord = RulesRecord> extends BaseConfig<Rules> {
        /**
         * The glob patterns for excluded files.
         */
        excludedFiles?: string | string[] | undefined;

        /**
         * The glob patterns for target files.
         */
        files: string | string[];
    }

    /**
     * ESLint legacy configuration.
     *
     * @see [ESLint Legacy Configuration](https://eslint.org/docs/latest/use/configure/)
     */
    // https://github.com/eslint/eslint/blob/v8.57.0/conf/config-schema.js
    interface LegacyConfig<Rules extends RulesRecord = RulesRecord, OverrideRules extends RulesRecord = Rules>
        extends BaseConfig<Rules, OverrideRules>
    {
        /**
         * Tell ESLint to ignore specific files and directories.
         *
         * @see [Ignore Patterns](https://eslint.org/docs/latest/use/configure/ignore-deprecated#ignorepatterns-in-config-files)
         */
        ignorePatterns?: string | string[] | undefined;

        /**
         * @see [Using Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#using-configuration-files)
         */
        root?: boolean | undefined;
    }

    /**
     * Parser options.
     *
     * @see [Specifying Parser Options](https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-parser-options)
     */
    interface ParserOptions {
        /**
         * Accepts any valid ECMAScript version number or `'latest'`:
         *
         * - A version: es3, es5, es6, es7, es8, es9, es10, es11, es12, es13, es14, ..., or
         * - A year: es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022, es2023, ..., or
         * - `'latest'`
         *
         * When it's a version or a year, the value must be a number - so do not include the `es` prefix.
         *
         * Specifies the version of ECMAScript syntax you want to use. This is used by the parser to determine how to perform scope analysis, and it affects the default
         *
         * @default 5
         */
        ecmaVersion?: EcmaVersion | undefined;

        /**
         * The type of JavaScript source code. Possible values are "script" for
         * traditional script files, "module" for ECMAScript modules (ESM), and
         * "commonjs" for CommonJS files.
         *
         * @default 'script'
         *
         * @see https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-parser-options
         */
        sourceType?: SourceType | undefined;

        /**
         * An object indicating which additional language features you'd like to use.
         *
         * @see https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-parser-options
         */
        ecmaFeatures?: {
            globalReturn?: boolean | undefined;
            impliedStrict?: boolean | undefined;
            jsx?: boolean | undefined;
            experimentalObjectRestSpread?: boolean | undefined;
            [key: string]: any;
        } | undefined;
        [key: string]: any;
    }

    interface LintOptions {
        filename?: string | undefined;
        preprocess?: ((code: string) => string[]) | undefined;
        postprocess?: ((problemLists: LintMessage[][]) => LintMessage[]) | undefined;
        filterCodeBlock?: boolean | undefined;
        disableFixes?: boolean | undefined;
        allowInlineConfig?: boolean | undefined;
        reportUnusedDisableDirectives?: boolean | undefined;
    }

    interface LintSuggestion {
        desc: string;
        fix: Rule.Fix;
        messageId?: string | undefined;
    }

    interface LintMessage {
        column: number;
        line: number;
        endColumn?: number | undefined;
        endLine?: number | undefined;
        ruleId: string | null;
        message: string;
        messageId?: string | undefined;
        nodeType?: string | undefined;
        fatal?: true | undefined;
        severity: Exclude<Severity, 0>;
        fix?: Rule.Fix | undefined;
        suggestions?: LintSuggestion[] | undefined;
    }

    interface LintSuppression {
        kind: string;
        justification: string;
    }

    interface SuppressedLintMessage extends LintMessage {
        suppressions: LintSuppression[];
    }

    interface FixOptions extends LintOptions {
        fix?: boolean | undefined;
    }

    interface FixReport {
        fixed: boolean;
        output: string;
        messages: LintMessage[];
    }

    // Temporarily loosen type for just flat config files (see #68232)
    type NonESTreeParser =
        & Omit<ESTreeParser, "parseForESLint">
        & ({
            parse(text: string, options?: any): unknown;
        } | {
            parseForESLint(text: string, options?: any): Omit<ESLintParseResult, "ast" | "scopeManager"> & {
                ast: unknown;
                scopeManager?: unknown;
            };
        });

    type ESTreeParser =
        & ESLint.ObjectMetaProperties
        & (
            | { parse(text: string, options?: any): AST.Program }
            | { parseForESLint(text: string, options?: any): ESLintParseResult }
        );

    type Parser = NonESTreeParser | ESTreeParser;

    interface ESLintParseResult {
        ast: AST.Program;
        parserServices?: SourceCode.ParserServices | undefined;
        scopeManager?: Scope.ScopeManager | undefined;
        visitorKeys?: SourceCode.VisitorKeys | undefined;
    }

    interface ProcessorFile {
        text: string;
        filename: string;
    }

    // https://eslint.org/docs/latest/extend/plugins#processors-in-plugins
    interface Processor<T extends string | ProcessorFile = string | ProcessorFile> extends ESLint.ObjectMetaProperties {
        supportsAutofix?: boolean | undefined;
        preprocess?(text: string, filename: string): T[];
        postprocess?(messages: LintMessage[][], filename: string): LintMessage[];
    }

    interface Config<Rules extends RulesRecord = RulesRecord> {
        /**
         * An string to identify the configuration object. Used in error messages and
         * inspection tools.
         */
        name?: string;

        /**
         * An array of glob patterns indicating the files that the configuration
         * object should apply to. If not specified, the configuration object applies
         * to all files
         */
        files?: Array<string | string[]>;

        /**
         * An array of glob patterns indicating the files that the configuration
         * object should not apply to. If not specified, the configuration object
         * applies to all files matched by files
         */
        ignores?: string[];

        /**
         * An object containing settings related to how JavaScript is configured for
         * linting.
         */
        languageOptions?: LanguageOptions;

        /**
         * An object containing settings related to the linting process
         */
        linterOptions?: LinterOptions;

        /**
         * Either an object containing preprocess() and postprocess() methods or a
         * string indicating the name of a processor inside of a plugin
         * (i.e., "pluginName/processorName").
         */
        processor?: string | Processor;

        /**
         * An object containing a name-value mapping of plugin names to plugin objects.
         * When files is specified, these plugins are only available to the matching files.
         */
        plugins?: Record<string, ESLint.Plugin>;

        /**
         * An object containing the configured rules. When files or ignores are specified,
         * these rule configurations are only available to the matching files.
         */
        rules?: Partial<Rules>;

        /**
         * An object containing name-value pairs of information that should be
         * available to all rules.
         */
        settings?: Record<string, unknown>;
    }

    /** @deprecated  Use `Config` instead of `FlatConfig` */
    type FlatConfig = Config;

    type GlobalConf = boolean | "off" | "readable" | "readonly" | "writable" | "writeable";

    interface Globals {
        [name: string]: GlobalConf;
    }

    interface LanguageOptions {
        /**
         * The version of ECMAScript to support. May be any year (i.e., 2022) or
         * version (i.e., 5). Set to "latest" for the most recent supported version.
         * @default "latest"
         */
        ecmaVersion?: EcmaVersion | undefined;

        /**
         * The type of JavaScript source code. Possible values are "script" for
         * traditional script files, "module" for ECMAScript modules (ESM), and
         * "commonjs" for CommonJS files. (default: "module" for .js and .mjs
         * files; "commonjs" for .cjs files)
         */
        sourceType?: SourceType | undefined;

        /**
         * An object specifying additional objects that should be added to the
         * global scope during linting.
         */
        globals?: Globals | undefined;

        /**
         * An object containing a parse() or parseForESLint() method.
         * If not configured, the default ESLint parser (Espree) will be used.
         */
        parser?: Parser | undefined;

        /**
         * An object specifying additional options that are passed directly to the
         * parser() method on the parser. The available options are parser-dependent
         */
        parserOptions?: Linter.ParserOptions | undefined;
    }

    interface LinterOptions {
        /**
         * A boolean value indicating if inline configuration is allowed.
         */
        noInlineConfig?: boolean;

        /**
         * A severity value indicating if and how unused disable directives should be
         * tracked and reported.
         */
        reportUnusedDisableDirectives?: Severity | StringSeverity | boolean;
    }

    interface Stats {
        /**
         * The number of times ESLint has applied at least one fix after linting.
         */
        fixPasses: number;

        /**
         * The times spent on (parsing, fixing, linting) a file, where the linting refers to the timing information for each rule.
         */
        times: { passes: TimePass[] };
    }

    interface TimePass {
        parse: { total: number };
        rules?: Record<string, { total: number }>;
        fix: { total: number };
        total: number;
    }
}

// #endregion

// #region ESLint

export class ESLint {
    static configType: "flat";

    static readonly version: string;

    static outputFixes(results: ESLint.LintResult[]): Promise<void>;

    static getErrorResults(results: ESLint.LintResult[]): ESLint.LintResult[];

    constructor(options?: ESLint.Options);

    lintFiles(patterns: string | string[]): Promise<ESLint.LintResult[]>;

    lintText(
        code: string,
        options?: { filePath?: string | undefined; warnIgnored?: boolean | undefined },
    ): Promise<ESLint.LintResult[]>;

    getRulesMetaForResults(results: ESLint.LintResult[]): ESLint.LintResultData["rulesMeta"];

    hasFlag(flag: string): boolean;

    calculateConfigForFile(filePath: string): Promise<any>;

    findConfigFile(): Promise<string | undefined>;

    isPathIgnored(filePath: string): Promise<boolean>;

    loadFormatter(nameOrPath?: string): Promise<ESLint.Formatter>;
}

export namespace ESLint {
    type ConfigData<Rules extends Linter.RulesRecord = Linter.RulesRecord> = Omit<
        Linter.LegacyConfig<Rules>,
        "$schema"
    >;

    interface Environment {
        globals?: Linter.Globals | undefined;
        parserOptions?: Linter.ParserOptions | undefined;
    }

    interface ObjectMetaProperties {
        /** @deprecated Use `meta.name` instead. */
        name?: string | undefined;

        /** @deprecated Use `meta.version` instead. */
        version?: string | undefined;

        meta?: {
            name?: string | undefined;
            version?: string | undefined;
        };
    }

    interface Plugin extends ObjectMetaProperties {
        configs?: Record<string, Linter.LegacyConfig | Linter.Config | Linter.Config[]> | undefined;
        environments?: Record<string, Environment> | undefined;
        processors?: Record<string, Linter.Processor> | undefined;
        rules?: Record<string, Rule.RuleModule> | undefined;
    }

    type FixType = "directive" | "problem" | "suggestion" | "layout";

    type CacheStrategy = "content" | "metadata";

    interface Options {
        // File enumeration
        cwd?: string | undefined;
        errorOnUnmatchedPattern?: boolean | undefined;
        globInputPaths?: boolean | undefined;
        ignore?: boolean | undefined;
        ignorePatterns?: string[] | null | undefined;
        passOnNoPatterns?: boolean | undefined;
        warnIgnored?: boolean | undefined;

        // Linting
        allowInlineConfig?: boolean | undefined;
        baseConfig?: Linter.Config | Linter.Config[] | null | undefined;
        overrideConfig?: Linter.Config | Linter.Config[] | null | undefined;
        overrideConfigFile?: string | boolean | undefined;
        plugins?: Record<string, Plugin> | null | undefined;
        ruleFilter?: ((arg: { ruleId: string; severity: Exclude<Linter.Severity, 0> }) => boolean) | undefined;
        stats?: boolean | undefined;

        // Autofix
        fix?: boolean | ((message: Linter.LintMessage) => boolean) | undefined;
        fixTypes?: FixType[] | undefined;

        // Cache-related
        cache?: boolean | undefined;
        cacheLocation?: string | undefined;
        cacheStrategy?: CacheStrategy | undefined;

        // Other Options
        flags?: string[] | undefined;
    }

    interface LegacyOptions {
        // File enumeration
        cwd?: string | undefined;
        errorOnUnmatchedPattern?: boolean | undefined;
        extensions?: string[] | undefined;
        globInputPaths?: boolean | undefined;
        ignore?: boolean | undefined;
        ignorePath?: string | undefined;

        // Linting
        allowInlineConfig?: boolean | undefined;
        baseConfig?: Linter.LegacyConfig | undefined;
        overrideConfig?: Linter.LegacyConfig | undefined;
        overrideConfigFile?: string | undefined;
        plugins?: Record<string, Plugin> | undefined;
        reportUnusedDisableDirectives?: Linter.StringSeverity | undefined;
        resolvePluginsRelativeTo?: string | undefined;
        rulePaths?: string[] | undefined;
        useEslintrc?: boolean | undefined;

        // Autofix
        fix?: boolean | ((message: Linter.LintMessage) => boolean) | undefined;
        fixTypes?: FixType[] | undefined;

        // Cache-related
        cache?: boolean | undefined;
        cacheLocation?: string | undefined;
        cacheStrategy?: CacheStrategy | undefined;

        // Other Options
        flags?: string[] | undefined;
    }

    interface LintResult {
        filePath: string;
        messages: Linter.LintMessage[];
        suppressedMessages: Linter.SuppressedLintMessage[];
        errorCount: number;
        fatalErrorCount: number;
        warningCount: number;
        fixableErrorCount: number;
        fixableWarningCount: number;
        output?: string | undefined;
        source?: string | undefined;
        stats?: Linter.Stats | undefined;
        usedDeprecatedRules: DeprecatedRuleUse[];
    }

    interface LintResultData {
        cwd: string;
        rulesMeta: {
            [ruleId: string]: Rule.RuleMetaData;
        };
    }

    interface DeprecatedRuleUse {
        ruleId: string;
        replacedBy: string[];
    }

    interface Formatter {
        format(results: LintResult[], data: LintResultData): string | Promise<string>;
    }

    // Docs reference the types by those name
    type EditInfo = Rule.Fix;
    type LoadedFormatter = Formatter;
    type ResultsMeta = LintResultData;
}

// #endregion

export function loadESLint(options: { useFlatConfig: true }): Promise<typeof ESLint>;
export function loadESLint(options: { useFlatConfig: false }): Promise<typeof LegacyESLint>;
export function loadESLint(
    options?: { useFlatConfig?: boolean | undefined },
): Promise<typeof ESLint | typeof LegacyESLint>;

// #region RuleTester

export class RuleTester {
    static describe: ((...args: any) => any) | null;
    static it: ((...args: any) => any) | null;
    static itOnly: ((...args: any) => any) | null;

    constructor(config?: Linter.Config);

    run(
        name: string,
        rule: Rule.RuleModule,
        tests: {
            valid: Array<string | RuleTester.ValidTestCase>;
            invalid: RuleTester.InvalidTestCase[];
        },
    ): void;

    static only(
        item: string | RuleTester.ValidTestCase | RuleTester.InvalidTestCase,
    ): RuleTester.ValidTestCase | RuleTester.InvalidTestCase;
}

export namespace RuleTester {
    interface ValidTestCase {
        name?: string;
        code: string;
        options?: any;
        filename?: string | undefined;
        only?: boolean;
        languageOptions?: Linter.LanguageOptions | undefined;
        settings?: { [name: string]: any } | undefined;
    }

    interface SuggestionOutput {
        messageId?: string;
        desc?: string;
        data?: Record<string, unknown> | undefined;
        output: string;
    }

    interface InvalidTestCase extends ValidTestCase {
        errors: number | Array<TestCaseError | string>;
        output?: string | null | undefined;
    }

    interface TestCaseError {
        message?: string | RegExp;
        messageId?: string;
        type?: string | undefined;
        data?: any;
        line?: number | undefined;
        column?: number | undefined;
        endLine?: number | undefined;
        endColumn?: number | undefined;
        suggestions?: SuggestionOutput[] | undefined;
    }
}

// #endregion
