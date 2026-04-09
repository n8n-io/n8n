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

function DEFNODE(type, props, methods, base) {
    if (typeof base === "undefined") base = AST_Node;
    props = props ? props.split(/\s+/) : [];
    var self_props = props;
    if (base && base.PROPS) props = props.concat(base.PROPS);
    var code = [
        "return function AST_", type, "(props){",
        // not essential, but speeds up compress by a few percent
        "this._bits=0;",
        "if(props){",
    ];
    props.forEach(function(prop) {
        code.push("this.", prop, "=props.", prop, ";");
    });
    code.push("}");
    var proto = Object.create(base && base.prototype);
    if (methods.initialize || proto.initialize) code.push("this.initialize();");
    code.push("};");
    var ctor = new Function(code.join(""))();
    ctor.prototype = proto;
    ctor.prototype.CTOR = ctor;
    ctor.prototype.TYPE = ctor.TYPE = type;
    if (base) {
        ctor.BASE = base;
        base.SUBCLASSES.push(ctor);
    }
    ctor.DEFMETHOD = function(name, method) {
        this.prototype[name] = method;
    };
    ctor.PROPS = props;
    ctor.SELF_PROPS = self_props;
    ctor.SUBCLASSES = [];
    for (var name in methods) if (HOP(methods, name)) {
        if (/^\$/.test(name)) {
            ctor[name.substr(1)] = methods[name];
        } else {
            ctor.DEFMETHOD(name, methods[name]);
        }
    }
    if (typeof exports !== "undefined") exports["AST_" + type] = ctor;
    return ctor;
}

var AST_Token = DEFNODE("Token", "type value line col pos endline endcol endpos nlb comments_before comments_after file raw", {
}, null);

var AST_Node = DEFNODE("Node", "start end", {
    _clone: function(deep) {
        if (deep) {
            var self = this.clone();
            return self.transform(new TreeTransformer(function(node) {
                if (node !== self) {
                    return node.clone(true);
                }
            }));
        }
        return new this.CTOR(this);
    },
    clone: function(deep) {
        return this._clone(deep);
    },
    $documentation: "Base class of all AST nodes",
    $propdoc: {
        start: "[AST_Token] The first token of this node",
        end: "[AST_Token] The last token of this node"
    },
    equals: function(node) {
        return this.TYPE == node.TYPE && this._equals(node);
    },
    walk: function(visitor) {
        visitor.visit(this);
    },
    _validate: function() {
        if (this.TYPE == "Node") throw new Error("should not instantiate AST_Node");
    },
    validate: function() {
        var ctor = this.CTOR;
        do {
            ctor.prototype._validate.call(this);
        } while (ctor = ctor.BASE);
    },
    validate_ast: function() {
        var marker = {};
        this.walk(new TreeWalker(function(node) {
            if (node.validate_visited === marker) {
                throw new Error(string_template("cannot reuse AST_{TYPE} from [{start}]", node));
            }
            node.validate_visited = marker;
        }));
    },
}, null);

DEF_BITPROPS(AST_Node, [
    // AST_Node
    "_optimized",
    "_squeezed",
    // AST_Call
    "call_only",
    // AST_Lambda
    "collapse_scanning",
    // AST_SymbolRef
    "defined",
    "evaluating",
    "falsy",
    // AST_SymbolRef
    "in_arg",
    // AST_Return
    "in_bool",
    // AST_SymbolRef
    "is_undefined",
    // AST_LambdaExpression
    // AST_LambdaDefinition
    "inlined",
    // AST_Lambda
    "length_read",
    // AST_Yield
    "nested",
    // AST_Lambda
    "new",
    // AST_Call
    // AST_PropAccess
    "optional",
    // AST_ClassProperty
    "private",
    // AST_Call
    "pure",
    // AST_Node
    "single_use",
    // AST_ClassProperty
    "static",
    // AST_Call
    // AST_PropAccess
    "terminal",
    "truthy",
    // AST_Scope
    "uses_eval",
    // AST_Scope
    "uses_with",
]);

(AST_Node.log_function = function(fn, verbose) {
    if (typeof fn != "function") {
        AST_Node.info = AST_Node.warn = noop;
        return;
    }
    var printed = Object.create(null);
    AST_Node.info = verbose ? function(text, props) {
        log("INFO: " + string_template(text, props));
    } : noop;
    AST_Node.warn = function(text, props) {
        log("WARN: " + string_template(text, props));
    };

    function log(msg) {
        if (printed[msg]) return;
        printed[msg] = true;
        fn(msg);
    }
})();

var restore_transforms = [];
AST_Node.enable_validation = function() {
    AST_Node.disable_validation();
    (function validate_transform(ctor) {
        ctor.SUBCLASSES.forEach(validate_transform);
        if (!HOP(ctor.prototype, "transform")) return;
        var transform = ctor.prototype.transform;
        ctor.prototype.transform = function(tw, in_list) {
            var node = transform.call(this, tw, in_list);
            if (node instanceof AST_Node) {
                node.validate();
            } else if (!(node === null || in_list && List.is_op(node))) {
                throw new Error("invalid transformed value: " + node);
            }
            return node;
        };
        restore_transforms.push(function() {
            ctor.prototype.transform = transform;
        });
    })(this);
};

AST_Node.disable_validation = function() {
    var restore;
    while (restore = restore_transforms.pop()) restore();
};

function all_equals(k, l) {
    return k.length == l.length && all(k, function(m, i) {
        return m.equals(l[i]);
    });
}

function list_equals(s, t) {
    return s.length == t.length && all(s, function(u, i) {
        return u == t[i];
    });
}

function prop_equals(u, v) {
    if (u === v) return true;
    if (u == null) return v == null;
    return u instanceof AST_Node && v instanceof AST_Node && u.equals(v);
}

/* -----[ statements ]----- */

var AST_Statement = DEFNODE("Statement", null, {
    $documentation: "Base class of all statements",
    _validate: function() {
        if (this.TYPE == "Statement") throw new Error("should not instantiate AST_Statement");
    },
});

var AST_Debugger = DEFNODE("Debugger", null, {
    $documentation: "Represents a debugger statement",
    _equals: return_true,
}, AST_Statement);

