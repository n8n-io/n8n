"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Visitor = void 0;
/**
 * @deprecated JavaScript API is deprecated. Please use Wasm plugin instead.
 */
class Visitor {
    visitProgram(n) {
        switch (n.type) {
            case "Module":
                return this.visitModule(n);
            case "Script":
                return this.visitScript(n);
        }
    }
    visitModule(m) {
        m.body = this.visitModuleItems(m.body);
        return m;
    }
    visitScript(m) {
        m.body = this.visitStatements(m.body);
        return m;
    }
    visitModuleItems(items) {
        return items.map(this.visitModuleItem.bind(this));
    }
    visitModuleItem(n) {
        switch (n.type) {
            case "ExportDeclaration":
            case "ExportDefaultDeclaration":
            case "ExportNamedDeclaration":
            case "ExportDefaultExpression":
            case "ImportDeclaration":
            case "ExportAllDeclaration":
            case "TsImportEqualsDeclaration":
            case "TsExportAssignment":
            case "TsNamespaceExportDeclaration":
                return this.visitModuleDeclaration(n);
            default:
                return this.visitStatement(n);
        }
    }
    visitModuleDeclaration(n) {
        switch (n.type) {
            case "ExportDeclaration":
                return this.visitExportDeclaration(n);
            case "ExportDefaultDeclaration":
                return this.visitExportDefaultDeclaration(n);
            case "ExportNamedDeclaration":
                return this.visitExportNamedDeclaration(n);
            case "ExportDefaultExpression":
                return this.visitExportDefaultExpression(n);
            case "ImportDeclaration":
                return this.visitImportDeclaration(n);
            case "ExportAllDeclaration":
                return this.visitExportAllDeclaration(n);
            case "TsImportEqualsDeclaration":
                return this.visitTsImportEqualsDeclaration(n);
            case "TsExportAssignment":
                return this.visitTsExportAssignment(n);
            case "TsNamespaceExportDeclaration":
                return this.visitTsNamespaceExportDeclaration(n);
        }
    }
    visitTsNamespaceExportDeclaration(n) {
        n.id = this.visitBindingIdentifier(n.id);
        return n;
    }
    visitTsExportAssignment(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitTsImportEqualsDeclaration(n) {
        n.id = this.visitBindingIdentifier(n.id);
        n.moduleRef = this.visitTsModuleReference(n.moduleRef);
        return n;
    }
    visitTsModuleReference(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitIdentifierReference(n);
            case "TsExternalModuleReference":
                return this.visitTsExternalModuleReference(n);
            case "TsQualifiedName":
                return this.visitTsQualifiedName(n);
        }
    }
    visitTsExternalModuleReference(n) {
        n.expression = this.visitStringLiteral(n.expression);
        return n;
    }
    visitExportAllDeclaration(n) {
        n.source = this.visitStringLiteral(n.source);
        return n;
    }
    visitExportDefaultExpression(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitExportNamedDeclaration(n) {
        n.specifiers = this.visitExportSpecifiers(n.specifiers);
        n.source = this.visitOptionalStringLiteral(n.source);
        return n;
    }
    visitExportSpecifiers(nodes) {
        return nodes.map(this.visitExportSpecifier.bind(this));
    }
    visitExportSpecifier(n) {
        switch (n.type) {
            case "ExportDefaultSpecifier":
                return this.visitExportDefaultSpecifier(n);
            case "ExportNamespaceSpecifier":
                return this.visitExportNamespaceSpecifier(n);
            case "ExportSpecifier":
                return this.visitNamedExportSpecifier(n);
        }
    }
    visitNamedExportSpecifier(n) {
        if (n.exported) {
            n.exported = this.visitModuleExportName(n.exported);
        }
        n.orig = this.visitModuleExportName(n.orig);
        return n;
    }
    visitModuleExportName(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitIdentifier(n);
            case "StringLiteral":
                return this.visitStringLiteral(n);
        }
    }
    visitExportNamespaceSpecifier(n) {
        n.name = this.visitModuleExportName(n.name);
        return n;
    }
    visitExportDefaultSpecifier(n) {
        n.exported = this.visitBindingIdentifier(n.exported);
        return n;
    }
    visitOptionalStringLiteral(n) {
        if (n) {
            return this.visitStringLiteral(n);
        }
    }
    visitExportDefaultDeclaration(n) {
        n.decl = this.visitDefaultDeclaration(n.decl);
        return n;
    }
    visitDefaultDeclaration(n) {
        switch (n.type) {
            case "ClassExpression":
                return this.visitClassExpression(n);
            case "FunctionExpression":
                return this.visitFunctionExpression(n);
            case "TsInterfaceDeclaration":
                return this.visitTsInterfaceDeclaration(n);
        }
    }
    visitFunctionExpression(n) {
        n = this.visitFunction(n);
        if (n.identifier) {
            n.identifier = this.visitBindingIdentifier(n.identifier);
        }
        return n;
    }
    visitClassExpression(n) {
        n = this.visitClass(n);
        if (n.identifier) {
            n.identifier = this.visitBindingIdentifier(n.identifier);
        }
        return n;
    }
    visitExportDeclaration(n) {
        n.declaration = this.visitDeclaration(n.declaration);
        return n;
    }
    visitArrayExpression(e) {
        if (e.elements) {
            e.elements = e.elements.map(this.visitArrayElement.bind(this));
        }
        return e;
    }
    visitArrayElement(e) {
        if (e) {
            return this.visitExprOrSpread(e);
        }
    }
    visitExprOrSpread(e) {
        return Object.assign(Object.assign({}, e), { expression: this.visitExpression(e.expression) });
    }
    visitExprOrSpreads(nodes) {
        return nodes.map(this.visitExprOrSpread.bind(this));
    }
    visitSpreadElement(e) {
        e.arguments = this.visitExpression(e.arguments);
        return e;
    }
    visitOptionalExpression(e) {
        if (e) {
            return this.visitExpression(e);
        }
    }
    visitArrowFunctionExpression(e) {
        e.body = this.visitArrowBody(e.body);
        e.params = this.visitPatterns(e.params);
        e.returnType = this.visitTsTypeAnnotation(e.returnType);
        e.typeParameters = this.visitTsTypeParameterDeclaration(e.typeParameters);
        return e;
    }
    visitArrowBody(body) {
        switch (body.type) {
            case "BlockStatement":
                return this.visitBlockStatement(body);
            default:
                return this.visitExpression(body);
        }
    }
    visitBlockStatement(block) {
        block.stmts = this.visitStatements(block.stmts);
        return block;
    }
    visitStatements(stmts) {
        return stmts.map(this.visitStatement.bind(this));
    }
    visitStatement(stmt) {
        switch (stmt.type) {
            case "ClassDeclaration":
            case "FunctionDeclaration":
            case "TsEnumDeclaration":
            case "TsInterfaceDeclaration":
            case "TsModuleDeclaration":
            case "TsTypeAliasDeclaration":
            case "VariableDeclaration":
                return this.visitDeclaration(stmt);
            case "BreakStatement":
                return this.visitBreakStatement(stmt);
            case "BlockStatement":
                return this.visitBlockStatement(stmt);
            case "ContinueStatement":
                return this.visitContinueStatement(stmt);
            case "DebuggerStatement":
                return this.visitDebuggerStatement(stmt);
            case "DoWhileStatement":
                return this.visitDoWhileStatement(stmt);
            case "EmptyStatement":
                return this.visitEmptyStatement(stmt);
            case "ForInStatement":
                return this.visitForInStatement(stmt);
            case "ForOfStatement":
                return this.visitForOfStatement(stmt);
            case "ForStatement":
                return this.visitForStatement(stmt);
            case "IfStatement":
                return this.visitIfStatement(stmt);
            case "LabeledStatement":
                return this.visitLabeledStatement(stmt);
            case "ReturnStatement":
                return this.visitReturnStatement(stmt);
            case "SwitchStatement":
                return this.visitSwitchStatement(stmt);
            case "ThrowStatement":
                return this.visitThrowStatement(stmt);
            case "TryStatement":
                return this.visitTryStatement(stmt);
            case "WhileStatement":
                return this.visitWhileStatement(stmt);
            case "WithStatement":
                return this.visitWithStatement(stmt);
            case "ExpressionStatement":
                return this.visitExpressionStatement(stmt);
            default:
                throw new Error(`Unknown statement type: ` + stmt.type);
        }
    }
    visitSwitchStatement(stmt) {
        stmt.discriminant = this.visitExpression(stmt.discriminant);
        stmt.cases = this.visitSwitchCases(stmt.cases);
        return stmt;
    }
    visitSwitchCases(cases) {
        return cases.map(this.visitSwitchCase.bind(this));
    }
    visitSwitchCase(c) {
        c.test = this.visitOptionalExpression(c.test);
        c.consequent = this.visitStatements(c.consequent);
        return c;
    }
    visitIfStatement(stmt) {
        stmt.test = this.visitExpression(stmt.test);
        stmt.consequent = this.visitStatement(stmt.consequent);
        stmt.alternate = this.visitOptionalStatement(stmt.alternate);
        return stmt;
    }
    visitOptionalStatement(stmt) {
        if (stmt) {
            return this.visitStatement(stmt);
        }
    }
    visitBreakStatement(stmt) {
        if (stmt.label) {
            stmt.label = this.visitLabelIdentifier(stmt.label);
        }
        return stmt;
    }
    visitWhileStatement(stmt) {
        stmt.test = this.visitExpression(stmt.test);
        stmt.body = this.visitStatement(stmt.body);
        return stmt;
    }
    visitTryStatement(stmt) {
        stmt.block = this.visitBlockStatement(stmt.block);
        stmt.handler = this.visitCatchClause(stmt.handler);
        if (stmt.finalizer) {
            stmt.finalizer = this.visitBlockStatement(stmt.finalizer);
        }
        return stmt;
    }
    visitCatchClause(handler) {
        if (handler) {
            if (handler.param) {
                handler.param = this.visitPattern(handler.param);
            }
            handler.body = this.visitBlockStatement(handler.body);
        }
        return handler;
    }
    visitThrowStatement(stmt) {
        stmt.argument = this.visitExpression(stmt.argument);
        return stmt;
    }
    visitReturnStatement(stmt) {
        if (stmt.argument) {
            stmt.argument = this.visitExpression(stmt.argument);
        }
        return stmt;
    }
    visitLabeledStatement(stmt) {
        stmt.label = this.visitLabelIdentifier(stmt.label);
        stmt.body = this.visitStatement(stmt.body);
        return stmt;
    }
    visitForStatement(stmt) {
        if (stmt.init) {
            if (stmt.init.type === "VariableDeclaration") {
                stmt.init = this.visitVariableDeclaration(stmt.init);
            }
            else {
                stmt.init = this.visitOptionalExpression(stmt.init);
            }
        }
        stmt.test = this.visitOptionalExpression(stmt.test);
        stmt.update = this.visitOptionalExpression(stmt.update);
        stmt.body = this.visitStatement(stmt.body);
        return stmt;
    }
    visitForOfStatement(stmt) {
        if (stmt.left.type === "VariableDeclaration") {
            stmt.left = this.visitVariableDeclaration(stmt.left);
        }
        else {
            stmt.left = this.visitPattern(stmt.left);
        }
        stmt.right = this.visitExpression(stmt.right);
        stmt.body = this.visitStatement(stmt.body);
        return stmt;
    }
    visitForInStatement(stmt) {
        if (stmt.left.type === "VariableDeclaration") {
            stmt.left = this.visitVariableDeclaration(stmt.left);
        }
        else {
            stmt.left = this.visitPattern(stmt.left);
        }
        stmt.right = this.visitExpression(stmt.right);
        stmt.body = this.visitStatement(stmt.body);
        return stmt;
    }
    visitEmptyStatement(stmt) {
        return stmt;
    }
    visitDoWhileStatement(stmt) {
        stmt.body = this.visitStatement(stmt.body);
        stmt.test = this.visitExpression(stmt.test);
        return stmt;
    }
    visitDebuggerStatement(stmt) {
        return stmt;
    }
    visitWithStatement(stmt) {
        stmt.object = this.visitExpression(stmt.object);
        stmt.body = this.visitStatement(stmt.body);
        return stmt;
    }
    visitDeclaration(decl) {
        switch (decl.type) {
            case "ClassDeclaration":
                return this.visitClassDeclaration(decl);
            case "FunctionDeclaration":
                return this.visitFunctionDeclaration(decl);
            case "TsEnumDeclaration":
                return this.visitTsEnumDeclaration(decl);
            case "TsInterfaceDeclaration":
                return this.visitTsInterfaceDeclaration(decl);
            case "TsModuleDeclaration":
                return this.visitTsModuleDeclaration(decl);
            case "TsTypeAliasDeclaration":
                return this.visitTsTypeAliasDeclaration(decl);
            case "VariableDeclaration":
                return this.visitVariableDeclaration(decl);
        }
    }
    visitVariableDeclaration(n) {
        n.declarations = this.visitVariableDeclarators(n.declarations);
        return n;
    }
    visitVariableDeclarators(nodes) {
        return nodes.map(this.visitVariableDeclarator.bind(this));
    }
    visitVariableDeclarator(n) {
        n.id = this.visitPattern(n.id);
        n.init = this.visitOptionalExpression(n.init);
        return n;
    }
    visitTsTypeAliasDeclaration(n) {
        n.id = this.visitBindingIdentifier(n.id);
        n.typeAnnotation = this.visitTsType(n.typeAnnotation);
        n.typeParams = this.visitTsTypeParameterDeclaration(n.typeParams);
        return n;
    }
    visitTsModuleDeclaration(n) {
        n.id = this.visitTsModuleName(n.id);
        if (n.body) {
            n.body = this.visitTsNamespaceBody(n.body);
        }
        return n;
    }
    visitTsModuleName(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitBindingIdentifier(n);
            case "StringLiteral":
                return this.visitStringLiteral(n);
        }
    }
    visitTsNamespaceBody(n) {
        if (n) {
            switch (n.type) {
                case "TsModuleBlock":
                    return this.visitTsModuleBlock(n);
                case "TsNamespaceDeclaration":
                    return this.visitTsNamespaceDeclaration(n);
            }
        }
    }
    visitTsNamespaceDeclaration(n) {
        const body = this.visitTsNamespaceBody(n.body);
        if (body) {
            n.body = body;
        }
        n.id = this.visitBindingIdentifier(n.id);
        return n;
    }
    visitTsModuleBlock(n) {
        n.body = this.visitModuleItems(n.body);
        return n;
    }
    visitTsInterfaceDeclaration(n) {
        n.id = this.visitBindingIdentifier(n.id);
        n.typeParams = this.visitTsTypeParameterDeclaration(n.typeParams);
        n.extends = this.visitTsExpressionsWithTypeArguments(n.extends);
        n.body = this.visitTsInterfaceBody(n.body);
        return n;
    }
    visitTsInterfaceBody(n) {
        n.body = this.visitTsTypeElements(n.body);
        return n;
    }
    visitTsTypeElements(nodes) {
        return nodes.map(this.visitTsTypeElement.bind(this));
    }
    visitTsTypeElement(n) {
        switch (n.type) {
            case "TsCallSignatureDeclaration":
                return this.visitTsCallSignatureDeclaration(n);
            case "TsConstructSignatureDeclaration":
                return this.visitTsConstructSignatureDeclaration(n);
            case "TsPropertySignature":
                return this.visitTsPropertySignature(n);
            case "TsGetterSignature":
                return this.visitTsGetterSignature(n);
            case "TsSetterSignature":
                return this.visitTsSetterSignature(n);
            case "TsMethodSignature":
                return this.visitTsMethodSignature(n);
            case "TsIndexSignature":
                return this.visitTsIndexSignature(n);
        }
    }
    visitTsCallSignatureDeclaration(n) {
        n.params = this.visitTsFnParameters(n.params);
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitTsConstructSignatureDeclaration(n) {
        n.params = this.visitTsFnParameters(n.params);
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitTsPropertySignature(n) {
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitTsGetterSignature(n) {
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitTsSetterSignature(n) {
        n.param = this.visitTsFnParameter(n.param);
        return n;
    }
    visitTsMethodSignature(n) {
        n.params = this.visitTsFnParameters(n.params);
        n.typeAnn = this.visitTsTypeAnnotation(n.typeAnn);
        return n;
    }
    visitTsEnumDeclaration(n) {
        n.id = this.visitIdentifier(n.id);
        n.members = this.visitTsEnumMembers(n.members);
        return n;
    }
    visitTsEnumMembers(nodes) {
        return nodes.map(this.visitTsEnumMember.bind(this));
    }
    visitTsEnumMember(n) {
        n.id = this.visitTsEnumMemberId(n.id);
        n.init = this.visitOptionalExpression(n.init);
        return n;
    }
    visitTsEnumMemberId(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitBindingIdentifier(n);
            case "StringLiteral":
                return this.visitStringLiteral(n);
        }
    }
    visitFunctionDeclaration(decl) {
        decl.identifier = this.visitIdentifier(decl.identifier);
        decl = this.visitFunction(decl);
        return decl;
    }
    visitClassDeclaration(decl) {
        decl = this.visitClass(decl);
        decl.identifier = this.visitIdentifier(decl.identifier);
        return decl;
    }
    visitClassBody(members) {
        return members.map(this.visitClassMember.bind(this));
    }
    visitClassMember(member) {
        switch (member.type) {
            case "ClassMethod":
                return this.visitClassMethod(member);
            case "ClassProperty":
                return this.visitClassProperty(member);
            case "Constructor":
                return this.visitConstructor(member);
            case "PrivateMethod":
                return this.visitPrivateMethod(member);
            case "PrivateProperty":
                return this.visitPrivateProperty(member);
            case "TsIndexSignature":
                return this.visitTsIndexSignature(member);
            case "EmptyStatement":
                return this.visitEmptyStatement(member);
            case "StaticBlock":
                return this.visitStaticBlock(member);
        }
    }
    visitTsIndexSignature(n) {
        n.params = this.visitTsFnParameters(n.params);
        if (n.typeAnnotation)
            n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitTsFnParameters(params) {
        return params.map(this.visitTsFnParameter.bind(this));
    }
    visitTsFnParameter(n) {
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitPrivateProperty(n) {
        n.decorators = this.visitDecorators(n.decorators);
        n.key = this.visitPrivateName(n.key);
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        n.value = this.visitOptionalExpression(n.value);
        return n;
    }
    visitPrivateMethod(n) {
        n.accessibility = this.visitAccessibility(n.accessibility);
        n.function = this.visitFunction(n.function);
        n.key = this.visitPrivateName(n.key);
        return n;
    }
    visitPrivateName(n) {
        return n;
    }
    visitConstructor(n) {
        n.accessibility = this.visitAccessibility(n.accessibility);
        n.key = this.visitPropertyName(n.key);
        n.params = this.visitConstructorParameters(n.params);
        if (n.body) {
            n.body = this.visitBlockStatement(n.body);
        }
        return n;
    }
    visitConstructorParameters(nodes) {
        return nodes.map(this.visitConstructorParameter.bind(this));
    }
    visitConstructorParameter(n) {
        switch (n.type) {
            case "TsParameterProperty":
                return this.visitTsParameterProperty(n);
            default:
                return this.visitParameter(n);
        }
    }
    visitStaticBlock(n) {
        n.body = this.visitBlockStatement(n.body);
        return n;
    }
    visitTsParameterProperty(n) {
        n.accessibility = this.visitAccessibility(n.accessibility);
        n.decorators = this.visitDecorators(n.decorators);
        n.param = this.visitTsParameterPropertyParameter(n.param);
        return n;
    }
    visitTsParameterPropertyParameter(n) {
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitPropertyName(key) {
        switch (key.type) {
            case "Identifier":
                return this.visitBindingIdentifier(key);
            case "StringLiteral":
                return this.visitStringLiteral(key);
            case "NumericLiteral":
                return this.visitNumericLiteral(key);
            case "BigIntLiteral":
                return this.visitBigIntLiteral(key);
            default:
                return this.visitComputedPropertyKey(key);
        }
    }
    visitAccessibility(n) {
        return n;
    }
    visitClassProperty(n) {
        n.accessibility = this.visitAccessibility(n.accessibility);
        n.decorators = this.visitDecorators(n.decorators);
        n.key = this.visitPropertyName(n.key);
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        n.value = this.visitOptionalExpression(n.value);
        return n;
    }
    visitClassMethod(n) {
        n.accessibility = this.visitAccessibility(n.accessibility);
        n.function = this.visitFunction(n.function);
        n.key = this.visitPropertyName(n.key);
        return n;
    }
    visitComputedPropertyKey(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitClass(n) {
        n.decorators = this.visitDecorators(n.decorators);
        n.superClass = this.visitOptionalExpression(n.superClass);
        n.superTypeParams = this.visitTsTypeParameterInstantiation(n.superTypeParams);
        if (n.implements) {
            n.implements = this.visitTsExpressionsWithTypeArguments(n.implements);
        }
        n.body = this.visitClassBody(n.body);
        return n;
    }
    visitFunction(n) {
        n.decorators = this.visitDecorators(n.decorators);
        n.params = this.visitParameters(n.params);
        if (n.body) {
            n.body = this.visitBlockStatement(n.body);
        }
        n.returnType = this.visitTsTypeAnnotation(n.returnType);
        n.typeParameters = this.visitTsTypeParameterDeclaration(n.typeParameters);
        return n;
    }
    visitTsExpressionsWithTypeArguments(nodes) {
        return nodes.map(this.visitTsExpressionWithTypeArguments.bind(this));
    }
    visitTsExpressionWithTypeArguments(n) {
        n.expression = this.visitExpression(n.expression);
        n.typeArguments = this.visitTsTypeParameterInstantiation(n.typeArguments);
        return n;
    }
    visitTsTypeParameterInstantiation(n) {
        if (n) {
            n.params = this.visitTsTypes(n.params);
        }
        return n;
    }
    visitTsTypes(nodes) {
        return nodes.map(this.visitTsType.bind(this));
    }
    visitTsEntityName(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitBindingIdentifier(n);
            case "TsQualifiedName":
                return this.visitTsQualifiedName(n);
        }
    }
    visitTsQualifiedName(n) {
        n.left = this.visitTsEntityName(n.left);
        n.right = this.visitIdentifier(n.right);
        return n;
    }
    visitDecorators(nodes) {
        if (nodes) {
            return nodes.map(this.visitDecorator.bind(this));
        }
    }
    visitDecorator(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitExpressionStatement(stmt) {
        stmt.expression = this.visitExpression(stmt.expression);
        return stmt;
    }
    visitContinueStatement(stmt) {
        if (stmt.label) {
            stmt.label = this.visitLabelIdentifier(stmt.label);
        }
        return stmt;
    }
    visitExpression(n) {
        switch (n.type) {
            case "ArrayExpression":
                return this.visitArrayExpression(n);
            case "ArrowFunctionExpression":
                return this.visitArrowFunctionExpression(n);
            case "AssignmentExpression":
                return this.visitAssignmentExpression(n);
            case "AwaitExpression":
                return this.visitAwaitExpression(n);
            case "BigIntLiteral":
                return this.visitBigIntLiteral(n);
            case "BinaryExpression":
                return this.visitBinaryExpression(n);
            case "BooleanLiteral":
                return this.visitBooleanLiteral(n);
            case "CallExpression":
                return this.visitCallExpression(n);
            case "ClassExpression":
                return this.visitClassExpression(n);
            case "ConditionalExpression":
                return this.visitConditionalExpression(n);
            case "FunctionExpression":
                return this.visitFunctionExpression(n);
            case "Identifier":
                return this.visitIdentifierReference(n);
            case "JSXElement":
                return this.visitJSXElement(n);
            case "JSXEmptyExpression":
                return this.visitJSXEmptyExpression(n);
            case "JSXFragment":
                return this.visitJSXFragment(n);
            case "JSXMemberExpression":
                return this.visitJSXMemberExpression(n);
            case "JSXNamespacedName":
                return this.visitJSXNamespacedName(n);
            case "JSXText":
                return this.visitJSXText(n);
            case "MemberExpression":
                return this.visitMemberExpression(n);
            case "SuperPropExpression":
                return this.visitSuperPropExpression(n);
            case "MetaProperty":
                return this.visitMetaProperty(n);
            case "NewExpression":
                return this.visitNewExpression(n);
            case "NullLiteral":
                return this.visitNullLiteral(n);
            case "NumericLiteral":
                return this.visitNumericLiteral(n);
            case "ObjectExpression":
                return this.visitObjectExpression(n);
            case "ParenthesisExpression":
                return this.visitParenthesisExpression(n);
            case "PrivateName":
                return this.visitPrivateName(n);
            case "RegExpLiteral":
                return this.visitRegExpLiteral(n);
            case "SequenceExpression":
                return this.visitSequenceExpression(n);
            case "StringLiteral":
                return this.visitStringLiteral(n);
            case "TaggedTemplateExpression":
                return this.visitTaggedTemplateExpression(n);
            case "TemplateLiteral":
                return this.visitTemplateLiteral(n);
            case "ThisExpression":
                return this.visitThisExpression(n);
            case "TsAsExpression":
                return this.visitTsAsExpression(n);
            case "TsSatisfiesExpression":
                return this.visitTsSatisfiesExpression(n);
            case "TsNonNullExpression":
                return this.visitTsNonNullExpression(n);
            case "TsTypeAssertion":
                return this.visitTsTypeAssertion(n);
            case "TsConstAssertion":
                return this.visitTsConstAssertion(n);
            case "TsInstantiation":
                return this.visitTsInstantiation(n);
            case "UnaryExpression":
                return this.visitUnaryExpression(n);
            case "UpdateExpression":
                return this.visitUpdateExpression(n);
            case "YieldExpression":
                return this.visitYieldExpression(n);
            case "OptionalChainingExpression":
                return this.visitOptionalChainingExpression(n);
            case "Invalid":
                return n;
        }
    }
    visitOptionalChainingExpression(n) {
        n.base = this.visitMemberExpressionOrOptionalChainingCall(n.base);
        return n;
    }
    visitMemberExpressionOrOptionalChainingCall(n) {
        switch (n.type) {
            case "MemberExpression":
                return this.visitMemberExpression(n);
            case "CallExpression":
                return this.visitOptionalChainingCall(n);
        }
    }
    visitOptionalChainingCall(n) {
        n.callee = this.visitExpression(n.callee);
        n.arguments = this.visitExprOrSpreads(n.arguments);
        if (n.typeArguments)
            n.typeArguments = this.visitTsTypeParameterInstantiation(n.typeArguments);
        return n;
    }
    visitAssignmentExpression(n) {
        n.left = this.visitPatternOrExpression(n.left);
        n.right = this.visitExpression(n.right);
        return n;
    }
    visitPatternOrExpression(n) {
        switch (n.type) {
            case "ObjectPattern":
            case "ArrayPattern":
            case "Identifier":
            case "AssignmentPattern":
            case "RestElement":
                return this.visitPattern(n);
            default:
                return this.visitExpression(n);
        }
    }
    visitYieldExpression(n) {
        n.argument = this.visitOptionalExpression(n.argument);
        return n;
    }
    visitUpdateExpression(n) {
        n.argument = this.visitExpression(n.argument);
        return n;
    }
    visitUnaryExpression(n) {
        n.argument = this.visitExpression(n.argument);
        return n;
    }
    visitTsTypeAssertion(n) {
        n.expression = this.visitExpression(n.expression);
        n.typeAnnotation = this.visitTsType(n.typeAnnotation);
        return n;
    }
    visitTsConstAssertion(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitTsInstantiation(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitTsNonNullExpression(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitTsAsExpression(n) {
        n.expression = this.visitExpression(n.expression);
        n.typeAnnotation = this.visitTsType(n.typeAnnotation);
        return n;
    }
    visitTsSatisfiesExpression(n) {
        n.expression = this.visitExpression(n.expression);
        n.typeAnnotation = this.visitTsType(n.typeAnnotation);
        return n;
    }
    visitThisExpression(n) {
        return n;
    }
    visitTemplateLiteral(n) {
        n.expressions = n.expressions.map(this.visitExpression.bind(this));
        return n;
    }
    visitParameters(n) {
        return n.map(this.visitParameter.bind(this));
    }
    visitParameter(n) {
        n.pat = this.visitPattern(n.pat);
        return n;
    }
    visitTaggedTemplateExpression(n) {
        n.tag = this.visitExpression(n.tag);
        const template = this.visitTemplateLiteral(n.template);
        if (template.type === "TemplateLiteral") {
            n.template = template;
        }
        return n;
    }
    visitSequenceExpression(n) {
        n.expressions = n.expressions.map(this.visitExpression.bind(this));
        return n;
    }
    visitRegExpLiteral(n) {
        return n;
    }
    visitParenthesisExpression(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitObjectExpression(n) {
        if (n.properties) {
            n.properties = this.visitObjectProperties(n.properties);
        }
        return n;
    }
    visitObjectProperties(nodes) {
        return nodes.map(this.visitObjectProperty.bind(this));
    }
    visitObjectProperty(n) {
        switch (n.type) {
            case "SpreadElement":
                return this.visitSpreadElement(n);
            default:
                return this.visitProperty(n);
        }
    }
    visitProperty(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitIdentifier(n);
            case "AssignmentProperty":
                return this.visitAssignmentProperty(n);
            case "GetterProperty":
                return this.visitGetterProperty(n);
            case "KeyValueProperty":
                return this.visitKeyValueProperty(n);
            case "MethodProperty":
                return this.visitMethodProperty(n);
            case "SetterProperty":
                return this.visitSetterProperty(n);
        }
    }
    visitSetterProperty(n) {
        n.key = this.visitPropertyName(n.key);
        n.param = this.visitPattern(n.param);
        if (n.body) {
            n.body = this.visitBlockStatement(n.body);
        }
        return n;
    }
    visitMethodProperty(n) {
        n.key = this.visitPropertyName(n.key);
        if (n.body) {
            n.body = this.visitBlockStatement(n.body);
        }
        n.decorators = this.visitDecorators(n.decorators);
        n.params = this.visitParameters(n.params);
        n.returnType = this.visitTsTypeAnnotation(n.returnType);
        n.typeParameters = this.visitTsTypeParameterDeclaration(n.typeParameters);
        return n;
    }
    visitKeyValueProperty(n) {
        n.key = this.visitPropertyName(n.key);
        n.value = this.visitExpression(n.value);
        return n;
    }
    visitGetterProperty(n) {
        n.key = this.visitPropertyName(n.key);
        if (n.body) {
            n.body = this.visitBlockStatement(n.body);
        }
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitAssignmentProperty(n) {
        n.key = this.visitIdentifier(n.key);
        n.value = this.visitExpression(n.value);
        return n;
    }
    visitNullLiteral(n) {
        return n;
    }
    visitNewExpression(n) {
        n.callee = this.visitExpression(n.callee);
        if (n.arguments) {
            n.arguments = this.visitArguments(n.arguments);
        }
        n.typeArguments = this.visitTsTypeArguments(n.typeArguments);
        return n;
    }
    visitTsTypeArguments(n) {
        if (n) {
            n.params = this.visitTsTypes(n.params);
        }
        return n;
    }
    visitArguments(nodes) {
        return nodes.map(this.visitArgument.bind(this));
    }
    visitArgument(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitMetaProperty(n) {
        return n;
    }
    visitMemberExpression(n) {
        n.object = this.visitExpression(n.object);
        switch (n.property.type) {
            case "Computed": {
                n.property = this.visitComputedPropertyKey(n.property);
                return n;
            }
            case "Identifier": {
                n.property = this.visitIdentifier(n.property);
                return n;
            }
            case "PrivateName": {
                n.property = this.visitPrivateName(n.property);
                return n;
            }
        }
    }
    visitSuperPropExpression(n) {
        switch (n.property.type) {
            case "Computed": {
                n.property = this.visitComputedPropertyKey(n.property);
                return n;
            }
            case "Identifier": {
                n.property = this.visitIdentifier(n.property);
                return n;
            }
        }
    }
    visitCallee(n) {
        if (n.type === "Super" || n.type === "Import") {
            return n;
        }
        return this.visitExpression(n);
    }
    visitJSXText(n) {
        return n;
    }
    visitJSXNamespacedName(n) {
        n.namespace = this.visitIdentifierReference(n.namespace);
        n.name = this.visitIdentifierReference(n.name);
        return n;
    }
    visitJSXMemberExpression(n) {
        n.object = this.visitJSXObject(n.object);
        n.property = this.visitIdentifierReference(n.property);
        return n;
    }
    visitJSXObject(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitIdentifierReference(n);
            case "JSXMemberExpression":
                return this.visitJSXMemberExpression(n);
        }
    }
    visitJSXFragment(n) {
        n.opening = this.visitJSXOpeningFragment(n.opening);
        if (n.children) {
            n.children = this.visitJSXElementChildren(n.children);
        }
        n.closing = this.visitJSXClosingFragment(n.closing);
        return n;
    }
    visitJSXClosingFragment(n) {
        return n;
    }
    visitJSXElementChildren(nodes) {
        return nodes.map(this.visitJSXElementChild.bind(this));
    }
    visitJSXElementChild(n) {
        switch (n.type) {
            case "JSXElement":
                return this.visitJSXElement(n);
            case "JSXExpressionContainer":
                return this.visitJSXExpressionContainer(n);
            case "JSXFragment":
                return this.visitJSXFragment(n);
            case "JSXSpreadChild":
                return this.visitJSXSpreadChild(n);
            case "JSXText":
                return this.visitJSXText(n);
        }
    }
    visitJSXExpressionContainer(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitJSXSpreadChild(n) {
        n.expression = this.visitExpression(n.expression);
        return n;
    }
    visitJSXOpeningFragment(n) {
        return n;
    }
    visitJSXEmptyExpression(n) {
        return n;
    }
    visitJSXElement(n) {
        n.opening = this.visitJSXOpeningElement(n.opening);
        n.children = this.visitJSXElementChildren(n.children);
        n.closing = this.visitJSXClosingElement(n.closing);
        return n;
    }
    visitJSXClosingElement(n) {
        if (n) {
            n.name = this.visitJSXElementName(n.name);
        }
        return n;
    }
    visitJSXElementName(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitIdentifierReference(n);
            case "JSXMemberExpression":
                return this.visitJSXMemberExpression(n);
            case "JSXNamespacedName":
                return this.visitJSXNamespacedName(n);
        }
    }
    visitJSXOpeningElement(n) {
        n.name = this.visitJSXElementName(n.name);
        n.typeArguments = this.visitTsTypeParameterInstantiation(n.typeArguments);
        n.attributes = this.visitJSXAttributeOrSpreads(n.attributes);
        return n;
    }
    visitJSXAttributes(attrs) {
        if (attrs)
            return attrs.map(this.visitJSXAttributeOrSpread.bind(this));
    }
    visitJSXAttributeOrSpread(n) {
        switch (n.type) {
            case "JSXAttribute":
                return this.visitJSXAttribute(n);
            case "SpreadElement":
                return this.visitSpreadElement(n);
        }
    }
    visitJSXAttributeOrSpreads(nodes) {
        return nodes.map(this.visitJSXAttributeOrSpread.bind(this));
    }
    visitJSXAttribute(n) {
        n.name = this.visitJSXAttributeName(n.name);
        n.value = this.visitJSXAttributeValue(n.value);
        return n;
    }
    visitJSXAttributeValue(n) {
        if (!n)
            return n;
        switch (n.type) {
            case "StringLiteral":
                return this.visitStringLiteral(n);
            case "JSXElement":
                return this.visitJSXElement(n);
            case "JSXExpressionContainer":
                return this.visitJSXExpressionContainer(n);
            case "JSXFragment":
                return this.visitJSXFragment(n);
        }
        return n;
    }
    visitJSXAttributeName(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitIdentifierReference(n);
            case "JSXNamespacedName":
                return this.visitJSXNamespacedName(n);
        }
    }
    visitConditionalExpression(n) {
        n.test = this.visitExpression(n.test);
        n.consequent = this.visitExpression(n.consequent);
        n.alternate = this.visitExpression(n.alternate);
        return n;
    }
    visitCallExpression(n) {
        n.callee = this.visitCallee(n.callee);
        n.typeArguments = this.visitTsTypeParameterInstantiation(n.typeArguments);
        if (n.arguments) {
            n.arguments = this.visitArguments(n.arguments);
        }
        return n;
    }
    visitBooleanLiteral(n) {
        return n;
    }
    visitBinaryExpression(n) {
        n.left = this.visitExpression(n.left);
        n.right = this.visitExpression(n.right);
        return n;
    }
    visitAwaitExpression(n) {
        n.argument = this.visitExpression(n.argument);
        return n;
    }
    visitTsTypeParameterDeclaration(n) {
        if (n) {
            n.parameters = this.visitTsTypeParameters(n.parameters);
        }
        return n;
    }
    visitTsTypeParameters(nodes) {
        return nodes.map(this.visitTsTypeParameter.bind(this));
    }
    visitTsTypeParameter(n) {
        if (n.constraint) {
            n.constraint = this.visitTsType(n.constraint);
        }
        if (n.default) {
            n.default = this.visitTsType(n.default);
        }
        n.name = this.visitIdentifierReference(n.name);
        return n;
    }
    visitTsTypeAnnotation(a) {
        if (a) {
            a.typeAnnotation = this.visitTsType(a.typeAnnotation);
        }
        return a;
    }
    visitTsType(n) {
        throw new Error("Method visitTsType not implemented.");
    }
    visitPatterns(nodes) {
        return nodes.map(this.visitPattern.bind(this));
    }
    visitImportDeclaration(n) {
        n.source = this.visitStringLiteral(n.source);
        n.specifiers = this.visitImportSpecifiers(n.specifiers || []);
        return n;
    }
    visitImportSpecifiers(nodes) {
        return nodes.map(this.visitImportSpecifier.bind(this));
    }
    visitImportSpecifier(node) {
        switch (node.type) {
            case "ImportDefaultSpecifier":
                return this.visitImportDefaultSpecifier(node);
            case "ImportNamespaceSpecifier":
                return this.visitImportNamespaceSpecifier(node);
            case "ImportSpecifier":
                return this.visitNamedImportSpecifier(node);
        }
    }
    visitNamedImportSpecifier(node) {
        node.local = this.visitBindingIdentifier(node.local);
        if (node.imported) {
            node.imported = this.visitModuleExportName(node.imported);
        }
        return node;
    }
    visitImportNamespaceSpecifier(node) {
        node.local = this.visitBindingIdentifier(node.local);
        return node;
    }
    visitImportDefaultSpecifier(node) {
        node.local = this.visitBindingIdentifier(node.local);
        return node;
    }
    visitBindingIdentifier(i) {
        if (i.typeAnnotation) {
            i.typeAnnotation = this.visitTsTypeAnnotation(i.typeAnnotation);
        }
        return this.visitIdentifier(i);
    }
    visitIdentifierReference(i) {
        return this.visitIdentifier(i);
    }
    visitLabelIdentifier(label) {
        return this.visitIdentifier(label);
    }
    visitIdentifier(n) {
        return n;
    }
    visitStringLiteral(n) {
        return n;
    }
    visitNumericLiteral(n) {
        return n;
    }
    visitBigIntLiteral(n) {
        return n;
    }
    visitPattern(n) {
        switch (n.type) {
            case "Identifier":
                return this.visitBindingIdentifier(n);
            case "ArrayPattern":
                return this.visitArrayPattern(n);
            case "ObjectPattern":
                return this.visitObjectPattern(n);
            case "AssignmentPattern":
                return this.visitAssignmentPattern(n);
            case "RestElement":
                return this.visitRestElement(n);
            default:
                return this.visitExpression(n);
        }
    }
    visitRestElement(n) {
        n.argument = this.visitPattern(n.argument);
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitAssignmentPattern(n) {
        n.left = this.visitPattern(n.left);
        n.right = this.visitExpression(n.right);
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitObjectPattern(n) {
        n.properties = this.visitObjectPatternProperties(n.properties || []);
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        return n;
    }
    visitObjectPatternProperties(nodes) {
        return nodes.map(this.visitObjectPatternProperty.bind(this));
    }
    visitObjectPatternProperty(n) {
        switch (n.type) {
            case "AssignmentPatternProperty":
                return this.visitAssignmentPatternProperty(n);
            case "KeyValuePatternProperty":
                return this.visitKeyValuePatternProperty(n);
            case "RestElement":
                return this.visitRestElement(n);
        }
    }
    visitKeyValuePatternProperty(n) {
        n.key = this.visitPropertyName(n.key);
        n.value = this.visitPattern(n.value);
        return n;
    }
    visitAssignmentPatternProperty(n) {
        n.key = this.visitBindingIdentifier(n.key);
        n.value = this.visitOptionalExpression(n.value);
        return n;
    }
    visitArrayPattern(n) {
        n.typeAnnotation = this.visitTsTypeAnnotation(n.typeAnnotation);
        n.elements = this.visitArrayPatternElements(n.elements);
        return n;
    }
    visitArrayPatternElements(nodes) {
        return nodes.map(this.visitArrayPatternElement.bind(this));
    }
    visitArrayPatternElement(n) {
        if (n) {
            n = this.visitPattern(n);
        }
        return n;
    }
}
exports.Visitor = Visitor;
exports.default = Visitor;
