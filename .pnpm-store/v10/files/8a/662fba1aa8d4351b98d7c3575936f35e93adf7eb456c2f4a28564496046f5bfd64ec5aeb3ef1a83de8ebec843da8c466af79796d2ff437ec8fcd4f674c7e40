/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

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

import { make_node } from "./utils/index.js";
import {
    AST_Accessor,
    AST_Array,
    AST_Arrow,
    AST_Assign,
    AST_Atom,
    AST_Await,
    AST_BigInt,
    AST_Binary,
    AST_Block,
    AST_BlockStatement,
    AST_Boolean,
    AST_Break,
    AST_Call,
    AST_Case,
    AST_Catch,
    AST_Chain,
    AST_Class,
    AST_ClassStaticBlock,
    AST_ClassExpression,
    AST_ClassProperty,
    AST_ClassPrivateProperty,
    AST_ConciseMethod,
    AST_Conditional,
    AST_Const,
    AST_Constant,
    AST_Continue,
    AST_Debugger,
    AST_Default,
    AST_DefaultAssign,
    AST_DefClass,
    AST_Definitions,
    AST_Defun,
    AST_Destructuring,
    AST_Directive,
    AST_Do,
    AST_Dot,
    AST_DotHash,
    AST_EmptyStatement,
    AST_Expansion,
    AST_Export,
    AST_False,
    AST_Finally,
    AST_For,
    AST_ForIn,
    AST_ForOf,
    AST_Function,
    AST_Hole,
    AST_If,
    AST_Import,
    AST_ImportMeta,
    AST_Label,
    AST_LabeledStatement,
    AST_LabelRef,
    AST_Lambda,
    AST_Let,
    AST_NameMapping,
    AST_New,
    AST_NewTarget,
    AST_Node,
    AST_Null,
    AST_Number,
    AST_Object,
    AST_ObjectGetter,
    AST_ObjectKeyVal,
    AST_ObjectProperty,
    AST_ObjectSetter,
    AST_PrefixedTemplateString,
    AST_PrivateGetter,
    AST_PrivateMethod,
    AST_PrivateSetter,
    AST_PrivateIn,
    AST_PropAccess,
    AST_RegExp,
    AST_Return,
    AST_Sequence,
    AST_SimpleStatement,
    AST_Statement,
    AST_String,
    AST_Sub,
    AST_Super,
    AST_Switch,
    AST_SwitchBranch,
    AST_Symbol,
    AST_SymbolCatch,
    AST_SymbolClass,
    AST_SymbolClassProperty,
    AST_SymbolPrivateProperty,
    AST_SymbolConst,
    AST_SymbolDefClass,
    AST_SymbolDefun,
    AST_SymbolExport,
    AST_SymbolExportForeign,
    AST_SymbolFunarg,
    AST_SymbolImport,
    AST_SymbolImportForeign,
    AST_SymbolLambda,
    AST_SymbolLet,
    AST_SymbolMethod,
    AST_SymbolRef,
    AST_SymbolVar,
    AST_TemplateSegment,
    AST_TemplateString,
    AST_This,
    AST_Throw,
    AST_Token,
    AST_Toplevel,
    AST_True,
    AST_Try,
    AST_Unary,
    AST_UnaryPostfix,
    AST_UnaryPrefix,
    AST_Var,
    AST_VarDef,
    AST_While,
    AST_With,
    AST_Yield,
} from "./ast.js";
import { is_basic_identifier_string } from "./parse.js";