var AST_Directive = DEFNODE("Directive", "quote value", {
    $documentation: "Represents a directive, like \"use strict\";",
    $propdoc: {
        quote: "[string?] the original quote character",
        value: "[string] The value of this directive as a plain string (it's not an AST_String!)",
    },
    _equals: function(node) {
        return this.value == node.value;
    },
    _validate: function() {
        if (this.quote != null) {
            if (typeof this.quote != "string") throw new Error("quote must be string");
            if (!/^["']$/.test(this.quote)) throw new Error("invalid quote: " + this.quote);
        }
        if (typeof this.value != "string") throw new Error("value must be string");
    },
}, AST_Statement);

var AST_EmptyStatement = DEFNODE("EmptyStatement", null, {
    $documentation: "The empty statement (empty block or simply a semicolon)",
    _equals: return_true,
}, AST_Statement);

function is_statement(node) {
    return node instanceof AST_Statement
        && !(node instanceof AST_ClassExpression)
        && !(node instanceof AST_LambdaExpression);
}

function validate_expression(value, prop, multiple, allow_spread, allow_hole) {
    multiple = multiple ? "contain" : "be";
    if (!(value instanceof AST_Node)) throw new Error(prop + " must " + multiple + " AST_Node");
    if (value instanceof AST_DefaultValue) throw new Error(prop + " cannot " + multiple + " AST_DefaultValue");
    if (value instanceof AST_Destructured) throw new Error(prop + " cannot " + multiple + " AST_Destructured");
    if (value instanceof AST_Hole && !allow_hole) throw new Error(prop + " cannot " + multiple + " AST_Hole");
    if (value instanceof AST_Spread && !allow_spread) throw new Error(prop + " cannot " + multiple + " AST_Spread");
    if (is_statement(value)) throw new Error(prop + " cannot " + multiple + " AST_Statement");
    if (value instanceof AST_SymbolDeclaration) {
        throw new Error(prop + " cannot " + multiple + " AST_SymbolDeclaration");
    }
}

function must_be_expression(node, prop) {
    validate_expression(node[prop], prop);
}

var AST_SimpleStatement = DEFNODE("SimpleStatement", "body", {
    $documentation: "A statement consisting of an expression, i.e. a = 1 + 2",
    $propdoc: {
        body: "[AST_Node] an expression node (should not be instanceof AST_Statement)",
    },
    _equals: function(node) {
        return this.body.equals(node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.body.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "body");
    },
}, AST_Statement);

var AST_BlockScope = DEFNODE("BlockScope", "_var_names enclosed functions make_def parent_scope variables", {
    $documentation: "Base class for all statements introducing a lexical scope",
    $propdoc: {
        enclosed: "[SymbolDef*/S] a list of all symbol definitions that are accessed from this scope or any inner scopes",
        functions: "[Dictionary/S] like `variables`, but only lists function declarations",
        parent_scope: "[AST_Scope?/S] link to the parent scope",
        variables: "[Dictionary/S] a map of name ---> SymbolDef for all variables/functions defined in this scope",
    },
    clone: function(deep) {
        var node = this._clone(deep);
        if (this.enclosed) node.enclosed = this.enclosed.slice();
        if (this.functions) node.functions = this.functions.clone();
        if (this.variables) node.variables = this.variables.clone();
        return node;
    },
    pinned: function() {
        return this.resolve().pinned();
    },
    resolve: function() {
        return this.parent_scope.resolve();
    },
    _validate: function() {
        if (this.TYPE == "BlockScope") throw new Error("should not instantiate AST_BlockScope");
        if (this.parent_scope == null) return;
        if (!(this.parent_scope instanceof AST_BlockScope)) throw new Error("parent_scope must be AST_BlockScope");
        if (!(this.resolve() instanceof AST_Scope)) throw new Error("must be contained within AST_Scope");
    },
}, AST_Statement);

function walk_body(node, visitor) {
    node.body.forEach(function(node) {
        node.walk(visitor);
    });
}

var AST_Block = DEFNODE("Block", "body", {
    $documentation: "A body of statements (usually braced)",
    $propdoc: {
        body: "[AST_Statement*] an array of statements"
    },
    _equals: function(node) {
        return all_equals(this.body, node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            walk_body(node, visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "Block") throw new Error("should not instantiate AST_Block");
        this.body.forEach(function(node) {
            if (!is_statement(node)) throw new Error("body must contain AST_Statement");
        });
    },
}, AST_BlockScope);

var AST_BlockStatement = DEFNODE("BlockStatement", null, {
    $documentation: "A block statement",
}, AST_Block);

var AST_StatementWithBody = DEFNODE("StatementWithBody", "body", {
    $documentation: "Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`",
    $propdoc: {
        body: "[AST_Statement] the body; this should always be present, even if it's an AST_EmptyStatement"
    },
    _validate: function() {
        if (this.TYPE == "StatementWithBody") throw new Error("should not instantiate AST_StatementWithBody");
        if (!is_statement(this.body)) throw new Error("body must be AST_Statement");
    },
}, AST_BlockScope);

var AST_LabeledStatement = DEFNODE("LabeledStatement", "label", {
    $documentation: "Statement with a label",
    $propdoc: {
        label: "[AST_Label] a label definition"
    },
    _equals: function(node) {
        return this.label.equals(node.label)
            && this.body.equals(node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.label.walk(visitor);
            node.body.walk(visitor);
        });
    },
    clone: function(deep) {
        var node = this._clone(deep);
        if (deep) {
            var label = node.label;
            var def = this.label;
            node.walk(new TreeWalker(function(node) {
                if (node instanceof AST_LoopControl) {
                    if (!node.label || node.label.thedef !== def) return;
                    node.label.thedef = label;
                    label.references.push(node);
                    return true;
                }
                if (node instanceof AST_Scope) return true;
            }));
        }
        return node;
    },
    _validate: function() {
        if (!(this.label instanceof AST_Label)) throw new Error("label must be AST_Label");
    },
}, AST_StatementWithBody);

var AST_IterationStatement = DEFNODE("IterationStatement", null, {
    $documentation: "Internal class.  All loops inherit from it.",
    _validate: function() {
        if (this.TYPE == "IterationStatement") throw new Error("should not instantiate AST_IterationStatement");
    },
}, AST_StatementWithBody);

var AST_DWLoop = DEFNODE("DWLoop", "condition", {
    $documentation: "Base class for do/while statements",
    $propdoc: {
        condition: "[AST_Node] the loop condition.  Should not be instanceof AST_Statement"
    },
    _equals: function(node) {
        return this.body.equals(node.body)
            && this.condition.equals(node.condition);
    },
    _validate: function() {
        if (this.TYPE == "DWLoop") throw new Error("should not instantiate AST_DWLoop");
        must_be_expression(this, "condition");
    },
}, AST_IterationStatement);

var AST_Do = DEFNODE("Do", null, {
    $documentation: "A `do` statement",
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.body.walk(visitor);
            node.condition.walk(visitor);
        });
    },
}, AST_DWLoop);

var AST_While = DEFNODE("While", null, {
    $documentation: "A `while` statement",
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.condition.walk(visitor);
            node.body.walk(visitor);
        });
    },
}, AST_DWLoop);

var AST_For = DEFNODE("For", "init condition step", {
    $documentation: "A `for` statement",
    $propdoc: {
        init: "[AST_Node?] the `for` initialization code, or null if empty",
        condition: "[AST_Node?] the `for` termination clause, or null if empty",
        step: "[AST_Node?] the `for` update clause, or null if empty"
    },
    _equals: function(node) {
        return prop_equals(this.init, node.init)
            && prop_equals(this.condition, node.condition)
            && prop_equals(this.step, node.step)
            && this.body.equals(node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.init) node.init.walk(visitor);
            if (node.condition) node.condition.walk(visitor);
            if (node.step) node.step.walk(visitor);
            node.body.walk(visitor);
        });
    },
    _validate: function() {
        if (this.init != null) {
            if (!(this.init instanceof AST_Node)) throw new Error("init must be AST_Node");
            if (is_statement(this.init) && !(this.init instanceof AST_Definitions)) {
                throw new Error("init cannot be AST_Statement");
            }
        }
        if (this.condition != null) must_be_expression(this, "condition");
        if (this.step != null) must_be_expression(this, "step");
    },
}, AST_IterationStatement);

