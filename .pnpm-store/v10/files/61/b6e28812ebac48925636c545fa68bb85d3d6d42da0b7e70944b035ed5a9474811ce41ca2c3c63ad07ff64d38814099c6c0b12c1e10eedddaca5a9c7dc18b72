import { Type, Omit } from "../types";
import * as K from "./kinds";
export declare namespace namedTypes {
    interface Printable {
        loc?: K.SourceLocationKind | null;
    }
    interface SourceLocation {
        start: K.PositionKind;
        end: K.PositionKind;
        source?: string | null;
    }
    interface Node extends Printable {
        type: string;
        comments?: K.CommentKind[] | null;
    }
    interface Comment extends Printable {
        value: string;
        leading?: boolean;
        trailing?: boolean;
    }
    interface Position {
        line: number;
        column: number;
    }
    interface File extends Omit<Node, "type"> {
        type: "File";
        program: K.ProgramKind;
        name?: string | null;
    }
    interface Program extends Omit<Node, "type"> {
        type: "Program";
        body: K.StatementKind[];
        directives?: K.DirectiveKind[];
        interpreter?: K.InterpreterDirectiveKind | null;
    }
    interface Statement extends Node {
    }
    interface Function extends Node {
        id?: K.IdentifierKind | null;
        params: K.PatternKind[];
        body: K.BlockStatementKind;
        generator?: boolean;
        async?: boolean;
        expression?: boolean;
        defaults?: (K.ExpressionKind | null)[];
        rest?: K.IdentifierKind | null;
        returnType?: K.TypeAnnotationKind | K.TSTypeAnnotationKind | null;
        typeParameters?: K.TypeParameterDeclarationKind | K.TSTypeParameterDeclarationKind | null;
        predicate?: K.FlowPredicateKind | null;
    }
    interface Expression extends Node {
    }
    interface Pattern extends Node {
    }
    interface Identifier extends Omit<Expression, "type">, Omit<Pattern, "type"> {
        type: "Identifier";
        name: string;
        optional?: boolean;
        typeAnnotation?: K.TypeAnnotationKind | K.TSTypeAnnotationKind | null;
    }
    interface BlockStatement extends Omit<Statement, "type"> {
        type: "BlockStatement";
        body: K.StatementKind[];
        directives?: K.DirectiveKind[];
    }
    interface EmptyStatement extends Omit<Statement, "type"> {
        type: "EmptyStatement";
    }
    interface ExpressionStatement extends Omit<Statement, "type"> {
        type: "ExpressionStatement";
        expression: K.ExpressionKind;
    }
    interface IfStatement extends Omit<Statement, "type"> {
        type: "IfStatement";
        test: K.ExpressionKind;
        consequent: K.StatementKind;
        alternate?: K.StatementKind | null;
    }
    interface LabeledStatement extends Omit<Statement, "type"> {
        type: "LabeledStatement";
        label: K.IdentifierKind;
        body: K.StatementKind;
    }
    interface BreakStatement extends Omit<Statement, "type"> {
        type: "BreakStatement";
        label?: K.IdentifierKind | null;
    }
    interface ContinueStatement extends Omit<Statement, "type"> {
        type: "ContinueStatement";
        label?: K.IdentifierKind | null;
    }
    interface WithStatement extends Omit<Statement, "type"> {
        type: "WithStatement";
        object: K.ExpressionKind;
        body: K.StatementKind;
    }
    interface SwitchStatement extends Omit<Statement, "type"> {
        type: "SwitchStatement";
        discriminant: K.ExpressionKind;
        cases: K.SwitchCaseKind[];
        lexical?: boolean;
    }
    interface SwitchCase extends Omit<Node, "type"> {
        type: "SwitchCase";
        test: K.ExpressionKind | null;
        consequent: K.StatementKind[];
    }
    interface ReturnStatement extends Omit<Statement, "type"> {
        type: "ReturnStatement";
        argument: K.ExpressionKind | null;
    }
    interface ThrowStatement extends Omit<Statement, "type"> {
        type: "ThrowStatement";
        argument: K.ExpressionKind;
    }
    interface TryStatement extends Omit<Statement, "type"> {
        type: "TryStatement";
        block: K.BlockStatementKind;
        handler?: K.CatchClauseKind | null;
        handlers?: K.CatchClauseKind[];
        guardedHandlers?: K.CatchClauseKind[];
        finalizer?: K.BlockStatementKind | null;
    }
    interface CatchClause extends Omit<Node, "type"> {
        type: "CatchClause";
        param?: K.PatternKind | null;
        guard?: K.ExpressionKind | null;
        body: K.BlockStatementKind;
    }
    interface WhileStatement extends Omit<Statement, "type"> {
        type: "WhileStatement";
        test: K.ExpressionKind;
        body: K.StatementKind;
    }
    interface DoWhileStatement extends Omit<Statement, "type"> {
        type: "DoWhileStatement";
        body: K.StatementKind;
        test: K.ExpressionKind;
    }
    interface ForStatement extends Omit<Statement, "type"> {
        type: "ForStatement";
        init: K.VariableDeclarationKind | K.ExpressionKind | null;
        test: K.ExpressionKind | null;
        update: K.ExpressionKind | null;
        body: K.StatementKind;
    }
    interface Declaration extends Statement {
    }
    interface VariableDeclaration extends Omit<Declaration, "type"> {
        type: "VariableDeclaration";
        kind: "var" | "let" | "const";
        declarations: (K.VariableDeclaratorKind | K.IdentifierKind)[];
    }
    interface ForInStatement extends Omit<Statement, "type"> {
        type: "ForInStatement";
        left: K.VariableDeclarationKind | K.ExpressionKind;
        right: K.ExpressionKind;
        body: K.StatementKind;
    }
    interface DebuggerStatement extends Omit<Statement, "type"> {
        type: "DebuggerStatement";
    }
    interface FunctionDeclaration extends Omit<Function, "type" | "id">, Omit<Declaration, "type"> {
        type: "FunctionDeclaration";
        id: K.IdentifierKind | null;
    }
    interface FunctionExpression extends Omit<Function, "type">, Omit<Expression, "type"> {
        type: "FunctionExpression";
    }
    interface VariableDeclarator extends Omit<Node, "type"> {
        type: "VariableDeclarator";
        id: K.PatternKind;
        init?: K.ExpressionKind | null;
    }
    interface ThisExpression extends Omit<Expression, "type"> {
        type: "ThisExpression";
    }
    interface ArrayExpression extends Omit<Expression, "type"> {
        type: "ArrayExpression";
        elements: (K.ExpressionKind | K.SpreadElementKind | K.RestElementKind | null)[];
    }
    interface ObjectExpression extends Omit<Expression, "type"> {
        type: "ObjectExpression";
        properties: (K.PropertyKind | K.ObjectMethodKind | K.ObjectPropertyKind | K.SpreadPropertyKind | K.SpreadElementKind)[];
    }
    interface Property extends Omit<Node, "type"> {
        type: "Property";
        kind: "init" | "get" | "set";
        key: K.LiteralKind | K.IdentifierKind | K.ExpressionKind;
        value: K.ExpressionKind | K.PatternKind;
        method?: boolean;
        shorthand?: boolean;
        computed?: boolean;
        decorators?: K.DecoratorKind[] | null;
    }
    interface Literal extends Omit<Expression, "type"> {
        type: "Literal";
        value: string | boolean | null | number | RegExp | BigInt;
    }
    interface SequenceExpression extends Omit<Expression, "type"> {
        type: "SequenceExpression";
        expressions: K.ExpressionKind[];
    }
    interface UnaryExpression extends Omit<Expression, "type"> {
        type: "UnaryExpression";
        operator: "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";
        argument: K.ExpressionKind;
        prefix?: boolean;
    }
    interface BinaryExpression extends Omit<Expression, "type"> {
        type: "BinaryExpression";
        operator: "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "&" | "|" | "^" | "in" | "instanceof" | "**";
        left: K.ExpressionKind;
        right: K.ExpressionKind;
    }
    interface AssignmentExpression extends Omit<Expression, "type"> {
        type: "AssignmentExpression";
        operator: "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=" | "|=" | "^=" | "&=" | "**=" | "||=" | "&&=" | "??=";
        left: K.PatternKind | K.MemberExpressionKind;
        right: K.ExpressionKind;
    }
    interface ChainElement extends Node {
        optional?: boolean;
    }
    interface MemberExpression extends Omit<Expression, "type">, Omit<ChainElement, "type"> {
        type: "MemberExpression";
        object: K.ExpressionKind;
        property: K.IdentifierKind | K.ExpressionKind;
        computed?: boolean;
    }
    interface UpdateExpression extends Omit<Expression, "type"> {
        type: "UpdateExpression";
        operator: "++" | "--";
        argument: K.ExpressionKind;
        prefix: boolean;
    }
    interface LogicalExpression extends Omit<Expression, "type"> {
        type: "LogicalExpression";
        operator: "||" | "&&" | "??";
        left: K.ExpressionKind;
        right: K.ExpressionKind;
    }
    interface ConditionalExpression extends Omit<Expression, "type"> {
        type: "ConditionalExpression";
        test: K.ExpressionKind;
        consequent: K.ExpressionKind;
        alternate: K.ExpressionKind;
    }
    interface NewExpression extends Omit<Expression, "type"> {
        type: "NewExpression";
        callee: K.ExpressionKind;
        arguments: (K.ExpressionKind | K.SpreadElementKind)[];
        typeArguments?: null | K.TypeParameterInstantiationKind;
    }
    interface CallExpression extends Omit<Expression, "type">, Omit<ChainElement, "type"> {
        type: "CallExpression";
        callee: K.ExpressionKind;
        arguments: (K.ExpressionKind | K.SpreadElementKind)[];
        typeArguments?: null | K.TypeParameterInstantiationKind;
    }
    interface RestElement extends Omit<Pattern, "type"> {
        type: "RestElement";
        argument: K.PatternKind;
        typeAnnotation?: K.TypeAnnotationKind | K.TSTypeAnnotationKind | null;
    }
    interface TypeAnnotation extends Omit<Node, "type"> {
        type: "TypeAnnotation";
        typeAnnotation: K.FlowTypeKind;
    }
    interface TSTypeAnnotation extends Omit<Node, "type"> {
        type: "TSTypeAnnotation";
        typeAnnotation: K.TSTypeKind | K.TSTypeAnnotationKind;
    }
    interface SpreadElementPattern extends Omit<Pattern, "type"> {
        type: "SpreadElementPattern";
        argument: K.PatternKind;
    }
    interface ArrowFunctionExpression extends Omit<Function, "type" | "id" | "body" | "generator">, Omit<Expression, "type"> {
        type: "ArrowFunctionExpression";
        id?: null;
        body: K.BlockStatementKind | K.ExpressionKind;
        generator?: false;
    }
    interface ForOfStatement extends Omit<Statement, "type"> {
        type: "ForOfStatement";
        left: K.VariableDeclarationKind | K.PatternKind;
        right: K.ExpressionKind;
        body: K.StatementKind;
        await?: boolean;
    }
    interface YieldExpression extends Omit<Expression, "type"> {
        type: "YieldExpression";
        argument: K.ExpressionKind | null;
        delegate?: boolean;
    }
    interface GeneratorExpression extends Omit<Expression, "type"> {
        type: "GeneratorExpression";
        body: K.ExpressionKind;
        blocks: K.ComprehensionBlockKind[];
        filter: K.ExpressionKind | null;
    }
    interface ComprehensionBlock extends Omit<Node, "type"> {
        type: "ComprehensionBlock";
        left: K.PatternKind;
        right: K.ExpressionKind;
        each: boolean;
    }
    interface ComprehensionExpression extends Omit<Expression, "type"> {
        type: "ComprehensionExpression";
        body: K.ExpressionKind;
        blocks: K.ComprehensionBlockKind[];
        filter: K.ExpressionKind | null;
    }
    interface ObjectProperty extends Omit<Node, "type"> {
        shorthand?: boolean;
        type: "ObjectProperty";
        key: K.LiteralKind | K.IdentifierKind | K.ExpressionKind;
        value: K.ExpressionKind | K.PatternKind;
        accessibility?: K.LiteralKind | null;
        computed?: boolean;
    }
    interface PropertyPattern extends Omit<Pattern, "type"> {
        type: "PropertyPattern";
        key: K.LiteralKind | K.IdentifierKind | K.ExpressionKind;
        pattern: K.PatternKind;
        computed?: boolean;
    }
    interface ObjectPattern extends Omit<Pattern, "type"> {
        type: "ObjectPattern";
        properties: (K.PropertyKind | K.PropertyPatternKind | K.SpreadPropertyPatternKind | K.SpreadPropertyKind | K.ObjectPropertyKind | K.RestPropertyKind | K.RestElementKind)[];
        typeAnnotation?: K.TypeAnnotationKind | K.TSTypeAnnotationKind | null;
        decorators?: K.DecoratorKind[] | null;
    }
    interface ArrayPattern extends Omit<Pattern, "type"> {
        type: "ArrayPattern";
        elements: (K.PatternKind | K.SpreadElementKind | null)[];
    }
    interface SpreadElement extends Omit<Node, "type"> {
        type: "SpreadElement";
        argument: K.ExpressionKind;
    }
    interface AssignmentPattern extends Omit<Pattern, "type"> {
        type: "AssignmentPattern";
        left: K.PatternKind;
        right: K.ExpressionKind;
    }
    interface MethodDefinition extends Omit<Declaration, "type"> {
        type: "MethodDefinition";
        kind: "constructor" | "method" | "get" | "set";
        key: K.ExpressionKind;
        value: K.FunctionKind;
        computed?: boolean;
        static?: boolean;
        decorators?: K.DecoratorKind[] | null;
    }
    interface ClassPropertyDefinition extends Omit<Declaration, "type"> {
        type: "ClassPropertyDefinition";
        definition: K.MethodDefinitionKind | K.VariableDeclaratorKind | K.ClassPropertyDefinitionKind | K.ClassPropertyKind | K.StaticBlockKind;
    }
    interface ClassProperty extends Omit<Declaration, "type"> {
        type: "ClassProperty";
        key: K.LiteralKind | K.IdentifierKind | K.ExpressionKind;
        computed?: boolean;
        value: K.ExpressionKind | null;
        static?: boolean;
        typeAnnotation?: K.TypeAnnotationKind | K.TSTypeAnnotationKind | null;
        variance?: K.VarianceKind | "plus" | "minus" | null;
        access?: "public" | "private" | "protected" | undefined;
    }
    interface StaticBlock extends Omit<Declaration, "type"> {
        type: "StaticBlock";
        body: K.StatementKind[];
    }
    interface ClassBody extends Omit<Declaration, "type"> {
        type: "ClassBody";
        body: (K.MethodDefinitionKind | K.VariableDeclaratorKind | K.ClassPropertyDefinitionKind | K.ClassPropertyKind | K.ClassPrivatePropertyKind | K.ClassAccessorPropertyKind | K.ClassMethodKind | K.ClassPrivateMethodKind | K.StaticBlockKind | K.TSDeclareMethodKind | K.TSCallSignatureDeclarationKind | K.TSConstructSignatureDeclarationKind | K.TSIndexSignatureKind | K.TSMethodSignatureKind | K.TSPropertySignatureKind)[];
    }
    interface ClassDeclaration extends Omit<Declaration, "type"> {
        type: "ClassDeclaration";
        id: K.IdentifierKind | null;
        body: K.ClassBodyKind;
        superClass?: K.ExpressionKind | null;
        typeParameters?: K.TypeParameterDeclarationKind | K.TSTypeParameterDeclarationKind | null;
        superTypeParameters?: K.TypeParameterInstantiationKind | K.TSTypeParameterInstantiationKind | null;
        implements?: K.ClassImplementsKind[] | K.TSExpressionWithTypeArgumentsKind[];
    }
    interface ClassExpression extends Omit<Expression, "type"> {
        type: "ClassExpression";
        id?: K.IdentifierKind | null;
        body: K.ClassBodyKind;
        superClass?: K.ExpressionKind | null;
        typeParameters?: K.TypeParameterDeclarationKind | K.TSTypeParameterDeclarationKind | null;
        superTypeParameters?: K.TypeParameterInstantiationKind | K.TSTypeParameterInstantiationKind | null;
        implements?: K.ClassImplementsKind[] | K.TSExpressionWithTypeArgumentsKind[];
    }
    interface Super extends Omit<Expression, "type"> {
        type: "Super";
    }
    interface Specifier extends Node {
    }
    interface ModuleSpecifier extends Specifier {
        local?: K.IdentifierKind | null;
        id?: K.IdentifierKind | null;
        name?: K.IdentifierKind | null;
    }
    interface ImportSpecifier extends Omit<ModuleSpecifier, "type"> {
        type: "ImportSpecifier";
        imported: K.IdentifierKind;
    }
    interface ImportDefaultSpecifier extends Omit<ModuleSpecifier, "type"> {
        type: "ImportDefaultSpecifier";
    }
    interface ImportNamespaceSpecifier extends Omit<ModuleSpecifier, "type"> {
        type: "ImportNamespaceSpecifier";
    }
    interface ImportDeclaration extends Omit<Declaration, "type"> {
        type: "ImportDeclaration";
        specifiers?: (K.ImportSpecifierKind | K.ImportNamespaceSpecifierKind | K.ImportDefaultSpecifierKind)[];
        source: K.LiteralKind;
        importKind?: "value" | "type" | "typeof";
        assertions?: K.ImportAttributeKind[];
    }
    interface ExportNamedDeclaration extends Omit<Declaration, "type"> {
        type: "ExportNamedDeclaration";
        declaration: K.DeclarationKind | null;
        specifiers?: K.ExportSpecifierKind[];
        source?: K.LiteralKind | null;
        assertions?: K.ImportAttributeKind[];
    }
    interface ExportSpecifier extends Omit<ModuleSpecifier, "type"> {
        type: "ExportSpecifier";
        exported: K.IdentifierKind;
    }
    interface ExportDefaultDeclaration extends Omit<Declaration, "type"> {
        type: "ExportDefaultDeclaration";
        declaration: K.DeclarationKind | K.ExpressionKind;
    }
    interface ExportAllDeclaration extends Omit<Declaration, "type"> {
        type: "ExportAllDeclaration";
        source: K.LiteralKind;
        exported?: K.IdentifierKind | null | undefined;
        assertions?: K.ImportAttributeKind[];
    }
    interface TaggedTemplateExpression extends Omit<Expression, "type"> {
        type: "TaggedTemplateExpression";
        tag: K.ExpressionKind;
        quasi: K.TemplateLiteralKind;
    }
    interface TemplateLiteral extends Omit<Expression, "type"> {
        type: "TemplateLiteral";
        quasis: K.TemplateElementKind[];
        expressions: K.ExpressionKind[] | K.TSTypeKind[];
    }
    interface TemplateElement extends Omit<Node, "type"> {
        type: "TemplateElement";
        value: {
            cooked: string | null;
            raw: string;
        };
        tail: boolean;
    }
    interface MetaProperty extends Omit<Expression, "type"> {
        type: "MetaProperty";
        meta: K.IdentifierKind;
        property: K.IdentifierKind;
    }
    interface AwaitExpression extends Omit<Expression, "type"> {
        type: "AwaitExpression";
        argument: K.ExpressionKind | null;
        all?: boolean;
    }
    interface SpreadProperty extends Omit<Node, "type"> {
        type: "SpreadProperty";
        argument: K.ExpressionKind;
    }
    interface SpreadPropertyPattern extends Omit<Pattern, "type"> {
        type: "SpreadPropertyPattern";
        argument: K.PatternKind;
    }
    interface ImportExpression extends Omit<Expression, "type"> {
        type: "ImportExpression";
        source: K.ExpressionKind;
    }
    interface ChainExpression extends Omit<Expression, "type"> {
        type: "ChainExpression";
        expression: K.ChainElementKind;
    }
    interface OptionalCallExpression extends Omit<CallExpression, "type" | "optional"> {
        type: "OptionalCallExpression";
        optional?: boolean;
    }
    interface OptionalMemberExpression extends Omit<MemberExpression, "type" | "optional"> {
        type: "OptionalMemberExpression";
        optional?: boolean;
    }
    interface Decorator extends Omit<Node, "type"> {
        type: "Decorator";
        expression: K.ExpressionKind;
    }
    interface PrivateName extends Omit<Expression, "type">, Omit<Pattern, "type"> {
        type: "PrivateName";
        id: K.IdentifierKind;
    }
    interface ClassPrivateProperty extends Omit<ClassProperty, "type" | "key" | "value"> {
        type: "ClassPrivateProperty";
        key: K.PrivateNameKind;
        value?: K.ExpressionKind | null;
    }
    interface ImportAttribute extends Omit<Node, "type"> {
        type: "ImportAttribute";
        key: K.IdentifierKind | K.LiteralKind;
        value: K.ExpressionKind;
    }
    interface RecordExpression extends Omit<Expression, "type"> {
        type: "RecordExpression";
        properties: (K.ObjectPropertyKind | K.ObjectMethodKind | K.SpreadElementKind)[];
    }
    interface ObjectMethod extends Omit<Node, "type">, Omit<Function, "type" | "params" | "body" | "generator" | "async"> {
        type: "ObjectMethod";
        kind: "method" | "get" | "set";
        key: K.LiteralKind | K.IdentifierKind | K.ExpressionKind;
        params: K.PatternKind[];
        body: K.BlockStatementKind;
        computed?: boolean;
        generator?: boolean;
        async?: boolean;
        accessibility?: K.LiteralKind | null;
        decorators?: K.DecoratorKind[] | null;
    }
    interface TupleExpression extends Omit<Expression, "type"> {
        type: "TupleExpression";
        elements: (K.ExpressionKind | K.SpreadElementKind | null)[];
    }
    interface ModuleExpression extends Omit<Node, "type"> {
        type: "ModuleExpression";
        body: K.ProgramKind;
    }
    interface JSXAttribute extends Omit<Node, "type"> {
        type: "JSXAttribute";
        name: K.JSXIdentifierKind | K.JSXNamespacedNameKind;
        value?: K.LiteralKind | K.JSXExpressionContainerKind | K.JSXElementKind | K.JSXFragmentKind | null;
    }
    interface JSXIdentifier extends Omit<Identifier, "type" | "name"> {
        type: "JSXIdentifier";
        name: string;
    }
    interface JSXNamespacedName extends Omit<Node, "type"> {
        type: "JSXNamespacedName";
        namespace: K.JSXIdentifierKind;
        name: K.JSXIdentifierKind;
    }
    interface JSXExpressionContainer extends Omit<Expression, "type"> {
        type: "JSXExpressionContainer";
        expression: K.ExpressionKind | K.JSXEmptyExpressionKind;
    }
    interface JSXElement extends Omit<Expression, "type"> {
        type: "JSXElement";
        openingElement: K.JSXOpeningElementKind;
        closingElement?: K.JSXClosingElementKind | null;
        children?: (K.JSXTextKind | K.JSXExpressionContainerKind | K.JSXSpreadChildKind | K.JSXElementKind | K.JSXFragmentKind | K.LiteralKind)[];
        name?: K.JSXIdentifierKind | K.JSXNamespacedNameKind | K.JSXMemberExpressionKind;
        selfClosing?: boolean;
        attributes?: (K.JSXAttributeKind | K.JSXSpreadAttributeKind)[];
    }
    interface JSXFragment extends Omit<Expression, "type"> {
        type: "JSXFragment";
        openingFragment: K.JSXOpeningFragmentKind;
        closingFragment: K.JSXClosingFragmentKind;
        children?: (K.JSXTextKind | K.JSXExpressionContainerKind | K.JSXSpreadChildKind | K.JSXElementKind | K.JSXFragmentKind | K.LiteralKind)[];
    }
    interface JSXMemberExpression extends Omit<MemberExpression, "type" | "object" | "property" | "computed"> {
        type: "JSXMemberExpression";
        object: K.JSXIdentifierKind | K.JSXMemberExpressionKind;
        property: K.JSXIdentifierKind;
        computed?: boolean;
    }
    interface JSXSpreadAttribute extends Omit<Node, "type"> {
        type: "JSXSpreadAttribute";
        argument: K.ExpressionKind;
    }
    interface JSXEmptyExpression extends Omit<Node, "type"> {
        type: "JSXEmptyExpression";
    }
    interface JSXText extends Omit<Literal, "type" | "value"> {
        type: "JSXText";
        value: string;
        raw?: string;
    }
    interface JSXSpreadChild extends Omit<Node, "type"> {
        type: "JSXSpreadChild";
        expression: K.ExpressionKind;
    }
    interface JSXOpeningElement extends Omit<Node, "type"> {
        type: "JSXOpeningElement";
        name: K.JSXIdentifierKind | K.JSXNamespacedNameKind | K.JSXMemberExpressionKind;
        attributes?: (K.JSXAttributeKind | K.JSXSpreadAttributeKind)[];
        selfClosing?: boolean;
    }
    interface JSXClosingElement extends Omit<Node, "type"> {
        type: "JSXClosingElement";
        name: K.JSXIdentifierKind | K.JSXNamespacedNameKind | K.JSXMemberExpressionKind;
    }
    interface JSXOpeningFragment extends Omit<Node, "type"> {
        type: "JSXOpeningFragment";
    }
    interface JSXClosingFragment extends Omit<Node, "type"> {
        type: "JSXClosingFragment";
    }
    interface TypeParameterDeclaration extends Omit<Node, "type"> {
        type: "TypeParameterDeclaration";
        params: K.TypeParameterKind[];
    }
    interface TSTypeParameterDeclaration extends Omit<Declaration, "type"> {
        type: "TSTypeParameterDeclaration";
        params: K.TSTypeParameterKind[];
    }
    interface TypeParameterInstantiation extends Omit<Node, "type"> {
        type: "TypeParameterInstantiation";
        params: K.FlowTypeKind[];
    }
    interface TSTypeParameterInstantiation extends Omit<Node, "type"> {
        type: "TSTypeParameterInstantiation";
        params: K.TSTypeKind[];
    }
    interface ClassImplements extends Omit<Node, "type"> {
        type: "ClassImplements";
        id: K.IdentifierKind;
        superClass?: K.ExpressionKind | null;
        typeParameters?: K.TypeParameterInstantiationKind | null;
    }
    interface TSType extends Node {
    }
    interface TSHasOptionalTypeParameterInstantiation {
        typeParameters?: K.TSTypeParameterInstantiationKind | null;
    }
    interface TSExpressionWithTypeArguments extends Omit<TSType, "type">, TSHasOptionalTypeParameterInstantiation {
        type: "TSExpressionWithTypeArguments";
        expression: K.IdentifierKind | K.TSQualifiedNameKind;
    }
    interface Flow extends Node {
    }
    interface FlowType extends Flow {
    }
    interface AnyTypeAnnotation extends Omit<FlowType, "type"> {
        type: "AnyTypeAnnotation";
    }
    interface EmptyTypeAnnotation extends Omit<FlowType, "type"> {
        type: "EmptyTypeAnnotation";
    }
    interface MixedTypeAnnotation extends Omit<FlowType, "type"> {
        type: "MixedTypeAnnotation";
    }
    interface VoidTypeAnnotation extends Omit<FlowType, "type"> {
        type: "VoidTypeAnnotation";
    }
    interface SymbolTypeAnnotation extends Omit<FlowType, "type"> {
        type: "SymbolTypeAnnotation";
    }
    interface NumberTypeAnnotation extends Omit<FlowType, "type"> {
        type: "NumberTypeAnnotation";
    }
    interface BigIntTypeAnnotation extends Omit<FlowType, "type"> {
        type: "BigIntTypeAnnotation";
    }
    interface NumberLiteralTypeAnnotation extends Omit<FlowType, "type"> {
        type: "NumberLiteralTypeAnnotation";
        value: number;
        raw: string;
    }
    interface NumericLiteralTypeAnnotation extends Omit<FlowType, "type"> {
        type: "NumericLiteralTypeAnnotation";
        value: number;
        raw: string;
    }
    interface BigIntLiteralTypeAnnotation extends Omit<FlowType, "type"> {
        type: "BigIntLiteralTypeAnnotation";
        value: null;
        raw: string;
    }
    interface StringTypeAnnotation extends Omit<FlowType, "type"> {
        type: "StringTypeAnnotation";
    }
    interface StringLiteralTypeAnnotation extends Omit<FlowType, "type"> {
        type: "StringLiteralTypeAnnotation";
        value: string;
        raw: string;
    }
    interface BooleanTypeAnnotation extends Omit<FlowType, "type"> {
        type: "BooleanTypeAnnotation";
    }
    interface BooleanLiteralTypeAnnotation extends Omit<FlowType, "type"> {
        type: "BooleanLiteralTypeAnnotation";
        value: boolean;
        raw: string;
    }
    interface NullableTypeAnnotation extends Omit<FlowType, "type"> {
        type: "NullableTypeAnnotation";
        typeAnnotation: K.FlowTypeKind;
    }
    interface NullLiteralTypeAnnotation extends Omit<FlowType, "type"> {
        type: "NullLiteralTypeAnnotation";
    }
    interface NullTypeAnnotation extends Omit<FlowType, "type"> {
        type: "NullTypeAnnotation";
    }
    interface ThisTypeAnnotation extends Omit<FlowType, "type"> {
        type: "ThisTypeAnnotation";
    }
    interface ExistsTypeAnnotation extends Omit<FlowType, "type"> {
        type: "ExistsTypeAnnotation";
    }
    interface ExistentialTypeParam extends Omit<FlowType, "type"> {
        type: "ExistentialTypeParam";
    }
    interface FunctionTypeAnnotation extends Omit<FlowType, "type"> {
        type: "FunctionTypeAnnotation";
        params: K.FunctionTypeParamKind[];
        returnType: K.FlowTypeKind;
        rest: K.FunctionTypeParamKind | null;
        typeParameters: K.TypeParameterDeclarationKind | null;
    }
    interface FunctionTypeParam extends Omit<Node, "type"> {
        type: "FunctionTypeParam";
        name: K.IdentifierKind | null;
        typeAnnotation: K.FlowTypeKind;
        optional: boolean;
    }
    interface ArrayTypeAnnotation extends Omit<FlowType, "type"> {
        type: "ArrayTypeAnnotation";
        elementType: K.FlowTypeKind;
    }
    interface ObjectTypeAnnotation extends Omit<FlowType, "type"> {
        type: "ObjectTypeAnnotation";
        properties: (K.ObjectTypePropertyKind | K.ObjectTypeSpreadPropertyKind)[];
        indexers?: K.ObjectTypeIndexerKind[];
        callProperties?: K.ObjectTypeCallPropertyKind[];
        inexact?: boolean | undefined;
        exact?: boolean;
        internalSlots?: K.ObjectTypeInternalSlotKind[];
    }
    interface ObjectTypeProperty extends Omit<Node, "type"> {
        type: "ObjectTypeProperty";
        key: K.LiteralKind | K.IdentifierKind;
        value: K.FlowTypeKind;
        optional: boolean;
        variance?: K.VarianceKind | "plus" | "minus" | null;
    }
    interface ObjectTypeSpreadProperty extends Omit<Node, "type"> {
        type: "ObjectTypeSpreadProperty";
        argument: K.FlowTypeKind;
    }
    interface ObjectTypeIndexer extends Omit<Node, "type"> {
        type: "ObjectTypeIndexer";
        id: K.IdentifierKind;
        key: K.FlowTypeKind;
        value: K.FlowTypeKind;
        variance?: K.VarianceKind | "plus" | "minus" | null;
        static?: boolean;
    }
    interface ObjectTypeCallProperty extends Omit<Node, "type"> {
        type: "ObjectTypeCallProperty";
        value: K.FunctionTypeAnnotationKind;
        static?: boolean;
    }
    interface ObjectTypeInternalSlot extends Omit<Node, "type"> {
        type: "ObjectTypeInternalSlot";
        id: K.IdentifierKind;
        value: K.FlowTypeKind;
        optional: boolean;
        static: boolean;
        method: boolean;
    }
    interface Variance extends Omit<Node, "type"> {
        type: "Variance";
        kind: "plus" | "minus";
    }
    interface QualifiedTypeIdentifier extends Omit<Node, "type"> {
        type: "QualifiedTypeIdentifier";
        qualification: K.IdentifierKind | K.QualifiedTypeIdentifierKind;
        id: K.IdentifierKind;
    }
    interface GenericTypeAnnotation extends Omit<FlowType, "type"> {
        type: "GenericTypeAnnotation";
        id: K.IdentifierKind | K.QualifiedTypeIdentifierKind;
        typeParameters: K.TypeParameterInstantiationKind | null;
    }
    interface MemberTypeAnnotation extends Omit<FlowType, "type"> {
        type: "MemberTypeAnnotation";
        object: K.IdentifierKind;
        property: K.MemberTypeAnnotationKind | K.GenericTypeAnnotationKind;
    }
    interface IndexedAccessType extends Omit<FlowType, "type"> {
        type: "IndexedAccessType";
        objectType: K.FlowTypeKind;
        indexType: K.FlowTypeKind;
    }
    interface OptionalIndexedAccessType extends Omit<FlowType, "type"> {
        type: "OptionalIndexedAccessType";
        objectType: K.FlowTypeKind;
        indexType: K.FlowTypeKind;
        optional: boolean;
    }
    interface UnionTypeAnnotation extends Omit<FlowType, "type"> {
        type: "UnionTypeAnnotation";
        types: K.FlowTypeKind[];
    }
    interface IntersectionTypeAnnotation extends Omit<FlowType, "type"> {
        type: "IntersectionTypeAnnotation";
        types: K.FlowTypeKind[];
    }
    interface TypeofTypeAnnotation extends Omit<FlowType, "type"> {
        type: "TypeofTypeAnnotation";
        argument: K.FlowTypeKind;
    }
    interface TypeParameter extends Omit<FlowType, "type"> {
        type: "TypeParameter";
        name: string;
        variance?: K.VarianceKind | "plus" | "minus" | null;
        bound?: K.TypeAnnotationKind | null;
        default?: K.FlowTypeKind | null;
    }
    interface InterfaceTypeAnnotation extends Omit<FlowType, "type"> {
        type: "InterfaceTypeAnnotation";
        body: K.ObjectTypeAnnotationKind;
        extends?: K.InterfaceExtendsKind[] | null;
    }
    interface InterfaceExtends extends Omit<Node, "type"> {
        type: "InterfaceExtends";
        id: K.IdentifierKind;
        typeParameters?: K.TypeParameterInstantiationKind | null;
    }
    interface InterfaceDeclaration extends Omit<Declaration, "type"> {
        type: "InterfaceDeclaration";
        id: K.IdentifierKind;
        typeParameters?: K.TypeParameterDeclarationKind | null;
        body: K.ObjectTypeAnnotationKind;
        extends: K.InterfaceExtendsKind[];
    }
    interface DeclareInterface extends Omit<InterfaceDeclaration, "type"> {
        type: "DeclareInterface";
    }
    interface TypeAlias extends Omit<Declaration, "type"> {
        type: "TypeAlias";
        id: K.IdentifierKind;
        typeParameters: K.TypeParameterDeclarationKind | null;
        right: K.FlowTypeKind;
    }
    interface DeclareTypeAlias extends Omit<TypeAlias, "type"> {
        type: "DeclareTypeAlias";
    }
    interface OpaqueType extends Omit<Declaration, "type"> {
        type: "OpaqueType";
        id: K.IdentifierKind;
        typeParameters: K.TypeParameterDeclarationKind | null;
        impltype: K.FlowTypeKind;
        supertype: K.FlowTypeKind | null;
    }
    interface DeclareOpaqueType extends Omit<OpaqueType, "type" | "impltype"> {
        type: "DeclareOpaqueType";
        impltype: K.FlowTypeKind | null;
    }
    interface TypeCastExpression extends Omit<Expression, "type"> {
        type: "TypeCastExpression";
        expression: K.ExpressionKind;
        typeAnnotation: K.TypeAnnotationKind;
    }
    interface TupleTypeAnnotation extends Omit<FlowType, "type"> {
        type: "TupleTypeAnnotation";
        types: K.FlowTypeKind[];
    }
    interface DeclareVariable extends Omit<Statement, "type"> {
        type: "DeclareVariable";
        id: K.IdentifierKind;
    }
    interface DeclareFunction extends Omit<Statement, "type"> {
        type: "DeclareFunction";
        id: K.IdentifierKind;
        predicate?: K.FlowPredicateKind | null;
    }
    interface FlowPredicate extends Flow {
    }
    interface DeclareClass extends Omit<InterfaceDeclaration, "type"> {
        type: "DeclareClass";
    }
    interface DeclareModule extends Omit<Statement, "type"> {
        type: "DeclareModule";
        id: K.IdentifierKind | K.LiteralKind;
        body: K.BlockStatementKind;
    }
    interface DeclareModuleExports extends Omit<Statement, "type"> {
        type: "DeclareModuleExports";
        typeAnnotation: K.TypeAnnotationKind;
    }
    interface DeclareExportDeclaration extends Omit<Declaration, "type"> {
        type: "DeclareExportDeclaration";
        default: boolean;
        declaration: K.DeclareVariableKind | K.DeclareFunctionKind | K.DeclareClassKind | K.FlowTypeKind | K.TypeAliasKind | K.DeclareOpaqueTypeKind | K.InterfaceDeclarationKind | null;
        specifiers?: (K.ExportSpecifierKind | K.ExportBatchSpecifierKind)[];
        source?: K.LiteralKind | null;
    }
    interface ExportBatchSpecifier extends Omit<Specifier, "type"> {
        type: "ExportBatchSpecifier";
    }
    interface DeclareExportAllDeclaration extends Omit<Declaration, "type"> {
        type: "DeclareExportAllDeclaration";
        source?: K.LiteralKind | null;
    }
    interface InferredPredicate extends Omit<FlowPredicate, "type"> {
        type: "InferredPredicate";
    }
    interface DeclaredPredicate extends Omit<FlowPredicate, "type"> {
        type: "DeclaredPredicate";
        value: K.ExpressionKind;
    }
    interface EnumDeclaration extends Omit<Declaration, "type"> {
        type: "EnumDeclaration";
        id: K.IdentifierKind;
        body: K.EnumBooleanBodyKind | K.EnumNumberBodyKind | K.EnumStringBodyKind | K.EnumSymbolBodyKind;
    }
    interface EnumBooleanBody {
        type: "EnumBooleanBody";
        members: K.EnumBooleanMemberKind[];
        explicitType: boolean;
    }
    interface EnumNumberBody {
        type: "EnumNumberBody";
        members: K.EnumNumberMemberKind[];
        explicitType: boolean;
    }
    interface EnumStringBody {
        type: "EnumStringBody";
        members: K.EnumStringMemberKind[] | K.EnumDefaultedMemberKind[];
        explicitType: boolean;
    }
    interface EnumSymbolBody {
        type: "EnumSymbolBody";
        members: K.EnumDefaultedMemberKind[];
    }
    interface EnumBooleanMember {
        type: "EnumBooleanMember";
        id: K.IdentifierKind;
        init: K.LiteralKind | boolean;
    }
    interface EnumNumberMember {
        type: "EnumNumberMember";
        id: K.IdentifierKind;
        init: K.LiteralKind;
    }
    interface EnumStringMember {
        type: "EnumStringMember";
        id: K.IdentifierKind;
        init: K.LiteralKind;
    }
    interface EnumDefaultedMember {
        type: "EnumDefaultedMember";
        id: K.IdentifierKind;
    }
    interface ExportDeclaration extends Omit<Declaration, "type"> {
        type: "ExportDeclaration";
        default: boolean;
        declaration: K.DeclarationKind | K.ExpressionKind | null;
        specifiers?: (K.ExportSpecifierKind | K.ExportBatchSpecifierKind)[];
        source?: K.LiteralKind | null;
    }
    interface Block extends Comment {
        type: "Block";
    }
    interface Line extends Comment {
        type: "Line";
    }
    interface Noop extends Omit<Statement, "type"> {
        type: "Noop";
    }
    interface DoExpression extends Omit<Expression, "type"> {
        type: "DoExpression";
        body: K.StatementKind[];
    }
    interface BindExpression extends Omit<Expression, "type"> {
        type: "BindExpression";
        object: K.ExpressionKind | null;
        callee: K.ExpressionKind;
    }
    interface ParenthesizedExpression extends Omit<Expression, "type"> {
        type: "ParenthesizedExpression";
        expression: K.ExpressionKind;
    }
    interface ExportNamespaceSpecifier extends Omit<Specifier, "type"> {
        type: "ExportNamespaceSpecifier";
        exported: K.IdentifierKind;
    }
    interface ExportDefaultSpecifier extends Omit<Specifier, "type"> {
        type: "ExportDefaultSpecifier";
        exported: K.IdentifierKind;
    }
    interface CommentBlock extends Comment {
        type: "CommentBlock";
    }
    interface CommentLine extends Comment {
        type: "CommentLine";
    }
    interface Directive extends Omit<Node, "type"> {
        type: "Directive";
        value: K.DirectiveLiteralKind;
    }
    interface DirectiveLiteral extends Omit<Node, "type">, Omit<Expression, "type"> {
        type: "DirectiveLiteral";
        value?: string;
    }
    interface InterpreterDirective extends Omit<Node, "type"> {
        type: "InterpreterDirective";
        value: string;
    }
    interface StringLiteral extends Omit<Literal, "type" | "value"> {
        type: "StringLiteral";
        value: string;
        extra?: {
            rawValue: string;
            raw: string;
        };
    }
    interface NumericLiteral extends Omit<Literal, "type" | "value"> {
        type: "NumericLiteral";
        value: number;
        raw?: string | null;
        extra?: {
            rawValue: number;
            raw: string;
        };
    }
    interface BigIntLiteral extends Omit<Literal, "type" | "value"> {
        type: "BigIntLiteral";
        value: string | number;
        extra?: {
            rawValue: string;
            raw: string;
        };
    }
    interface DecimalLiteral extends Omit<Literal, "type" | "value"> {
        type: "DecimalLiteral";
        value: string;
        extra?: {
            rawValue: string;
            raw: string;
        };
    }
    interface NullLiteral extends Omit<Literal, "type" | "value"> {
        type: "NullLiteral";
        value?: null;
    }
    interface BooleanLiteral extends Omit<Literal, "type" | "value"> {
        type: "BooleanLiteral";
        value: boolean;
    }
    interface RegExpLiteral extends Omit<Literal, "type" | "value"> {
        type: "RegExpLiteral";
        pattern: string;
        flags: string;
        value?: RegExp;
        extra?: {
            rawValue: RegExp | undefined;
            raw: string;
        };
        regex?: {
            pattern: string;
            flags: string;
        };
    }
    interface ClassMethod extends Omit<Declaration, "type">, Omit<Function, "type" | "body"> {
        type: "ClassMethod";
        key: K.LiteralKind | K.IdentifierKind | K.ExpressionKind;
        kind?: "get" | "set" | "method" | "constructor";
        body: K.BlockStatementKind;
        access?: "public" | "private" | "protected" | null;
        computed?: boolean;
        static?: boolean;
        abstract?: boolean;
        accessibility?: "public" | "private" | "protected" | null;
        decorators?: K.DecoratorKind[] | null;
        definite?: boolean;
        optional?: boolean;
        override?: boolean;
        readonly?: boolean;
    }
    interface ClassPrivateMethod extends Omit<Declaration, "type">, Omit<Function, "type" | "body"> {
        type: "ClassPrivateMethod";
        key: K.PrivateNameKind;
        kind?: "get" | "set" | "method" | "constructor";
        body: K.BlockStatementKind;
        access?: "public" | "private" | "protected" | null;
        computed?: boolean;
        static?: boolean;
        abstract?: boolean;
        accessibility?: "public" | "private" | "protected" | null;
        decorators?: K.DecoratorKind[] | null;
        definite?: boolean;
        optional?: boolean;
        override?: boolean;
        readonly?: boolean;
    }
    interface TSHasOptionalTypeAnnotation {
        typeAnnotation?: K.TSTypeAnnotationKind | null;
    }
    interface ClassAccessorProperty extends Omit<Declaration, "type">, TSHasOptionalTypeAnnotation {
        type: "ClassAccessorProperty";
        key: K.LiteralKind | K.IdentifierKind | K.PrivateNameKind | K.ExpressionKind;
        value?: K.ExpressionKind | null;
        computed?: boolean;
        static?: boolean;
        abstract?: boolean;
        accessibility?: "public" | "private" | "protected" | null;
        decorators?: K.DecoratorKind[] | null;
        definite?: boolean;
        optional?: boolean;
        override?: boolean;
        readonly?: boolean;
    }
    interface RestProperty extends Omit<Node, "type"> {
        type: "RestProperty";
        argument: K.ExpressionKind;
    }
    interface ForAwaitStatement extends Omit<Statement, "type"> {
        type: "ForAwaitStatement";
        left: K.VariableDeclarationKind | K.ExpressionKind;
        right: K.ExpressionKind;
        body: K.StatementKind;
    }
    interface Import extends Omit<Expression, "type"> {
        type: "Import";
    }
    interface V8IntrinsicIdentifier extends Omit<Expression, "type"> {
        type: "V8IntrinsicIdentifier";
        name: string;
    }
    interface TopicReference extends Omit<Expression, "type"> {
        type: "TopicReference";
    }
    interface TSQualifiedName extends Omit<Node, "type"> {
        type: "TSQualifiedName";
        left: K.IdentifierKind | K.TSQualifiedNameKind;
        right: K.IdentifierKind | K.TSQualifiedNameKind;
    }
    interface TSTypeReference extends Omit<TSType, "type">, TSHasOptionalTypeParameterInstantiation {
        type: "TSTypeReference";
        typeName: K.IdentifierKind | K.TSQualifiedNameKind;
    }
    interface TSHasOptionalTypeParameters {
        typeParameters?: K.TSTypeParameterDeclarationKind | null | undefined;
    }
    interface TSAsExpression extends Omit<Expression, "type">, Omit<Pattern, "type"> {
        type: "TSAsExpression";
        expression: K.ExpressionKind;
        typeAnnotation: K.TSTypeKind;
        extra?: {
            parenthesized: boolean;
        } | null;
    }
    interface TSTypeCastExpression extends Omit<Expression, "type"> {
        type: "TSTypeCastExpression";
        expression: K.ExpressionKind;
        typeAnnotation: K.TSTypeKind;
    }
    interface TSSatisfiesExpression extends Omit<Expression, "type">, Omit<Pattern, "type"> {
        type: "TSSatisfiesExpression";
        expression: K.ExpressionKind;
        typeAnnotation: K.TSTypeKind;
    }
    interface TSNonNullExpression extends Omit<Expression, "type">, Omit<Pattern, "type"> {
        type: "TSNonNullExpression";
        expression: K.ExpressionKind;
    }
    interface TSAnyKeyword extends Omit<TSType, "type"> {
        type: "TSAnyKeyword";
    }
    interface TSBigIntKeyword extends Omit<TSType, "type"> {
        type: "TSBigIntKeyword";
    }
    interface TSBooleanKeyword extends Omit<TSType, "type"> {
        type: "TSBooleanKeyword";
    }
    interface TSNeverKeyword extends Omit<TSType, "type"> {
        type: "TSNeverKeyword";
    }
    interface TSNullKeyword extends Omit<TSType, "type"> {
        type: "TSNullKeyword";
    }
    interface TSNumberKeyword extends Omit<TSType, "type"> {
        type: "TSNumberKeyword";
    }
    interface TSObjectKeyword extends Omit<TSType, "type"> {
        type: "TSObjectKeyword";
    }
    interface TSStringKeyword extends Omit<TSType, "type"> {
        type: "TSStringKeyword";
    }
    interface TSSymbolKeyword extends Omit<TSType, "type"> {
        type: "TSSymbolKeyword";
    }
    interface TSUndefinedKeyword extends Omit<TSType, "type"> {
        type: "TSUndefinedKeyword";
    }
    interface TSUnknownKeyword extends Omit<TSType, "type"> {
        type: "TSUnknownKeyword";
    }
    interface TSVoidKeyword extends Omit<TSType, "type"> {
        type: "TSVoidKeyword";
    }
    interface TSIntrinsicKeyword extends Omit<TSType, "type"> {
        type: "TSIntrinsicKeyword";
    }
    interface TSThisType extends Omit<TSType, "type"> {
        type: "TSThisType";
    }
    interface TSArrayType extends Omit<TSType, "type"> {
        type: "TSArrayType";
        elementType: K.TSTypeKind;
    }
    interface TSLiteralType extends Omit<TSType, "type"> {
        type: "TSLiteralType";
        literal: K.NumericLiteralKind | K.StringLiteralKind | K.BooleanLiteralKind | K.TemplateLiteralKind | K.UnaryExpressionKind | K.BigIntLiteralKind;
    }
    interface TSUnionType extends Omit<TSType, "type"> {
        type: "TSUnionType";
        types: K.TSTypeKind[];
    }
    interface TSIntersectionType extends Omit<TSType, "type"> {
        type: "TSIntersectionType";
        types: K.TSTypeKind[];
    }
    interface TSConditionalType extends Omit<TSType, "type"> {
        type: "TSConditionalType";
        checkType: K.TSTypeKind;
        extendsType: K.TSTypeKind;
        trueType: K.TSTypeKind;
        falseType: K.TSTypeKind;
    }
    interface TSInferType extends Omit<TSType, "type"> {
        type: "TSInferType";
        typeParameter: K.TSTypeParameterKind;
    }
    interface TSTypeParameter extends Omit<Identifier, "type" | "name"> {
        type: "TSTypeParameter";
        name: K.IdentifierKind | string;
        constraint?: K.TSTypeKind | undefined;
        default?: K.TSTypeKind | undefined;
    }
    interface TSParenthesizedType extends Omit<TSType, "type"> {
        type: "TSParenthesizedType";
        typeAnnotation: K.TSTypeKind;
    }
    interface TSFunctionType extends Omit<TSType, "type">, TSHasOptionalTypeParameters, TSHasOptionalTypeAnnotation {
        type: "TSFunctionType";
        parameters: (K.IdentifierKind | K.RestElementKind | K.ArrayPatternKind | K.ObjectPatternKind)[];
    }
    interface TSConstructorType extends Omit<TSType, "type">, TSHasOptionalTypeParameters, TSHasOptionalTypeAnnotation {
        type: "TSConstructorType";
        parameters: (K.IdentifierKind | K.RestElementKind | K.ArrayPatternKind | K.ObjectPatternKind)[];
    }
    interface TSDeclareFunction extends Omit<Declaration, "type">, TSHasOptionalTypeParameters {
        type: "TSDeclareFunction";
        declare?: boolean;
        async?: boolean;
        generator?: boolean;
        id?: K.IdentifierKind | null;
        params: K.PatternKind[];
        returnType?: K.TSTypeAnnotationKind | K.NoopKind | null;
    }
    interface TSDeclareMethod extends Omit<Declaration, "type">, TSHasOptionalTypeParameters {
        type: "TSDeclareMethod";
        async?: boolean;
        generator?: boolean;
        params: K.PatternKind[];
        abstract?: boolean;
        accessibility?: "public" | "private" | "protected" | undefined;
        static?: boolean;
        computed?: boolean;
        optional?: boolean;
        key: K.IdentifierKind | K.StringLiteralKind | K.NumericLiteralKind | K.ExpressionKind;
        kind?: "get" | "set" | "method" | "constructor";
        access?: "public" | "private" | "protected" | undefined;
        decorators?: K.DecoratorKind[] | null;
        returnType?: K.TSTypeAnnotationKind | K.NoopKind | null;
    }
    interface TSMappedType extends Omit<TSType, "type"> {
        type: "TSMappedType";
        readonly?: boolean | "+" | "-";
        typeParameter: K.TSTypeParameterKind;
        optional?: boolean | "+" | "-";
        typeAnnotation?: K.TSTypeKind | null;
    }
    interface TSTupleType extends Omit<TSType, "type"> {
        type: "TSTupleType";
        elementTypes: (K.TSTypeKind | K.TSNamedTupleMemberKind)[];
    }
    interface TSNamedTupleMember extends Omit<TSType, "type"> {
        type: "TSNamedTupleMember";
        label: K.IdentifierKind;
        optional?: boolean;
        elementType: K.TSTypeKind;
    }
    interface TSRestType extends Omit<TSType, "type"> {
        type: "TSRestType";
        typeAnnotation: K.TSTypeKind;
    }
    interface TSOptionalType extends Omit<TSType, "type"> {
        type: "TSOptionalType";
        typeAnnotation: K.TSTypeKind;
    }
    interface TSIndexedAccessType extends Omit<TSType, "type"> {
        type: "TSIndexedAccessType";
        objectType: K.TSTypeKind;
        indexType: K.TSTypeKind;
    }
    interface TSTypeOperator extends Omit<TSType, "type"> {
        type: "TSTypeOperator";
        operator: string;
        typeAnnotation: K.TSTypeKind;
    }
    interface TSIndexSignature extends Omit<Declaration, "type">, TSHasOptionalTypeAnnotation {
        type: "TSIndexSignature";
        parameters: K.IdentifierKind[];
        readonly?: boolean;
    }
    interface TSPropertySignature extends Omit<Declaration, "type">, TSHasOptionalTypeAnnotation {
        type: "TSPropertySignature";
        key: K.ExpressionKind;
        computed?: boolean;
        readonly?: boolean;
        optional?: boolean;
        initializer?: K.ExpressionKind | null;
    }
    interface TSMethodSignature extends Omit<Declaration, "type">, TSHasOptionalTypeParameters, TSHasOptionalTypeAnnotation {
        type: "TSMethodSignature";
        key: K.ExpressionKind;
        computed?: boolean;
        optional?: boolean;
        parameters: (K.IdentifierKind | K.RestElementKind | K.ArrayPatternKind | K.ObjectPatternKind)[];
    }
    interface TSTypePredicate extends Omit<TSTypeAnnotation, "type" | "typeAnnotation">, Omit<TSType, "type"> {
        type: "TSTypePredicate";
        parameterName: K.IdentifierKind | K.TSThisTypeKind;
        typeAnnotation?: K.TSTypeAnnotationKind | null;
        asserts?: boolean;
    }
    interface TSCallSignatureDeclaration extends Omit<Declaration, "type">, TSHasOptionalTypeParameters, TSHasOptionalTypeAnnotation {
        type: "TSCallSignatureDeclaration";
        parameters: (K.IdentifierKind | K.RestElementKind | K.ArrayPatternKind | K.ObjectPatternKind)[];
    }
    interface TSConstructSignatureDeclaration extends Omit<Declaration, "type">, TSHasOptionalTypeParameters, TSHasOptionalTypeAnnotation {
        type: "TSConstructSignatureDeclaration";
        parameters: (K.IdentifierKind | K.RestElementKind | K.ArrayPatternKind | K.ObjectPatternKind)[];
    }
    interface TSEnumMember extends Omit<Node, "type"> {
        type: "TSEnumMember";
        id: K.IdentifierKind | K.StringLiteralKind;
        initializer?: K.ExpressionKind | null;
    }
    interface TSTypeQuery extends Omit<TSType, "type"> {
        type: "TSTypeQuery";
        exprName: K.IdentifierKind | K.TSQualifiedNameKind | K.TSImportTypeKind;
    }
    interface TSImportType extends Omit<TSType, "type">, TSHasOptionalTypeParameterInstantiation {
        type: "TSImportType";
        argument: K.StringLiteralKind;
        qualifier?: K.IdentifierKind | K.TSQualifiedNameKind | undefined;
    }
    interface TSTypeLiteral extends Omit<TSType, "type"> {
        type: "TSTypeLiteral";
        members: (K.TSCallSignatureDeclarationKind | K.TSConstructSignatureDeclarationKind | K.TSIndexSignatureKind | K.TSMethodSignatureKind | K.TSPropertySignatureKind)[];
    }
    interface TSTypeAssertion extends Omit<Expression, "type">, Omit<Pattern, "type"> {
        type: "TSTypeAssertion";
        typeAnnotation: K.TSTypeKind;
        expression: K.ExpressionKind;
        extra?: {
            parenthesized: boolean;
        } | null;
    }
    interface TSInstantiationExpression extends Omit<Expression, "type">, TSHasOptionalTypeParameterInstantiation {
        type: "TSInstantiationExpression";
        expression: K.ExpressionKind;
    }
    interface TSEnumDeclaration extends Omit<Declaration, "type"> {
        type: "TSEnumDeclaration";
        id: K.IdentifierKind;
        const?: boolean;
        declare?: boolean;
        members: K.TSEnumMemberKind[];
        initializer?: K.ExpressionKind | null;
    }
    interface TSTypeAliasDeclaration extends Omit<Declaration, "type">, TSHasOptionalTypeParameters {
        type: "TSTypeAliasDeclaration";
        id: K.IdentifierKind;
        declare?: boolean;
        typeAnnotation: K.TSTypeKind;
    }
    interface TSModuleBlock extends Omit<Node, "type"> {
        type: "TSModuleBlock";
        body: K.StatementKind[];
    }
    interface TSModuleDeclaration extends Omit<Declaration, "type"> {
        type: "TSModuleDeclaration";
        id: K.StringLiteralKind | K.IdentifierKind | K.TSQualifiedNameKind;
        declare?: boolean;
        global?: boolean;
        body?: K.TSModuleBlockKind | K.TSModuleDeclarationKind | null;
    }
    interface TSImportEqualsDeclaration extends Omit<Declaration, "type"> {
        type: "TSImportEqualsDeclaration";
        id: K.IdentifierKind;
        isExport?: boolean;
        moduleReference: K.IdentifierKind | K.TSQualifiedNameKind | K.TSExternalModuleReferenceKind;
    }
    interface TSExternalModuleReference extends Omit<Declaration, "type"> {
        type: "TSExternalModuleReference";
        expression: K.StringLiteralKind;
    }
    interface TSExportAssignment extends Omit<Statement, "type"> {
        type: "TSExportAssignment";
        expression: K.ExpressionKind;
    }
    interface TSNamespaceExportDeclaration extends Omit<Declaration, "type"> {
        type: "TSNamespaceExportDeclaration";
        id: K.IdentifierKind;
    }
    interface TSInterfaceBody extends Omit<Node, "type"> {
        type: "TSInterfaceBody";
        body: (K.TSCallSignatureDeclarationKind | K.TSConstructSignatureDeclarationKind | K.TSIndexSignatureKind | K.TSMethodSignatureKind | K.TSPropertySignatureKind)[];
    }
    interface TSInterfaceDeclaration extends Omit<Declaration, "type">, TSHasOptionalTypeParameters {
        type: "TSInterfaceDeclaration";
        id: K.IdentifierKind | K.TSQualifiedNameKind;
        declare?: boolean;
        extends?: K.TSExpressionWithTypeArgumentsKind[] | null;
        body: K.TSInterfaceBodyKind;
    }
    interface TSParameterProperty extends Omit<Pattern, "type"> {
        type: "TSParameterProperty";
        accessibility?: "public" | "private" | "protected" | undefined;
        readonly?: boolean;
        parameter: K.IdentifierKind | K.AssignmentPatternKind;
    }
    type ASTNode = File | Program | Identifier | BlockStatement | EmptyStatement | ExpressionStatement | IfStatement | LabeledStatement | BreakStatement | ContinueStatement | WithStatement | SwitchStatement | SwitchCase | ReturnStatement | ThrowStatement | TryStatement | CatchClause | WhileStatement | DoWhileStatement | ForStatement | VariableDeclaration | ForInStatement | DebuggerStatement | FunctionDeclaration | FunctionExpression | VariableDeclarator | ThisExpression | ArrayExpression | ObjectExpression | Property | Literal | SequenceExpression | UnaryExpression | BinaryExpression | AssignmentExpression | MemberExpression | UpdateExpression | LogicalExpression | ConditionalExpression | NewExpression | CallExpression | RestElement | TypeAnnotation | TSTypeAnnotation | SpreadElementPattern | ArrowFunctionExpression | ForOfStatement | YieldExpression | GeneratorExpression | ComprehensionBlock | ComprehensionExpression | ObjectProperty | PropertyPattern | ObjectPattern | ArrayPattern | SpreadElement | AssignmentPattern | MethodDefinition | ClassPropertyDefinition | ClassProperty | StaticBlock | ClassBody | ClassDeclaration | ClassExpression | Super | ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier | ImportDeclaration | ExportNamedDeclaration | ExportSpecifier | ExportDefaultDeclaration | ExportAllDeclaration | TaggedTemplateExpression | TemplateLiteral | TemplateElement | MetaProperty | AwaitExpression | SpreadProperty | SpreadPropertyPattern | ImportExpression | ChainExpression | OptionalCallExpression | OptionalMemberExpression | Decorator | PrivateName | ClassPrivateProperty | ImportAttribute | RecordExpression | ObjectMethod | TupleExpression | ModuleExpression | JSXAttribute | JSXIdentifier | JSXNamespacedName | JSXExpressionContainer | JSXElement | JSXFragment | JSXMemberExpression | JSXSpreadAttribute | JSXEmptyExpression | JSXText | JSXSpreadChild | JSXOpeningElement | JSXClosingElement | JSXOpeningFragment | JSXClosingFragment | TypeParameterDeclaration | TSTypeParameterDeclaration | TypeParameterInstantiation | TSTypeParameterInstantiation | ClassImplements | TSExpressionWithTypeArguments | AnyTypeAnnotation | EmptyTypeAnnotation | MixedTypeAnnotation | VoidTypeAnnotation | SymbolTypeAnnotation | NumberTypeAnnotation | BigIntTypeAnnotation | NumberLiteralTypeAnnotation | NumericLiteralTypeAnnotation | BigIntLiteralTypeAnnotation | StringTypeAnnotation | StringLiteralTypeAnnotation | BooleanTypeAnnotation | BooleanLiteralTypeAnnotation | NullableTypeAnnotation | NullLiteralTypeAnnotation | NullTypeAnnotation | ThisTypeAnnotation | ExistsTypeAnnotation | ExistentialTypeParam | FunctionTypeAnnotation | FunctionTypeParam | ArrayTypeAnnotation | ObjectTypeAnnotation | ObjectTypeProperty | ObjectTypeSpreadProperty | ObjectTypeIndexer | ObjectTypeCallProperty | ObjectTypeInternalSlot | Variance | QualifiedTypeIdentifier | GenericTypeAnnotation | MemberTypeAnnotation | IndexedAccessType | OptionalIndexedAccessType | UnionTypeAnnotation | IntersectionTypeAnnotation | TypeofTypeAnnotation | TypeParameter | InterfaceTypeAnnotation | InterfaceExtends | InterfaceDeclaration | DeclareInterface | TypeAlias | DeclareTypeAlias | OpaqueType | DeclareOpaqueType | TypeCastExpression | TupleTypeAnnotation | DeclareVariable | DeclareFunction | DeclareClass | DeclareModule | DeclareModuleExports | DeclareExportDeclaration | ExportBatchSpecifier | DeclareExportAllDeclaration | InferredPredicate | DeclaredPredicate | EnumDeclaration | EnumBooleanBody | EnumNumberBody | EnumStringBody | EnumSymbolBody | EnumBooleanMember | EnumNumberMember | EnumStringMember | EnumDefaultedMember | ExportDeclaration | Block | Line | Noop | DoExpression | BindExpression | ParenthesizedExpression | ExportNamespaceSpecifier | ExportDefaultSpecifier | CommentBlock | CommentLine | Directive | DirectiveLiteral | InterpreterDirective | StringLiteral | NumericLiteral | BigIntLiteral | DecimalLiteral | NullLiteral | BooleanLiteral | RegExpLiteral | ClassMethod | ClassPrivateMethod | ClassAccessorProperty | RestProperty | ForAwaitStatement | Import | V8IntrinsicIdentifier | TopicReference | TSQualifiedName | TSTypeReference | TSAsExpression | TSTypeCastExpression | TSSatisfiesExpression | TSNonNullExpression | TSAnyKeyword | TSBigIntKeyword | TSBooleanKeyword | TSNeverKeyword | TSNullKeyword | TSNumberKeyword | TSObjectKeyword | TSStringKeyword | TSSymbolKeyword | TSUndefinedKeyword | TSUnknownKeyword | TSVoidKeyword | TSIntrinsicKeyword | TSThisType | TSArrayType | TSLiteralType | TSUnionType | TSIntersectionType | TSConditionalType | TSInferType | TSTypeParameter | TSParenthesizedType | TSFunctionType | TSConstructorType | TSDeclareFunction | TSDeclareMethod | TSMappedType | TSTupleType | TSNamedTupleMember | TSRestType | TSOptionalType | TSIndexedAccessType | TSTypeOperator | TSIndexSignature | TSPropertySignature | TSMethodSignature | TSTypePredicate | TSCallSignatureDeclaration | TSConstructSignatureDeclaration | TSEnumMember | TSTypeQuery | TSImportType | TSTypeLiteral | TSTypeAssertion | TSInstantiationExpression | TSEnumDeclaration | TSTypeAliasDeclaration | TSModuleBlock | TSModuleDeclaration | TSImportEqualsDeclaration | TSExternalModuleReference | TSExportAssignment | TSNamespaceExportDeclaration | TSInterfaceBody | TSInterfaceDeclaration | TSParameterProperty;
    let Printable: Type<Printable>;
    let SourceLocation: Type<SourceLocation>;
    let Node: Type<Node>;
    let Comment: Type<Comment>;
    let Position: Type<Position>;
    let File: Type<File>;
    let Program: Type<Program>;
    let Statement: Type<Statement>;
    let Function: Type<Function>;
    let Expression: Type<Expression>;
    let Pattern: Type<Pattern>;
    let Identifier: Type<Identifier>;
    let BlockStatement: Type<BlockStatement>;
    let EmptyStatement: Type<EmptyStatement>;
    let ExpressionStatement: Type<ExpressionStatement>;
    let IfStatement: Type<IfStatement>;
    let LabeledStatement: Type<LabeledStatement>;
    let BreakStatement: Type<BreakStatement>;
    let ContinueStatement: Type<ContinueStatement>;
    let WithStatement: Type<WithStatement>;
    let SwitchStatement: Type<SwitchStatement>;
    let SwitchCase: Type<SwitchCase>;
    let ReturnStatement: Type<ReturnStatement>;
    let ThrowStatement: Type<ThrowStatement>;
    let TryStatement: Type<TryStatement>;
    let CatchClause: Type<CatchClause>;
    let WhileStatement: Type<WhileStatement>;
    let DoWhileStatement: Type<DoWhileStatement>;
    let ForStatement: Type<ForStatement>;
    let Declaration: Type<Declaration>;
    let VariableDeclaration: Type<VariableDeclaration>;
    let ForInStatement: Type<ForInStatement>;
    let DebuggerStatement: Type<DebuggerStatement>;
    let FunctionDeclaration: Type<FunctionDeclaration>;
    let FunctionExpression: Type<FunctionExpression>;
    let VariableDeclarator: Type<VariableDeclarator>;
    let ThisExpression: Type<ThisExpression>;
    let ArrayExpression: Type<ArrayExpression>;
    let ObjectExpression: Type<ObjectExpression>;
    let Property: Type<Property>;
    let Literal: Type<Literal>;
    let SequenceExpression: Type<SequenceExpression>;
    let UnaryExpression: Type<UnaryExpression>;
    let BinaryExpression: Type<BinaryExpression>;
    let AssignmentExpression: Type<AssignmentExpression>;
    let ChainElement: Type<ChainElement>;
    let MemberExpression: Type<MemberExpression>;
    let UpdateExpression: Type<UpdateExpression>;
    let LogicalExpression: Type<LogicalExpression>;
    let ConditionalExpression: Type<ConditionalExpression>;
    let NewExpression: Type<NewExpression>;
    let CallExpression: Type<CallExpression>;
    let RestElement: Type<RestElement>;
    let TypeAnnotation: Type<TypeAnnotation>;
    let TSTypeAnnotation: Type<TSTypeAnnotation>;
    let SpreadElementPattern: Type<SpreadElementPattern>;
    let ArrowFunctionExpression: Type<ArrowFunctionExpression>;
    let ForOfStatement: Type<ForOfStatement>;
    let YieldExpression: Type<YieldExpression>;
    let GeneratorExpression: Type<GeneratorExpression>;
    let ComprehensionBlock: Type<ComprehensionBlock>;
    let ComprehensionExpression: Type<ComprehensionExpression>;
    let ObjectProperty: Type<ObjectProperty>;
    let PropertyPattern: Type<PropertyPattern>;
    let ObjectPattern: Type<ObjectPattern>;
    let ArrayPattern: Type<ArrayPattern>;
    let SpreadElement: Type<SpreadElement>;
    let AssignmentPattern: Type<AssignmentPattern>;
    let MethodDefinition: Type<MethodDefinition>;
    let ClassPropertyDefinition: Type<ClassPropertyDefinition>;
    let ClassProperty: Type<ClassProperty>;
    let StaticBlock: Type<StaticBlock>;
    let ClassBody: Type<ClassBody>;
    let ClassDeclaration: Type<ClassDeclaration>;
    let ClassExpression: Type<ClassExpression>;
    let Super: Type<Super>;
    let Specifier: Type<Specifier>;
    let ModuleSpecifier: Type<ModuleSpecifier>;
    let ImportSpecifier: Type<ImportSpecifier>;
    let ImportDefaultSpecifier: Type<ImportDefaultSpecifier>;
    let ImportNamespaceSpecifier: Type<ImportNamespaceSpecifier>;
    let ImportDeclaration: Type<ImportDeclaration>;
    let ExportNamedDeclaration: Type<ExportNamedDeclaration>;
    let ExportSpecifier: Type<ExportSpecifier>;
    let ExportDefaultDeclaration: Type<ExportDefaultDeclaration>;
    let ExportAllDeclaration: Type<ExportAllDeclaration>;
    let TaggedTemplateExpression: Type<TaggedTemplateExpression>;
    let TemplateLiteral: Type<TemplateLiteral>;
    let TemplateElement: Type<TemplateElement>;
    let MetaProperty: Type<MetaProperty>;
    let AwaitExpression: Type<AwaitExpression>;
    let SpreadProperty: Type<SpreadProperty>;
    let SpreadPropertyPattern: Type<SpreadPropertyPattern>;
    let ImportExpression: Type<ImportExpression>;
    let ChainExpression: Type<ChainExpression>;
    let OptionalCallExpression: Type<OptionalCallExpression>;
    let OptionalMemberExpression: Type<OptionalMemberExpression>;
    let Decorator: Type<Decorator>;
    let PrivateName: Type<PrivateName>;
    let ClassPrivateProperty: Type<ClassPrivateProperty>;
    let ImportAttribute: Type<ImportAttribute>;
    let RecordExpression: Type<RecordExpression>;
    let ObjectMethod: Type<ObjectMethod>;
    let TupleExpression: Type<TupleExpression>;
    let ModuleExpression: Type<ModuleExpression>;
    let JSXAttribute: Type<JSXAttribute>;
    let JSXIdentifier: Type<JSXIdentifier>;
    let JSXNamespacedName: Type<JSXNamespacedName>;
    let JSXExpressionContainer: Type<JSXExpressionContainer>;
    let JSXElement: Type<JSXElement>;
    let JSXFragment: Type<JSXFragment>;
    let JSXMemberExpression: Type<JSXMemberExpression>;
    let JSXSpreadAttribute: Type<JSXSpreadAttribute>;
    let JSXEmptyExpression: Type<JSXEmptyExpression>;
    let JSXText: Type<JSXText>;
    let JSXSpreadChild: Type<JSXSpreadChild>;
    let JSXOpeningElement: Type<JSXOpeningElement>;
    let JSXClosingElement: Type<JSXClosingElement>;
    let JSXOpeningFragment: Type<JSXOpeningFragment>;
    let JSXClosingFragment: Type<JSXClosingFragment>;
    let TypeParameterDeclaration: Type<TypeParameterDeclaration>;
    let TSTypeParameterDeclaration: Type<TSTypeParameterDeclaration>;
    let TypeParameterInstantiation: Type<TypeParameterInstantiation>;
    let TSTypeParameterInstantiation: Type<TSTypeParameterInstantiation>;
    let ClassImplements: Type<ClassImplements>;
    let TSType: Type<TSType>;
    let TSHasOptionalTypeParameterInstantiation: Type<TSHasOptionalTypeParameterInstantiation>;
    let TSExpressionWithTypeArguments: Type<TSExpressionWithTypeArguments>;
    let Flow: Type<Flow>;
    let FlowType: Type<FlowType>;
    let AnyTypeAnnotation: Type<AnyTypeAnnotation>;
    let EmptyTypeAnnotation: Type<EmptyTypeAnnotation>;
    let MixedTypeAnnotation: Type<MixedTypeAnnotation>;
    let VoidTypeAnnotation: Type<VoidTypeAnnotation>;
    let SymbolTypeAnnotation: Type<SymbolTypeAnnotation>;
    let NumberTypeAnnotation: Type<NumberTypeAnnotation>;
    let BigIntTypeAnnotation: Type<BigIntTypeAnnotation>;
    let NumberLiteralTypeAnnotation: Type<NumberLiteralTypeAnnotation>;
    let NumericLiteralTypeAnnotation: Type<NumericLiteralTypeAnnotation>;
    let BigIntLiteralTypeAnnotation: Type<BigIntLiteralTypeAnnotation>;
    let StringTypeAnnotation: Type<StringTypeAnnotation>;
    let StringLiteralTypeAnnotation: Type<StringLiteralTypeAnnotation>;
    let BooleanTypeAnnotation: Type<BooleanTypeAnnotation>;
    let BooleanLiteralTypeAnnotation: Type<BooleanLiteralTypeAnnotation>;
    let NullableTypeAnnotation: Type<NullableTypeAnnotation>;
    let NullLiteralTypeAnnotation: Type<NullLiteralTypeAnnotation>;
    let NullTypeAnnotation: Type<NullTypeAnnotation>;
    let ThisTypeAnnotation: Type<ThisTypeAnnotation>;
    let ExistsTypeAnnotation: Type<ExistsTypeAnnotation>;
    let ExistentialTypeParam: Type<ExistentialTypeParam>;
    let FunctionTypeAnnotation: Type<FunctionTypeAnnotation>;
    let FunctionTypeParam: Type<FunctionTypeParam>;
    let ArrayTypeAnnotation: Type<ArrayTypeAnnotation>;
    let ObjectTypeAnnotation: Type<ObjectTypeAnnotation>;
    let ObjectTypeProperty: Type<ObjectTypeProperty>;
    let ObjectTypeSpreadProperty: Type<ObjectTypeSpreadProperty>;
    let ObjectTypeIndexer: Type<ObjectTypeIndexer>;
    let ObjectTypeCallProperty: Type<ObjectTypeCallProperty>;
    let ObjectTypeInternalSlot: Type<ObjectTypeInternalSlot>;
    let Variance: Type<Variance>;
    let QualifiedTypeIdentifier: Type<QualifiedTypeIdentifier>;
    let GenericTypeAnnotation: Type<GenericTypeAnnotation>;
    let MemberTypeAnnotation: Type<MemberTypeAnnotation>;
    let IndexedAccessType: Type<IndexedAccessType>;
    let OptionalIndexedAccessType: Type<OptionalIndexedAccessType>;
    let UnionTypeAnnotation: Type<UnionTypeAnnotation>;
    let IntersectionTypeAnnotation: Type<IntersectionTypeAnnotation>;
    let TypeofTypeAnnotation: Type<TypeofTypeAnnotation>;
    let TypeParameter: Type<TypeParameter>;
    let InterfaceTypeAnnotation: Type<InterfaceTypeAnnotation>;
    let InterfaceExtends: Type<InterfaceExtends>;
    let InterfaceDeclaration: Type<InterfaceDeclaration>;
    let DeclareInterface: Type<DeclareInterface>;
    let TypeAlias: Type<TypeAlias>;
    let DeclareTypeAlias: Type<DeclareTypeAlias>;
    let OpaqueType: Type<OpaqueType>;
    let DeclareOpaqueType: Type<DeclareOpaqueType>;
    let TypeCastExpression: Type<TypeCastExpression>;
    let TupleTypeAnnotation: Type<TupleTypeAnnotation>;
    let DeclareVariable: Type<DeclareVariable>;
    let DeclareFunction: Type<DeclareFunction>;
    let FlowPredicate: Type<FlowPredicate>;
    let DeclareClass: Type<DeclareClass>;
    let DeclareModule: Type<DeclareModule>;
    let DeclareModuleExports: Type<DeclareModuleExports>;
    let DeclareExportDeclaration: Type<DeclareExportDeclaration>;
    let ExportBatchSpecifier: Type<ExportBatchSpecifier>;
    let DeclareExportAllDeclaration: Type<DeclareExportAllDeclaration>;
    let InferredPredicate: Type<InferredPredicate>;
    let DeclaredPredicate: Type<DeclaredPredicate>;
    let EnumDeclaration: Type<EnumDeclaration>;
    let EnumBooleanBody: Type<EnumBooleanBody>;
    let EnumNumberBody: Type<EnumNumberBody>;
    let EnumStringBody: Type<EnumStringBody>;
    let EnumSymbolBody: Type<EnumSymbolBody>;
    let EnumBooleanMember: Type<EnumBooleanMember>;
    let EnumNumberMember: Type<EnumNumberMember>;
    let EnumStringMember: Type<EnumStringMember>;
    let EnumDefaultedMember: Type<EnumDefaultedMember>;
    let ExportDeclaration: Type<ExportDeclaration>;
    let Block: Type<Block>;
    let Line: Type<Line>;
    let Noop: Type<Noop>;
    let DoExpression: Type<DoExpression>;
    let BindExpression: Type<BindExpression>;
    let ParenthesizedExpression: Type<ParenthesizedExpression>;
    let ExportNamespaceSpecifier: Type<ExportNamespaceSpecifier>;
    let ExportDefaultSpecifier: Type<ExportDefaultSpecifier>;
    let CommentBlock: Type<CommentBlock>;
    let CommentLine: Type<CommentLine>;
    let Directive: Type<Directive>;
    let DirectiveLiteral: Type<DirectiveLiteral>;
    let InterpreterDirective: Type<InterpreterDirective>;
    let StringLiteral: Type<StringLiteral>;
    let NumericLiteral: Type<NumericLiteral>;
    let BigIntLiteral: Type<BigIntLiteral>;
    let DecimalLiteral: Type<DecimalLiteral>;
    let NullLiteral: Type<NullLiteral>;
    let BooleanLiteral: Type<BooleanLiteral>;
    let RegExpLiteral: Type<RegExpLiteral>;
    let ClassMethod: Type<ClassMethod>;
    let ClassPrivateMethod: Type<ClassPrivateMethod>;
    let TSHasOptionalTypeAnnotation: Type<TSHasOptionalTypeAnnotation>;
    let ClassAccessorProperty: Type<ClassAccessorProperty>;
    let RestProperty: Type<RestProperty>;
    let ForAwaitStatement: Type<ForAwaitStatement>;
    let Import: Type<Import>;
    let V8IntrinsicIdentifier: Type<V8IntrinsicIdentifier>;
    let TopicReference: Type<TopicReference>;
    let TSQualifiedName: Type<TSQualifiedName>;
    let TSTypeReference: Type<TSTypeReference>;
    let TSHasOptionalTypeParameters: Type<TSHasOptionalTypeParameters>;
    let TSAsExpression: Type<TSAsExpression>;
    let TSTypeCastExpression: Type<TSTypeCastExpression>;
    let TSSatisfiesExpression: Type<TSSatisfiesExpression>;
    let TSNonNullExpression: Type<TSNonNullExpression>;
    let TSAnyKeyword: Type<TSAnyKeyword>;
    let TSBigIntKeyword: Type<TSBigIntKeyword>;
    let TSBooleanKeyword: Type<TSBooleanKeyword>;
    let TSNeverKeyword: Type<TSNeverKeyword>;
    let TSNullKeyword: Type<TSNullKeyword>;
    let TSNumberKeyword: Type<TSNumberKeyword>;
    let TSObjectKeyword: Type<TSObjectKeyword>;
    let TSStringKeyword: Type<TSStringKeyword>;
    let TSSymbolKeyword: Type<TSSymbolKeyword>;
    let TSUndefinedKeyword: Type<TSUndefinedKeyword>;
    let TSUnknownKeyword: Type<TSUnknownKeyword>;
    let TSVoidKeyword: Type<TSVoidKeyword>;
    let TSIntrinsicKeyword: Type<TSIntrinsicKeyword>;
    let TSThisType: Type<TSThisType>;
    let TSArrayType: Type<TSArrayType>;
    let TSLiteralType: Type<TSLiteralType>;
    let TSUnionType: Type<TSUnionType>;
    let TSIntersectionType: Type<TSIntersectionType>;
    let TSConditionalType: Type<TSConditionalType>;
    let TSInferType: Type<TSInferType>;
    let TSTypeParameter: Type<TSTypeParameter>;
    let TSParenthesizedType: Type<TSParenthesizedType>;
    let TSFunctionType: Type<TSFunctionType>;
    let TSConstructorType: Type<TSConstructorType>;
    let TSDeclareFunction: Type<TSDeclareFunction>;
    let TSDeclareMethod: Type<TSDeclareMethod>;
    let TSMappedType: Type<TSMappedType>;
    let TSTupleType: Type<TSTupleType>;
    let TSNamedTupleMember: Type<TSNamedTupleMember>;
    let TSRestType: Type<TSRestType>;
    let TSOptionalType: Type<TSOptionalType>;
    let TSIndexedAccessType: Type<TSIndexedAccessType>;
    let TSTypeOperator: Type<TSTypeOperator>;
    let TSIndexSignature: Type<TSIndexSignature>;
    let TSPropertySignature: Type<TSPropertySignature>;
    let TSMethodSignature: Type<TSMethodSignature>;
    let TSTypePredicate: Type<TSTypePredicate>;
    let TSCallSignatureDeclaration: Type<TSCallSignatureDeclaration>;
    let TSConstructSignatureDeclaration: Type<TSConstructSignatureDeclaration>;
    let TSEnumMember: Type<TSEnumMember>;
    let TSTypeQuery: Type<TSTypeQuery>;
    let TSImportType: Type<TSImportType>;
    let TSTypeLiteral: Type<TSTypeLiteral>;
    let TSTypeAssertion: Type<TSTypeAssertion>;
    let TSInstantiationExpression: Type<TSInstantiationExpression>;
    let TSEnumDeclaration: Type<TSEnumDeclaration>;
    let TSTypeAliasDeclaration: Type<TSTypeAliasDeclaration>;
    let TSModuleBlock: Type<TSModuleBlock>;
    let TSModuleDeclaration: Type<TSModuleDeclaration>;
    let TSImportEqualsDeclaration: Type<TSImportEqualsDeclaration>;
    let TSExternalModuleReference: Type<TSExternalModuleReference>;
    let TSExportAssignment: Type<TSExportAssignment>;
    let TSNamespaceExportDeclaration: Type<TSNamespaceExportDeclaration>;
    let TSInterfaceBody: Type<TSInterfaceBody>;
    let TSInterfaceDeclaration: Type<TSInterfaceDeclaration>;
    let TSParameterProperty: Type<TSParameterProperty>;
}
export interface NamedTypes {
    Printable: Type<namedTypes.Printable>;
    SourceLocation: Type<namedTypes.SourceLocation>;
    Node: Type<namedTypes.Node>;
    Comment: Type<namedTypes.Comment>;
    Position: Type<namedTypes.Position>;
    File: Type<namedTypes.File>;
    Program: Type<namedTypes.Program>;
    Statement: Type<namedTypes.Statement>;
    Function: Type<namedTypes.Function>;
    Expression: Type<namedTypes.Expression>;
    Pattern: Type<namedTypes.Pattern>;
    Identifier: Type<namedTypes.Identifier>;
    BlockStatement: Type<namedTypes.BlockStatement>;
    EmptyStatement: Type<namedTypes.EmptyStatement>;
    ExpressionStatement: Type<namedTypes.ExpressionStatement>;
    IfStatement: Type<namedTypes.IfStatement>;
    LabeledStatement: Type<namedTypes.LabeledStatement>;
    BreakStatement: Type<namedTypes.BreakStatement>;
    ContinueStatement: Type<namedTypes.ContinueStatement>;
    WithStatement: Type<namedTypes.WithStatement>;
    SwitchStatement: Type<namedTypes.SwitchStatement>;
    SwitchCase: Type<namedTypes.SwitchCase>;
    ReturnStatement: Type<namedTypes.ReturnStatement>;
    ThrowStatement: Type<namedTypes.ThrowStatement>;
    TryStatement: Type<namedTypes.TryStatement>;
    CatchClause: Type<namedTypes.CatchClause>;
    WhileStatement: Type<namedTypes.WhileStatement>;
    DoWhileStatement: Type<namedTypes.DoWhileStatement>;
    ForStatement: Type<namedTypes.ForStatement>;
    Declaration: Type<namedTypes.Declaration>;
    VariableDeclaration: Type<namedTypes.VariableDeclaration>;
    ForInStatement: Type<namedTypes.ForInStatement>;
    DebuggerStatement: Type<namedTypes.DebuggerStatement>;
    FunctionDeclaration: Type<namedTypes.FunctionDeclaration>;
    FunctionExpression: Type<namedTypes.FunctionExpression>;
    VariableDeclarator: Type<namedTypes.VariableDeclarator>;
    ThisExpression: Type<namedTypes.ThisExpression>;
    ArrayExpression: Type<namedTypes.ArrayExpression>;
    ObjectExpression: Type<namedTypes.ObjectExpression>;
    Property: Type<namedTypes.Property>;
    Literal: Type<namedTypes.Literal>;
    SequenceExpression: Type<namedTypes.SequenceExpression>;
    UnaryExpression: Type<namedTypes.UnaryExpression>;
    BinaryExpression: Type<namedTypes.BinaryExpression>;
    AssignmentExpression: Type<namedTypes.AssignmentExpression>;
    ChainElement: Type<namedTypes.ChainElement>;
    MemberExpression: Type<namedTypes.MemberExpression>;
    UpdateExpression: Type<namedTypes.UpdateExpression>;
    LogicalExpression: Type<namedTypes.LogicalExpression>;
    ConditionalExpression: Type<namedTypes.ConditionalExpression>;
    NewExpression: Type<namedTypes.NewExpression>;
    CallExpression: Type<namedTypes.CallExpression>;
    RestElement: Type<namedTypes.RestElement>;
    TypeAnnotation: Type<namedTypes.TypeAnnotation>;
    TSTypeAnnotation: Type<namedTypes.TSTypeAnnotation>;
    SpreadElementPattern: Type<namedTypes.SpreadElementPattern>;
    ArrowFunctionExpression: Type<namedTypes.ArrowFunctionExpression>;
    ForOfStatement: Type<namedTypes.ForOfStatement>;
    YieldExpression: Type<namedTypes.YieldExpression>;
    GeneratorExpression: Type<namedTypes.GeneratorExpression>;
    ComprehensionBlock: Type<namedTypes.ComprehensionBlock>;
    ComprehensionExpression: Type<namedTypes.ComprehensionExpression>;
    ObjectProperty: Type<namedTypes.ObjectProperty>;
    PropertyPattern: Type<namedTypes.PropertyPattern>;
    ObjectPattern: Type<namedTypes.ObjectPattern>;
    ArrayPattern: Type<namedTypes.ArrayPattern>;
    SpreadElement: Type<namedTypes.SpreadElement>;
    AssignmentPattern: Type<namedTypes.AssignmentPattern>;
    MethodDefinition: Type<namedTypes.MethodDefinition>;
    ClassPropertyDefinition: Type<namedTypes.ClassPropertyDefinition>;
    ClassProperty: Type<namedTypes.ClassProperty>;
    StaticBlock: Type<namedTypes.StaticBlock>;
    ClassBody: Type<namedTypes.ClassBody>;
    ClassDeclaration: Type<namedTypes.ClassDeclaration>;
    ClassExpression: Type<namedTypes.ClassExpression>;
    Super: Type<namedTypes.Super>;
    Specifier: Type<namedTypes.Specifier>;
    ModuleSpecifier: Type<namedTypes.ModuleSpecifier>;
    ImportSpecifier: Type<namedTypes.ImportSpecifier>;
    ImportDefaultSpecifier: Type<namedTypes.ImportDefaultSpecifier>;
    ImportNamespaceSpecifier: Type<namedTypes.ImportNamespaceSpecifier>;
    ImportDeclaration: Type<namedTypes.ImportDeclaration>;
    ExportNamedDeclaration: Type<namedTypes.ExportNamedDeclaration>;
    ExportSpecifier: Type<namedTypes.ExportSpecifier>;
    ExportDefaultDeclaration: Type<namedTypes.ExportDefaultDeclaration>;
    ExportAllDeclaration: Type<namedTypes.ExportAllDeclaration>;
    TaggedTemplateExpression: Type<namedTypes.TaggedTemplateExpression>;
    TemplateLiteral: Type<namedTypes.TemplateLiteral>;
    TemplateElement: Type<namedTypes.TemplateElement>;
    MetaProperty: Type<namedTypes.MetaProperty>;
    AwaitExpression: Type<namedTypes.AwaitExpression>;
    SpreadProperty: Type<namedTypes.SpreadProperty>;
    SpreadPropertyPattern: Type<namedTypes.SpreadPropertyPattern>;
    ImportExpression: Type<namedTypes.ImportExpression>;
    ChainExpression: Type<namedTypes.ChainExpression>;
    OptionalCallExpression: Type<namedTypes.OptionalCallExpression>;
    OptionalMemberExpression: Type<namedTypes.OptionalMemberExpression>;
    Decorator: Type<namedTypes.Decorator>;
    PrivateName: Type<namedTypes.PrivateName>;
    ClassPrivateProperty: Type<namedTypes.ClassPrivateProperty>;
    ImportAttribute: Type<namedTypes.ImportAttribute>;
    RecordExpression: Type<namedTypes.RecordExpression>;
    ObjectMethod: Type<namedTypes.ObjectMethod>;
    TupleExpression: Type<namedTypes.TupleExpression>;
    ModuleExpression: Type<namedTypes.ModuleExpression>;
    JSXAttribute: Type<namedTypes.JSXAttribute>;
    JSXIdentifier: Type<namedTypes.JSXIdentifier>;
    JSXNamespacedName: Type<namedTypes.JSXNamespacedName>;
    JSXExpressionContainer: Type<namedTypes.JSXExpressionContainer>;
    JSXElement: Type<namedTypes.JSXElement>;
    JSXFragment: Type<namedTypes.JSXFragment>;
    JSXMemberExpression: Type<namedTypes.JSXMemberExpression>;
    JSXSpreadAttribute: Type<namedTypes.JSXSpreadAttribute>;
    JSXEmptyExpression: Type<namedTypes.JSXEmptyExpression>;
    JSXText: Type<namedTypes.JSXText>;
    JSXSpreadChild: Type<namedTypes.JSXSpreadChild>;
    JSXOpeningElement: Type<namedTypes.JSXOpeningElement>;
    JSXClosingElement: Type<namedTypes.JSXClosingElement>;
    JSXOpeningFragment: Type<namedTypes.JSXOpeningFragment>;
    JSXClosingFragment: Type<namedTypes.JSXClosingFragment>;
    TypeParameterDeclaration: Type<namedTypes.TypeParameterDeclaration>;
    TSTypeParameterDeclaration: Type<namedTypes.TSTypeParameterDeclaration>;
    TypeParameterInstantiation: Type<namedTypes.TypeParameterInstantiation>;
    TSTypeParameterInstantiation: Type<namedTypes.TSTypeParameterInstantiation>;
    ClassImplements: Type<namedTypes.ClassImplements>;
    TSType: Type<namedTypes.TSType>;
    TSHasOptionalTypeParameterInstantiation: Type<namedTypes.TSHasOptionalTypeParameterInstantiation>;
    TSExpressionWithTypeArguments: Type<namedTypes.TSExpressionWithTypeArguments>;
    Flow: Type<namedTypes.Flow>;
    FlowType: Type<namedTypes.FlowType>;
    AnyTypeAnnotation: Type<namedTypes.AnyTypeAnnotation>;
    EmptyTypeAnnotation: Type<namedTypes.EmptyTypeAnnotation>;
    MixedTypeAnnotation: Type<namedTypes.MixedTypeAnnotation>;
    VoidTypeAnnotation: Type<namedTypes.VoidTypeAnnotation>;
    SymbolTypeAnnotation: Type<namedTypes.SymbolTypeAnnotation>;
    NumberTypeAnnotation: Type<namedTypes.NumberTypeAnnotation>;
    BigIntTypeAnnotation: Type<namedTypes.BigIntTypeAnnotation>;
    NumberLiteralTypeAnnotation: Type<namedTypes.NumberLiteralTypeAnnotation>;
    NumericLiteralTypeAnnotation: Type<namedTypes.NumericLiteralTypeAnnotation>;
    BigIntLiteralTypeAnnotation: Type<namedTypes.BigIntLiteralTypeAnnotation>;
    StringTypeAnnotation: Type<namedTypes.StringTypeAnnotation>;
    StringLiteralTypeAnnotation: Type<namedTypes.StringLiteralTypeAnnotation>;
    BooleanTypeAnnotation: Type<namedTypes.BooleanTypeAnnotation>;
    BooleanLiteralTypeAnnotation: Type<namedTypes.BooleanLiteralTypeAnnotation>;
    NullableTypeAnnotation: Type<namedTypes.NullableTypeAnnotation>;
    NullLiteralTypeAnnotation: Type<namedTypes.NullLiteralTypeAnnotation>;
    NullTypeAnnotation: Type<namedTypes.NullTypeAnnotation>;
    ThisTypeAnnotation: Type<namedTypes.ThisTypeAnnotation>;
    ExistsTypeAnnotation: Type<namedTypes.ExistsTypeAnnotation>;
    ExistentialTypeParam: Type<namedTypes.ExistentialTypeParam>;
    FunctionTypeAnnotation: Type<namedTypes.FunctionTypeAnnotation>;
    FunctionTypeParam: Type<namedTypes.FunctionTypeParam>;
    ArrayTypeAnnotation: Type<namedTypes.ArrayTypeAnnotation>;
    ObjectTypeAnnotation: Type<namedTypes.ObjectTypeAnnotation>;
    ObjectTypeProperty: Type<namedTypes.ObjectTypeProperty>;
    ObjectTypeSpreadProperty: Type<namedTypes.ObjectTypeSpreadProperty>;
    ObjectTypeIndexer: Type<namedTypes.ObjectTypeIndexer>;
    ObjectTypeCallProperty: Type<namedTypes.ObjectTypeCallProperty>;
    ObjectTypeInternalSlot: Type<namedTypes.ObjectTypeInternalSlot>;
    Variance: Type<namedTypes.Variance>;
    QualifiedTypeIdentifier: Type<namedTypes.QualifiedTypeIdentifier>;
    GenericTypeAnnotation: Type<namedTypes.GenericTypeAnnotation>;
    MemberTypeAnnotation: Type<namedTypes.MemberTypeAnnotation>;
    IndexedAccessType: Type<namedTypes.IndexedAccessType>;
    OptionalIndexedAccessType: Type<namedTypes.OptionalIndexedAccessType>;
    UnionTypeAnnotation: Type<namedTypes.UnionTypeAnnotation>;
    IntersectionTypeAnnotation: Type<namedTypes.IntersectionTypeAnnotation>;
    TypeofTypeAnnotation: Type<namedTypes.TypeofTypeAnnotation>;
    TypeParameter: Type<namedTypes.TypeParameter>;
    InterfaceTypeAnnotation: Type<namedTypes.InterfaceTypeAnnotation>;
    InterfaceExtends: Type<namedTypes.InterfaceExtends>;
    InterfaceDeclaration: Type<namedTypes.InterfaceDeclaration>;
    DeclareInterface: Type<namedTypes.DeclareInterface>;
    TypeAlias: Type<namedTypes.TypeAlias>;
    DeclareTypeAlias: Type<namedTypes.DeclareTypeAlias>;
    OpaqueType: Type<namedTypes.OpaqueType>;
    DeclareOpaqueType: Type<namedTypes.DeclareOpaqueType>;
    TypeCastExpression: Type<namedTypes.TypeCastExpression>;
    TupleTypeAnnotation: Type<namedTypes.TupleTypeAnnotation>;
    DeclareVariable: Type<namedTypes.DeclareVariable>;
    DeclareFunction: Type<namedTypes.DeclareFunction>;
    FlowPredicate: Type<namedTypes.FlowPredicate>;
    DeclareClass: Type<namedTypes.DeclareClass>;
    DeclareModule: Type<namedTypes.DeclareModule>;
    DeclareModuleExports: Type<namedTypes.DeclareModuleExports>;
    DeclareExportDeclaration: Type<namedTypes.DeclareExportDeclaration>;
    ExportBatchSpecifier: Type<namedTypes.ExportBatchSpecifier>;
    DeclareExportAllDeclaration: Type<namedTypes.DeclareExportAllDeclaration>;
    InferredPredicate: Type<namedTypes.InferredPredicate>;
    DeclaredPredicate: Type<namedTypes.DeclaredPredicate>;
    EnumDeclaration: Type<namedTypes.EnumDeclaration>;
    EnumBooleanBody: Type<namedTypes.EnumBooleanBody>;
    EnumNumberBody: Type<namedTypes.EnumNumberBody>;
    EnumStringBody: Type<namedTypes.EnumStringBody>;
    EnumSymbolBody: Type<namedTypes.EnumSymbolBody>;
    EnumBooleanMember: Type<namedTypes.EnumBooleanMember>;
    EnumNumberMember: Type<namedTypes.EnumNumberMember>;
    EnumStringMember: Type<namedTypes.EnumStringMember>;
    EnumDefaultedMember: Type<namedTypes.EnumDefaultedMember>;
    ExportDeclaration: Type<namedTypes.ExportDeclaration>;
    Block: Type<namedTypes.Block>;
    Line: Type<namedTypes.Line>;
    Noop: Type<namedTypes.Noop>;
    DoExpression: Type<namedTypes.DoExpression>;
    BindExpression: Type<namedTypes.BindExpression>;
    ParenthesizedExpression: Type<namedTypes.ParenthesizedExpression>;
    ExportNamespaceSpecifier: Type<namedTypes.ExportNamespaceSpecifier>;
    ExportDefaultSpecifier: Type<namedTypes.ExportDefaultSpecifier>;
    CommentBlock: Type<namedTypes.CommentBlock>;
    CommentLine: Type<namedTypes.CommentLine>;
    Directive: Type<namedTypes.Directive>;
    DirectiveLiteral: Type<namedTypes.DirectiveLiteral>;
    InterpreterDirective: Type<namedTypes.InterpreterDirective>;
    StringLiteral: Type<namedTypes.StringLiteral>;
    NumericLiteral: Type<namedTypes.NumericLiteral>;
    BigIntLiteral: Type<namedTypes.BigIntLiteral>;
    DecimalLiteral: Type<namedTypes.DecimalLiteral>;
    NullLiteral: Type<namedTypes.NullLiteral>;
    BooleanLiteral: Type<namedTypes.BooleanLiteral>;
    RegExpLiteral: Type<namedTypes.RegExpLiteral>;
    ClassMethod: Type<namedTypes.ClassMethod>;
    ClassPrivateMethod: Type<namedTypes.ClassPrivateMethod>;
    TSHasOptionalTypeAnnotation: Type<namedTypes.TSHasOptionalTypeAnnotation>;
    ClassAccessorProperty: Type<namedTypes.ClassAccessorProperty>;
    RestProperty: Type<namedTypes.RestProperty>;
    ForAwaitStatement: Type<namedTypes.ForAwaitStatement>;
    Import: Type<namedTypes.Import>;
    V8IntrinsicIdentifier: Type<namedTypes.V8IntrinsicIdentifier>;
    TopicReference: Type<namedTypes.TopicReference>;
    TSQualifiedName: Type<namedTypes.TSQualifiedName>;
    TSTypeReference: Type<namedTypes.TSTypeReference>;
    TSHasOptionalTypeParameters: Type<namedTypes.TSHasOptionalTypeParameters>;
    TSAsExpression: Type<namedTypes.TSAsExpression>;
    TSTypeCastExpression: Type<namedTypes.TSTypeCastExpression>;
    TSSatisfiesExpression: Type<namedTypes.TSSatisfiesExpression>;
    TSNonNullExpression: Type<namedTypes.TSNonNullExpression>;
    TSAnyKeyword: Type<namedTypes.TSAnyKeyword>;
    TSBigIntKeyword: Type<namedTypes.TSBigIntKeyword>;
    TSBooleanKeyword: Type<namedTypes.TSBooleanKeyword>;
    TSNeverKeyword: Type<namedTypes.TSNeverKeyword>;
    TSNullKeyword: Type<namedTypes.TSNullKeyword>;
    TSNumberKeyword: Type<namedTypes.TSNumberKeyword>;
    TSObjectKeyword: Type<namedTypes.TSObjectKeyword>;
    TSStringKeyword: Type<namedTypes.TSStringKeyword>;
    TSSymbolKeyword: Type<namedTypes.TSSymbolKeyword>;
    TSUndefinedKeyword: Type<namedTypes.TSUndefinedKeyword>;
    TSUnknownKeyword: Type<namedTypes.TSUnknownKeyword>;
    TSVoidKeyword: Type<namedTypes.TSVoidKeyword>;
    TSIntrinsicKeyword: Type<namedTypes.TSIntrinsicKeyword>;
    TSThisType: Type<namedTypes.TSThisType>;
    TSArrayType: Type<namedTypes.TSArrayType>;
    TSLiteralType: Type<namedTypes.TSLiteralType>;
    TSUnionType: Type<namedTypes.TSUnionType>;
    TSIntersectionType: Type<namedTypes.TSIntersectionType>;
    TSConditionalType: Type<namedTypes.TSConditionalType>;
    TSInferType: Type<namedTypes.TSInferType>;
    TSTypeParameter: Type<namedTypes.TSTypeParameter>;
    TSParenthesizedType: Type<namedTypes.TSParenthesizedType>;
    TSFunctionType: Type<namedTypes.TSFunctionType>;
    TSConstructorType: Type<namedTypes.TSConstructorType>;
    TSDeclareFunction: Type<namedTypes.TSDeclareFunction>;
    TSDeclareMethod: Type<namedTypes.TSDeclareMethod>;
    TSMappedType: Type<namedTypes.TSMappedType>;
    TSTupleType: Type<namedTypes.TSTupleType>;
    TSNamedTupleMember: Type<namedTypes.TSNamedTupleMember>;
    TSRestType: Type<namedTypes.TSRestType>;
    TSOptionalType: Type<namedTypes.TSOptionalType>;
    TSIndexedAccessType: Type<namedTypes.TSIndexedAccessType>;
    TSTypeOperator: Type<namedTypes.TSTypeOperator>;
    TSIndexSignature: Type<namedTypes.TSIndexSignature>;
    TSPropertySignature: Type<namedTypes.TSPropertySignature>;
    TSMethodSignature: Type<namedTypes.TSMethodSignature>;
    TSTypePredicate: Type<namedTypes.TSTypePredicate>;
    TSCallSignatureDeclaration: Type<namedTypes.TSCallSignatureDeclaration>;
    TSConstructSignatureDeclaration: Type<namedTypes.TSConstructSignatureDeclaration>;
    TSEnumMember: Type<namedTypes.TSEnumMember>;
    TSTypeQuery: Type<namedTypes.TSTypeQuery>;
    TSImportType: Type<namedTypes.TSImportType>;
    TSTypeLiteral: Type<namedTypes.TSTypeLiteral>;
    TSTypeAssertion: Type<namedTypes.TSTypeAssertion>;
    TSInstantiationExpression: Type<namedTypes.TSInstantiationExpression>;
    TSEnumDeclaration: Type<namedTypes.TSEnumDeclaration>;
    TSTypeAliasDeclaration: Type<namedTypes.TSTypeAliasDeclaration>;
    TSModuleBlock: Type<namedTypes.TSModuleBlock>;
    TSModuleDeclaration: Type<namedTypes.TSModuleDeclaration>;
    TSImportEqualsDeclaration: Type<namedTypes.TSImportEqualsDeclaration>;
    TSExternalModuleReference: Type<namedTypes.TSExternalModuleReference>;
    TSExportAssignment: Type<namedTypes.TSExportAssignment>;
    TSNamespaceExportDeclaration: Type<namedTypes.TSNamespaceExportDeclaration>;
    TSInterfaceBody: Type<namedTypes.TSInterfaceBody>;
    TSInterfaceDeclaration: Type<namedTypes.TSInterfaceDeclaration>;
    TSParameterProperty: Type<namedTypes.TSParameterProperty>;
}