(function() {

    var normalize_directives = function(body) {
        var in_directive = true;

        for (var i = 0; i < body.length; i++) {
            if (in_directive && body[i] instanceof AST_Statement && body[i].body instanceof AST_String) {
                body[i] = new AST_Directive({
                    start: body[i].start,
                    end: body[i].end,
                    value: body[i].body.value
                });
            } else if (in_directive && !(body[i] instanceof AST_Statement && body[i].body instanceof AST_String)) {
                in_directive = false;
            }
        }

        return body;
    };

    const assert_clause_from_moz = (assertions) => {
        if (assertions && assertions.length > 0) {
            return new AST_Object({
                start: my_start_token(assertions),
                end: my_end_token(assertions),
                properties: assertions.map((assertion_kv) =>
                    new AST_ObjectKeyVal({
                        start: my_start_token(assertion_kv),
                        end: my_end_token(assertion_kv),
                        key: assertion_kv.key.name || assertion_kv.key.value,
                        value: from_moz(assertion_kv.value)
                    })
                )
            });
        }
        return null;
    };

    var MOZ_TO_ME = {
        Program: function(M) {
            return new AST_Toplevel({
                start: my_start_token(M),
                end: my_end_token(M),
                body: normalize_directives(M.body.map(from_moz))
            });
        },

        ArrayPattern: function(M) {
            return new AST_Destructuring({
                start: my_start_token(M),
                end: my_end_token(M),
                names: M.elements.map(function(elm) {
                    if (elm === null) {
                        return new AST_Hole();
                    }
                    return from_moz(elm);
                }),
                is_array: true
            });
        },

        ObjectPattern: function(M) {
            return new AST_Destructuring({
                start: my_start_token(M),
                end: my_end_token(M),
                names: M.properties.map(from_moz),
                is_array: false
            });
        },

        AssignmentPattern: function(M) {
            return new AST_DefaultAssign({
                start: my_start_token(M),
                end: my_end_token(M),
                left: from_moz(M.left),
                operator: "=",
                right: from_moz(M.right)
            });
        },

        SpreadElement: function(M) {
            return new AST_Expansion({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.argument)
            });
        },

        RestElement: function(M) {
            return new AST_Expansion({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.argument)
            });
        },

        TemplateElement: function(M) {
            return new AST_TemplateSegment({
                start: my_start_token(M),
                end: my_end_token(M),
                value: M.value.cooked,
                raw: M.value.raw
            });
        },

        TemplateLiteral: function(M) {
            var segments = [];
            for (var i = 0; i < M.quasis.length; i++) {
                segments.push(from_moz(M.quasis[i]));
                if (M.expressions[i]) {
                    segments.push(from_moz(M.expressions[i]));
                }
            }
            return new AST_TemplateString({
                start: my_start_token(M),
                end: my_end_token(M),
                segments: segments
            });
        },

        TaggedTemplateExpression: function(M) {
            return new AST_PrefixedTemplateString({
                start: my_start_token(M),
                end: my_end_token(M),
                template_string: from_moz(M.quasi),
                prefix: from_moz(M.tag)
            });
        },

        FunctionDeclaration: function(M) {
            return new AST_Defun({
                start: my_start_token(M),
                end: my_end_token(M),
                name: from_moz(M.id),
                argnames: M.params.map(from_moz),
                is_generator: M.generator,
                async: M.async,
                body: normalize_directives(from_moz(M.body).body)
            });
        },

        FunctionExpression: function(M) {
            return new AST_Function({
                start: my_start_token(M),
                end: my_end_token(M),
                name: from_moz(M.id),
                argnames: M.params.map(from_moz),
                is_generator: M.generator,
                async: M.async,
                body: normalize_directives(from_moz(M.body).body)
            });
        },

        ArrowFunctionExpression: function(M) {
            const body = M.body.type === "BlockStatement"
                ? from_moz(M.body).body
                : [make_node(AST_Return, {}, { value: from_moz(M.body) })];
            return new AST_Arrow({
                start: my_start_token(M),
                end: my_end_token(M),
                argnames: M.params.map(from_moz),
                body,
                async: M.async,
            });
        },

        ExpressionStatement: function(M) {
            return new AST_SimpleStatement({
                start: my_start_token(M),
                end: my_end_token(M),
                body: from_moz(M.expression)
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
                bfinally : M.finalizer ? new AST_Finally(from_moz(M.finalizer)) : null
            });
        },

        Property: function(M) {
            var key = M.key;
            var args = {
                start    : my_start_token(key || M.value),
                end      : my_end_token(M.value),
                key      : key.type == "Identifier" ? key.name : key.value,
                value    : from_moz(M.value)
            };
            if (M.computed) {
                args.key = from_moz(M.key);
            }
            if (M.method) {
                args.is_generator = M.value.generator;
                args.async = M.value.async;
                if (!M.computed) {
                    args.key = new AST_SymbolMethod({ name: args.key });
                } else {
                    args.key = from_moz(M.key);
                }
                return new AST_ConciseMethod(args);
            }
            if (M.kind == "init") {
                if (key.type != "Identifier" && key.type != "Literal") {
                    args.key = from_moz(key);
                }
                return new AST_ObjectKeyVal(args);
            }
            if (typeof args.key === "string" || typeof args.key === "number") {
                args.key = new AST_SymbolMethod({
                    name: args.key
                });
            }
            args.value = new AST_Accessor(args.value);
            if (M.kind == "get") return new AST_ObjectGetter(args);
            if (M.kind == "set") return new AST_ObjectSetter(args);
            if (M.kind == "method") {
                args.async = M.value.async;
                args.is_generator = M.value.generator;
                args.quote = M.computed ? "\"" : null;
                return new AST_ConciseMethod(args);
            }
        },

        MethodDefinition: function(M) {
            var args = {
                start    : my_start_token(M),
                end      : my_end_token(M),
                key      : M.computed ? from_moz(M.key) : new AST_SymbolMethod({ name: M.key.name || M.key.value }),
                value    : from_moz(M.value),
                static   : M.static,
            };
            if (M.kind == "get") {
                return new AST_ObjectGetter(args);
            }
            if (M.kind == "set") {
                return new AST_ObjectSetter(args);
            }
            args.is_generator = M.value.generator;
            args.async = M.value.async;
            return new AST_ConciseMethod(args);
        },

        FieldDefinition: function(M) {
            let key;
            if (M.computed) {
                key = from_moz(M.key);
            } else {
                if (M.key.type !== "Identifier") throw new Error("Non-Identifier key in FieldDefinition");
                key = from_moz(M.key);
            }
            return new AST_ClassProperty({
                start    : my_start_token(M),
                end      : my_end_token(M),
                key,
                value    : from_moz(M.value),
                static   : M.static,
            });
        },

        PropertyDefinition: function(M) {
            let key;
            if (M.computed) {
                key = from_moz(M.key);
            } else {
                if (M.key.type !== "Identifier" && M.key.type !== "PrivateIdentifier") {
                    throw new Error("Non-Identifier key in PropertyDefinition");
                }
                key = from_moz(M.key);
            }

            return new AST_ClassProperty({
                start    : my_start_token(M),
                end      : my_end_token(M),
                key,
                value    : from_moz(M.value),
                static   : M.static,
            });
        },

        StaticBlock: function(M) {
            return new AST_ClassStaticBlock({
                start : my_start_token(M),
                end   : my_end_token(M),
                body  : M.body.map(from_moz),
            });
        },

        ArrayExpression: function(M) {
            return new AST_Array({
                start    : my_start_token(M),
                end      : my_end_token(M),
                elements : M.elements.map(function(elem) {
                    return elem === null ? new AST_Hole() : from_moz(elem);
                })
            });
        },

        ObjectExpression: function(M) {
            return new AST_Object({
                start      : my_start_token(M),
                end        : my_end_token(M),
                properties : M.properties.map(function(prop) {
                    if (prop.type === "SpreadElement") {
                        return from_moz(prop);
                    }
                    prop.type = "Property";
                    return from_moz(prop);
                })
            });
        },

        SequenceExpression: function(M) {
            return new AST_Sequence({
                start      : my_start_token(M),
                end        : my_end_token(M),
                expressions: M.expressions.map(from_moz)
            });
        },

        MemberExpression: function(M) {
            return new (M.computed ? AST_Sub : AST_Dot)({
                start      : my_start_token(M),
                end        : my_end_token(M),
                property   : M.computed ? from_moz(M.property) : M.property.name,
                expression : from_moz(M.object),
                optional   : M.optional || false
            });
        },

        ChainExpression: function(M) {
            return new AST_Chain({
                start      : my_start_token(M),
                end        : my_end_token(M),
                expression : from_moz(M.expression)
            });
        },

        SwitchCase: function(M) {
            return new (M.test ? AST_Case : AST_Default)({
                start      : my_start_token(M),
                end        : my_end_token(M),
                expression : from_moz(M.test),
                body       : M.consequent.map(from_moz)
            });
        },

        VariableDeclaration: function(M) {
            return new (M.kind === "const" ? AST_Const :
                        M.kind === "let" ? AST_Let : AST_Var)({
                start       : my_start_token(M),
                end         : my_end_token(M),
                definitions : M.declarations.map(from_moz)
            });
        },

        ImportDeclaration: function(M) {
            var imported_name = null;
            var imported_names = null;
            M.specifiers.forEach(function (specifier) {
                if (specifier.type === "ImportSpecifier") {
                    if (!imported_names) { imported_names = []; }
                    imported_names.push(new AST_NameMapping({
                        start: my_start_token(specifier),
                        end: my_end_token(specifier),
                        foreign_name: from_moz(specifier.imported),
                        name: from_moz(specifier.local)
                    }));
                } else if (specifier.type === "ImportDefaultSpecifier") {
                    imported_name = from_moz(specifier.local);
                } else if (specifier.type === "ImportNamespaceSpecifier") {
                    if (!imported_names) { imported_names = []; }
                    imported_names.push(new AST_NameMapping({
                        start: my_start_token(specifier),
                        end: my_end_token(specifier),
                        foreign_name: new AST_SymbolImportForeign({ name: "*" }),
                        name: from_moz(specifier.local)
                    }));
                }
            });
            return new AST_Import({
                start       : my_start_token(M),
                end         : my_end_token(M),
                imported_name: imported_name,
                imported_names : imported_names,
                module_name : from_moz(M.source),
                assert_clause: assert_clause_from_moz(M.assertions)
            });
        },

        ExportAllDeclaration: function(M) {
            return new AST_Export({
                start: my_start_token(M),
                end: my_end_token(M),
                exported_names: [
                    new AST_NameMapping({
                        name: new AST_SymbolExportForeign({ name: "*" }),
                        foreign_name: new AST_SymbolExportForeign({ name: "*" })
                    })
                ],
                module_name: from_moz(M.source),
                assert_clause: assert_clause_from_moz(M.assertions)
            });
        },

        ExportNamedDeclaration: function(M) {
            return new AST_Export({
                start: my_start_token(M),
                end: my_end_token(M),
                exported_definition: from_moz(M.declaration),
                exported_names: M.specifiers && M.specifiers.length ? M.specifiers.map(function (specifier) {
                    return new AST_NameMapping({
                        foreign_name: from_moz(specifier.exported),
                        name: from_moz(specifier.local)
                    });
                }) : null,
                module_name: from_moz(M.source),
                assert_clause: assert_clause_from_moz(M.assertions)
            });
        },

        ExportDefaultDeclaration: function(M) {
            return new AST_Export({
                start: my_start_token(M),
                end: my_end_token(M),
                exported_value: from_moz(M.declaration),
                is_default: true
            });
        },

        Literal: function(M) {
            var val = M.value, args = {
                start  : my_start_token(M),
                end    : my_end_token(M)
            };
            var rx = M.regex;
            if (rx && rx.pattern) {
                // RegExpLiteral as per ESTree AST spec
                args.value = {
                    source: rx.pattern,
                    flags: rx.flags
                };
                return new AST_RegExp(args);
            } else if (rx) {
                // support legacy RegExp
                const rx_source = M.raw || val;
                const match = rx_source.match(/^\/(.*)\/(\w*)$/);
                if (!match) throw new Error("Invalid regex source " + rx_source);
                const [_, source, flags] = match;
                args.value = { source, flags };
                return new AST_RegExp(args);
            }
            if (val === null) return new AST_Null(args);
            switch (typeof val) {
              case "string":
                args.value = val;
                return new AST_String(args);
              case "number":
                args.value = val;
                args.raw = M.raw || val.toString();
                return new AST_Number(args);
              case "boolean":
                return new (val ? AST_True : AST_False)(args);
            }
        },

        MetaProperty: function(M) {
            if (M.meta.name === "new" && M.property.name === "target") {
                return new AST_NewTarget({
                    start: my_start_token(M),
                    end: my_end_token(M)
                });
            } else if (M.meta.name === "import" && M.property.name === "meta") {
                return new AST_ImportMeta({
                    start: my_start_token(M),
                    end: my_end_token(M)
                });
            }
        },

        Identifier: function(M) {
            var p = FROM_MOZ_STACK[FROM_MOZ_STACK.length - 2];
            return new (  p.type == "LabeledStatement" ? AST_Label
                        : p.type == "VariableDeclarator" && p.id === M ? (p.kind == "const" ? AST_SymbolConst : p.kind == "let" ? AST_SymbolLet : AST_SymbolVar)
                        : /Import.*Specifier/.test(p.type) ? (p.local === M ? AST_SymbolImport : AST_SymbolImportForeign)
                        : p.type == "ExportSpecifier" ? (p.local === M ? AST_SymbolExport : AST_SymbolExportForeign)
                        : p.type == "FunctionExpression" ? (p.id === M ? AST_SymbolLambda : AST_SymbolFunarg)
                        : p.type == "FunctionDeclaration" ? (p.id === M ? AST_SymbolDefun : AST_SymbolFunarg)
                        : p.type == "ArrowFunctionExpression" ? (p.params.includes(M)) ? AST_SymbolFunarg : AST_SymbolRef
                        : p.type == "ClassExpression" ? (p.id === M ? AST_SymbolClass : AST_SymbolRef)
                        : p.type == "Property" ? (p.key === M && p.computed || p.value === M ? AST_SymbolRef : AST_SymbolMethod)
                        : p.type == "PropertyDefinition" || p.type === "FieldDefinition" ? (p.key === M && p.computed || p.value === M ? AST_SymbolRef : AST_SymbolClassProperty)
                        : p.type == "ClassDeclaration" ? (p.id === M ? AST_SymbolDefClass : AST_SymbolRef)
                        : p.type == "MethodDefinition" ? (p.computed ? AST_SymbolRef : AST_SymbolMethod)
                        : p.type == "CatchClause" ? AST_SymbolCatch
                        : p.type == "BreakStatement" || p.type == "ContinueStatement" ? AST_LabelRef
                        : AST_SymbolRef)({
                            start : my_start_token(M),
                            end   : my_end_token(M),
                            name  : M.name
                        });
        },

        BigIntLiteral(M) {
            return new AST_BigInt({
                start : my_start_token(M),
                end   : my_end_token(M),
                value : M.value
            });
        },

        EmptyStatement: function(M) {
            return new AST_EmptyStatement({
                start: my_start_token(M),
                end: my_end_token(M)
            });
        },

        BlockStatement: function(M) {
            return new AST_BlockStatement({
                start: my_start_token(M),
                end: my_end_token(M),
                body: M.body.map(from_moz)
            });
        },

        IfStatement: function(M) {
            return new AST_If({
                start: my_start_token(M),
                end: my_end_token(M),
                condition: from_moz(M.test),
                body: from_moz(M.consequent),
                alternative: from_moz(M.alternate)
            });
        },

        LabeledStatement: function(M) {
            return new AST_LabeledStatement({
                start: my_start_token(M),
                end: my_end_token(M),
                label: from_moz(M.label),
                body: from_moz(M.body)
            });
        },

        BreakStatement: function(M) {
            return new AST_Break({
                start: my_start_token(M),
                end: my_end_token(M),
                label: from_moz(M.label)
            });
        },

        ContinueStatement: function(M) {
            return new AST_Continue({
                start: my_start_token(M),
                end: my_end_token(M),
                label: from_moz(M.label)
            });
        },

        WithStatement: function(M) {
            return new AST_With({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.object),
                body: from_moz(M.body)
            });
        },

        SwitchStatement: function(M) {
            return new AST_Switch({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.discriminant),
                body: M.cases.map(from_moz)
            });
        },

        ReturnStatement: function(M) {
            return new AST_Return({
                start: my_start_token(M),
                end: my_end_token(M),
                value: from_moz(M.argument)
            });
        },

        ThrowStatement: function(M) {
            return new AST_Throw({
                start: my_start_token(M),
                end: my_end_token(M),
                value: from_moz(M.argument)
            });
        },

        WhileStatement: function(M) {
            return new AST_While({
                start: my_start_token(M),
                end: my_end_token(M),
                condition: from_moz(M.test),
                body: from_moz(M.body)
            });
        },

        DoWhileStatement: function(M) {
            return new AST_Do({
                start: my_start_token(M),
                end: my_end_token(M),
                condition: from_moz(M.test),
                body: from_moz(M.body)
            });
        },

        ForStatement: function(M) {
            return new AST_For({
                start: my_start_token(M),
                end: my_end_token(M),
                init: from_moz(M.init),
                condition: from_moz(M.test),
                step: from_moz(M.update),
                body: from_moz(M.body)
            });
        },

        ForInStatement: function(M) {
            return new AST_ForIn({
                start: my_start_token(M),
                end: my_end_token(M),
                init: from_moz(M.left),
                object: from_moz(M.right),
                body: from_moz(M.body)
            });
        },

        ForOfStatement: function(M) {
            return new AST_ForOf({
                start: my_start_token(M),
                end: my_end_token(M),
                init: from_moz(M.left),
                object: from_moz(M.right),
                body: from_moz(M.body),
                await: M.await
            });
        },

        AwaitExpression: function(M) {
            return new AST_Await({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.argument)
            });
        },

        YieldExpression: function(M) {
            return new AST_Yield({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.argument),
                is_star: M.delegate
            });
        },

        DebuggerStatement: function(M) {
            return new AST_Debugger({
                start: my_start_token(M),
                end: my_end_token(M)
            });
        },

        VariableDeclarator: function(M) {
            return new AST_VarDef({
                start: my_start_token(M),
                end: my_end_token(M),
                name: from_moz(M.id),
                value: from_moz(M.init)
            });
        },

        CatchClause: function(M) {
            return new AST_Catch({
                start: my_start_token(M),
                end: my_end_token(M),
                argname: from_moz(M.param),
                body: from_moz(M.body).body
            });
        },

        ThisExpression: function(M) {
            return new AST_This({
                start: my_start_token(M),
                end: my_end_token(M)
            });
        },

        Super: function(M) {
            return new AST_Super({
                start: my_start_token(M),
                end: my_end_token(M)
            });
        },

        BinaryExpression: function(M) {
            if (M.left.type === "PrivateIdentifier") {
                return new AST_PrivateIn({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    key: new AST_SymbolPrivateProperty({
                        start: my_start_token(M.left),
                        end: my_end_token(M.left),
                        name: M.left.name
                    }),
                    value: from_moz(M.right),
                });
            }
            return new AST_Binary({
                start: my_start_token(M),
                end: my_end_token(M),
                operator: M.operator,
                left: from_moz(M.left),
                right: from_moz(M.right)
            });
        },

        LogicalExpression: function(M) {
            return new AST_Binary({
                start: my_start_token(M),
                end: my_end_token(M),
                operator: M.operator,
                left: from_moz(M.left),
                right: from_moz(M.right)
            });
        },

        AssignmentExpression: function(M) {
            return new AST_Assign({
                start: my_start_token(M),
                end: my_end_token(M),
                operator: M.operator,
                left: from_moz(M.left),
                right: from_moz(M.right)
            });
        },

        ConditionalExpression: function(M) {
            return new AST_Conditional({
                start: my_start_token(M),
                end: my_end_token(M),
                condition: from_moz(M.test),
                consequent: from_moz(M.consequent),
                alternative: from_moz(M.alternate)
            });
        },

        NewExpression: function(M) {
            return new AST_New({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.callee),
                args: M.arguments.map(from_moz)
            });
        },

        CallExpression: function(M) {
            return new AST_Call({
                start: my_start_token(M),
                end: my_end_token(M),
                expression: from_moz(M.callee),
                optional: M.optional,
                args: M.arguments.map(from_moz)
            });
        }
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

    MOZ_TO_ME.ClassDeclaration =
    MOZ_TO_ME.ClassExpression = function From_Moz_Class(M) {
        return new (M.type === "ClassDeclaration" ? AST_DefClass : AST_ClassExpression)({
            start    : my_start_token(M),
            end      : my_end_token(M),
            name     : from_moz(M.id),
            extends  : from_moz(M.superClass),
            properties: M.body.body.map(from_moz)
        });
    };

    def_to_moz(AST_EmptyStatement, function To_Moz_EmptyStatement() {
        return {
            type: "EmptyStatement"
        };
    });
    def_to_moz(AST_BlockStatement, function To_Moz_BlockStatement(M) {
        return {
            type: "BlockStatement",
            body: M.body.map(to_moz)
        };
    });
    def_to_moz(AST_If, function To_Moz_IfStatement(M) {
        return {
            type: "IfStatement",
            test: to_moz(M.condition),
            consequent: to_moz(M.body),
            alternate: to_moz(M.alternative)
        };
    });
    def_to_moz(AST_LabeledStatement, function To_Moz_LabeledStatement(M) {
        return {
            type: "LabeledStatement",
            label: to_moz(M.label),
            body: to_moz(M.body)
        };
    });
    def_to_moz(AST_Break, function To_Moz_BreakStatement(M) {
        return {
            type: "BreakStatement",
            label: to_moz(M.label)
        };
    });
    def_to_moz(AST_Continue, function To_Moz_ContinueStatement(M) {
        return {
            type: "ContinueStatement",
            label: to_moz(M.label)
        };
    });
    def_to_moz(AST_With, function To_Moz_WithStatement(M) {
        return {
            type: "WithStatement",
            object: to_moz(M.expression),
            body: to_moz(M.body)
        };
    });
    def_to_moz(AST_Switch, function To_Moz_SwitchStatement(M) {
        return {
            type: "SwitchStatement",
            discriminant: to_moz(M.expression),
            cases: M.body.map(to_moz)
        };
    });
    def_to_moz(AST_Return, function To_Moz_ReturnStatement(M) {
        return {
            type: "ReturnStatement",
            argument: to_moz(M.value)
        };
    });
    def_to_moz(AST_Throw, function To_Moz_ThrowStatement(M) {
        return {
            type: "ThrowStatement",
            argument: to_moz(M.value)
        };
    });
    def_to_moz(AST_While, function To_Moz_WhileStatement(M) {
        return {
            type: "WhileStatement",
            test: to_moz(M.condition),
            body: to_moz(M.body)
        };
    });
    def_to_moz(AST_Do, function To_Moz_DoWhileStatement(M) {
        return {
            type: "DoWhileStatement",
            test: to_moz(M.condition),
            body: to_moz(M.body)
        };
    });
    def_to_moz(AST_For, function To_Moz_ForStatement(M) {
        return {
            type: "ForStatement",
            init: to_moz(M.init),
            test: to_moz(M.condition),
            update: to_moz(M.step),
            body: to_moz(M.body)
        };
    });
    def_to_moz(AST_ForIn, function To_Moz_ForInStatement(M) {
        return {
            type: "ForInStatement",
            left: to_moz(M.init),
            right: to_moz(M.object),
            body: to_moz(M.body)
        };
    });
    def_to_moz(AST_ForOf, function To_Moz_ForOfStatement(M) {
        return {
            type: "ForOfStatement",
            left: to_moz(M.init),
            right: to_moz(M.object),
            body: to_moz(M.body),
            await: M.await
        };
    });
    def_to_moz(AST_Await, function To_Moz_AwaitExpression(M) {
        return {
            type: "AwaitExpression",
            argument: to_moz(M.expression)
        };
    });
    def_to_moz(AST_Yield, function To_Moz_YieldExpression(M) {
        return {
            type: "YieldExpression",
            argument: to_moz(M.expression),
            delegate: M.is_star
        };
    });
    def_to_moz(AST_Debugger, function To_Moz_DebuggerStatement() {
        return {
            type: "DebuggerStatement"
        };
    });
    def_to_moz(AST_VarDef, function To_Moz_VariableDeclarator(M) {
        return {
            type: "VariableDeclarator",
            id: to_moz(M.name),
            init: to_moz(M.value)
        };
    });
    def_to_moz(AST_Catch, function To_Moz_CatchClause(M) {
        return {
            type: "CatchClause",
            param: to_moz(M.argname),
            body: to_moz_block(M)
        };
    });

    def_to_moz(AST_This, function To_Moz_ThisExpression() {
        return {
            type: "ThisExpression"
        };
    });
    def_to_moz(AST_Super, function To_Moz_Super() {
        return {
            type: "Super"
        };
    });
    def_to_moz(AST_Binary, function To_Moz_BinaryExpression(M) {
        return {
            type: "BinaryExpression",
            operator: M.operator,
            left: to_moz(M.left),
            right: to_moz(M.right)
        };
    });
    def_to_moz(AST_Binary, function To_Moz_LogicalExpression(M) {
        return {
            type: "LogicalExpression",
            operator: M.operator,
            left: to_moz(M.left),
            right: to_moz(M.right)
        };
    });
    def_to_moz(AST_Assign, function To_Moz_AssignmentExpression(M) {
        return {
            type: "AssignmentExpression",
            operator: M.operator,
            left: to_moz(M.left),
            right: to_moz(M.right)
        };
    });
    def_to_moz(AST_Conditional, function To_Moz_ConditionalExpression(M) {
        return {
            type: "ConditionalExpression",
            test: to_moz(M.condition),
            consequent: to_moz(M.consequent),
            alternate: to_moz(M.alternative)
        };
    });
    def_to_moz(AST_New, function To_Moz_NewExpression(M) {
        return {
            type: "NewExpression",
            callee: to_moz(M.expression),
            arguments: M.args.map(to_moz)
        };
    });
    def_to_moz(AST_Call, function To_Moz_CallExpression(M) {
        return {
            type: "CallExpression",
            callee: to_moz(M.expression),
            optional: M.optional,
            arguments: M.args.map(to_moz)
        };
    });

    def_to_moz(AST_Toplevel, function To_Moz_Program(M) {
        return to_moz_scope("Program", M);
    });

    def_to_moz(AST_Expansion, function To_Moz_Spread(M) {
        return {
            type: to_moz_in_destructuring() ? "RestElement" : "SpreadElement",
            argument: to_moz(M.expression)
        };
    });

    def_to_moz(AST_PrefixedTemplateString, function To_Moz_TaggedTemplateExpression(M) {
        return {
            type: "TaggedTemplateExpression",
            tag: to_moz(M.prefix),
            quasi: to_moz(M.template_string)
        };
    });

    def_to_moz(AST_TemplateString, function To_Moz_TemplateLiteral(M) {
        var quasis = [];
        var expressions = [];
        for (var i = 0; i < M.segments.length; i++) {
            if (i % 2 !== 0) {
                expressions.push(to_moz(M.segments[i]));
            } else {
                quasis.push({
                    type: "TemplateElement",
                    value: {
                        raw: M.segments[i].raw,
                        cooked: M.segments[i].value
                    },
                    tail: i === M.segments.length - 1
                });
            }
        }
        return {
            type: "TemplateLiteral",
            quasis: quasis,
            expressions: expressions
        };
    });

    def_to_moz(AST_Defun, function To_Moz_FunctionDeclaration(M) {
        return {
            type: "FunctionDeclaration",
            id: to_moz(M.name),
            params: M.argnames.map(to_moz),
            generator: M.is_generator,
            async: M.async,
            body: to_moz_scope("BlockStatement", M)
        };
    });

    def_to_moz(AST_Function, function To_Moz_FunctionExpression(M, parent) {
        var is_generator = parent.is_generator !== undefined ?
            parent.is_generator : M.is_generator;
        return {
            type: "FunctionExpression",
            id: to_moz(M.name),
            params: M.argnames.map(to_moz),
            generator: is_generator,
            async: M.async,
            body: to_moz_scope("BlockStatement", M)
        };
    });

    def_to_moz(AST_Arrow, function To_Moz_ArrowFunctionExpression(M) {
        var body = {
            type: "BlockStatement",
            body: M.body.map(to_moz)
        };
        return {
            type: "ArrowFunctionExpression",
            params: M.argnames.map(to_moz),
            async: M.async,
            body: body
        };
    });

    def_to_moz(AST_Destructuring, function To_Moz_ObjectPattern(M) {
        if (M.is_array) {
            return {
                type: "ArrayPattern",
                elements: M.names.map(to_moz)
            };
        }
        return {
            type: "ObjectPattern",
            properties: M.names.map(to_moz)
        };
    });

    def_to_moz(AST_Directive, function To_Moz_Directive(M) {
        return {
            type: "ExpressionStatement",
            expression: {
                type: "Literal",
                value: M.value,
                raw: M.print_to_string()
            },
            directive: M.value
        };
    });

    def_to_moz(AST_SimpleStatement, function To_Moz_ExpressionStatement(M) {
        return {
            type: "ExpressionStatement",
            expression: to_moz(M.body)
        };
    });

    def_to_moz(AST_SwitchBranch, function To_Moz_SwitchCase(M) {
        return {
            type: "SwitchCase",
            test: to_moz(M.expression),
            consequent: M.body.map(to_moz)
        };
    });

    def_to_moz(AST_Try, function To_Moz_TryStatement(M) {
        return {
            type: "TryStatement",
            block: to_moz_block(M),
            handler: to_moz(M.bcatch),
            guardedHandlers: [],
            finalizer: to_moz(M.bfinally)
        };
    });

    def_to_moz(AST_Catch, function To_Moz_CatchClause(M) {
        return {
            type: "CatchClause",
            param: to_moz(M.argname),
            guard: null,
            body: to_moz_block(M)
        };
    });

    def_to_moz(AST_Definitions, function To_Moz_VariableDeclaration(M) {
        return {
            type: "VariableDeclaration",
            kind:
                M instanceof AST_Const ? "const" :
                M instanceof AST_Let ? "let" : "var",
            declarations: M.definitions.map(to_moz)
        };
    });

    const assert_clause_to_moz = assert_clause => {
        const assertions = [];
        if (assert_clause) {
            for (const { key, value } of assert_clause.properties) {
                const key_moz = is_basic_identifier_string(key)
                    ? { type: "Identifier", name: key }
                    : { type: "Literal", value: key, raw: JSON.stringify(key) };
                assertions.push({
                    type: "ImportAttribute",
                    key: key_moz,
                    value: to_moz(value)
                });
            }
        }
        return assertions;
    };

    def_to_moz(AST_Export, function To_Moz_ExportDeclaration(M) {
        if (M.exported_names) {
            if (M.exported_names[0].name.name === "*") {
                return {
                    type: "ExportAllDeclaration",
                    source: to_moz(M.module_name),
                    assertions: assert_clause_to_moz(M.assert_clause)
                };
            }
            return {
                type: "ExportNamedDeclaration",
                specifiers: M.exported_names.map(function (name_mapping) {
                    return {
                        type: "ExportSpecifier",
                        exported: to_moz(name_mapping.foreign_name),
                        local: to_moz(name_mapping.name)
                    };
                }),
                declaration: to_moz(M.exported_definition),
                source: to_moz(M.module_name),
                assertions: assert_clause_to_moz(M.assert_clause)
            };
        }
        return {
            type: M.is_default ? "ExportDefaultDeclaration" : "ExportNamedDeclaration",
            declaration: to_moz(M.exported_value || M.exported_definition)
        };
    });

    def_to_moz(AST_Import, function To_Moz_ImportDeclaration(M) {
        var specifiers = [];
        if (M.imported_name) {
            specifiers.push({
                type: "ImportDefaultSpecifier",
                local: to_moz(M.imported_name)
            });
        }
        if (M.imported_names && M.imported_names[0].foreign_name.name === "*") {
            specifiers.push({
                type: "ImportNamespaceSpecifier",
                local: to_moz(M.imported_names[0].name)
            });
        } else if (M.imported_names) {
            M.imported_names.forEach(function(name_mapping) {
                specifiers.push({
                    type: "ImportSpecifier",
                    local: to_moz(name_mapping.name),
                    imported: to_moz(name_mapping.foreign_name)
                });
            });
        }
        return {
            type: "ImportDeclaration",
            specifiers: specifiers,
            source: to_moz(M.module_name),
            assertions: assert_clause_to_moz(M.assert_clause)
        };
    });

    def_to_moz(AST_ImportMeta, function To_Moz_MetaProperty() {
        return {
            type: "MetaProperty",
            meta: {
                type: "Identifier",
                name: "import"
            },
            property: {
                type: "Identifier",
                name: "meta"
            }
        };
    });

    def_to_moz(AST_Sequence, function To_Moz_SequenceExpression(M) {
        return {
            type: "SequenceExpression",
            expressions: M.expressions.map(to_moz)
        };
    });

    def_to_moz(AST_DotHash, function To_Moz_PrivateMemberExpression(M) {
        return {
            type: "MemberExpression",
            object: to_moz(M.expression),
            computed: false,
            property: {
                type: "PrivateIdentifier",
                name: M.property
            },
            optional: M.optional
        };
    });

    def_to_moz(AST_PropAccess, function To_Moz_MemberExpression(M) {
        var isComputed = M instanceof AST_Sub;
        return {
            type: "MemberExpression",
            object: to_moz(M.expression),
            computed: isComputed,
            property: isComputed ? to_moz(M.property) : {type: "Identifier", name: M.property},
            optional: M.optional
        };
    });

    def_to_moz(AST_Chain, function To_Moz_ChainExpression(M) {
        return {
            type: "ChainExpression",
            expression: to_moz(M.expression)
        };
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
        if (M.operator == "=" && to_moz_in_destructuring()) {
            return {
                type: "AssignmentPattern",
                left: to_moz(M.left),
                right: to_moz(M.right)
            };
        }

        const type = M.operator == "&&" || M.operator == "||" || M.operator === "??"
            ? "LogicalExpression"
            : "BinaryExpression";

        return {
            type,
            left: to_moz(M.left),
            operator: M.operator,
            right: to_moz(M.right)
        };
    });

    def_to_moz(AST_PrivateIn, function To_Moz_BinaryExpression_PrivateIn(M) {
        return {
            type: "BinaryExpression",
            left: { type: "PrivateIdentifier", name: M.key.name },
            operator: "in",
            right: to_moz(M.value),
        };
    });

    def_to_moz(AST_Array, function To_Moz_ArrayExpression(M) {
        return {
            type: "ArrayExpression",
            elements: M.elements.map(to_moz)
        };
    });

    def_to_moz(AST_Object, function To_Moz_ObjectExpression(M) {
        return {
            type: "ObjectExpression",
            properties: M.properties.map(to_moz)
        };
    });

    def_to_moz(AST_ObjectProperty, function To_Moz_Property(M, parent) {
        var key = M.key instanceof AST_Node ? to_moz(M.key) : {
            type: "Identifier",
            value: M.key
        };
        if (typeof M.key === "number") {
            key = {
                type: "Literal",
                value: Number(M.key)
            };
        }
        if (typeof M.key === "string") {
            key = {
                type: "Identifier",
                name: M.key
            };
        }
        var kind;
        var string_or_num = typeof M.key === "string" || typeof M.key === "number";
        var computed = string_or_num ? false : !(M.key instanceof AST_Symbol) || M.key instanceof AST_SymbolRef;
        if (M instanceof AST_ObjectKeyVal) {
            kind = "init";
            computed = !string_or_num;
        } else
        if (M instanceof AST_ObjectGetter) {
            kind = "get";
        } else
        if (M instanceof AST_ObjectSetter) {
            kind = "set";
        }
        if (M instanceof AST_PrivateGetter || M instanceof AST_PrivateSetter) {
            const kind = M instanceof AST_PrivateGetter ? "get" : "set";
            return {
                type: "MethodDefinition",
                computed: false,
                kind: kind,
                static: M.static,
                key: {
                    type: "PrivateIdentifier",
                    name: M.key.name
                },
                value: to_moz(M.value)
            };
        }
        if (M instanceof AST_ClassPrivateProperty) {
            return {
                type: "PropertyDefinition",
                key: {
                    type: "PrivateIdentifier",
                    name: M.key.name
                },
                value: to_moz(M.value),
                computed: false,
                static: M.static
            };
        }
        if (M instanceof AST_ClassProperty) {
            return {
                type: "PropertyDefinition",
                key,
                value: to_moz(M.value),
                computed,
                static: M.static
            };
        }
        if (parent instanceof AST_Class) {
            return {
                type: "MethodDefinition",
                computed: computed,
                kind: kind,
                static: M.static,
                key: to_moz(M.key),
                value: to_moz(M.value)
            };
        }
        return {
            type: "Property",
            computed: computed,
            kind: kind,
            key: key,
            value: to_moz(M.value)
        };
    });

    def_to_moz(AST_ConciseMethod, function To_Moz_MethodDefinition(M, parent) {
        if (parent instanceof AST_Object) {
            return {
                type: "Property",
                computed: !(M.key instanceof AST_Symbol) || M.key instanceof AST_SymbolRef,
                kind: "init",
                method: true,
                shorthand: false,
                key: to_moz(M.key),
                value: to_moz(M.value)
            };
        }

        const key = M instanceof AST_PrivateMethod
            ? {
                type: "PrivateIdentifier",
                name: M.key.name
            }
            : to_moz(M.key);

        return {
            type: "MethodDefinition",
            kind: M.key === "constructor" ? "constructor" : "method",
            key,
            value: to_moz(M.value),
            computed: !(M.key instanceof AST_Symbol) || M.key instanceof AST_SymbolRef,
            static: M.static,
        };
    });

    def_to_moz(AST_Class, function To_Moz_Class(M) {
        var type = M instanceof AST_ClassExpression ? "ClassExpression" : "ClassDeclaration";
        return {
            type: type,
            superClass: to_moz(M.extends),
            id: M.name ? to_moz(M.name) : null,
            body: {
                type: "ClassBody",
                body: M.properties.map(to_moz)
            }
        };
    });

    def_to_moz(AST_ClassStaticBlock, function To_Moz_StaticBlock(M) {
        return {
            type: "StaticBlock",
            body: M.body.map(to_moz),
        };
    });

    def_to_moz(AST_NewTarget, function To_Moz_MetaProperty() {
        return {
            type: "MetaProperty",
            meta: {
                type: "Identifier",
                name: "new"
            },
            property: {
                type: "Identifier",
                name: "target"
            }
        };
    });

    def_to_moz(AST_Symbol, function To_Moz_Identifier(M, parent) {
        if (M instanceof AST_SymbolMethod && parent.quote) {
            return {
                type: "Literal",
                value: M.name
            };
        }
        var def = M.definition();
        return {
            type: "Identifier",
            name: def ? def.mangled_name || def.name : M.name
        };
    });

    def_to_moz(AST_RegExp, function To_Moz_RegExpLiteral(M) {
        const pattern = M.value.source;
        const flags = M.value.flags;
        return {
            type: "Literal",
            value: null,
            raw: M.print_to_string(),
            regex: { pattern, flags }
        };
    });

    def_to_moz(AST_Constant, function To_Moz_Literal(M) {
        var value = M.value;
        return {
            type: "Literal",
            value: value,
            raw: M.raw || M.print_to_string()
        };
    });

    def_to_moz(AST_Atom, function To_Moz_Atom(M) {
        return {
            type: "Identifier",
            name: String(M.value)
        };
    });

    def_to_moz(AST_BigInt, M => ({
        type: "BigIntLiteral",
        value: M.value
    }));

    AST_Boolean.DEFMETHOD("to_mozilla_ast", AST_Constant.prototype.to_mozilla_ast);
    AST_Null.DEFMETHOD("to_mozilla_ast", AST_Constant.prototype.to_mozilla_ast);
    AST_Hole.DEFMETHOD("to_mozilla_ast", function To_Moz_ArrayHole() { return null; });

    AST_Block.DEFMETHOD("to_mozilla_ast", AST_BlockStatement.prototype.to_mozilla_ast);
    AST_Lambda.DEFMETHOD("to_mozilla_ast", AST_Function.prototype.to_mozilla_ast);

    /* -----[ tools ]----- */

    function my_start_token(moznode) {
        var loc = moznode.loc, start = loc && loc.start;
        var range = moznode.range;
        return new AST_Token(
            "",
            "",
            start && start.line || 0,
            start && start.column || 0,
            range ? range [0] : moznode.start,
            false,
            [],
            [],
            loc && loc.source,
        );
    }

    function my_end_token(moznode) {
        var loc = moznode.loc, end = loc && loc.end;
        var range = moznode.range;
        return new AST_Token(
            "",
            "",
            end && end.line || 0,
            end && end.column || 0,
            range ? range [0] : moznode.end,
            false,
            [],
            [],
            loc && loc.source,
        );
    }

    var FROM_MOZ_STACK = null;

    function from_moz(node) {
        FROM_MOZ_STACK.push(node);
        var ret = node != null ? MOZ_TO_ME[node.type](node) : null;
        FROM_MOZ_STACK.pop();
        return ret;
    }

    AST_Node.from_mozilla_ast = function(node) {
        var save_stack = FROM_MOZ_STACK;
        FROM_MOZ_STACK = [];
        var ast = from_moz(node);
        FROM_MOZ_STACK = save_stack;
        return ast;
    };

    function set_moz_loc(mynode, moznode) {
        var start = mynode.start;
        var end = mynode.end;
        if (!(start && end)) {
            return moznode;
        }
        if (start.pos != null && end.endpos != null) {
            moznode.range = [start.pos, end.endpos];
        }
        if (start.line) {
            moznode.loc = {
                start: {line: start.line, column: start.col},
                end: end.endline ? {line: end.endline, column: end.endcol} : null
            };
            if (start.file) {
                moznode.loc.source = start.file;
            }
        }
        return moznode;
    }

    function def_to_moz(mytype, handler) {
        mytype.DEFMETHOD("to_mozilla_ast", function(parent) {
            return set_moz_loc(this, handler(this, parent));
        });
    }

    var TO_MOZ_STACK = null;

    function to_moz(node) {
        if (TO_MOZ_STACK === null) { TO_MOZ_STACK = []; }
        TO_MOZ_STACK.push(node);
        var ast = node != null ? node.to_mozilla_ast(TO_MOZ_STACK[TO_MOZ_STACK.length - 2]) : null;
        TO_MOZ_STACK.pop();
        if (TO_MOZ_STACK.length === 0) { TO_MOZ_STACK = null; }
        return ast;
    }

    function to_moz_in_destructuring() {
        var i = TO_MOZ_STACK.length;
        while (i--) {
            if (TO_MOZ_STACK[i] instanceof AST_Destructuring) {
                return true;
            }
        }
        return false;
    }

    function to_moz_block(node) {
        return {
            type: "BlockStatement",
            body: node.body.map(to_moz)
        };
    }

    function to_moz_scope(type, node) {
        var body = node.body.map(to_moz);
        if (node.body[0] instanceof AST_SimpleStatement && node.body[0].body instanceof AST_String) {
            body.unshift(to_moz(new AST_EmptyStatement(node.body[0])));
        }
        return {
            type: type,
            body: body
        };
    }
})();