var AST_ForEnumeration = DEFNODE("ForEnumeration", "init object", {
    $documentation: "Base class for enumeration loops, i.e. `for ... in`, `for ... of` & `for await ... of`",
    $propdoc: {
        init: "[AST_Node] the assignment target during iteration",
        object: "[AST_Node] the object to iterate over"
    },
    _equals: function(node) {
        return this.init.equals(node.init)
            && this.object.equals(node.object)
            && this.body.equals(node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.init.walk(visitor);
            node.object.walk(visitor);
            node.body.walk(visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "ForEnumeration") throw new Error("should not instantiate AST_ForEnumeration");
        if (this.init instanceof AST_Definitions) {
            if (this.init.definitions.length != 1) throw new Error("init must have single declaration");
        } else {
            validate_destructured(this.init, function(node) {
                if (!(node instanceof AST_PropAccess || node instanceof AST_SymbolRef)) {
                    throw new Error("init must be assignable: " + node.TYPE);
                }
            });
        }
        must_be_expression(this, "object");
    },
}, AST_IterationStatement);

var AST_ForIn = DEFNODE("ForIn", null, {
    $documentation: "A `for ... in` statement",
}, AST_ForEnumeration);

var AST_ForOf = DEFNODE("ForOf", null, {
    $documentation: "A `for ... of` statement",
}, AST_ForEnumeration);

var AST_ForAwaitOf = DEFNODE("ForAwaitOf", null, {
    $documentation: "A `for await ... of` statement",
}, AST_ForOf);

var AST_With = DEFNODE("With", "expression", {
    $documentation: "A `with` statement",
    $propdoc: {
        expression: "[AST_Node] the `with` expression"
    },
    _equals: function(node) {
        return this.expression.equals(node.expression)
            && this.body.equals(node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
            node.body.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "expression");
    },
}, AST_StatementWithBody);

/* -----[ scope and functions ]----- */

var AST_Scope = DEFNODE("Scope", "fn_defs may_call_this uses_eval uses_with", {
    $documentation: "Base class for all statements introducing a lambda scope",
    $propdoc: {
        uses_eval: "[boolean/S] tells whether this scope contains a direct call to the global `eval`",
        uses_with: "[boolean/S] tells whether this scope uses the `with` statement",
    },
    pinned: function() {
        return this.uses_eval || this.uses_with;
    },
    resolve: return_this,
    _validate: function() {
        if (this.TYPE == "Scope") throw new Error("should not instantiate AST_Scope");
    },
}, AST_Block);

var AST_Toplevel = DEFNODE("Toplevel", "globals", {
    $documentation: "The toplevel scope",
    $propdoc: {
        globals: "[Dictionary/S] a map of name ---> SymbolDef for all undeclared names",
    },
    wrap: function(name) {
        var body = this.body;
        return parse([
            "(function(exports){'$ORIG';})(typeof ",
            name,
            "=='undefined'?(",
            name,
            "={}):",
            name,
            ");"
        ].join(""), {
            filename: "wrap=" + JSON.stringify(name)
        }).transform(new TreeTransformer(function(node) {
            if (node instanceof AST_Directive && node.value == "$ORIG") {
                return List.splice(body);
            }
        }));
    },
    enclose: function(args_values) {
        if (typeof args_values != "string") args_values = "";
        var index = args_values.indexOf(":");
        if (index < 0) index = args_values.length;
        var body = this.body;
        return parse([
            "(function(",
            args_values.slice(0, index),
            '){"$ORIG"})(',
            args_values.slice(index + 1),
            ")"
        ].join(""), {
            filename: "enclose=" + JSON.stringify(args_values)
        }).transform(new TreeTransformer(function(node) {
            if (node instanceof AST_Directive && node.value == "$ORIG") {
                return List.splice(body);
            }
        }));
    }
}, AST_Scope);

var AST_ClassInitBlock = DEFNODE("ClassInitBlock", null, {
    $documentation: "Value for `class` static initialization blocks",
}, AST_Scope);

var AST_Lambda = DEFNODE("Lambda", "argnames length_read rest safe_ids uses_arguments", {
    $documentation: "Base class for functions",
    $propdoc: {
        argnames: "[(AST_DefaultValue|AST_Destructured|AST_SymbolFunarg)*] array of function arguments and/or destructured literals",
        length_read: "[boolean/S] whether length property of this function is accessed",
        rest: "[(AST_Destructured|AST_SymbolFunarg)?] rest parameter, or null if absent",
        uses_arguments: "[boolean|number/S] whether this function accesses the arguments array",
    },
    each_argname: function(visit) {
        var tw = new TreeWalker(function(node) {
            if (node instanceof AST_DefaultValue) {
                node.name.walk(tw);
                return true;
            }
            if (node instanceof AST_DestructuredKeyVal) {
                node.value.walk(tw);
                return true;
            }
            if (node instanceof AST_SymbolFunarg) visit(node);
        });
        this.argnames.forEach(function(argname) {
            argname.walk(tw);
        });
        if (this.rest) this.rest.walk(tw);
    },
    _equals: function(node) {
        return prop_equals(this.rest, node.rest)
            && prop_equals(this.name, node.name)
            && prop_equals(this.value, node.value)
            && all_equals(this.argnames, node.argnames)
            && all_equals(this.body, node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.name) node.name.walk(visitor);
            node.argnames.forEach(function(argname) {
                argname.walk(visitor);
            });
            if (node.rest) node.rest.walk(visitor);
            walk_body(node, visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "Lambda") throw new Error("should not instantiate AST_Lambda");
        this.argnames.forEach(function(node) {
            validate_destructured(node, function(node) {
                if (!(node instanceof AST_SymbolFunarg)) throw new Error("argnames must be AST_SymbolFunarg[]");
            }, true);
        });
        if (this.rest != null) validate_destructured(this.rest, function(node) {
            if (!(node instanceof AST_SymbolFunarg)) throw new Error("rest must be AST_SymbolFunarg");
        });
    },
}, AST_Scope);

var AST_Accessor = DEFNODE("Accessor", null, {
    $documentation: "A getter/setter function",
    _validate: function() {
        if (this.name != null) throw new Error("name must be null");
    },
}, AST_Lambda);

var AST_LambdaExpression = DEFNODE("LambdaExpression", "inlined", {
    $documentation: "Base class for function expressions",
    $propdoc: {
        inlined: "[boolean/S] whether this function has been inlined",
    },
    _validate: function() {
        if (this.TYPE == "LambdaExpression") throw new Error("should not instantiate AST_LambdaExpression");
    },
}, AST_Lambda);

function is_arrow(node) {
    return node instanceof AST_Arrow || node instanceof AST_AsyncArrow;
}

function is_async(node) {
    return node instanceof AST_AsyncArrow
        || node instanceof AST_AsyncDefun
        || node instanceof AST_AsyncFunction
        || node instanceof AST_AsyncGeneratorDefun
        || node instanceof AST_AsyncGeneratorFunction;
}

function is_generator(node) {
    return node instanceof AST_AsyncGeneratorDefun
        || node instanceof AST_AsyncGeneratorFunction
        || node instanceof AST_GeneratorDefun
        || node instanceof AST_GeneratorFunction;
}

function walk_lambda(node, tw) {
    if (is_arrow(node) && node.value) {
        node.value.walk(tw);
    } else {
        walk_body(node, tw);
    }
}

var AST_Arrow = DEFNODE("Arrow", "value", {
    $documentation: "An arrow function expression",
    $propdoc: {
        value: "[AST_Node?] simple return expression, or null if using function body.",
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.argnames.forEach(function(argname) {
                argname.walk(visitor);
            });
            if (node.rest) node.rest.walk(visitor);
            if (node.value) {
                node.value.walk(visitor);
            } else {
                walk_body(node, visitor);
            }
        });
    },
    _validate: function() {
        if (this.name != null) throw new Error("name must be null");
        if (this.uses_arguments) throw new Error("uses_arguments must be false");
        if (this.value != null) {
            must_be_expression(this, "value");
            if (this.body.length) throw new Error("body must be empty if value exists");
        }
    },
}, AST_LambdaExpression);

var AST_AsyncArrow = DEFNODE("AsyncArrow", "value", {
    $documentation: "An asynchronous arrow function expression",
    $propdoc: {
        value: "[AST_Node?] simple return expression, or null if using function body.",
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.argnames.forEach(function(argname) {
                argname.walk(visitor);
            });
            if (node.rest) node.rest.walk(visitor);
            if (node.value) {
                node.value.walk(visitor);
            } else {
                walk_body(node, visitor);
            }
        });
    },
    _validate: function() {
        if (this.name != null) throw new Error("name must be null");
        if (this.uses_arguments) throw new Error("uses_arguments must be false");
        if (this.value != null) {
            must_be_expression(this, "value");
            if (this.body.length) throw new Error("body must be empty if value exists");
        }
    },
}, AST_LambdaExpression);

var AST_AsyncFunction = DEFNODE("AsyncFunction", "name", {
    $documentation: "An asynchronous function expression",
    $propdoc: {
        name: "[AST_SymbolLambda?] the name of this function, or null if not specified",
    },
    _validate: function() {
        if (this.name != null) {
            if (!(this.name instanceof AST_SymbolLambda)) throw new Error("name must be AST_SymbolLambda");
        }
    },
}, AST_LambdaExpression);

var AST_AsyncGeneratorFunction = DEFNODE("AsyncGeneratorFunction", "name", {
    $documentation: "An asynchronous generator function expression",
    $propdoc: {
        name: "[AST_SymbolLambda?] the name of this function, or null if not specified",
    },
    _validate: function() {
        if (this.name != null) {
            if (!(this.name instanceof AST_SymbolLambda)) throw new Error("name must be AST_SymbolLambda");
        }
    },
}, AST_LambdaExpression);

var AST_Function = DEFNODE("Function", "name", {
    $documentation: "A function expression",
    $propdoc: {
        name: "[AST_SymbolLambda?] the name of this function, or null if not specified",
    },
    _validate: function() {
        if (this.name != null) {
            if (!(this.name instanceof AST_SymbolLambda)) throw new Error("name must be AST_SymbolLambda");
        }
    },
}, AST_LambdaExpression);

var AST_GeneratorFunction = DEFNODE("GeneratorFunction", "name", {
    $documentation: "A generator function expression",
    $propdoc: {
        name: "[AST_SymbolLambda?] the name of this function, or null if not specified",
    },
    _validate: function() {
        if (this.name != null) {
            if (!(this.name instanceof AST_SymbolLambda)) throw new Error("name must be AST_SymbolLambda");
        }
    },
}, AST_LambdaExpression);

var AST_LambdaDefinition = DEFNODE("LambdaDefinition", "inlined name", {
    $documentation: "Base class for function definitions",
    $propdoc: {
        inlined: "[boolean/S] whether this function has been inlined",
        name: "[AST_SymbolDefun] the name of this function",
    },
    _validate: function() {
        if (this.TYPE == "LambdaDefinition") throw new Error("should not instantiate AST_LambdaDefinition");
        if (!(this.name instanceof AST_SymbolDefun)) throw new Error("name must be AST_SymbolDefun");
    },
}, AST_Lambda);

var AST_AsyncDefun = DEFNODE("AsyncDefun", null, {
    $documentation: "An asynchronous function definition",
}, AST_LambdaDefinition);

var AST_AsyncGeneratorDefun = DEFNODE("AsyncGeneratorDefun", null, {
    $documentation: "An asynchronous generator function definition",
}, AST_LambdaDefinition);

var AST_Defun = DEFNODE("Defun", null, {
    $documentation: "A function definition",
}, AST_LambdaDefinition);

var AST_GeneratorDefun = DEFNODE("GeneratorDefun", null, {
    $documentation: "A generator function definition",
}, AST_LambdaDefinition);

/* -----[ classes ]----- */

var AST_Class = DEFNODE("Class", "extends name properties", {
    $documentation: "Base class for class literals",
    $propdoc: {
        extends: "[AST_Node?] the super class, or null if not specified",
        properties: "[AST_ClassProperty*] array of class properties",
    },
    _equals: function(node) {
        return prop_equals(this.name, node.name)
            && prop_equals(this.extends, node.extends)
            && all_equals(this.properties, node.properties);
    },
    resolve: function(def_class) {
        return def_class ? this : this.parent_scope.resolve();
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.name) node.name.walk(visitor);
            if (node.extends) node.extends.walk(visitor);
            node.properties.forEach(function(prop) {
                prop.walk(visitor);
            });
        });
    },
    _validate: function() {
        if (this.TYPE == "Class") throw new Error("should not instantiate AST_Class");
        if (this.extends != null) must_be_expression(this, "extends");
        this.properties.forEach(function(node) {
            if (!(node instanceof AST_ClassProperty)) throw new Error("properties must contain AST_ClassProperty");
        });
    },
}, AST_BlockScope);

