/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

(function() {
    var MOZ_TO_ME = {
        Program: function(M) {
            return new AST_Toplevel({
                start: my_start_token(M),
                end: my_end_token(M),
                body: normalize_directives(M.body.map(from_moz)),
            });
        },
        ArrowFunctionExpression: function(M) {
            var argnames = [], rest = null;
            M.params.forEach(function(param) {
                if (param.type == "RestElement") {
                    rest = from_moz(param.argument);
                } else {
                    argnames.push(from_moz(param));
                }
            });
            var fn = new (M.async ? AST_AsyncArrow : AST_Arrow)({
                start: my_start_token(M),
                end: my_end_token(M),
                argnames: argnames,
                rest: rest,
            });
            var node = from_moz(M.body);
            if (node instanceof AST_BlockStatement) {
                fn.body = normalize_directives(node.body);
                fn.value = null;
            } else {
                fn.body = [];
                fn.value = node;
            }
            return fn;
        },
        FunctionDeclaration: function(M) {
            var ctor;
            if (M.async) {
                ctor = M.generator ? AST_AsyncGeneratorDefun : AST_AsyncDefun;
            } else {
                ctor = M.generator ? AST_GeneratorDefun : AST_Defun;
            }
            var argnames = [], rest = null;
            M.params.forEach(function(param) {
                if (param.type == "RestElement") {
                    rest = from_moz(param.argument);
                } else {
                    argnames.push(from_moz(param));
                }
            });
            return new ctor({
                start: my_start_token(M),
                end: my_end_token(M),
                name: from_moz(M.id),
                argnames: argnames,
                rest: rest,
                body: normalize_directives(from_moz(M.body).body),
            });
        },
        FunctionExpression: function(M) {
            var ctor;
            if (M.async) {
                ctor = M.generator ? AST_AsyncGeneratorFunction : AST_AsyncFunction;
            } else {
                ctor = M.generator ? AST_GeneratorFunction : AST_Function;
            }
            var argnames = [], rest = null;
            M.params.forEach(function(param) {
                if (param.type == "RestElement") {
                    rest = from_moz(param.argument);
                } else {
                    argnames.push(from_moz(param));
                }
            });
            return new ctor({
                start: my_start_token(M),
                end: my_end_token(M),
                name: from_moz(M.id),
                argnames: argnames,
                rest: rest,
                body: normalize_directives(from_moz(M.body).body),
            });
        },
        ClassDeclaration: function(M) {
            return new AST_DefClass({
                start: my_start_token(M),
                end: my_end_token(M),
                name: from_moz(M.id),
                extends: from_moz(M.superClass),
                properties: M.body.body.map(from_moz),
            });
        },
        ClassExpression: function(M) {
            return new AST_ClassExpression({
                start: my_start_token(M),
                end: my_end_token(M),
                name: from_moz(M.id),
                extends: from_moz(M.superClass),
                properties: M.body.body.map(from_moz),
            });
        },
        MethodDefinition: function(M) {
            var key = M.key, internal = false;
            if (M.computed) {
                key = from_moz(key);
            } else if (key.type == "PrivateIdentifier") {
                internal = true;
                key = "#" + key.name;
            } else {
                key = read_name(key);
            }
            var ctor = AST_ClassMethod, value = from_moz(M.value);
            switch (M.kind) {
              case "get":
                ctor = AST_ClassGetter;
                value = new AST_Accessor(value);
                break;
              case "set":
                ctor = AST_ClassSetter;
                value = new AST_Accessor(value);
                break;
            }
            return new ctor({
                start: my_start_token(M),
                end: my_end_token(M),
                key: key,
                private: internal,
                static: M.static,
                value: value,
            });
        },
        PropertyDefinition: function(M) {
            var key = M.key, internal = false;
            if (M.computed) {
                key = from_moz(key);
            } else if (key.type == "PrivateIdentifier") {
                internal = true;
                key = "#" + key.name;
            } else {
                key = read_name(key);
            }
            return new AST_ClassField({
                start: my_start_token(M),
                end: my_end_token(M),
                key: key,
                private: internal,
                static: M.static,
                value: from_moz(M.value),
            });
        },
        StaticBlock: function(M) {
            var start = my_start_token(M);
            var end = my_end_token(M);
            return new AST_ClassInit({
                start: start,
                end: end,
                value: new AST_ClassInitBlock({
                    start: start,
                    end: end,
                    body: normalize_directives(M.body.map(from_moz)),
                }),
            });
        },
        ForOfStatement: function(M) {
            return new (M.await ? AST_ForAwaitOf : AST_ForOf)({
                start: my_start_token(M),
                end: my_end_token(M),
                init: from_moz(M.left),
                object: from_moz(M.right),
                body: from_moz(M.body),
            });
        },
        TryStatement: function(M) {
            var handlers = M.handlers || [M.handler];
            if (handlers.length > 1 || M.guardedHandlers && M.guardedHandlers.length) {
                throw new Error("Multiple catch clauses are not supported.");
            }
            return new AST_Try({
                start    : my_start_token(M),
                end      : my_end_token(M),
                body     : from_moz(M.block).body,
                bcatch   : from_moz(handlers[0]),
                bfinally : M.finalizer ? new AST_Finally(from_moz(M.finalizer)) : null,
            });
        },
        Property: function(M) {
            var key = M.computed ? from_moz(M.key) : read_name(M.key);
            var args = {
                start: my_start_token(M),
                end: my_end_token(M),
                key: key,
                value: from_moz(M.value),
            };
            if (M.kind == "init") return new (M.method ? AST_ObjectMethod : AST_ObjectKeyVal)(args);
            args.value = new AST_Accessor(args.value);
            if (M.kind == "get") return new AST_ObjectGetter(args);
            if (M.kind == "set") return new AST_ObjectSetter(args);
        },
        ArrayExpression: function(M) {
            return new AST_Array({
                start: my_start_token(M),
                end: my_end_token(M),
                elements: M.elements.map(function(elem) {
                    return elem === null ? new AST_Hole() : from_moz(elem);
                }),
            });
        },
        ArrayPattern: function(M) {
            var elements = [], rest = null;
            M.elements.forEach(function(el) {
                if (el === null) {
                    elements.push(new AST_Hole());
                } else if (el.type == "RestElement") {
                    rest = from_moz(el.argument);
                } else {
                    elements.push(from_moz(el));
                }
            });
            return new AST_DestructuredArray({
                start: my_start_token(M),
                end: my_end_token(M),
                elements: elements,
                rest: rest,
            });
        },
        ObjectPattern: function(M) {
            var props = [], rest = null;
            M.properties.forEach(function(prop) {
                if (prop.type == "RestElement") {
                    rest = from_moz(prop.argument);
                } else {
                    props.push(new AST_DestructuredKeyVal(from_moz(prop)));
                }
            });
            return new AST_DestructuredObject({
                start: my_start_token(M),
                end: my_end_token(M),
                properties: props,
                rest: rest,
            });
        },
        MemberExpression: function(M) {
            return new (M.computed ? AST_Sub : AST_Dot)({
                start: my_start_token(M),
                end: my_end_token(M),
                optional: M.optional,
                expression: from_moz(M.object),
                property: M.computed ? from_moz(M.property) : M.property.name,
            });
        },
        MetaProperty: function(M) {
            var expr = from_moz(M.meta);
            var prop = read_name(M.property);
            if (expr.name == "new" && prop == "target") return new AST_NewTarget({
                start: my_start_token(M),
                end: my_end_token(M),
                name: "new.target",
            });
            return new AST_Dot({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: expr,
                property: prop,
            });
        },
        SwitchCase: function(M) {
            return new (M.test ? AST_Case : AST_Default)({
                start      : my_start_token(M),
                end        : my_end_token(M),
                expression : from_moz(M.test),
                body       : M.consequent.map(from_moz),
            });
        },
        ExportAllDeclaration: function(M) {
            var start = my_start_token(M);
            var end = my_end_token(M);
            return new AST_ExportForeign({
                start: start,
                end: end,
                aliases: [ M.exported ? from_moz_alias(M.exported) : new AST_String({
                    start: start,
                    value: "*",
                    end: end,
                }) ],
                keys: [ new AST_String({
                    start: start,
                    value: "*",
                    end: end,
                }) ],
                path: from_moz(M.source),
            });
        },
        ExportDefaultDeclaration: function(M) {
            var decl = from_moz(M.declaration);
            if (!decl.name) switch (decl.CTOR) {
              case AST_AsyncDefun:
                decl = new AST_AsyncFunction(decl);
                break;
              case AST_AsyncGeneratorDefun:
                decl = new AST_AsyncGeneratorFunction(decl);
                break;
              case AST_DefClass:
                decl = new AST_ClassExpression(decl);
                break;
              case AST_Defun:
                decl = new AST_Function(decl);
                break;
              case AST_GeneratorDefun:
                decl = new AST_GeneratorFunction(decl);
                break;
            }
            return new AST_ExportDefault({
                start: my_start_token(M),
                end: my_end_token(M),
                body: decl,
            });
        },
        ExportNamedDeclaration: function(M) {
            if (M.declaration) return new AST_ExportDeclaration({
                start: my_start_token(M),
                end: my_end_token(M),
                body: from_moz(M.declaration),
            });
            if (M.source) {
                var aliases = [], keys = [];
                M.specifiers.forEach(function(prop) {
                    aliases.push(from_moz_alias(prop.exported));
                    keys.push(from_moz_alias(prop.local));
                });
                return new AST_ExportForeign({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    aliases: aliases,
                    keys: keys,
                    path: from_moz(M.source),
                });
            }
            return new AST_ExportReferences({
                start: my_start_token(M),
                end: my_end_token(M),
                properties: M.specifiers.map(function(prop) {
                    var sym = new AST_SymbolExport(from_moz(prop.local));
                    sym.alias = from_moz_alias(prop.exported);
                    return sym;
                }),
            });
        },
        ImportDeclaration: function(M) {
            var start = my_start_token(M);
            var end = my_end_token(M);
            var all = null, def = null, props = null;
            M.specifiers.forEach(function(prop) {
                var sym = new AST_SymbolImport(from_moz(prop.local));
                switch (prop.type) {
                  case "ImportDefaultSpecifier":
                    def = sym;
                    def.key = new AST_String({
                        start: start,
                        value: "",
                        end: end,
                    });
                    break;
                  case "ImportNamespaceSpecifier":
                    all = sym;
                    all.key = new AST_String({
                        start: start,
                        value: "*",
                        end: end,
                    });
                    break;
                  default:
                    sym.key = from_moz_alias(prop.imported);
                    if (!props) props = [];
                    props.push(sym);
                    break;
                }
            });
            return new AST_Import({
                start: start,
                end: end,
                all: all,
                default: def,
                properties: props,
                path: from_moz(M.source),
            });
        },
        ImportExpression: function(M) {
            var start = my_start_token(M);
            var arg = from_moz(M.source);
            return new AST_Call({
                start: start,
                end: my_end_token(M),
                expression: new AST_SymbolRef({
                    start: start,
                    end: arg.start,
                    name: "import",
                }),
                args: [ arg ],
            });
        },
        VariableDeclaration: function(M) {
            return new ({
                const: AST_Const,
                let: AST_Let,
            }[M.kind] || AST_Var)({
                start: my_start_token(M),
                end: my_end_token(M),
                definitions: M.declarations.map(from_moz),
            });
        },
        Literal: function(M) {
            var args = {
                start: my_start_token(M),
                end: my_end_token(M),
            };
            if (M.bigint) {
                args.value = M.bigint.toLowerCase() + "n";
                return new AST_BigInt(args);
            }
            var val = M.value;
            if (val === null) return new AST_Null(args);
            var rx = M.regex;
            if (rx && rx.pattern) {
                // RegExpLiteral as per ESTree AST spec
                args.value = new RegExp(rx.pattern, rx.flags);
                args.value.raw_source = rx.pattern;
                return new AST_RegExp(args);
            } else if (rx) {
                // support legacy RegExp
                args.value = M.regex && M.raw ? M.raw : val;
                return new AST_RegExp(args);
            }
            switch (typeof val) {
              case "string":
                args.value = val;
                return new AST_String(args);
              case "number":
                if (isNaN(val)) return new AST_NaN(args);
                var negate, node;
                if (isFinite(val)) {
                    negate = 1 / val < 0;
                    args.value = negate ? -val : val;
                    node = new AST_Number(args);
                } else {
                    negate = val < 0;
                    node = new AST_Infinity(args);
                }
                return negate ? new AST_UnaryPrefix({
                    start: args.start,
                    end: args.end,
                    operator: "-",
                    expression: node,
                }) : node;
              case "boolean":
                return new (val ? AST_True : AST_False)(args);
            }
        },
        TemplateLiteral: function(M) {
            return new AST_Template({
                start: my_start_token(M),
                end: my_end_token(M),
                expressions: M.expressions.map(from_moz),
                strings: M.quasis.map(function(el) {
                    return el.value.raw;
                }),
            });
        },
        TaggedTemplateExpression: function(M) {
            var tmpl = from_moz(M.quasi);
            tmpl.start = my_start_token(M);
            tmpl.end = my_end_token(M);
            tmpl.tag = from_moz(M.tag);
            return tmpl;
        },
        Identifier: function(M) {
            var p, level = FROM_MOZ_STACK.length - 1;
            do {
                p = FROM_MOZ_STACK[--level];
            } while (p.type == "ArrayPattern"
                || p.type == "AssignmentPattern" && p.left === FROM_MOZ_STACK[level + 1]
                || p.type == "ObjectPattern"
                || p.type == "Property" && p.value === FROM_MOZ_STACK[level + 1]
                || p.type == "VariableDeclarator" && p.id === FROM_MOZ_STACK[level + 1]);
            var ctor = AST_SymbolRef;
            switch (p.type) {
              case "ArrowFunctionExpression":
                if (p.body !== FROM_MOZ_STACK[level + 1]) ctor = AST_SymbolFunarg;
                break;
              case "BreakStatement":
              case "ContinueStatement":
                ctor = AST_LabelRef;
                break;
              case "CatchClause":
                ctor = AST_SymbolCatch;
                break;
              case "ClassDeclaration":
                if (p.id === FROM_MOZ_STACK[level + 1]) ctor = AST_SymbolDefClass;
                break;
              case "ClassExpression":
                if (p.id === FROM_MOZ_STACK[level + 1]) ctor = AST_SymbolClass;
                break;
              case "FunctionDeclaration":
                ctor = p.id === FROM_MOZ_STACK[level + 1] ? AST_SymbolDefun : AST_SymbolFunarg;
                break;
              case "FunctionExpression":
                ctor = p.id === FROM_MOZ_STACK[level + 1] ? AST_SymbolLambda : AST_SymbolFunarg;
                break;
              case "LabeledStatement":
                ctor = AST_Label;
                break;
              case "VariableDeclaration":
                ctor = {
                    const: AST_SymbolConst,
                    let: AST_SymbolLet,
                }[p.kind] || AST_SymbolVar;
                break;
            }
            return new ctor({
                start: my_start_token(M),
                end: my_end_token(M),
                name: M.name,
            });
        },
        Super: function(M) {
            return new AST_Super({
                start: my_start_token(M),
                end: my_end_token(M),
                name: "super",
            });
        },
        ThisExpression: function(M) {
            return new AST_This({
                start: my_start_token(M),
                end: my_end_token(M),
                name: "this",
            });
        },
        ParenthesizedExpression: function(M) {
            var node = from_moz(M.expression);
            if (!node.start.parens) node.start.parens = [];
            node.start.parens.push(my_start_token(M));
            if (!node.end.parens) node.end.parens = [];
            node.end.parens.push(my_end_token(M));
            return node;
        },
        ChainExpression: function(M) {
            var node = from_moz(M.expression);
            node.terminal = true;
            return node;
        },
    };

    MOZ_TO_ME.UpdateExpression =
    MOZ_TO_ME.UnaryExpression = function To_Moz_Unary(M) {
        var prefix = "prefix" in M ? M.prefix
            : M.type == "UnaryExpression" ? true : false;
        return new (prefix ? AST_UnaryPrefix : AST_UnaryPostfix)({
            start      : my_start_token(M),
            end        : my_end_token(M),
            operator   : M.operator,
            expression : from_moz(M.argument)
        });
    };

    map("EmptyStatement", AST_EmptyStatement);
    map("ExpressionStatement", AST_SimpleStatement, "expression>body");
    map("BlockStatement", AST_BlockStatement, "body@body");
    map("IfStatement", AST_If, "test>condition, consequent>body, alternate>alternative");
    map("LabeledStatement", AST_LabeledStatement, "label>label, body>body");
    map("BreakStatement", AST_Break, "label>label");
    map("ContinueStatement", AST_Continue, "label>label");
    map("WithStatement", AST_With, "object>expression, body>body");
    map("SwitchStatement", AST_Switch, "discriminant>expression, cases@body");
    map("ReturnStatement", AST_Return, "argument>value");
    map("ThrowStatement", AST_Throw, "argument>value");
    map("WhileStatement", AST_While, "test>condition, body>body");
    map("DoWhileStatement", AST_Do, "test>condition, body>body");
    map("ForStatement", AST_For, "init>init, test>condition, update>step, body>body");
    map("ForInStatement", AST_ForIn, "left>init, right>object, body>body");
    map("DebuggerStatement", AST_Debugger);
    map("VariableDeclarator", AST_VarDef, "id>name, init>value");
    map("CatchClause", AST_Catch, "param>argname, body%body");

    map("BinaryExpression", AST_Binary, "operator=operator, left>left, right>right");
    map("LogicalExpression", AST_Binary, "operator=operator, left>left, right>right");
    map("AssignmentExpression", AST_Assign, "operator=operator, left>left, right>right");
    map("AssignmentPattern", AST_DefaultValue, "left>name, right>value");
    map("ConditionalExpression", AST_Conditional, "test>condition, consequent>consequent, alternate>alternative");
    map("NewExpression", AST_New, "callee>expression, arguments@args, pure=pure");
    map("CallExpression", AST_Call, "callee>expression, arguments@args, optional=optional, pure=pure");
    map("SequenceExpression", AST_Sequence, "expressions@expressions");
    map("SpreadElement", AST_Spread, "argument>expression");
    map("ObjectExpression", AST_Object, "properties@properties");
    map("AwaitExpression", AST_Await, "argument>expression");
    map("YieldExpression", AST_Yield, "argument>expression, delegate=nested");

    def_to_moz(AST_Toplevel, function To_Moz_Program(M) {
        return to_moz_scope("Program", M);
    });

    def_to_moz(AST_LambdaDefinition, function To_Moz_FunctionDeclaration(M) {
        var params = M.argnames.map(to_moz);
        if (M.rest) params.push({
            type: "RestElement",
            argument: to_moz(M.rest),
        });
        return {
            type: "FunctionDeclaration",
            id: to_moz(M.name),
            async: is_async(M),
            generator: is_generator(M),
            params: params,
            body: to_moz_scope("BlockStatement", M),
        };
    });

    def_to_moz(AST_Lambda, function To_Moz_FunctionExpression(M) {
        var params = M.argnames.map(to_moz);
        if (M.rest) params.push({
            type: "RestElement",
            argument: to_moz(M.rest),
        });
        if (is_arrow(M)) return {
            type: "ArrowFunctionExpression",
            async: is_async(M),
            params: params,
            body: M.value ? to_moz(M.value) : to_moz_scope("BlockStatement", M),
        };
        return {
            type: "FunctionExpression",
            id: to_moz(M.name),
            async: is_async(M),
            generator: is_generator(M),
            params: params,
            body: to_moz_scope("BlockStatement", M),
        };
    });

    def_to_moz(AST_DefClass, function To_Moz_ClassDeclaration(M) {
        return {
            type: "ClassDeclaration",
            id: to_moz(M.name),
            superClass: to_moz(M.extends),
            body: {
                type: "ClassBody",
                body: M.properties.map(to_moz),
            },
        };
    });

    def_to_moz(AST_ClassExpression, function To_Moz_ClassExpression(M) {
        return {
            type: "ClassExpression",
            id: to_moz(M.name),
            superClass: to_moz(M.extends),
            body: {
                type: "ClassBody",
                body: M.properties.map(to_moz),
            },
        };
    });

    function To_Moz_MethodDefinition(kind) {
        return function(M) {
            var computed = M.key instanceof AST_Node;
            var key = computed ? to_moz(M.key) : M.private ? {
                type: "PrivateIdentifier",
                name: M.key.slice(1),
            } : {
                type: "Literal",
                value: M.key,
            };
            return {
                type: "MethodDefinition",
                kind: kind,
                computed: computed,
                key: key,
                static: M.static,
                value: to_moz(M.value),
            };
        };
    }
    def_to_moz(AST_ClassGetter, To_Moz_MethodDefinition("get"));
    def_to_moz(AST_ClassSetter, To_Moz_MethodDefinition("set"));
    def_to_moz(AST_ClassMethod, To_Moz_MethodDefinition("method"));

    def_to_moz(AST_ClassField, function To_Moz_PropertyDefinition(M) {
        var computed = M.key instanceof AST_Node;
        var key = computed ? to_moz(M.key) : M.private ? {
            type: "PrivateIdentifier",
            name: M.key.slice(1),
        } : {
            type: "Literal",
            value: M.key,
        };
        return {
            type: "PropertyDefinition",
            computed: computed,
            key: key,
            static: M.static,
            value: to_moz(M.value),
        };
    });

    def_to_moz(AST_ClassInit, function To_Moz_StaticBlock(M) {
        return to_moz_scope("StaticBlock", M.value);
    });

    function To_Moz_ForOfStatement(is_await) {
        return function(M) {
            return {
                type: "ForOfStatement",
                await: is_await,
                left: to_moz(M.init),
                right: to_moz(M.object),
                body: to_moz(M.body),
            };
        };
    }
    def_to_moz(AST_ForAwaitOf, To_Moz_ForOfStatement(true));
    def_to_moz(AST_ForOf, To_Moz_ForOfStatement(false));

    def_to_moz(AST_Directive, function To_Moz_Directive(M) {
        return {
            type: "ExpressionStatement",
            expression: set_moz_loc(M, {
                type: "Literal",
                value: M.value,
            }),
        };
    });

    def_to_moz(AST_SwitchBranch, function To_Moz_SwitchCase(M) {
        return {
            type: "SwitchCase",
            test: to_moz(M.expression),
            consequent: M.body.map(to_moz),
        };
    });

    def_to_moz(AST_Try, function To_Moz_TryStatement(M) {
        return {
            type: "TryStatement",
            block: to_moz_block(M),
            handler: to_moz(M.bcatch),
            guardedHandlers: [],
            finalizer: to_moz(M.bfinally),
        };
    });

    def_to_moz(AST_Catch, function To_Moz_CatchClause(M) {
        return {
            type: "CatchClause",
            param: to_moz(M.argname),
            guard: null,
            body: to_moz_block(M),
        };
    });

    def_to_moz(AST_ExportDeclaration, function To_Moz_ExportNamedDeclaration_declaration(M) {
        return {
            type: "ExportNamedDeclaration",
            declaration: to_moz(M.body),
        };
    });

    def_to_moz(AST_ExportDefault, function To_Moz_ExportDefaultDeclaration(M) {
        return {
            type: "ExportDefaultDeclaration",
            declaration: to_moz(M.body),
        };
    });

    def_to_moz(AST_ExportForeign, function To_Moz_ExportAllDeclaration_ExportNamedDeclaration(M) {
        if (M.keys[0].value == "*") return {
            type: "ExportAllDeclaration",
            exported: M.aliases[0].value == "*" ? null : to_moz_alias(M.aliases[0]),
            source: to_moz(M.path),
        };
        var specifiers = [];
        for (var i = 0; i < M.aliases.length; i++) {
            specifiers.push(set_moz_loc({
                start: M.keys[i].start,
                end: M.aliases[i].end,
            }, {
                type: "ExportSpecifier",
                local: to_moz_alias(M.keys[i]),
                exported: to_moz_alias(M.aliases[i]),
            }));
        }
        return {
            type: "ExportNamedDeclaration",
            specifiers: specifiers,
            source: to_moz(M.path),
        };
    });

    def_to_moz(AST_ExportReferences, function To_Moz_ExportNamedDeclaration_specifiers(M) {
        return {
            type: "ExportNamedDeclaration",
            specifiers: M.properties.map(function(prop) {
                return set_moz_loc({
                    start: prop.start,
                    end: prop.alias.end,
                }, {
                    type: "ExportSpecifier",
                    local: to_moz(prop),
                    exported: to_moz_alias(prop.alias),
                });
            }),
        };
    });

    def_to_moz(AST_Import, function To_Moz_ImportDeclaration(M) {
        var specifiers = M.properties ? M.properties.map(function(prop) {
            return set_moz_loc({
                start: prop.key.start,
                end: prop.end,
            }, {
                type: "ImportSpecifier",
                local: to_moz(prop),
                imported: to_moz_alias(prop.key),
            });
        }) : [];
        if (M.all) specifiers.unshift(set_moz_loc(M.all, {
            type: "ImportNamespaceSpecifier",
            local: to_moz(M.all),
        }));
        if (M.default) specifiers.unshift(set_moz_loc(M.default, {
            type: "ImportDefaultSpecifier",
            local: to_moz(M.default),
        }));
        return {
            type: "ImportDeclaration",
            specifiers: specifiers,
            source: to_moz(M.path),
        };
    });

    def_to_moz(AST_Definitions, function To_Moz_VariableDeclaration(M) {
        return {
            type: "VariableDeclaration",
            kind: M.TYPE.toLowerCase(),
            declarations: M.definitions.map(to_moz),
        };
    });

    def_to_moz(AST_PropAccess, function To_Moz_MemberExpression(M) {
        var computed = M instanceof AST_Sub;
        var expr = {
            type: "MemberExpression",
            object: to_moz(M.expression),
            computed: computed,
            optional: M.optional,
            property: computed ? to_moz(M.property) : {
                type: "Identifier",
                name: M.property,
            },
        };
        return M.terminal ? {
            type: "ChainExpression",
            expression: expr,
        } : expr;
    });

    def_to_moz(AST_Unary, function To_Moz_Unary(M) {
        return {
            type: M.operator == "++" || M.operator == "--" ? "UpdateExpression" : "UnaryExpression",
            operator: M.operator,
            prefix: M instanceof AST_UnaryPrefix,
            argument: to_moz(M.expression)
        };
    });

    def_to_moz(AST_Binary, function To_Moz_BinaryExpression(M) {
        return {
            type: M.operator == "&&" || M.operator == "||" ? "LogicalExpression" : "BinaryExpression",
            left: to_moz(M.left),
            operator: M.operator,
            right: to_moz(M.right)
        };
    });

    def_to_moz(AST_Array, function To_Moz_ArrayExpression(M) {
        return {
            type: "ArrayExpression",
            elements: M.elements.map(to_moz),
        };
    });

    def_to_moz(AST_DestructuredArray, function To_Moz_ArrayPattern(M) {
        var elements = M.elements.map(to_moz);
        if (M.rest) elements.push({
            type: "RestElement",
            argument: to_moz(M.rest),
        });
        return {
            type: "ArrayPattern",
            elements: elements,
        };
    });

    def_to_moz(AST_DestructuredKeyVal, function To_Moz_Property(M) {
        var computed = M.key instanceof AST_Node;
        var key = computed ? to_moz(M.key) : {
            type: "Literal",
            value: M.key,
        };
        return {
            type: "Property",
            kind: "init",
            computed: computed,
            key: key,
            value: to_moz(M.value),
        };
    });

    def_to_moz(AST_DestructuredObject, function To_Moz_ObjectPattern(M) {
        var props = M.properties.map(to_moz);
        if (M.rest) props.push({
            type: "RestElement",
            argument: to_moz(M.rest),
        });
        return {
            type: "ObjectPattern",
            properties: props,
        };
    });

    def_to_moz(AST_ObjectProperty, function To_Moz_Property(M) {
        var computed = M.key instanceof AST_Node;
        var key = computed ? to_moz(M.key) : {
            type: "Literal",
            value: M.key,
        };
        var kind;
        if (M instanceof AST_ObjectKeyVal) {
            kind = "init";
        } else if (M instanceof AST_ObjectGetter) {
            kind = "get";
        } else if (M instanceof AST_ObjectSetter) {
            kind = "set";
        }
        return {
            type: "Property",
            kind: kind,
            computed: computed,
            method: M instanceof AST_ObjectMethod,
            key: key,
            value: to_moz(M.value),
        };
    });

    def_to_moz(AST_Symbol, function To_Moz_Identifier(M) {
        var def = M.definition();
        return {
            type: "Identifier",
            name: def && def.mangled_name || M.name,
        };
    });

    def_to_moz(AST_Super, function To_Moz_Super() {
        return { type: "Super" };
    });

    def_to_moz(AST_This, function To_Moz_ThisExpression() {
        return { type: "ThisExpression" };
    });

    def_to_moz(AST_NewTarget, function To_Moz_MetaProperty() {
        return {
            type: "MetaProperty",
            meta: {
                type: "Identifier",
                name: "new",
            },
            property: {
                type: "Identifier",
                name: "target",
            },
        };
    });

    def_to_moz(AST_RegExp, function To_Moz_RegExpLiteral(M) {
        var flags = M.value.toString().match(/\/([gimuy]*)$/)[1];
        var value = "/" + M.value.raw_source + "/" + flags;
        return {
            type: "Literal",
            value: value,
            raw: value,
            regex: {
                pattern: M.value.raw_source,
                flags: flags,
            },
        };
    });

    def_to_moz(AST_BigInt, function To_Moz_BigInt(M) {
        var value = M.value;
        return {
            type: "Literal",
            bigint: value.slice(0, -1),
            raw: value,
        };
    });

    function To_Moz_Literal(M) {
        var value = M.value;
        if (typeof value === "number" && (value < 0 || (value === 0 && 1 / value < 0))) {
            return {
                type: "UnaryExpression",
                operator: "-",
                prefix: true,
                argument: {
                    type: "Literal",
                    value: -value,
                    raw: M.start.raw,
                },
            };
        }
        return {
            type: "Literal",
            value: value,
            raw: M.start.raw,
        };
    }
    def_to_moz(AST_Boolean, To_Moz_Literal);
    def_to_moz(AST_Constant, To_Moz_Literal);
    def_to_moz(AST_Null, To_Moz_Literal);

    def_to_moz(AST_Atom, function To_Moz_Atom(M) {
        return {
            type: "Identifier",
            name: String(M.value),
        };
    });

    def_to_moz(AST_Template, function To_Moz_TemplateLiteral_TaggedTemplateExpression(M) {
        var last = M.strings.length - 1;
        var tmpl = {
            type: "TemplateLiteral",
            expressions: M.expressions.map(to_moz),
            quasis: M.strings.map(function(str, index) {
                return {
                    type: "TemplateElement",
                    tail: index == last,
                    value: { raw: str },
                };
            }),
        };
        if (!M.tag) return tmpl;
        return {
            type: "TaggedTemplateExpression",
            tag: to_moz(M.tag),
            quasi: tmpl,
        };
    });

    AST_Block.DEFMETHOD("to_mozilla_ast", AST_BlockStatement.prototype.to_mozilla_ast);
    AST_Hole.DEFMETHOD("to_mozilla_ast", return_null);
    AST_Node.DEFMETHOD("to_mozilla_ast", function() {
        throw new Error("Cannot convert AST_" + this.TYPE);
    });

    /* -----[ tools ]----- */

    function normalize_directives(body) {
        for (var i = 0; i < body.length; i++) {
            var stat = body[i];
            if (!(stat instanceof AST_SimpleStatement)) break;
            var node = stat.body;
            if (!(node instanceof AST_String)) break;
            if (stat.start.pos !== node.start.pos) break;
            body[i] = new AST_Directive(node);
        }
        return body;
    }

    function raw_token(moznode) {
        if (moznode.type == "Literal") {
            return moznode.raw != null ? moznode.raw : moznode.value + "";
        }
    }

    function my_start_token(moznode) {
        var loc = moznode.loc, start = loc && loc.start;
        var range = moznode.range;
        return new AST_Token({
            file    : loc && loc.source,
            line    : start && start.line,
            col     : start && start.column,
            pos     : range ? range[0] : moznode.start,
            endline : start && start.line,
            endcol  : start && start.column,
            endpos  : range ? range[0] : moznode.start,
            raw     : raw_token(moznode),
        });
    }

    function my_end_token(moznode) {
        var loc = moznode.loc, end = loc && loc.end;
        var range = moznode.range;
        return new AST_Token({
            file    : loc && loc.source,
            line    : end && end.line,
            col     : end && end.column,
            pos     : range ? range[1] : moznode.end,
            endline : end && end.line,
            endcol  : end && end.column,
            endpos  : range ? range[1] : moznode.end,
            raw     : raw_token(moznode),
        });
    }

    function read_name(M) {
        return "" + M[M.type == "Identifier" ? "name" : "value"];
    }

    function map(moztype, mytype, propmap) {
        var moz_to_me = [
            "start: my_start_token(M)",
            "end: my_end_token(M)",
        ];
        var me_to_moz = [
            "type: " + JSON.stringify(moztype),
        ];

        if (propmap) propmap.split(/\s*,\s*/).forEach(function(prop) {
            var m = /([a-z0-9$_]+)(=|@|>|%)([a-z0-9$_]+)/i.exec(prop);
            if (!m) throw new Error("Can't understand property map: " + prop);
            var moz = m[1], how = m[2], my = m[3];
            switch (how) {
              case "@":
                moz_to_me.push(my + ": M." + moz + ".map(from_moz)");
                me_to_moz.push(moz + ": M." +  my + ".map(to_moz)");
                break;
              case ">":
                moz_to_me.push(my + ": from_moz(M." + moz + ")");
                me_to_moz.push(moz + ": to_moz(M." + my + ")");
                break;
              case "=":
                moz_to_me.push(my + ": M." + moz);
                me_to_moz.push(moz + ": M." + my);
                break;
              case "%":
                moz_to_me.push(my + ": from_moz(M." + moz + ").body");
                me_to_moz.push(moz + ": to_moz_block(M)");
                break;
              default:
                throw new Error("Can't understand operator in propmap: " + prop);
            }
        });

        MOZ_TO_ME[moztype] = new Function("U2", "my_start_token", "my_end_token", "from_moz", [
            "return function From_Moz_" + moztype + "(M) {",
            "    return new U2.AST_" + mytype.TYPE + "({",
            moz_to_me.join(",\n"),
            "    });",
            "};",
        ].join("\n"))(exports, my_start_token, my_end_token, from_moz);
        def_to_moz(mytype, new Function("to_moz", "to_moz_block", "to_moz_scope", [
            "return function To_Moz_" + moztype + "(M) {",
            "    return {",
            me_to_moz.join(",\n"),
            "    };",
            "};",
        ].join("\n"))(to_moz, to_moz_block, to_moz_scope));
    }

    var FROM_MOZ_STACK = null;

    function from_moz(moz) {
        FROM_MOZ_STACK.push(moz);
        var node = null;
        if (moz) {
            if (!HOP(MOZ_TO_ME, moz.type)) throw new Error("Unsupported type: " + moz.type);
            node = MOZ_TO_ME[moz.type](moz);
        }
        FROM_MOZ_STACK.pop();
        return node;
    }

    function from_moz_alias(moz) {
        return new AST_String({
            start: my_start_token(moz),
            value: read_name(moz),
            end: my_end_token(moz),
        });
    }

    AST_Node.from_mozilla_ast = function(node) {
        var save_stack = FROM_MOZ_STACK;
        FROM_MOZ_STACK = [];
        var ast = from_moz(node);
        FROM_MOZ_STACK = save_stack;
        ast.walk(new TreeWalker(function(node) {
            if (node instanceof AST_LabelRef) {
                for (var level = 0, parent; parent = this.parent(level); level++) {
                    if (parent instanceof AST_Scope) break;
                    if (parent instanceof AST_LabeledStatement && parent.label.name == node.name) {
                        node.thedef = parent.label;
                        break;
                    }
                }
                if (!node.thedef) {
                    var s = node.start;
                    js_error("Undefined label " + node.name, s.file, s.line, s.col, s.pos);
                }
            }
        }));
        return ast;
    };

    function set_moz_loc(mynode, moznode) {
        var start = mynode.start;
        var end = mynode.end;
        if (start.pos != null && end.endpos != null) {
            moznode.range = [start.pos, end.endpos];
        }
        if (start.line) {
            moznode.loc = {
                start: {line: start.line, column: start.col},
                end: end.endline ? {line: end.endline, column: end.endcol} : null,
            };
            if (start.file) {
                moznode.loc.source = start.file;
            }
        }
        return moznode;
    }

    function def_to_moz(mytype, handler) {
        mytype.DEFMETHOD("to_mozilla_ast", function() {
            return set_moz_loc(this, handler(this));
        });
    }

    function to_moz(node) {
        return node != null ? node.to_mozilla_ast() : null;
    }

    function to_moz_alias(alias) {
        return is_identifier_string(alias.value) ? set_moz_loc(alias, {
            type: "Identifier",
            name: alias.value,
        }) : to_moz(alias);
    }

    function to_moz_block(node) {
        return {
            type: "BlockStatement",
            body: node.body.map(to_moz),
        };
    }

    function to_moz_scope(type, node) {
        var body = node.body.map(to_moz);
        if (node.body[0] instanceof AST_SimpleStatement && node.body[0].body instanceof AST_String) {
            body.unshift(to_moz(new AST_EmptyStatement(node.body[0])));
        }
        return {
            type: type,
            body: body,
        };
    }
})();