var AST_DefClass = DEFNODE("DefClass", null, {
    $documentation: "A class definition",
    $propdoc: {
        name: "[AST_SymbolDefClass] the name of this class",
    },
    _validate: function() {
        if (!(this.name instanceof AST_SymbolDefClass)) throw new Error("name must be AST_SymbolDefClass");
    },
}, AST_Class);

var AST_ClassExpression = DEFNODE("ClassExpression", null, {
    $documentation: "A class expression",
    $propdoc: {
        name: "[AST_SymbolClass?] the name of this class, or null if not specified",
    },
    _validate: function() {
        if (this.name != null) {
            if (!(this.name instanceof AST_SymbolClass)) throw new Error("name must be AST_SymbolClass");
        }
    },
}, AST_Class);

var AST_ClassProperty = DEFNODE("ClassProperty", "key private static value", {
    $documentation: "Base class for `class` properties",
    $propdoc: {
        key: "[string|AST_Node?] property name (AST_Node for computed property, null for initialization block)",
        private: "[boolean] whether this is a private property",
        static: "[boolean] whether this is a static property",
        value: "[AST_Node?] property value (AST_Accessor for getters/setters, AST_LambdaExpression for methods, null if not specified for fields)",
    },
    _equals: function(node) {
        return !this.private == !node.private
            && !this.static == !node.static
            && prop_equals(this.key, node.key)
            && prop_equals(this.value, node.value);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.key instanceof AST_Node) node.key.walk(visitor);
            if (node.value) node.value.walk(visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "ClassProperty") throw new Error("should not instantiate AST_ClassProperty");
        if (this instanceof AST_ClassInit) {
            if (this.key != null) throw new Error("key must be null");
        } else if (typeof this.key != "string") {
            if (!(this.key instanceof AST_Node)) throw new Error("key must be string or AST_Node");
            if (this.private) throw new Error("computed key cannot be private");
            must_be_expression(this, "key");
        } else if (this.private) {
            if (!/^#/.test(this.key)) throw new Error("private key must prefix with #");
        }
        if (this.value != null) {
            if (!(this.value instanceof AST_Node)) throw new Error("value must be AST_Node");
        }
    },
});

var AST_ClassField = DEFNODE("ClassField", null, {
    $documentation: "A `class` field",
    _validate: function() {
        if (this.value != null) must_be_expression(this, "value");
    },
}, AST_ClassProperty);

var AST_ClassGetter = DEFNODE("ClassGetter", null, {
    $documentation: "A `class` getter",
    _validate: function() {
        if (!(this.value instanceof AST_Accessor)) throw new Error("value must be AST_Accessor");
    },
}, AST_ClassProperty);

var AST_ClassSetter = DEFNODE("ClassSetter", null, {
    $documentation: "A `class` setter",
    _validate: function() {
        if (!(this.value instanceof AST_Accessor)) throw new Error("value must be AST_Accessor");
    },
}, AST_ClassProperty);

var AST_ClassMethod = DEFNODE("ClassMethod", null, {
    $documentation: "A `class` method",
    _validate: function() {
        if (!(this.value instanceof AST_LambdaExpression)) throw new Error("value must be AST_LambdaExpression");
        if (is_arrow(this.value)) throw new Error("value cannot be AST_Arrow or AST_AsyncArrow");
        if (this.value.name != null) throw new Error("name of class method's lambda must be null");
    },
}, AST_ClassProperty);

var AST_ClassInit = DEFNODE("ClassInit", null, {
    $documentation: "A `class` static initialization block",
    _validate: function() {
        if (!this.static) throw new Error("static must be true");
        if (!(this.value instanceof AST_ClassInitBlock)) throw new Error("value must be AST_ClassInitBlock");
    },
    initialize: function() {
        this.static = true;
    },
}, AST_ClassProperty);

/* -----[ JUMPS ]----- */

var AST_Jump = DEFNODE("Jump", null, {
    $documentation: "Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)",
    _validate: function() {
        if (this.TYPE == "Jump") throw new Error("should not instantiate AST_Jump");
    },
}, AST_Statement);

var AST_Exit = DEFNODE("Exit", "value", {
    $documentation: "Base class for “exits” (`return` and `throw`)",
    $propdoc: {
        value: "[AST_Node?] the value returned or thrown by this statement; could be null for AST_Return"
    },
    _equals: function(node) {
        return prop_equals(this.value, node.value);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.value) node.value.walk(visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "Exit") throw new Error("should not instantiate AST_Exit");
    },
}, AST_Jump);

var AST_Return = DEFNODE("Return", null, {
    $documentation: "A `return` statement",
    _validate: function() {
        if (this.value != null) must_be_expression(this, "value");
    },
}, AST_Exit);

var AST_Throw = DEFNODE("Throw", null, {
    $documentation: "A `throw` statement",
    _validate: function() {
        must_be_expression(this, "value");
    },
}, AST_Exit);

var AST_LoopControl = DEFNODE("LoopControl", "label", {
    $documentation: "Base class for loop control statements (`break` and `continue`)",
    $propdoc: {
        label: "[AST_LabelRef?] the label, or null if none",
    },
    _equals: function(node) {
        return prop_equals(this.label, node.label);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.label) node.label.walk(visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "LoopControl") throw new Error("should not instantiate AST_LoopControl");
        if (this.label != null) {
            if (!(this.label instanceof AST_LabelRef)) throw new Error("label must be AST_LabelRef");
        }
    },
}, AST_Jump);

var AST_Break = DEFNODE("Break", null, {
    $documentation: "A `break` statement"
}, AST_LoopControl);

var AST_Continue = DEFNODE("Continue", null, {
    $documentation: "A `continue` statement"
}, AST_LoopControl);

/* -----[ IF ]----- */

var AST_If = DEFNODE("If", "condition alternative", {
    $documentation: "A `if` statement",
    $propdoc: {
        condition: "[AST_Node] the `if` condition",
        alternative: "[AST_Statement?] the `else` part, or null if not present"
    },
    _equals: function(node) {
        return this.body.equals(node.body)
            && this.condition.equals(node.condition)
            && prop_equals(this.alternative, node.alternative);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.condition.walk(visitor);
            node.body.walk(visitor);
            if (node.alternative) node.alternative.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "condition");
        if (this.alternative != null) {
            if (!is_statement(this.alternative)) throw new Error("alternative must be AST_Statement");
        }
    },
}, AST_StatementWithBody);

/* -----[ SWITCH ]----- */

var AST_Switch = DEFNODE("Switch", "expression", {
    $documentation: "A `switch` statement",
    $propdoc: {
        expression: "[AST_Node] the `switch` “discriminant”"
    },
    _equals: function(node) {
        return this.expression.equals(node.expression)
            && all_equals(this.body, node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
            walk_body(node, visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "expression");
        this.body.forEach(function(node) {
            if (!(node instanceof AST_SwitchBranch)) throw new Error("body must be AST_SwitchBranch[]");
        });
    },
}, AST_Block);

var AST_SwitchBranch = DEFNODE("SwitchBranch", null, {
    $documentation: "Base class for `switch` branches",
    _validate: function() {
        if (this.TYPE == "SwitchBranch") throw new Error("should not instantiate AST_SwitchBranch");
    },
}, AST_Block);

var AST_Default = DEFNODE("Default", null, {
    $documentation: "A `default` switch branch",
}, AST_SwitchBranch);

var AST_Case = DEFNODE("Case", "expression", {
    $documentation: "A `case` switch branch",
    $propdoc: {
        expression: "[AST_Node] the `case` expression"
    },
    _equals: function(node) {
        return this.expression.equals(node.expression)
            && all_equals(this.body, node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
            walk_body(node, visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "expression");
    },
}, AST_SwitchBranch);

/* -----[ EXCEPTIONS ]----- */

var AST_Try = DEFNODE("Try", "bcatch bfinally", {
    $documentation: "A `try` statement",
    $propdoc: {
        bcatch: "[AST_Catch?] the catch block, or null if not present",
        bfinally: "[AST_Finally?] the finally block, or null if not present"
    },
    _equals: function(node) {
        return all_equals(this.body, node.body)
            && prop_equals(this.bcatch, node.bcatch)
            && prop_equals(this.bfinally, node.bfinally);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            walk_body(node, visitor);
            if (node.bcatch) node.bcatch.walk(visitor);
            if (node.bfinally) node.bfinally.walk(visitor);
        });
    },
    _validate: function() {
        if (this.bcatch != null) {
            if (!(this.bcatch instanceof AST_Catch)) throw new Error("bcatch must be AST_Catch");
        }
        if (this.bfinally != null) {
            if (!(this.bfinally instanceof AST_Finally)) throw new Error("bfinally must be AST_Finally");
        }
    },
}, AST_Block);

var AST_Catch = DEFNODE("Catch", "argname", {
    $documentation: "A `catch` node; only makes sense as part of a `try` statement",
    $propdoc: {
        argname: "[(AST_Destructured|AST_SymbolCatch)?] symbol for the exception, or null if not present",
    },
    _equals: function(node) {
        return prop_equals(this.argname, node.argname)
            && all_equals(this.body, node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.argname) node.argname.walk(visitor);
            walk_body(node, visitor);
        });
    },
    _validate: function() {
        if (this.argname != null) validate_destructured(this.argname, function(node) {
            if (!(node instanceof AST_SymbolCatch)) throw new Error("argname must be AST_SymbolCatch");
        });
    },
}, AST_Block);

var AST_Finally = DEFNODE("Finally", null, {
    $documentation: "A `finally` node; only makes sense as part of a `try` statement"
}, AST_Block);

/* -----[ VAR ]----- */

var AST_Definitions = DEFNODE("Definitions", "definitions", {
    $documentation: "Base class for `var` nodes (variable declarations/initializations)",
    $propdoc: {
        definitions: "[AST_VarDef*] array of variable definitions"
    },
    _equals: function(node) {
        return all_equals(this.definitions, node.definitions);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.definitions.forEach(function(defn) {
                defn.walk(visitor);
            });
        });
    },
    _validate: function() {
        if (this.TYPE == "Definitions") throw new Error("should not instantiate AST_Definitions");
        if (this.definitions.length < 1) throw new Error("must have at least one definition");
    },
}, AST_Statement);

var AST_Const = DEFNODE("Const", null, {
    $documentation: "A `const` statement",
    _validate: function() {
        this.definitions.forEach(function(node) {
            if (!(node instanceof AST_VarDef)) throw new Error("definitions must be AST_VarDef[]");
            validate_destructured(node.name, function(node) {
                if (!(node instanceof AST_SymbolConst)) throw new Error("name must be AST_SymbolConst");
            });
        });
    },
}, AST_Definitions);

var AST_Let = DEFNODE("Let", null, {
    $documentation: "A `let` statement",
    _validate: function() {
        this.definitions.forEach(function(node) {
            if (!(node instanceof AST_VarDef)) throw new Error("definitions must be AST_VarDef[]");
            validate_destructured(node.name, function(node) {
                if (!(node instanceof AST_SymbolLet)) throw new Error("name must be AST_SymbolLet");
            });
        });
    },
}, AST_Definitions);

var AST_Var = DEFNODE("Var", null, {
    $documentation: "A `var` statement",
    _validate: function() {
        this.definitions.forEach(function(node) {
            if (!(node instanceof AST_VarDef)) throw new Error("definitions must be AST_VarDef[]");
            validate_destructured(node.name, function(node) {
                if (!(node instanceof AST_SymbolVar)) throw new Error("name must be AST_SymbolVar");
            });
        });
    },
}, AST_Definitions);

var AST_VarDef = DEFNODE("VarDef", "name value", {
    $documentation: "A variable declaration; only appears in a AST_Definitions node",
    $propdoc: {
        name: "[AST_Destructured|AST_SymbolVar] name of the variable",
        value: "[AST_Node?] initializer, or null of there's no initializer",
    },
    _equals: function(node) {
        return this.name.equals(node.name)
            && prop_equals(this.value, node.value);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.name.walk(visitor);
            if (node.value) node.value.walk(visitor);
        });
    },
    _validate: function() {
        if (this.value != null) must_be_expression(this, "value");
    },
});

/* -----[ OTHER ]----- */

var AST_ExportDeclaration = DEFNODE("ExportDeclaration", "body", {
    $documentation: "An `export` statement",
    $propdoc: {
        body: "[AST_DefClass|AST_Definitions|AST_LambdaDefinition] the statement to export",
    },
    _equals: function(node) {
        return this.body.equals(node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.body.walk(visitor);
        });
    },
    _validate: function() {
        if (!(this.body instanceof AST_DefClass
            || this.body instanceof AST_Definitions
            || this.body instanceof AST_LambdaDefinition)) {
            throw new Error("body must be AST_DefClass, AST_Definitions or AST_LambdaDefinition");
        }
    },
}, AST_Statement);

var AST_ExportDefault = DEFNODE("ExportDefault", "body", {
    $documentation: "An `export default` statement",
    $propdoc: {
        body: "[AST_Node] the default export",
    },
    _equals: function(node) {
        return this.body.equals(node.body);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.body.walk(visitor);
        });
    },
    _validate: function() {
        if (!(this.body instanceof AST_DefClass || this.body instanceof AST_LambdaDefinition)) {
            must_be_expression(this, "body");
        }
    },
}, AST_Statement);

var AST_ExportForeign = DEFNODE("ExportForeign", "aliases keys path", {
    $documentation: "An `export ... from '...'` statement",
    $propdoc: {
        aliases: "[AST_String*] array of aliases to export",
        keys: "[AST_String*] array of keys to import",
        path: "[AST_String] the path to import module",
    },
    _equals: function(node) {
        return this.path.equals(node.path)
            && all_equals(this.aliases, node.aliases)
            && all_equals(this.keys, node.keys);
    },
    _validate: function() {
        if (this.aliases.length != this.keys.length) {
            throw new Error("aliases:key length mismatch: " + this.aliases.length + " != " + this.keys.length);
        }
        this.aliases.forEach(function(name) {
            if (!(name instanceof AST_String)) throw new Error("aliases must contain AST_String");
        });
        this.keys.forEach(function(name) {
            if (!(name instanceof AST_String)) throw new Error("keys must contain AST_String");
        });
        if (!(this.path instanceof AST_String)) throw new Error("path must be AST_String");
    },
}, AST_Statement);

var AST_ExportReferences = DEFNODE("ExportReferences", "properties", {
    $documentation: "An `export { ... }` statement",
    $propdoc: {
        properties: "[AST_SymbolExport*] array of aliases to export",
    },
    _equals: function(node) {
        return all_equals(this.properties, node.properties);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.properties.forEach(function(prop) {
                prop.walk(visitor);
            });
        });
    },
    _validate: function() {
        this.properties.forEach(function(prop) {
            if (!(prop instanceof AST_SymbolExport)) throw new Error("properties must contain AST_SymbolExport");
        });
    },
}, AST_Statement);

var AST_Import = DEFNODE("Import", "all default path properties", {
    $documentation: "An `import` statement",
    $propdoc: {
        all: "[AST_SymbolImport?] the imported namespace, or null if not specified",
        default: "[AST_SymbolImport?] the alias for default `export`, or null if not specified",
        path: "[AST_String] the path to import module",
        properties: "[(AST_SymbolImport*)?] array of aliases, or null if not specified",
    },
    _equals: function(node) {
        return this.path.equals(node.path)
            && prop_equals(this.all, node.all)
            && prop_equals(this.default, node.default)
            && !this.properties == !node.properties
            && (!this.properties || all_equals(this.properties, node.properties));
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.all) node.all.walk(visitor);
            if (node.default) node.default.walk(visitor);
            if (node.properties) node.properties.forEach(function(prop) {
                prop.walk(visitor);
            });
        });
    },
    _validate: function() {
        if (this.all != null) {
            if (!(this.all instanceof AST_SymbolImport)) throw new Error("all must be AST_SymbolImport");
            if (this.properties != null) throw new Error("cannot import both * and {} in the same statement");
        }
        if (this.default != null) {
            if (!(this.default instanceof AST_SymbolImport)) throw new Error("default must be AST_SymbolImport");
            if (this.default.key.value !== "") throw new Error("invalid default key: " + this.default.key.value);
        }
        if (!(this.path instanceof AST_String)) throw new Error("path must be AST_String");
        if (this.properties != null) this.properties.forEach(function(node) {
            if (!(node instanceof AST_SymbolImport)) throw new Error("properties must contain AST_SymbolImport");
        });
    },
}, AST_Statement);

var AST_DefaultValue = DEFNODE("DefaultValue", "name value", {
    $documentation: "A default value declaration",
    $propdoc: {
        name: "[AST_Destructured|AST_SymbolDeclaration] name of the variable",
        value: "[AST_Node] value to assign if variable is `undefined`",
    },
    _equals: function(node) {
        return this.name.equals(node.name)
            && this.value.equals(node.value);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.name.walk(visitor);
            node.value.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "value");
    },
});

function must_be_expressions(node, prop, allow_spread, allow_hole) {
    node[prop].forEach(function(node) {
        validate_expression(node, prop, true, allow_spread, allow_hole);
    });
}

var AST_Call = DEFNODE("Call", "args expression optional pure terminal", {
    $documentation: "A function call expression",
    $propdoc: {
        args: "[AST_Node*] array of arguments",
        expression: "[AST_Node] expression to invoke as function",
        optional: "[boolean] whether the expression is optional chaining",
        pure: "[boolean/S] marker for side-effect-free call expression",
        terminal: "[boolean] whether the chain has ended",
    },
    _equals: function(node) {
        return !this.optional == !node.optional
            && this.expression.equals(node.expression)
            && all_equals(this.args, node.args);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
            node.args.forEach(function(arg) {
                arg.walk(visitor);
            });
        });
    },
    _validate: function() {
        must_be_expression(this, "expression");
        must_be_expressions(this, "args", true);
    },
});

var AST_New = DEFNODE("New", null, {
    $documentation: "An object instantiation.  Derives from a function call since it has exactly the same properties",
    _validate: function() {
        if (this.optional) throw new Error("optional must be false");
        if (this.terminal) throw new Error("terminal must be false");
    },
}, AST_Call);

var AST_Sequence = DEFNODE("Sequence", "expressions", {
    $documentation: "A sequence expression (comma-separated expressions)",
    $propdoc: {
        expressions: "[AST_Node*] array of expressions (at least two)",
    },
    _equals: function(node) {
        return all_equals(this.expressions, node.expressions);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expressions.forEach(function(expr) {
                expr.walk(visitor);
            });
        });
    },
    _validate: function() {
        if (this.expressions.length < 2) throw new Error("expressions must contain multiple elements");
        must_be_expressions(this, "expressions");
    },
});

function root_expr(prop) {
    while (prop instanceof AST_PropAccess) prop = prop.expression;
    return prop;
}

var AST_PropAccess = DEFNODE("PropAccess", "expression optional property terminal", {
    $documentation: "Base class for property access expressions, i.e. `a.foo` or `a[\"foo\"]`",
    $propdoc: {
        expression: "[AST_Node] the “container” expression",
        optional: "[boolean] whether the expression is optional chaining",
        property: "[AST_Node|string] the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node",
        terminal: "[boolean] whether the chain has ended",
    },
    _equals: function(node) {
        return !this.optional == !node.optional
            && prop_equals(this.property, node.property)
            && this.expression.equals(node.expression);
    },
    get_property: function() {
        var p = this.property;
        if (p instanceof AST_Constant) return p.value;
        if (p instanceof AST_UnaryPrefix && p.operator == "void" && p.expression instanceof AST_Constant) return;
        return p;
    },
    _validate: function() {
        if (this.TYPE == "PropAccess") throw new Error("should not instantiate AST_PropAccess");
        must_be_expression(this, "expression");
    },
});

var AST_Dot = DEFNODE("Dot", "quoted", {
    $documentation: "A dotted property access expression",
    $propdoc: {
        quoted: "[boolean] whether property is transformed from a quoted string",
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
        });
    },
    _validate: function() {
        if (typeof this.property != "string") throw new Error("property must be string");
    },
}, AST_PropAccess);

var AST_Sub = DEFNODE("Sub", null, {
    $documentation: "Index-style property access, i.e. `a[\"foo\"]`",
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
            node.property.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "property");
    },
}, AST_PropAccess);

var AST_Spread = DEFNODE("Spread", "expression", {
    $documentation: "Spread expression in array/object literals or function calls",
    $propdoc: {
        expression: "[AST_Node] expression to be expanded",
    },
    _equals: function(node) {
        return this.expression.equals(node.expression);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "expression");
    },
});

var AST_Unary = DEFNODE("Unary", "operator expression", {
    $documentation: "Base class for unary expressions",
    $propdoc: {
        operator: "[string] the operator",
        expression: "[AST_Node] expression that this unary operator applies to",
    },
    _equals: function(node) {
        return this.operator == node.operator
            && this.expression.equals(node.expression);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "Unary") throw new Error("should not instantiate AST_Unary");
        if (typeof this.operator != "string") throw new Error("operator must be string");
        must_be_expression(this, "expression");
    },
});

var AST_UnaryPrefix = DEFNODE("UnaryPrefix", null, {
    $documentation: "Unary prefix expression, i.e. `typeof i` or `++i`"
}, AST_Unary);

var AST_UnaryPostfix = DEFNODE("UnaryPostfix", null, {
    $documentation: "Unary postfix expression, i.e. `i++`"
}, AST_Unary);

var AST_Binary = DEFNODE("Binary", "operator left right", {
    $documentation: "Binary expression, i.e. `a + b`",
    $propdoc: {
        left: "[AST_Node] left-hand side expression",
        operator: "[string] the operator",
        right: "[AST_Node] right-hand side expression"
    },
    _equals: function(node) {
        return this.operator == node.operator
            && this.left.equals(node.left)
            && this.right.equals(node.right);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.left.walk(visitor);
            node.right.walk(visitor);
        });
    },
    _validate: function() {
        if (!(this instanceof AST_Assign)) must_be_expression(this, "left");
        if (typeof this.operator != "string") throw new Error("operator must be string");
        must_be_expression(this, "right");
    },
});

var AST_Conditional = DEFNODE("Conditional", "condition consequent alternative", {
    $documentation: "Conditional expression using the ternary operator, i.e. `a ? b : c`",
    $propdoc: {
        condition: "[AST_Node]",
        consequent: "[AST_Node]",
        alternative: "[AST_Node]"
    },
    _equals: function(node) {
        return this.condition.equals(node.condition)
            && this.consequent.equals(node.consequent)
            && this.alternative.equals(node.alternative);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.condition.walk(visitor);
            node.consequent.walk(visitor);
            node.alternative.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "condition");
        must_be_expression(this, "consequent");
        must_be_expression(this, "alternative");
    },
});

var AST_Assign = DEFNODE("Assign", null, {
    $documentation: "An assignment expression — `a = b + 5`",
    _validate: function() {
        if (this.operator.indexOf("=") < 0) throw new Error('operator must contain "="');
        if (this.left instanceof AST_Destructured) {
            if (this.operator != "=") throw new Error("invalid destructuring operator: " + this.operator);
            validate_destructured(this.left, function(node) {
                if (!(node instanceof AST_PropAccess || node instanceof AST_SymbolRef)) {
                    throw new Error("left must be assignable: " + node.TYPE);
                }
            });
        } else if (!(this.left instanceof AST_Infinity
            || this.left instanceof AST_NaN
            || this.left instanceof AST_PropAccess && !this.left.optional
            || this.left instanceof AST_SymbolRef
            || this.left instanceof AST_Undefined)) {
            throw new Error("left must be assignable");
        }
    },
}, AST_Binary);

var AST_Await = DEFNODE("Await", "expression", {
    $documentation: "An await expression",
    $propdoc: {
        expression: "[AST_Node] expression with Promise to resolve on",
    },
    _equals: function(node) {
        return this.expression.equals(node.expression);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.expression.walk(visitor);
        });
    },
    _validate: function() {
        must_be_expression(this, "expression");
    },
});

var AST_Yield = DEFNODE("Yield", "expression nested", {
    $documentation: "A yield expression",
    $propdoc: {
        expression: "[AST_Node?] return value for iterator, or null if undefined",
        nested: "[boolean] whether to iterate over expression as generator",
    },
    _equals: function(node) {
        return !this.nested == !node.nested
            && prop_equals(this.expression, node.expression);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.expression) node.expression.walk(visitor);
        });
    },
    _validate: function() {
        if (this.expression != null) {
            must_be_expression(this, "expression");
        } else if (this.nested) {
            throw new Error("yield* must contain expression");
        }
    },
});

/* -----[ LITERALS ]----- */

var AST_Array = DEFNODE("Array", "elements", {
    $documentation: "An array literal",
    $propdoc: {
        elements: "[AST_Node*] array of elements"
    },
    _equals: function(node) {
        return all_equals(this.elements, node.elements);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.elements.forEach(function(element) {
                element.walk(visitor);
            });
        });
    },
    _validate: function() {
        must_be_expressions(this, "elements", true, true);
    },
});

var AST_Destructured = DEFNODE("Destructured", "rest", {
    $documentation: "Base class for destructured literal",
    $propdoc: {
        rest: "[(AST_Destructured|AST_SymbolDeclaration|AST_SymbolRef)?] rest parameter, or null if absent",
    },
    _validate: function() {
        if (this.TYPE == "Destructured") throw new Error("should not instantiate AST_Destructured");
    },
});

function validate_destructured(node, check, allow_default) {
    if (node instanceof AST_DefaultValue && allow_default) return validate_destructured(node.name, check);
    if (node instanceof AST_Destructured) {
        if (node.rest != null) validate_destructured(node.rest, check);
        if (node instanceof AST_DestructuredArray) return node.elements.forEach(function(node) {
            if (!(node instanceof AST_Hole)) validate_destructured(node, check, true);
        });
        if (node instanceof AST_DestructuredObject) return node.properties.forEach(function(prop) {
            validate_destructured(prop.value, check, true);
        });
    }
    check(node);
}

var AST_DestructuredArray = DEFNODE("DestructuredArray", "elements", {
    $documentation: "A destructured array literal",
    $propdoc: {
        elements: "[(AST_DefaultValue|AST_Destructured|AST_SymbolDeclaration|AST_SymbolRef)*] array of elements",
    },
    _equals: function(node) {
        return prop_equals(this.rest, node.rest)
            && all_equals(this.elements, node.elements);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.elements.forEach(function(element) {
                element.walk(visitor);
            });
            if (node.rest) node.rest.walk(visitor);
        });
    },
}, AST_Destructured);

var AST_DestructuredKeyVal = DEFNODE("DestructuredKeyVal", "key value", {
    $documentation: "A key: value destructured property",
    $propdoc: {
        key: "[string|AST_Node] property name.  For computed property this is an AST_Node.",
        value: "[AST_DefaultValue|AST_Destructured|AST_SymbolDeclaration|AST_SymbolRef] property value",
    },
    _equals: function(node) {
        return prop_equals(this.key, node.key)
            && this.value.equals(node.value);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.key instanceof AST_Node) node.key.walk(visitor);
            node.value.walk(visitor);
        });
    },
    _validate: function() {
        if (typeof this.key != "string") {
            if (!(this.key instanceof AST_Node)) throw new Error("key must be string or AST_Node");
            must_be_expression(this, "key");
        }
        if (!(this.value instanceof AST_Node)) throw new Error("value must be AST_Node");
    },
});

var AST_DestructuredObject = DEFNODE("DestructuredObject", "properties", {
    $documentation: "A destructured object literal",
    $propdoc: {
        properties: "[AST_DestructuredKeyVal*] array of properties",
    },
    _equals: function(node) {
        return prop_equals(this.rest, node.rest)
            && all_equals(this.properties, node.properties);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.properties.forEach(function(prop) {
                prop.walk(visitor);
            });
            if (node.rest) node.rest.walk(visitor);
        });
    },
    _validate: function() {
        this.properties.forEach(function(node) {
            if (!(node instanceof AST_DestructuredKeyVal)) throw new Error("properties must be AST_DestructuredKeyVal[]");
        });
    },
}, AST_Destructured);

var AST_Object = DEFNODE("Object", "properties", {
    $documentation: "An object literal",
    $propdoc: {
        properties: "[(AST_ObjectProperty|AST_Spread)*] array of properties"
    },
    _equals: function(node) {
        return all_equals(this.properties, node.properties);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            node.properties.forEach(function(prop) {
                prop.walk(visitor);
            });
        });
    },
    _validate: function() {
        this.properties.forEach(function(node) {
            if (!(node instanceof AST_ObjectProperty || node instanceof AST_Spread)) {
                throw new Error("properties must contain AST_ObjectProperty and/or AST_Spread only");
            }
        });
    },
});

var AST_ObjectProperty = DEFNODE("ObjectProperty", "key value", {
    $documentation: "Base class for literal object properties",
    $propdoc: {
        key: "[string|AST_Node] property name.  For computed property this is an AST_Node.",
        value: "[AST_Node] property value.  For getters and setters this is an AST_Accessor.",
    },
    _equals: function(node) {
        return prop_equals(this.key, node.key)
            && this.value.equals(node.value);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.key instanceof AST_Node) node.key.walk(visitor);
            node.value.walk(visitor);
        });
    },
    _validate: function() {
        if (this.TYPE == "ObjectProperty") throw new Error("should not instantiate AST_ObjectProperty");
        if (typeof this.key != "string") {
            if (!(this.key instanceof AST_Node)) throw new Error("key must be string or AST_Node");
            must_be_expression(this, "key");
        }
        if (!(this.value instanceof AST_Node)) throw new Error("value must be AST_Node");
    },
});

var AST_ObjectKeyVal = DEFNODE("ObjectKeyVal", null, {
    $documentation: "A key: value object property",
    _validate: function() {
        must_be_expression(this, "value");
    },
}, AST_ObjectProperty);

var AST_ObjectMethod = DEFNODE("ObjectMethod", null, {
    $documentation: "A key(){} object property",
    _validate: function() {
        if (!(this.value instanceof AST_LambdaExpression)) throw new Error("value must be AST_LambdaExpression");
        if (is_arrow(this.value)) throw new Error("value cannot be AST_Arrow or AST_AsyncArrow");
        if (this.value.name != null) throw new Error("name of object method's lambda must be null");
    },
}, AST_ObjectKeyVal);

var AST_ObjectSetter = DEFNODE("ObjectSetter", null, {
    $documentation: "An object setter property",
    _validate: function() {
        if (!(this.value instanceof AST_Accessor)) throw new Error("value must be AST_Accessor");
    },
}, AST_ObjectProperty);

var AST_ObjectGetter = DEFNODE("ObjectGetter", null, {
    $documentation: "An object getter property",
    _validate: function() {
        if (!(this.value instanceof AST_Accessor)) throw new Error("value must be AST_Accessor");
    },
}, AST_ObjectProperty);

var AST_Symbol = DEFNODE("Symbol", "scope name thedef", {
    $documentation: "Base class for all symbols",
    $propdoc: {
        name: "[string] name of this symbol",
        scope: "[AST_Scope/S] the current scope (not necessarily the definition scope)",
        thedef: "[SymbolDef/S] the definition of this symbol"
    },
    _equals: function(node) {
        return this.thedef ? this.thedef === node.thedef : this.name == node.name;
    },
    _validate: function() {
        if (this.TYPE == "Symbol") throw new Error("should not instantiate AST_Symbol");
        if (typeof this.name != "string") throw new Error("name must be string");
    },
});

var AST_SymbolDeclaration = DEFNODE("SymbolDeclaration", "init", {
    $documentation: "A declaration symbol (symbol in var, function name or argument, symbol in catch)",
}, AST_Symbol);

var AST_SymbolConst = DEFNODE("SymbolConst", null, {
    $documentation: "Symbol defining a constant",
}, AST_SymbolDeclaration);

var AST_SymbolImport = DEFNODE("SymbolImport", "key", {
    $documentation: "Symbol defined by an `import` statement",
    $propdoc: {
        key: "[AST_String] the original `export` name",
    },
    _equals: function(node) {
        return this.name == node.name
            && this.key.equals(node.key);
    },
    _validate: function() {
        if (!(this.key instanceof AST_String)) throw new Error("key must be AST_String");
    },
}, AST_SymbolConst);

var AST_SymbolLet = DEFNODE("SymbolLet", null, {
    $documentation: "Symbol defining a lexical-scoped variable",
}, AST_SymbolDeclaration);

var AST_SymbolVar = DEFNODE("SymbolVar", null, {
    $documentation: "Symbol defining a variable",
}, AST_SymbolDeclaration);

var AST_SymbolFunarg = DEFNODE("SymbolFunarg", "unused", {
    $documentation: "Symbol naming a function argument",
}, AST_SymbolVar);

var AST_SymbolDefun = DEFNODE("SymbolDefun", null, {
    $documentation: "Symbol defining a function",
}, AST_SymbolDeclaration);

var AST_SymbolLambda = DEFNODE("SymbolLambda", null, {
    $documentation: "Symbol naming a function expression",
}, AST_SymbolDeclaration);

var AST_SymbolDefClass = DEFNODE("SymbolDefClass", null, {
    $documentation: "Symbol defining a class",
}, AST_SymbolConst);

var AST_SymbolClass = DEFNODE("SymbolClass", null, {
    $documentation: "Symbol naming a class expression",
}, AST_SymbolConst);

var AST_SymbolCatch = DEFNODE("SymbolCatch", null, {
    $documentation: "Symbol naming the exception in catch",
}, AST_SymbolDeclaration);

var AST_Label = DEFNODE("Label", "references", {
    $documentation: "Symbol naming a label (declaration)",
    $propdoc: {
        references: "[AST_LoopControl*] a list of nodes referring to this label"
    },
    initialize: function() {
        this.references = [];
        this.thedef = this;
    },
}, AST_Symbol);

var AST_SymbolRef = DEFNODE("SymbolRef", "fixed in_arg redef", {
    $documentation: "Reference to some symbol (not definition/declaration)",
}, AST_Symbol);

var AST_SymbolExport = DEFNODE("SymbolExport", "alias", {
    $documentation: "Reference in an `export` statement",
    $propdoc: {
        alias: "[AST_String] the `export` alias",
    },
    _equals: function(node) {
        return this.name == node.name
            && this.alias.equals(node.alias);
    },
    _validate: function() {
        if (!(this.alias instanceof AST_String)) throw new Error("alias must be AST_String");
    },
}, AST_SymbolRef);

var AST_LabelRef = DEFNODE("LabelRef", null, {
    $documentation: "Reference to a label symbol",
}, AST_Symbol);

var AST_ObjectIdentity = DEFNODE("ObjectIdentity", null, {
    $documentation: "Base class for `super` & `this`",
    _equals: return_true,
    _validate: function() {
        if (this.TYPE == "ObjectIdentity") throw new Error("should not instantiate AST_ObjectIdentity");
    },
}, AST_Symbol);

var AST_Super = DEFNODE("Super", null, {
    $documentation: "The `super` symbol",
    _validate: function() {
        if (this.name !== "super") throw new Error('name must be "super"');
    },
}, AST_ObjectIdentity);

var AST_This = DEFNODE("This", null, {
    $documentation: "The `this` symbol",
    _validate: function() {
        if (this.TYPE == "This" && this.name !== "this") throw new Error('name must be "this"');
    },
}, AST_ObjectIdentity);

var AST_NewTarget = DEFNODE("NewTarget", null, {
    $documentation: "The `new.target` symbol",
    initialize: function() {
        this.name = "new.target";
    },
    _validate: function() {
        if (this.name !== "new.target") throw new Error('name must be "new.target": ' + this.name);
    },
}, AST_This);

var AST_Template = DEFNODE("Template", "expressions strings tag", {
    $documentation: "A template literal, i.e. tag`str1${expr1}...strN${exprN}strN+1`",
    $propdoc: {
        expressions: "[AST_Node*] the placeholder expressions",
        strings: "[string*] the raw text segments",
        tag: "[AST_Node?] tag function, or null if absent",
    },
    _equals: function(node) {
        return prop_equals(this.tag, node.tag)
            && list_equals(this.strings, node.strings)
            && all_equals(this.expressions, node.expressions);
    },
    walk: function(visitor) {
        var node = this;
        visitor.visit(node, function() {
            if (node.tag) node.tag.walk(visitor);
            node.expressions.forEach(function(expr) {
                expr.walk(visitor);
            });
        });
    },
    _validate: function() {
        if (this.expressions.length + 1 != this.strings.length) {
            throw new Error("malformed template with " + this.expressions.length + " placeholder(s) but " + this.strings.length + " text segment(s)");
        }
        must_be_expressions(this, "expressions");
        this.strings.forEach(function(string) {
            if (typeof string != "string") throw new Error("strings must contain string");
        });
        if (this.tag != null) must_be_expression(this, "tag");
    },
});

var AST_Constant = DEFNODE("Constant", null, {
    $documentation: "Base class for all constants",
    _equals: function(node) {
        return this.value === node.value;
    },
    _validate: function() {
        if (this.TYPE == "Constant") throw new Error("should not instantiate AST_Constant");
    },
});

var AST_String = DEFNODE("String", "quote value", {
    $documentation: "A string literal",
    $propdoc: {
        quote: "[string?] the original quote character",
        value: "[string] the contents of this string",
    },
    _validate: function() {
        if (this.quote != null) {
            if (typeof this.quote != "string") throw new Error("quote must be string");
            if (!/^["']$/.test(this.quote)) throw new Error("invalid quote: " + this.quote);
        }
        if (typeof this.value != "string") throw new Error("value must be string");
    },
}, AST_Constant);

var AST_Number = DEFNODE("Number", "value", {
    $documentation: "A number literal",
    $propdoc: {
        value: "[number] the numeric value",
    },
    _validate: function() {
        if (typeof this.value != "number") throw new Error("value must be number");
        if (!isFinite(this.value)) throw new Error("value must be finite");
        if (this.value < 0) throw new Error("value cannot be negative");
    },
}, AST_Constant);

var AST_BigInt = DEFNODE("BigInt", "value", {
    $documentation: "A BigInt literal",
    $propdoc: {
        value: "[string] the numeric representation",
    },
    _validate: function() {
        if (typeof this.value != "string") throw new Error("value must be string");
        if (this.value[0] == "-") throw new Error("value cannot be negative");
    },
}, AST_Constant);

var AST_RegExp = DEFNODE("RegExp", "value", {
    $documentation: "A regexp literal",
    $propdoc: {
        value: "[RegExp] the actual regexp"
    },
    _equals: function(node) {
        return "" + this.value == "" + node.value;
    },
    _validate: function() {
        if (!(this.value instanceof RegExp)) throw new Error("value must be RegExp");
    },
}, AST_Constant);

var AST_Atom = DEFNODE("Atom", null, {
    $documentation: "Base class for atoms",
    _equals: return_true,
    _validate: function() {
        if (this.TYPE == "Atom") throw new Error("should not instantiate AST_Atom");
    },
}, AST_Constant);

var AST_Null = DEFNODE("Null", null, {
    $documentation: "The `null` atom",
    value: null,
}, AST_Atom);

var AST_NaN = DEFNODE("NaN", null, {
    $documentation: "The impossible value",
    value: 0/0,
}, AST_Atom);

var AST_Undefined = DEFNODE("Undefined", null, {
    $documentation: "The `undefined` value",
    value: function(){}(),
}, AST_Atom);

var AST_Hole = DEFNODE("Hole", null, {
    $documentation: "A hole in an array",
    value: function(){}(),
}, AST_Atom);

var AST_Infinity = DEFNODE("Infinity", null, {
    $documentation: "The `Infinity` value",
    value: 1/0,
}, AST_Atom);

var AST_Boolean = DEFNODE("Boolean", null, {
    $documentation: "Base class for booleans",
    _validate: function() {
        if (this.TYPE == "Boolean") throw new Error("should not instantiate AST_Boolean");
    },
}, AST_Atom);

var AST_False = DEFNODE("False", null, {
    $documentation: "The `false` atom",
    value: false,
}, AST_Boolean);

var AST_True = DEFNODE("True", null, {
    $documentation: "The `true` atom",
    value: true,
}, AST_Boolean);

/* -----[ TreeWalker ]----- */

function TreeWalker(callback) {
    this.callback = callback;
    this.directives = Object.create(null);
    this.stack = [];
}
TreeWalker.prototype = {
    visit: function(node, descend) {
        this.push(node);
        var done = this.callback(node, descend || noop);
        if (!done && descend) descend();
        this.pop();
    },
    parent: function(n) {
        return this.stack[this.stack.length - 2 - (n || 0)];
    },
    push: function(node) {
        var value;
        if (node instanceof AST_Class) {
            this.directives = Object.create(this.directives);
            value = "use strict";
        } else if (node instanceof AST_Directive) {
            value = node.value;
        } else if (node instanceof AST_Lambda) {
            this.directives = Object.create(this.directives);
        }
        if (value && !this.directives[value]) this.directives[value] = node;
        this.stack.push(node);
    },
    pop: function() {
        var node = this.stack.pop();
        if (node instanceof AST_Class || node instanceof AST_Lambda) {
            this.directives = Object.getPrototypeOf(this.directives);
        }
    },
    self: function() {
        return this.stack[this.stack.length - 1];
    },
    find_parent: function(type) {
        var stack = this.stack;
        for (var i = stack.length - 1; --i >= 0;) {
            var x = stack[i];
            if (x instanceof type) return x;
        }
    },
    has_directive: function(type) {
        var dir = this.directives[type];
        if (dir) return dir;
        var node = this.stack[this.stack.length - 1];
        if (node instanceof AST_Scope) {
            for (var i = 0; i < node.body.length; ++i) {
                var st = node.body[i];
                if (!(st instanceof AST_Directive)) break;
                if (st.value == type) return st;
            }
        }
    },
    loopcontrol_target: function(node) {
        var stack = this.stack;
        if (node.label) for (var i = stack.length; --i >= 0;) {
            var x = stack[i];
            if (x instanceof AST_LabeledStatement && x.label.name == node.label.name)
                return x.body;
        } else for (var i = stack.length; --i >= 0;) {
            var x = stack[i];
            if (x instanceof AST_IterationStatement
                || node instanceof AST_Break && x instanceof AST_Switch)
                return x;
        }
    },
    in_boolean_context: function() {
        for (var drop = true, level = 0, parent, self = this.self(); parent = this.parent(level++); self = parent) {
            if (parent instanceof AST_Binary) switch (parent.operator) {
              case "&&":
              case "||":
                if (parent.left === self) drop = false;
                continue;
              default:
                return false;
            }
            if (parent instanceof AST_Conditional) {
                if (parent.condition === self) return true;
                continue;
            }
            if (parent instanceof AST_DWLoop) return parent.condition === self;
            if (parent instanceof AST_For) return parent.condition === self;
            if (parent instanceof AST_If) return parent.condition === self;
            if (parent instanceof AST_Return) {
                if (parent.in_bool) return true;
                while (parent = this.parent(level++)) {
                    if (parent instanceof AST_Lambda) {
                        if (parent.name) return false;
                        parent = this.parent(level++);
                        if (parent.TYPE != "Call") return false;
                        break;
                    }
                }
            }
            if (parent instanceof AST_Sequence) {
                if (parent.tail_node() === self) continue;
                return drop ? "d" : true;
            }
            if (parent instanceof AST_SimpleStatement) return drop ? "d" : true;
            if (parent instanceof AST_UnaryPrefix) return parent.operator == "!";
            return false;
        }
    }
};
