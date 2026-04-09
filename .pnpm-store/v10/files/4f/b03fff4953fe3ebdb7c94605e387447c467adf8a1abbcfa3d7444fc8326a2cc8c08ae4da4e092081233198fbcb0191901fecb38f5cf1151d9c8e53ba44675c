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

function Compressor(options, false_by_default) {
    if (!(this instanceof Compressor))
        return new Compressor(options, false_by_default);
    TreeTransformer.call(this, this.before, this.after);
    this.options = defaults(options, {
        annotations     : !false_by_default,
        arguments       : !false_by_default,
        arrows          : !false_by_default,
        assignments     : !false_by_default,
        awaits          : !false_by_default,
        booleans        : !false_by_default,
        collapse_vars   : !false_by_default,
        comparisons     : !false_by_default,
        conditionals    : !false_by_default,
        dead_code       : !false_by_default,
        default_values  : !false_by_default,
        directives      : !false_by_default,
        drop_console    : false,
        drop_debugger   : !false_by_default,
        evaluate        : !false_by_default,
        expression      : false,
        functions       : !false_by_default,
        global_defs     : false,
        hoist_exports   : !false_by_default,
        hoist_funs      : false,
        hoist_props     : !false_by_default,
        hoist_vars      : false,
        ie              : false,
        if_return       : !false_by_default,
        imports         : !false_by_default,
        inline          : !false_by_default,
        join_vars       : !false_by_default,
        keep_fargs      : false_by_default,
        keep_fnames     : false,
        keep_infinity   : false,
        loops           : !false_by_default,
        merge_vars      : !false_by_default,
        module          : false,
        negate_iife     : !false_by_default,
        objects         : !false_by_default,
        optional_chains : !false_by_default,
        passes          : 1,
        properties      : !false_by_default,
        pure_funcs      : null,
        pure_getters    : !false_by_default && "strict",
        reduce_funcs    : !false_by_default,
        reduce_vars     : !false_by_default,
        rests           : !false_by_default,
        sequences       : !false_by_default,
        side_effects    : !false_by_default,
        spreads         : !false_by_default,
        strings         : !false_by_default,
        switches        : !false_by_default,
        templates       : !false_by_default,
        top_retain      : null,
        toplevel        : !!(options && !options["expression"] && options["top_retain"]),
        typeofs         : !false_by_default,
        unsafe          : false,
        unsafe_comps    : false,
        unsafe_Function : false,
        unsafe_math     : false,
        unsafe_proto    : false,
        unsafe_regexp   : false,
        unsafe_undefined: false,
        unused          : !false_by_default,
        varify          : !false_by_default,
        webkit          : false,
        yields          : !false_by_default,
    }, true);
    var evaluate = this.options["evaluate"];
    this.eval_threshold = /eager/.test(evaluate) ? 1 / 0 : +evaluate;
    var global_defs = this.options["global_defs"];
    if (typeof global_defs == "object") for (var key in global_defs) {
        if (/^@/.test(key) && HOP(global_defs, key)) {
            global_defs[key.slice(1)] = parse(global_defs[key], { expression: true });
        }
    }
    if (this.options["inline"] === true) this.options["inline"] = 4;
    this.drop_fargs = this.options["keep_fargs"] ? return_false : function(lambda, parent) {
        if (lambda.length_read) return false;
        var name = lambda.name;
        if (!name) return parent && parent.TYPE == "Call" && parent.expression === lambda;
        if (name.fixed_value() !== lambda) return false;
        var def = name.definition();
        if (def.direct_access) return false;
        var escaped = def.escaped;
        return escaped && escaped.depth != 1;
    };
    if (this.options["module"]) this.directives["use strict"] = true;
    var pure_funcs = this.options["pure_funcs"];
    if (typeof pure_funcs == "function") {
        this.pure_funcs = pure_funcs;
    } else if (typeof pure_funcs == "string") {
        this.pure_funcs = function(node) {
            var expr;
            if (node instanceof AST_Call) {
                expr = node.expression;
            } else if (node instanceof AST_Template) {
                expr = node.tag;
            }
            return !(expr && pure_funcs === expr.print_to_string());
        };
    } else if (Array.isArray(pure_funcs)) {
        this.pure_funcs = function(node) {
            var expr;
            if (node instanceof AST_Call) {
                expr = node.expression;
            } else if (node instanceof AST_Template) {
                expr = node.tag;
            }
            return !(expr && member(expr.print_to_string(), pure_funcs));
        };
    } else {
        this.pure_funcs = return_true;
    }
    var sequences = this.options["sequences"];
    this.sequences_limit = sequences == 1 ? 800 : sequences | 0;
    var top_retain = this.options["top_retain"];
    if (top_retain instanceof RegExp) {
        this.top_retain = function(def) {
            return top_retain.test(def.name);
        };
    } else if (typeof top_retain == "function") {
        this.top_retain = top_retain;
    } else if (top_retain) {
        if (typeof top_retain == "string") {
            top_retain = top_retain.split(/,/);
        }
        this.top_retain = function(def) {
            return member(def.name, top_retain);
        };
    }
    var toplevel = this.options["toplevel"];
    this.toplevel = typeof toplevel == "string" ? {
        funcs: /funcs/.test(toplevel),
        vars: /vars/.test(toplevel)
    } : {
        funcs: toplevel,
        vars: toplevel
    };
}

Compressor.prototype = new TreeTransformer(function(node, descend) {
    if (node._squeezed) return node;
    var is_scope = node instanceof AST_Scope;
    if (is_scope) {
        if (this.option("arrows") && is_arrow(node) && node.value) {
            node.body = [ node.first_statement() ];
            node.value = null;
        }
        node.hoist_properties(this);
        node.hoist_declarations(this);
        node.process_returns(this);
    }
    // Before https://github.com/mishoo/UglifyJS/pull/1602 AST_Node.optimize()
    // would call AST_Node.transform() if a different instance of AST_Node is
    // produced after OPT().
    // This corrupts TreeWalker.stack, which cause AST look-ups to malfunction.
    // Migrate and defer all children's AST_Node.transform() to below, which
    // will now happen after this parent AST_Node has been properly substituted
    // thus gives a consistent AST snapshot.
    descend(node, this);
    // Existing code relies on how AST_Node.optimize() worked, and omitting the
    // following replacement call would result in degraded efficiency of both
    // output and performance.
    descend(node, this);
    var opt = node.optimize(this);
    if (is_scope) {
        if (opt === node && !this.has_directive("use asm") && !opt.pinned()) {
            opt.drop_unused(this);
            if (opt.merge_variables(this)) opt.drop_unused(this);
            descend(opt, this);
        }
        if (this.option("arrows") && is_arrow(opt) && opt.body.length == 1) {
            var stat = opt.body[0];
            if (stat instanceof AST_Return) {
                opt.body.length = 0;
                opt.value = stat.value;
            }
        }
    }
    if (opt === node) opt._squeezed = true;
    return opt;
});
Compressor.prototype.option = function(key) {
    return this.options[key];
};
Compressor.prototype.exposed = function(def) {
    if (def.exported) return true;
    if (def.undeclared) return true;
    if (!(def.global || def.scope.resolve() instanceof AST_Toplevel)) return false;
    var toplevel = this.toplevel;
    return !all(def.orig, function(sym) {
        return toplevel[sym instanceof AST_SymbolDefun ? "funcs" : "vars"];
    });
};
Compressor.prototype.compress = function(node) {
    node = node.resolve_defines(this);
    node.hoist_exports(this);
    if (this.option("expression")) node.process_expression(true);
    var merge_vars = this.options.merge_vars;
    var passes = +this.options.passes || 1;
    var min_count = 1 / 0;
    var stopping = false;
    var mangle = { ie: this.option("ie") };
    for (var pass = 0; pass < passes; pass++) {
        node.figure_out_scope(mangle);
        if (pass > 0 || this.option("reduce_vars"))
            node.reset_opt_flags(this);
        this.options.merge_vars = merge_vars && (stopping || pass == passes - 1);
        node = node.transform(this);
        if (passes > 1) {
            var count = 0;
            node.walk(new TreeWalker(function() {
                count++;
            }));
            AST_Node.info("pass {pass}: last_count: {min_count}, count: {count}", {
                pass: pass,
                min_count: min_count,
                count: count,
            });
            if (count < min_count) {
                min_count = count;
                stopping = false;
            } else if (stopping) {
                break;
            } else {
                stopping = true;
            }
        }
    }
    if (this.option("expression")) node.process_expression(false);
    return node;
};

(function(OPT) {
    OPT(AST_Node, function(self) {
        return self;
    });

    AST_Toplevel.DEFMETHOD("hoist_exports", function(compressor) {
        if (!compressor.option("hoist_exports")) return;
        var body = this.body, props = [];
        for (var i = 0; i < body.length; i++) {
            var stat = body[i];
            if (stat instanceof AST_ExportDeclaration) {
                body[i] = stat = stat.body;
                if (stat instanceof AST_Definitions) {
                    stat.definitions.forEach(function(defn) {
                        defn.name.match_symbol(export_symbol, true);
                    });
                } else {
                    export_symbol(stat.name);
                }
            } else if (stat instanceof AST_ExportReferences) {
                body.splice(i--, 1);
                [].push.apply(props, stat.properties);
            }
        }
        if (props.length) body.push(make_node(AST_ExportReferences, this, { properties: props }));

        function export_symbol(sym) {
            if (!(sym instanceof AST_SymbolDeclaration)) return;
            var node = make_node(AST_SymbolExport, sym);
            node.alias = make_node(AST_String, node, { value: node.name });
            props.push(node);
        }
    });

    AST_Scope.DEFMETHOD("process_expression", function(insert, transform) {
        var self = this;
        var tt = new TreeTransformer(function(node) {
            if (insert) {
                if (node instanceof AST_Directive) node = make_node(AST_SimpleStatement, node, {
                    body: make_node(AST_String, node),
                });
                if (node instanceof AST_SimpleStatement) {
                    return transform ? transform(node) : make_node(AST_Return, node, { value: node.body });
                }
            } else if (node instanceof AST_Return) {
                if (transform) return transform(node);
                var value = node.value;
                if (value instanceof AST_String) return make_node(AST_Directive, value);
                return make_node(AST_SimpleStatement, node, {
                    body: value || make_node(AST_UnaryPrefix, node, {
                        operator: "void",
                        expression: make_node(AST_Number, node, { value: 0 }),
                    }),
                });
            }
            if (node instanceof AST_Block) {
                if (node instanceof AST_Lambda) {
                    if (node !== self) return node;
                } else if (insert === "awaits" && node instanceof AST_Try) {
                    if (node.bfinally) return node;
                }
                for (var index = node.body.length; --index >= 0;) {
                    var stat = node.body[index];
                    if (!is_declaration(stat, true)) {
                        node.body[index] = stat.transform(tt);
                        break;
                    }
                }
            } else if (node instanceof AST_If) {
                node.body = node.body.transform(tt);
                if (node.alternative) node.alternative = node.alternative.transform(tt);
            } else if (node instanceof AST_With) {
                node.body = node.body.transform(tt);
            }
            return node;
        });
        self.transform(tt);
    });
    AST_Toplevel.DEFMETHOD("unwrap_expression", function() {
        var self = this;
        switch (self.body.length) {
          case 0:
            return make_node(AST_UnaryPrefix, self, {
                operator: "void",
                expression: make_node(AST_Number, self, { value: 0 }),
            });
          case 1:
            var stat = self.body[0];
            if (stat instanceof AST_Directive) return make_node(AST_String, stat);
            if (stat instanceof AST_SimpleStatement) return stat.body;
          default:
            return make_node(AST_Call, self, {
                expression: make_node(AST_Function, self, {
                    argnames: [],
                    body: self.body,
                }).init_vars(self, self),
                args: [],
            });
        }
    });
    AST_Node.DEFMETHOD("wrap_expression", function() {
        var self = this;
        if (!is_statement(self)) self = make_node(AST_SimpleStatement, self, { body: self });
        if (!(self instanceof AST_Toplevel)) self = make_node(AST_Toplevel, self, { body: [ self ] });
        return self;
    });

    function read_property(obj, node) {
        var key = node.get_property();
        if (key instanceof AST_Node) return;
        var value;
        if (obj instanceof AST_Array) {
            var elements = obj.elements;
            if (key == "length") return make_node_from_constant(elements.length, obj);
            if (typeof key == "number" && key in elements) value = elements[key];
        } else if (obj instanceof AST_Lambda) {
            if (key == "length") {
                obj.length_read = true;
                return make_node_from_constant(obj.argnames.length, obj);
            }
        } else if (obj instanceof AST_Object) {
            key = "" + key;
            var props = obj.properties;
            for (var i = props.length; --i >= 0;) {
                var prop = props[i];
                if (!can_hoist_property(prop)) return;
                if (!value && props[i].key === key) value = props[i].value;
            }
        }
        return value instanceof AST_SymbolRef && value.fixed_value() || value;
    }

    function is_read_only_fn(value, name) {
        if (value instanceof AST_Boolean) return native_fns.Boolean[name];
        if (value instanceof AST_Number) return native_fns.Number[name];
        if (value instanceof AST_String) return native_fns.String[name];
        if (name == "valueOf") return false;
        if (value instanceof AST_Array) return native_fns.Array[name];
        if (value instanceof AST_Lambda) return native_fns.Function[name];
        if (value instanceof AST_Object) return native_fns.Object[name];
        if (value instanceof AST_RegExp) return native_fns.RegExp[name] && !value.value.global;
    }

    function is_modified(compressor, tw, node, value, level, immutable, recursive) {
        var parent = tw.parent(level);
        if (compressor.option("unsafe") && parent instanceof AST_Dot && is_read_only_fn(value, parent.property)) {
            return;
        }
        var lhs = is_lhs(node, parent);
        if (lhs) return lhs;
        if (level == 0 && value && value.is_constant()) return;
        if (parent instanceof AST_Array) return is_modified(compressor, tw, parent, parent, level + 1);
        if (parent instanceof AST_Assign) switch (parent.operator) {
          case "=":
            return is_modified(compressor, tw, parent, value, level + 1, immutable, recursive);
          case "&&=":
          case "||=":
          case "??=":
            return is_modified(compressor, tw, parent, parent, level + 1);
          default:
            return;
        }
        if (parent instanceof AST_Binary) {
            if (!lazy_op[parent.operator]) return;
            return is_modified(compressor, tw, parent, parent, level + 1);
        }
        if (parent instanceof AST_Call) {
            return !immutable
                && parent.expression === node
                && !parent.is_expr_pure(compressor)
                && (!(value instanceof AST_LambdaExpression) || !(parent instanceof AST_New) && value.contains_this());
        }
        if (parent instanceof AST_Conditional) {
            if (parent.condition === node) return;
            return is_modified(compressor, tw, parent, parent, level + 1);
        }
        if (parent instanceof AST_ForEnumeration) return parent.init === node;
        if (parent instanceof AST_ObjectKeyVal) {
            if (parent.value !== node) return;
            var obj = tw.parent(level + 1);
            return is_modified(compressor, tw, obj, obj, level + 2);
        }
        if (parent instanceof AST_PropAccess) {
            if (parent.expression !== node) return;
            var prop = read_property(value, parent);
            return (!immutable || recursive) && is_modified(compressor, tw, parent, prop, level + 1);
        }
        if (parent instanceof AST_Sequence) {
            if (parent.tail_node() !== node) return;
            return is_modified(compressor, tw, parent, value, level + 1, immutable, recursive);
        }
    }

    function is_lambda(node) {
        return node instanceof AST_Class || node instanceof AST_Lambda;
    }

    function safe_for_extends(node) {
        return node instanceof AST_Class || node instanceof AST_Defun || node instanceof AST_Function;
    }

    function is_arguments(def) {
        return def.name == "arguments" && def.scope.uses_arguments;
    }

    function cross_scope(def, sym) {
        do {
            if (def === sym) return false;
            if (sym instanceof AST_Scope) return true;
        } while (sym = sym.parent_scope);
    }

    function can_drop_symbol(ref, compressor, keep_lambda) {
        var def = ref.redef || ref.definition();
        if (ref.in_arg && is_funarg(def)) return false;
        return all(def.orig, function(sym) {
            if (sym instanceof AST_SymbolConst || sym instanceof AST_SymbolLet) {
                if (sym instanceof AST_SymbolImport) return true;
                return compressor && safe_from_tdz(compressor, sym);
            }
            return !(keep_lambda && sym instanceof AST_SymbolLambda);
        });
    }

    function has_escaped(d, scope, node, parent) {
        if (parent instanceof AST_Assign) return parent.operator == "=" && parent.right === node;
        if (parent instanceof AST_Call) return parent.expression !== node || parent instanceof AST_New;
        if (parent instanceof AST_ClassField) return parent.value === node && !parent.static;
        if (parent instanceof AST_Exit) return parent.value === node && scope.resolve() !== d.scope.resolve();
        if (parent instanceof AST_VarDef) return parent.value === node;
    }

    function make_ref(ref, fixed) {
        var node = make_node(AST_SymbolRef, ref);
        node.fixed = fixed || make_node(AST_Undefined, ref);
        return node;
    }

    function replace_ref(resolve, fixed) {
        return function(node) {
            var ref = resolve(node);
            var node = make_ref(ref, fixed);
            var def = ref.definition();
            def.references.push(node);
            def.replaced++;
            return node;
        };
    }

    var RE_POSITIVE_INTEGER = /^(0|[1-9][0-9]*)$/;
    (function(def) {
        def(AST_Node, noop);

        function reset_def(tw, compressor, def) {
            def.assignments = 0;
            def.bool_return = 0;
            def.cross_loop = false;
            def.direct_access = false;
            def.drop_return = 0;
            def.escaped = [];
            def.first_decl = null;
            def.fixed = !def.const_redefs
                && !def.scope.pinned()
                && !compressor.exposed(def)
                && !(def.init instanceof AST_LambdaExpression && def.init !== def.scope)
                && def.init;
            def.reassigned = 0;
            def.recursive_refs = 0;
            def.references = [];
            def.single_use = undefined;
        }

        function reset_block_variables(tw, compressor, scope) {
            scope.variables.each(function(def) {
                reset_def(tw, compressor, def);
            });
        }

        function reset_variables(tw, compressor, scope) {
            scope.fn_defs = [];
            scope.variables.each(function(def) {
                reset_def(tw, compressor, def);
                var init = def.init;
                if (init instanceof AST_LambdaDefinition) {
                    scope.fn_defs.push(init);
                    init.safe_ids = null;
                }
                if (def.fixed === null) {
                    def.safe_ids = tw.safe_ids;
                    mark(tw, def);
                } else if (def.fixed) {
                    tw.loop_ids[def.id] = tw.in_loop;
                    mark(tw, def);
                }
            });
            scope.may_call_this = function() {
                scope.may_call_this = scope.contains_this() ? return_true : return_false;
            };
            if (scope.uses_arguments) scope.each_argname(function(node) {
                node.definition().last_ref = false;
            });
            if (compressor.option("ie")) scope.variables.each(function(def) {
                var d = def.orig[0].definition();
                if (d !== def) d.fixed = false;
            });
        }

        function safe_to_visit(tw, fn) {
            var marker = fn.safe_ids;
            return marker === undefined || marker === tw.safe_ids;
        }

        function walk_fn_def(tw, fn) {
            var was_scanning = tw.fn_scanning;
            tw.fn_scanning = fn;
            fn.walk(tw);
            tw.fn_scanning = was_scanning;
        }

        function revisit_fn_def(tw, fn) {
            fn.enclosed.forEach(function(d) {
                if (fn.variables.get(d.name) === d) return;
                if (safe_to_read(tw, d)) return;
                d.single_use = false;
                var fixed = d.fixed;
                if (typeof fixed == "function") fixed = fixed();
                if (fixed instanceof AST_Lambda) {
                    var safe_ids = fixed.safe_ids;
                    switch (safe_ids) {
                      case null:
                      case false:
                        return;
                      default:
                        if (safe_ids && safe_ids.seq !== tw.safe_ids.seq) return;
                    }
                }
                d.fixed = false;
            });
        }

        function mark_fn_def(tw, def, fn) {
            var marker = fn.safe_ids;
            if (marker === undefined) return;
            if (marker === false) return;
            if (fn.parent_scope.resolve().may_call_this === return_true) {
                if (member(fn, tw.fn_visited)) revisit_fn_def(tw, fn);
            } else if (marker) {
                var visited = member(fn, tw.fn_visited);
                if (marker === tw.safe_ids) {
                    if (!visited) walk_fn_def(tw, fn);
                } else if (visited) {
                    revisit_fn_def(tw, fn);
                } else {
                    fn.safe_ids = false;
                }
            } else if (tw.fn_scanning && tw.fn_scanning !== def.scope.resolve()) {
                fn.safe_ids = false;
            } else {
                fn.safe_ids = tw.safe_ids;
                walk_fn_def(tw, fn);
            }
        }

        function pop_scope(tw, scope) {
            pop(tw);
            var fn_defs = scope.fn_defs;
            fn_defs.forEach(function(fn) {
                fn.safe_ids = tw.safe_ids;
                walk_fn_def(tw, fn);
            });
            fn_defs.forEach(function(fn) {
                fn.safe_ids = undefined;
            });
            scope.fn_defs = undefined;
            scope.may_call_this = undefined;
        }

        function push(tw, sequential, conditional) {
            var defined_ids = Object.create(tw.defined_ids);
            if (!sequential || conditional) defined_ids.seq = Object.create(null);
            tw.defined_ids = defined_ids;
            var safe_ids = Object.create(tw.safe_ids);
            if (!sequential) safe_ids.seq = {};
            if (conditional) safe_ids.cond = true;
            tw.safe_ids = safe_ids;
        }

        function pop(tw) {
            tw.defined_ids = Object.getPrototypeOf(tw.defined_ids);
            tw.safe_ids = Object.getPrototypeOf(tw.safe_ids);
        }

        function access(tw, def) {
            var seq = tw.defined_ids.seq;
            tw.defined_ids[def.id] = seq;
            seq[def.id] = true;
        }

        function assign(tw, def) {
            var seq = tw.defined_ids.seq;
            tw.assigned_ids[def.id] = seq;
            seq[def.id] = false;
        }

        function safe_to_access(tw, def) {
            var seq = tw.defined_ids.seq;
            var defined = tw.defined_ids[def.id];
            if (defined !== seq) return false;
            if (!defined[def.id]) return false;
            var assigned = tw.assigned_ids[def.id];
            return !assigned || assigned === seq;
        }

        function mark(tw, def) {
            tw.safe_ids[def.id] = {};
        }

        function push_ref(def, ref) {
            def.references.push(ref);
            if (def.last_ref !== false) def.last_ref = ref;
        }

        function safe_to_read(tw, def) {
            if (def.single_use == "m") return false;
            var safe = tw.safe_ids[def.id];
            if (safe) {
                var in_order = HOP(tw.safe_ids, def.id);
                if (!in_order) {
                    var seq = tw.safe_ids.seq;
                    if (!safe.read) {
                        safe.read = seq;
                    } else if (safe.read !== seq) {
                        safe.read = true;
                    }
                }
                if (def.fixed == null) {
                    if (is_arguments(def)) return false;
                    if (def.global && def.name == "arguments") return false;
                    tw.loop_ids[def.id] = null;
                    def.fixed = make_node(AST_Undefined, def.orig[0]);
                    if (in_order) def.safe_ids = undefined;
                    return true;
                }
                return !safe.assign || safe.assign === tw.safe_ids;
            }
            return def.fixed instanceof AST_LambdaDefinition;
        }

        function safe_to_assign(tw, def, declare) {
            if (!declare) {
                if (is_funarg(def) && def.scope.uses_arguments && !tw.has_directive("use strict")) return false;
                if (!all(def.orig, function(sym) {
                    return !(sym instanceof AST_SymbolConst);
                })) return false;
            }
            if (def.fixed === undefined) return declare || all(def.orig, function(sym) {
                return !(sym instanceof AST_SymbolLet);
            });
            if (def.fixed === false || def.fixed === 0) return false;
            var safe = tw.safe_ids[def.id];
            if (def.safe_ids) {
                def.safe_ids[def.id] = false;
                def.safe_ids = undefined;
                return def.fixed === null || HOP(tw.safe_ids, def.id) && !safe.read;
            }
            if (!HOP(tw.safe_ids, def.id)) {
                if (!safe) return false;
                if (safe.read || tw.in_loop) {
                    var scope = tw.find_parent(AST_BlockScope);
                    if (scope instanceof AST_Class) return false;
                    if (def.scope.resolve() !== scope.resolve()) return false;
                }
                safe.assign = safe.assign && safe.assign !== tw.safe_ids ? true : tw.safe_ids;
            }
            if (def.fixed != null && safe.read) {
                if (safe.read !== tw.safe_ids.seq) return false;
                if (tw.loop_ids[def.id] !== tw.in_loop) return false;
            }
            return safe_to_read(tw, def) && all(def.orig, function(sym) {
                return !(sym instanceof AST_SymbolLambda);
            });
        }

        function ref_once(compressor, def) {
            return compressor.option("unused")
                && !def.scope.pinned()
                && def.single_use !== false
                && def.references.length - def.recursive_refs == 1
                && !(is_funarg(def) && def.scope.uses_arguments);
        }

        function is_immutable(value) {
            if (!value) return false;
            if (value instanceof AST_Assign) {
                var op = value.operator;
                return op == "=" ? is_immutable(value.right) : !lazy_op[op.slice(0, -1)];
            }
            if (value instanceof AST_Sequence) return is_immutable(value.tail_node());
            return value.is_constant() || is_lambda(value) || value instanceof AST_ObjectIdentity;
        }

        function value_in_use(node, parent) {
            if (parent instanceof AST_Array) return true;
            if (parent instanceof AST_Binary) return lazy_op[parent.operator];
            if (parent instanceof AST_Conditional) return parent.condition !== node;
            if (parent instanceof AST_Sequence) return parent.tail_node() === node;
            if (parent instanceof AST_Spread) return true;
        }

        function mark_escaped(tw, d, scope, node, value, level, depth) {
            var parent = tw.parent(level);
            if (value && value.is_constant()) return;
            if (has_escaped(d, scope, node, parent)) {
                d.escaped.push(parent);
                if (depth > 1 && !(value && value.is_constant_expression(scope))) depth = 1;
                if (!d.escaped.depth || d.escaped.depth > depth) d.escaped.depth = depth;
                if (d.scope.resolve() !== scope.resolve()) d.escaped.cross_scope = true;
                if (d.fixed) d.fixed.escaped = d.escaped;
                return;
            } else if (value_in_use(node, parent)) {
                mark_escaped(tw, d, scope, parent, parent, level + 1, depth);
            } else if (parent instanceof AST_ObjectKeyVal && parent.value === node) {
                var obj = tw.parent(level + 1);
                mark_escaped(tw, d, scope, obj, obj, level + 2, depth);
            } else if (parent instanceof AST_PropAccess && parent.expression === node) {
                value = read_property(value, parent);
                mark_escaped(tw, d, scope, parent, value, level + 1, depth + 1);
                if (value) return;
            }
            if (level > 0) return;
            if (parent instanceof AST_Call && parent.expression === node) return;
            if (parent instanceof AST_Sequence && parent.tail_node() !== node) return;
            if (parent instanceof AST_SimpleStatement) return;
            if (parent instanceof AST_Unary && !unary_side_effects[parent.operator]) return;
            d.direct_access = true;
            if (d.fixed) d.fixed.direct_access = true;
        }

        function mark_assignment_to_arguments(node) {
            if (!(node instanceof AST_Sub)) return;
            var expr = node.expression;
            if (!(expr instanceof AST_SymbolRef)) return;
            var def = expr.definition();
            if (!is_arguments(def)) return;
            var key = node.property;
            if (key.is_constant()) key = key.value;
            if (!(key instanceof AST_Node) && !RE_POSITIVE_INTEGER.test(key)) return;
            def.reassigned++;
            (key instanceof AST_Node ? def.scope.argnames : [ def.scope.argnames[key] ]).forEach(function(argname) {
                if (argname instanceof AST_SymbolFunarg) argname.definition().fixed = false;
            });
        }

        function make_fixed(save, fn) {
            var prev_save, prev_value;
            return function() {
                var current = save();
                if (prev_save !== current) {
                    prev_save = current;
                    prev_value = fn(current);
                }
                return prev_value;
            };
        }

        function make_fixed_default(compressor, node, save) {
            var prev_save, prev_seq;
            return function() {
                if (prev_seq === node) return node;
                var current = save();
                var ev = fuzzy_eval(compressor, current, true);
                if (ev instanceof AST_Node) {
                    prev_seq = node;
                } else if (prev_save !== current) {
                    prev_save = current;
                    prev_seq = ev === undefined ? make_sequence(node, [ current, node.value ]) : current;
                }
                return prev_seq;
            };
        }

        function scan_declaration(tw, compressor, lhs, fixed, visit) {
            var scanner = new TreeWalker(function(node) {
                if (node instanceof AST_DefaultValue) {
                    reset_flags(node);
                    push(tw, true, true);
                    node.value.walk(tw);
                    pop(tw);
                    var save = fixed;
                    if (save) fixed = make_fixed_default(compressor, node, save);
                    node.name.walk(scanner);
                    fixed = save;
                    return true;
                }
                if (node instanceof AST_DestructuredArray) {
                    reset_flags(node);
                    var save = fixed;
                    node.elements.forEach(function(node, index) {
                        if (node instanceof AST_Hole) return reset_flags(node);
                        if (save) fixed = make_fixed(save, function(value) {
                            return make_node(AST_Sub, node, {
                                expression: value,
                                property: make_node(AST_Number, node, { value: index }),
                            });
                        });
                        node.walk(scanner);
                    });
                    if (node.rest) {
                        var fixed_node;
                        if (save) fixed = compressor.option("rests") && make_fixed(save, function(value) {
                            if (!(value instanceof AST_Array)) return node;
                            for (var i = 0, len = node.elements.length; i < len; i++) {
                                if (value.elements[i] instanceof AST_Spread) return node;
                            }
                            if (!fixed_node) fixed_node = make_node(AST_Array, node, {});
                            fixed_node.elements = value.elements.slice(len);
                            return fixed_node;
                        });
                        node.rest.walk(scanner);
                    }
                    fixed = save;
                    return true;
                }
                if (node instanceof AST_DestructuredObject) {
                    reset_flags(node);
                    var save = fixed;
                    node.properties.forEach(function(node) {
                        reset_flags(node);
                        if (node.key instanceof AST_Node) {
                            push(tw);
                            node.key.walk(tw);
                            pop(tw);
                        }
                        if (save) fixed = make_fixed(save, function(value) {
                            var key = node.key;
                            var type = AST_Sub;
                            if (typeof key == "string") {
                                if (is_identifier_string(key)) {
                                    type = AST_Dot;
                                } else {
                                    key = make_node_from_constant(key, node);
                                }
                            }
                            return make_node(type, node, {
                                expression: value,
                                property: key,
                            });
                        });
                        node.value.walk(scanner);
                    });
                    if (node.rest) {
                        fixed = false;
                        node.rest.walk(scanner);
                    }
                    fixed = save;
                    return true;
                }
                visit(node, fixed, function() {
                    var save_len = tw.stack.length;
                    for (var i = 0, len = scanner.stack.length - 1; i < len; i++) {
                        tw.stack.push(scanner.stack[i]);
                    }
                    node.walk(tw);
                    tw.stack.length = save_len;
                });
                return true;
            });
            lhs.walk(scanner);
        }

        function reduce_iife(tw, descend, compressor) {
            var fn = this;
            fn.inlined = false;
            var iife = tw.parent();
            var sequential = !is_async(fn) && !is_generator(fn);
            var hit = !sequential;
            var aborts = false;
            fn.walk(new TreeWalker(function(node) {
                if (hit) return aborts = true;
                if (node instanceof AST_Return) return hit = true;
                if (node instanceof AST_Scope && node !== fn) return true;
            }));
            if (aborts) push(tw, sequential);
            reset_variables(tw, compressor, fn);
            // Virtually turn IIFE parameters into variable definitions:
            //   (function(a,b) {...})(c,d) ---> (function() {var a=c,b=d; ...})()
            // So existing transformation rules can work on them.
            var safe = !fn.uses_arguments || tw.has_directive("use strict");
            fn.argnames.forEach(function(argname, i) {
                var value = iife.args[i];
                scan_declaration(tw, compressor, argname, function() {
                    var j = fn.argnames.indexOf(argname);
                    var arg = j < 0 ? value : iife.args[j];
                    if (arg instanceof AST_Sequence && arg.expressions.length < 2) arg = arg.expressions[0];
                    return arg || make_node(AST_Undefined, iife);
                }, visit);
            });
            var rest = fn.rest, fixed_node;
            if (rest) scan_declaration(tw, compressor, rest, compressor.option("rests") && function() {
                if (fn.rest !== rest) return rest;
                if (!fixed_node) fixed_node = make_node(AST_Array, fn, {});
                fixed_node.elements = iife.args.slice(fn.argnames.length);
                return fixed_node;
            }, visit);
            walk_lambda(fn, tw);
            var defined_ids = tw.defined_ids;
            var safe_ids = tw.safe_ids;
            pop_scope(tw, fn);
            if (!aborts) {
                tw.defined_ids = defined_ids;
                tw.safe_ids = safe_ids;
            }
            return true;

            function visit(node, fixed) {
                var d = node.definition();
                if (!d.first_decl && d.references.length == 0) d.first_decl = node;
                if (fixed && safe && d.fixed === undefined) {
                    mark(tw, d);
                    tw.loop_ids[d.id] = tw.in_loop;
                    d.fixed = fixed;
                    d.fixed.assigns = [ node ];
                } else {
                    d.fixed = false;
                }
            }
        }

        def(AST_Assign, function(tw, descend, compressor) {
            var node = this;
            var left = node.left;
            var right = node.right;
            var ld = left instanceof AST_SymbolRef && left.definition();
            var scan = ld || left instanceof AST_Destructured;
            switch (node.operator) {
              case "=":
                if (left.equals(right) && !left.has_side_effects(compressor)) {
                    right.walk(tw);
                    walk_prop(left);
                    return true;
                }
                if (ld && right instanceof AST_LambdaExpression) {
                    walk_assign();
                    right.parent_scope.resolve().fn_defs.push(right);
                    right.safe_ids = null;
                    if (!ld.fixed || !node.write_only || tw.safe_ids.cond) mark_fn_def(tw, ld, right);
                    return true;
                }
                if (scan) {
                    right.walk(tw);
                    walk_assign();
                    return true;
                }
                mark_assignment_to_arguments(left);
                return;
              case "&&=":
              case "||=":
              case "??=":
                var lazy = true;
              default:
                if (!scan) {
                    mark_assignment_to_arguments(left);
                    return walk_lazy();
                }
                assign(tw, ld);
                ld.assignments++;
                var fixed = ld.fixed;
                if (is_modified(compressor, tw, node, node, 0)) {
                    ld.fixed = false;
                    return walk_lazy();
                }
                var safe = safe_to_read(tw, ld);
                if (lazy) push(tw, true, true);
                right.walk(tw);
                if (lazy) pop(tw);
                if (safe && !left.in_arg && safe_to_assign(tw, ld)) {
                    push_ref(ld, left);
                    mark(tw, ld);
                    if (ld.single_use) ld.single_use = false;
                    left.fixed = ld.fixed = function() {
                        return make_node(AST_Binary, node, {
                            operator: node.operator.slice(0, -1),
                            left: make_ref(left, fixed),
                            right: node.right,
                        });
                    };
                    left.fixed.assigns = !fixed || !fixed.assigns ? [ ld.orig[0] ] : fixed.assigns.slice();
                    left.fixed.assigns.push(node);
                    left.fixed.to_binary = replace_ref(function(node) {
                        return node.left;
                    }, fixed);
                } else {
                    left.walk(tw);
                    ld.fixed = false;
                }
                return true;
            }

            function walk_prop(lhs) {
                reset_flags(lhs);
                if (lhs instanceof AST_Dot) {
                    walk_prop(lhs.expression);
                } else if (lhs instanceof AST_Sub) {
                    walk_prop(lhs.expression);
                    lhs.property.walk(tw);
                } else if (lhs instanceof AST_SymbolRef) {
                    var d = lhs.definition();
                    push_ref(d, lhs);
                    if (d.fixed) {
                        lhs.fixed = d.fixed;
                        if (lhs.fixed.assigns) {
                            lhs.fixed.assigns.push(node);
                        } else {
                            lhs.fixed.assigns = [ node ];
                        }
                    }
                } else {
                    lhs.walk(tw);
                }
            }

            function walk_assign() {
                var recursive = ld && recursive_ref(tw, ld);
                var modified = is_modified(compressor, tw, node, right, 0, is_immutable(right), recursive);
                scan_declaration(tw, compressor, left, function() {
                    return node.right;
                }, function(sym, fixed, walk) {
                    if (!(sym instanceof AST_SymbolRef)) {
                        mark_assignment_to_arguments(sym);
                        walk();
                        return;
                    }
                    var d = sym.definition();
                    assign(tw, d);
                    d.assignments++;
                    if (!fixed || sym.in_arg || !safe_to_assign(tw, d)) {
                        walk();
                        d.fixed = false;
                    } else {
                        push_ref(d, sym);
                        mark(tw, d);
                        if (left instanceof AST_Destructured
                            || d.orig.length == 1 && d.orig[0] instanceof AST_SymbolDefun) {
                            d.single_use = false;
                        }
                        tw.loop_ids[d.id] = tw.in_loop;
                        d.fixed = modified ? 0 : fixed;
                        sym.fixed = fixed;
                        sym.fixed.assigns = [ node ];
                        mark_escaped(tw, d, sym.scope, node, right, 0, 1);
                    }
                });
            }

            function walk_lazy() {
                if (!lazy) return;
                left.walk(tw);
                push(tw, true, true);
                right.walk(tw);
                pop(tw);
                return true;
            }
        });
        def(AST_Binary, function(tw) {
            if (!lazy_op[this.operator]) return;
            this.left.walk(tw);
            push(tw, true, true);
            this.right.walk(tw);
            pop(tw);
            return true;
        });
        def(AST_BlockScope, function(tw, descend, compressor) {
            reset_block_variables(tw, compressor, this);
        });
        def(AST_Call, function(tw) {
            var node = this;
            var exp = node.expression;
            if (exp instanceof AST_LambdaExpression) {
                var iife = is_iife_single(node);
                node.args.forEach(function(arg) {
                    arg.walk(tw);
                    if (arg instanceof AST_Spread) iife = false;
                });
                if (iife) exp.reduce_vars = reduce_iife;
                exp.walk(tw);
                if (iife) delete exp.reduce_vars;
                return true;
            }
            if (node.TYPE == "Call") switch (tw.in_boolean_context()) {
              case "d":
                var drop = true;
              case true:
                mark_refs(exp, drop);
            }
            exp.walk(tw);
            var optional = node.optional;
            if (optional) push(tw, true, true);
            node.args.forEach(function(arg) {
                arg.walk(tw);
            });
            if (optional) pop(tw);
            var fixed = exp instanceof AST_SymbolRef && exp.fixed_value();
            if (fixed instanceof AST_Lambda) {
                mark_fn_def(tw, exp.definition(), fixed);
            } else {
                tw.defined_ids.seq = {};
                tw.find_parent(AST_Scope).may_call_this();
            }
            return true;

            function mark_refs(node, drop) {
                if (node instanceof AST_Assign) {
                    if (node.operator != "=") return;
                    mark_refs(node.left, drop);
                    mark_refs(node.right, drop);
                } else if (node instanceof AST_Binary) {
                    if (!lazy_op[node.operator]) return;
                    mark_refs(node.left, drop);
                    mark_refs(node.right, drop);
                } else if (node instanceof AST_Conditional) {
                    mark_refs(node.consequent, drop);
                    mark_refs(node.alternative, drop);
                } else if (node instanceof AST_SymbolRef) {
                    var def = node.definition();
                    def.bool_return++;
                    if (drop) def.drop_return++;
                }
            }
        });
        def(AST_Class, function(tw, descend, compressor) {
            var node = this;
            reset_block_variables(tw, compressor, node);
            if (node.extends) node.extends.walk(tw);
            var props = node.properties.filter(function(prop) {
                reset_flags(prop);
                if (prop.key instanceof AST_Node) {
                    tw.push(prop);
                    prop.key.walk(tw);
                    tw.pop();
                }
                return prop.value;
            });
            if (node.name) {
                var d = node.name.definition();
                var parent = tw.parent();
                if (parent instanceof AST_ExportDeclaration || parent instanceof AST_ExportDefault) d.single_use = false;
                if (safe_to_assign(tw, d, true)) {
                    mark(tw, d);
                    tw.loop_ids[d.id] = tw.in_loop;
                    d.fixed = function() {
                        return node;
                    };
                    d.fixed.assigns = [ node ];
                    if (!is_safe_lexical(d)) d.single_use = false;
                } else {
                    d.fixed = false;
                }
            }
            props.forEach(function(prop) {
                tw.push(prop);
                if (!prop.static || is_static_field_or_init(prop) && prop.value.contains_this()) {
                    push(tw);
                    prop.value.walk(tw);
                    pop(tw);
                } else {
                    prop.value.walk(tw);
                }
                tw.pop();
            });
            return true;
        });
        def(AST_ClassInitBlock, function(tw, descend, compressor) {
            var node = this;
            push(tw, true);
            reset_variables(tw, compressor, node);
            descend();
            pop_scope(tw, node);
            return true;
        });
        def(AST_Conditional, function(tw) {
            this.condition.walk(tw);
            push(tw, true, true);
            this.consequent.walk(tw);
            pop(tw);
            push(tw, true, true);
            this.alternative.walk(tw);
            pop(tw);
            return true;
        });
        def(AST_DefaultValue, function(tw) {
            push(tw, true, true);
            this.value.walk(tw);
            pop(tw);
            this.name.walk(tw);
            return true;
        });
        def(AST_Do, function(tw) {
            var save_loop = tw.in_loop;
            tw.in_loop = this;
            push(tw);
            this.body.walk(tw);
            if (has_loop_control(this, tw.parent())) {
                pop(tw);
                push(tw);
            }
            this.condition.walk(tw);
            pop(tw);
            tw.in_loop = save_loop;
            return true;
        });
        def(AST_Dot, function(tw, descend) {
            descend();
            var node = this;
            var expr = node.expression;
            if (!node.optional) {
                while (expr instanceof AST_Assign && expr.operator == "=") {
                    var lhs = expr.left;
                    if (lhs instanceof AST_SymbolRef) access(tw, lhs.definition());
                    expr = expr.right;
                }
                if (expr instanceof AST_SymbolRef) access(tw, expr.definition());
            }
            return true;
        });
        def(AST_For, function(tw, descend, compressor) {
            var node = this;
            reset_block_variables(tw, compressor, node);
            if (node.init) node.init.walk(tw);
            var save_loop = tw.in_loop;
            tw.in_loop = node;
            push(tw);
            if (node.condition) node.condition.walk(tw);
            node.body.walk(tw);
            if (node.step) {
                if (has_loop_control(node, tw.parent())) {
                    pop(tw);
                    push(tw);
                }
                node.step.walk(tw);
            }
            pop(tw);
            tw.in_loop = save_loop;
            return true;
        });
        def(AST_ForEnumeration, function(tw, descend, compressor) {
            var node = this;
            reset_block_variables(tw, compressor, node);
            node.object.walk(tw);
            var save_loop = tw.in_loop;
            tw.in_loop = node;
            push(tw);
            var init = node.init;
            if (init instanceof AST_Definitions) {
                init.definitions[0].name.mark_symbol(function(node) {
                    if (node instanceof AST_SymbolDeclaration) {
                        var def = node.definition();
                        def.assignments++;
                        def.fixed = false;
                    }
                }, tw);
            } else if (init instanceof AST_Destructured || init instanceof AST_SymbolRef) {
                init.mark_symbol(function(node) {
                    if (node instanceof AST_SymbolRef) {
                        var def = node.definition();
                        push_ref(def, node);
                        def.assignments++;
                        if (!node.is_immutable()) def.fixed = false;
                    }
                }, tw);
            } else {
                init.walk(tw);
            }
            node.body.walk(tw);
            pop(tw);
            tw.in_loop = save_loop;
            return true;
        });
        def(AST_If, function(tw) {
            this.condition.walk(tw);
            push(tw, true, true);
            this.body.walk(tw);
            pop(tw);
            if (this.alternative) {
                push(tw, true, true);
                this.alternative.walk(tw);
                pop(tw);
            }
            return true;
        });
        def(AST_LabeledStatement, function(tw) {
            push(tw, true);
            this.body.walk(tw);
            pop(tw);
            return true;
        });
        def(AST_Lambda, function(tw, descend, compressor) {
            var fn = this;
            if (!safe_to_visit(tw, fn)) return true;
            if (!push_uniq(tw.fn_visited, fn)) return true;
            fn.inlined = false;
            push(tw);
            reset_variables(tw, compressor, fn);
            descend();
            pop_scope(tw, fn);
            if (fn.name) mark_escaped(tw, fn.name.definition(), fn, fn.name, fn, 0, 1);
            return true;
        });
        def(AST_LambdaDefinition, function(tw, descend, compressor) {
            var fn = this;
            var def = fn.name.definition();
            if (!safe_to_trim(fn)) def.fixed = false;
            var parent = tw.parent();
            if (parent instanceof AST_ExportDeclaration || parent instanceof AST_ExportDefault) def.single_use = false;
            if (!safe_to_visit(tw, fn)) return true;
            if (!push_uniq(tw.fn_visited, fn)) return true;
            fn.inlined = false;
            push(tw);
            reset_variables(tw, compressor, fn);
            descend();
            pop_scope(tw, fn);
            return true;
        });
        def(AST_Sub, function(tw, descend) {
            var node = this;
            var expr = node.expression;
            if (node.optional) {
                expr.walk(tw);
                push(tw, true, true);
                node.property.walk(tw);
                pop(tw);
            } else {
                descend();
                while (expr instanceof AST_Assign && expr.operator == "=") {
                    var lhs = expr.left;
                    if (lhs instanceof AST_SymbolRef) access(tw, lhs.definition());
                    expr = expr.right;
                }
                if (expr instanceof AST_SymbolRef) access(tw, expr.definition());
            }
            return true;
        });
        def(AST_Switch, function(tw, descend, compressor) {
            var node = this;
            reset_block_variables(tw, compressor, node);
            node.expression.walk(tw);
            var first = true;
            node.body.forEach(function(branch) {
                if (branch instanceof AST_Default) return;
                branch.expression.walk(tw);
                if (first) {
                    first = false;
                    push(tw, true, true);
                }
            });
            if (!first) pop(tw);
            walk_body(node, tw);
            return true;
        });
        def(AST_SwitchBranch, function(tw) {
            push(tw, true, true);
            walk_body(this, tw);
            pop(tw);
            return true;
        });
        def(AST_SymbolCatch, function() {
            var d = this.definition();
            if (!d.first_decl && d.references.length == 0) d.first_decl = this;
            d.fixed = false;
        });
        def(AST_SymbolDeclaration, function() {
            var d = this.definition();
            if (!d.first_decl && d.references.length == 0) d.first_decl = this;
        });
        def(AST_SymbolDefun, function() {
            var d = this.definition();
            if (!d.first_decl && d.references.length == 0) d.first_decl = this;
            if (d.orig.length > 1 && d.scope.resolve() !== this.scope) d.fixed = false;
        });
        def(AST_SymbolImport, function() {
            var d = this.definition();
            d.first_decl = this;
            d.fixed = false;
        });
        def(AST_SymbolRef, function(tw, descend, compressor) {
            var ref = this;
            var d = ref.definition();
            var fixed = d.fixed || d.last_ref && d.last_ref.fixed;
            push_ref(d, ref);
            if (safe_to_access(tw, d)) ref.defined = true;
            if (d.references.length == 1 && !d.fixed && d.orig[0] instanceof AST_SymbolDefun) {
                tw.loop_ids[d.id] = tw.in_loop;
            }
            var recursive = recursive_ref(tw, d);
            if (recursive) recursive.enclosed.forEach(function(def) {
                if (d === def) return;
                if (def.scope.resolve() === recursive) return;
                var assigns = def.fixed && def.fixed.assigns;
                if (!assigns) return;
                if (assigns[assigns.length - 1] instanceof AST_VarDef) return;
                var safe = tw.safe_ids[def.id];
                if (!safe) return;
                safe.assign = true;
            });
            if (d.single_use == "m" && d.fixed) {
                d.fixed = 0;
                d.single_use = false;
            }
            switch (d.fixed) {
              case 0:
                if (!safe_to_read(tw, d)) d.fixed = false;
              case false:
                var redef = d.redefined();
                if (redef && cross_scope(d.scope, ref.scope)) redef.single_use = false;
                break;
              case undefined:
                d.fixed = false;
                break;
              default:
                if (!safe_to_read(tw, d)) {
                    d.fixed = false;
                    break;
                }
                if (ref.in_arg && d.orig[0] instanceof AST_SymbolLambda) ref.fixed = d.scope;
                var value = ref.fixed_value();
                if (recursive) {
                    d.recursive_refs++;
                } else if (value && ref_once(compressor, d)) {
                    d.in_loop = tw.loop_ids[d.id] !== tw.in_loop;
                    d.single_use = is_lambda(value)
                            && !value.pinned()
                            && (!d.in_loop || tw.parent() instanceof AST_Call)
                        || !d.in_loop
                            && d.scope === ref.scope.resolve()
                            && value.is_constant_expression();
                } else {
                    d.single_use = false;
                }
                if (is_modified(compressor, tw, ref, value, 0, is_immutable(value), recursive)) {
                    if (d.single_use) {
                        d.single_use = "m";
                    } else {
                        d.fixed = 0;
                    }
                }
                if (d.fixed && tw.loop_ids[d.id] !== tw.in_loop) d.cross_loop = true;
                mark_escaped(tw, d, ref.scope, ref, value, 0, 1);
                break;
            }
            if (!ref.fixed) ref.fixed = d.fixed === 0 ? fixed : d.fixed;
            if (!value && fixed) value = fixed instanceof AST_Node ? fixed : fixed();
            if (!(value instanceof AST_Lambda)) return;
            if (d.fixed) {
                var parent = tw.parent();
                if (parent instanceof AST_Call && parent.expression === ref) return;
            }
            mark_fn_def(tw, d, value);
        });
        def(AST_Template, function(tw) {
            var node = this;
            var tag = node.tag;
            if (!tag) return;
            if (tag instanceof AST_LambdaExpression) {
                node.expressions.forEach(function(exp) {
                    exp.walk(tw);
                });
                tag.walk(tw);
                return true;
            }
            tag.walk(tw);
            node.expressions.forEach(function(exp) {
                exp.walk(tw);
            });
            var fixed = tag instanceof AST_SymbolRef && tag.fixed_value();
            if (fixed instanceof AST_Lambda) {
                mark_fn_def(tw, tag.definition(), fixed);
            } else {
                tw.find_parent(AST_Scope).may_call_this();
            }
            return true;
        });
        def(AST_Toplevel, function(tw, descend, compressor) {
            var node = this;
            node.globals.each(function(def) {
                reset_def(tw, compressor, def);
            });
            push(tw, true);
            reset_variables(tw, compressor, node);
            descend();
            pop_scope(tw, node);
            return true;
        });
        def(AST_Try, function(tw, descend, compressor) {
            var node = this;
            reset_block_variables(tw, compressor, node);
            push(tw, true);
            walk_body(node, tw);
            pop(tw);
            if (node.bcatch) {
                push(tw, true, true);
                node.bcatch.walk(tw);
                pop(tw);
            }
            if (node.bfinally) node.bfinally.walk(tw);
            return true;
        });
        def(AST_Unary, function(tw) {
            var node = this;
            if (!UNARY_POSTFIX[node.operator]) return;
            var exp = node.expression;
            if (!(exp instanceof AST_SymbolRef)) {
                mark_assignment_to_arguments(exp);
                return;
            }
            var d = exp.definition();
            d.assignments++;
            var fixed = d.fixed;
            if (safe_to_read(tw, d) && !exp.in_arg && safe_to_assign(tw, d)) {
                push_ref(d, exp);
                mark(tw, d);
                if (d.single_use) d.single_use = false;
                d.fixed = function() {
                    return make_node(AST_Binary, node, {
                        operator: node.operator.slice(0, -1),
                        left: make_node(AST_UnaryPrefix, node, {
                            operator: "+",
                            expression: make_ref(exp, fixed),
                        }),
                        right: make_node(AST_Number, node, { value: 1 }),
                    });
                };
                d.fixed.assigns = fixed && fixed.assigns ? fixed.assigns.slice() : [];
                d.fixed.assigns.push(node);
                if (node instanceof AST_UnaryPrefix) {
                    exp.fixed = d.fixed;
                } else {
                    exp.fixed = function() {
                        return make_node(AST_UnaryPrefix, node, {
                            operator: "+",
                            expression: make_ref(exp, fixed),
                        });
                    };
                    exp.fixed.assigns = fixed && fixed.assigns;
                    exp.fixed.to_prefix = replace_ref(function(node) {
                        return node.expression;
                    }, d.fixed);
                }
            } else {
                exp.walk(tw);
                d.fixed = false;
            }
            return true;
        });
        def(AST_VarDef, function(tw, descend, compressor) {
            var node = this;
            var value = node.value;
            if (value instanceof AST_LambdaExpression && node.name instanceof AST_SymbolDeclaration) {
                walk_defn();
                value.parent_scope.resolve().fn_defs.push(value);
                value.safe_ids = null;
                var ld = node.name.definition();
                if (!ld.fixed) mark_fn_def(tw, ld, value);
            } else if (value) {
                value.walk(tw);
                walk_defn();
            } else if (tw.parent() instanceof AST_Let) {
                walk_defn();
            } else {
                node.name.walk(tw);
            }
            return true;

            function walk_defn() {
                scan_declaration(tw, compressor, node.name, function() {
                    return node.value || make_node(AST_Undefined, node);
                }, function(name, fixed) {
                    var d = name.definition();
                    assign(tw, d);
                    if (!d.first_decl && d.references.length == 0) d.first_decl = name;
                    if (fixed && safe_to_assign(tw, d, true)) {
                        mark(tw, d);
                        tw.loop_ids[d.id] = tw.in_loop;
                        d.fixed = fixed;
                        d.fixed.assigns = [ node ];
                        if (name instanceof AST_SymbolConst && d.redefined()
                            || !(can_drop_symbol(name) || is_safe_lexical(d))) {
                            d.single_use = false;
                        }
                    } else {
                        d.fixed = false;
                    }
                });
            }
        });
        def(AST_While, function(tw, descend) {
            var save_loop = tw.in_loop;
            tw.in_loop = this;
            push(tw);
            descend();
            pop(tw);
            tw.in_loop = save_loop;
            return true;
        });
    })(function(node, func) {
        node.DEFMETHOD("reduce_vars", func);
    });

    function reset_flags(node) {
        node._squeezed = false;
        node._optimized = false;
        node.single_use = false;
        if (node instanceof AST_BlockScope) node._var_names = undefined;
        if (node instanceof AST_SymbolRef) node.fixed = undefined;
    }

    AST_Toplevel.DEFMETHOD("reset_opt_flags", function(compressor) {
        var tw = new TreeWalker(compressor.option("reduce_vars") ? function(node, descend) {
            reset_flags(node);
            return node.reduce_vars(tw, descend, compressor);
        } : reset_flags);
        // Side-effect tracking on sequential property access
        tw.assigned_ids = Object.create(null);
        tw.defined_ids = Object.create(null);
        tw.defined_ids.seq = {};
        // Flow control for visiting lambda definitions
        tw.fn_scanning = null;
        tw.fn_visited = [];
        // Record the loop body in which `AST_SymbolDeclaration` is first encountered
        tw.in_loop = null;
        tw.loop_ids = Object.create(null);
        // Stack of look-up tables to keep track of whether a `SymbolDef` has been
        // properly assigned before use:
        // - `push()` & `pop()` when visiting conditional branches
        // - backup & restore via `save_ids` when visiting out-of-order sections
        tw.safe_ids = Object.create(null);
        tw.safe_ids.seq = {};
        this.walk(tw);
    });

    AST_Symbol.DEFMETHOD("fixed_value", function(ref_only) {
        var def = this.definition();
        var fixed = def.fixed;
        if (fixed) {
            if (this.fixed) fixed = this.fixed;
            return (fixed instanceof AST_Node ? fixed : fixed()).tail_node();
        }
        fixed = fixed === 0 && this.fixed;
        if (!fixed) return fixed;
        var value = (fixed instanceof AST_Node ? fixed : fixed()).tail_node();
        if (ref_only && def.escaped.depth != 1 && is_object(value, true)) return value;
        if (value.is_constant()) return value;
    });

    AST_SymbolRef.DEFMETHOD("is_immutable", function() {
        var def = this.redef || this.definition();
        if (!(def.orig[0] instanceof AST_SymbolLambda)) return false;
        if (def.orig.length == 1) return true;
        if (!this.in_arg) return false;
        return !(def.orig[1] instanceof AST_SymbolFunarg);
    });

    AST_Node.DEFMETHOD("convert_symbol", noop);
    function convert_destructured(type, process) {
        return this.transform(new TreeTransformer(function(node, descend) {
            if (node instanceof AST_DefaultValue) {
                node = node.clone();
                node.name = node.name.transform(this);
                return node;
            }
            if (node instanceof AST_Destructured) {
                node = node.clone();
                descend(node, this);
                return node;
            }
            if (node instanceof AST_DestructuredKeyVal) {
                node = node.clone();
                node.value = node.value.transform(this);
                return node;
            }
            return node.convert_symbol(type, process);
        }));
    }
    AST_DefaultValue.DEFMETHOD("convert_symbol", convert_destructured);
    AST_Destructured.DEFMETHOD("convert_symbol", convert_destructured);
    function convert_symbol(type, process) {
        var node = make_node(type, this);
        return process(node, this) || node;
    }
    AST_SymbolDeclaration.DEFMETHOD("convert_symbol", convert_symbol);
    AST_SymbolRef.DEFMETHOD("convert_symbol", convert_symbol);

    function process_to_assign(ref) {
        var def = ref.definition();
        def.assignments++;
        def.references.push(ref);
    }

    function mark_destructured(process, tw) {
        var marker = new TreeWalker(function(node) {
            if (node instanceof AST_DefaultValue) {
                node.value.walk(tw);
                node.name.walk(marker);
                return true;
            }
            if (node instanceof AST_DestructuredKeyVal) {
                if (node.key instanceof AST_Node) node.key.walk(tw);
                node.value.walk(marker);
                return true;
            }
            return process(node);
        });
        this.walk(marker);
    }
    AST_DefaultValue.DEFMETHOD("mark_symbol", mark_destructured);
    AST_Destructured.DEFMETHOD("mark_symbol", mark_destructured);
    function mark_symbol(process) {
        return process(this);
    }
    AST_SymbolDeclaration.DEFMETHOD("mark_symbol", mark_symbol);
    AST_SymbolRef.DEFMETHOD("mark_symbol", mark_symbol);

    AST_Node.DEFMETHOD("match_symbol", function(predicate) {
        return predicate(this);
    });
    function match_destructured(predicate, ignore_side_effects) {
        var found = false;
        var tw = new TreeWalker(function(node) {
            if (found) return true;
            if (node instanceof AST_DefaultValue) {
                if (!ignore_side_effects) return found = true;
                node.name.walk(tw);
                return true;
            }
            if (node instanceof AST_DestructuredKeyVal) {
                if (!ignore_side_effects && node.key instanceof AST_Node) return found = true;
                node.value.walk(tw);
                return true;
            }
            if (predicate(node)) return found = true;
        });
        this.walk(tw);
        return found;
    }
    AST_DefaultValue.DEFMETHOD("match_symbol", match_destructured);
    AST_Destructured.DEFMETHOD("match_symbol", match_destructured);

    function in_async_generator(scope) {
        return scope instanceof AST_AsyncGeneratorDefun || scope instanceof AST_AsyncGeneratorFunction;
    }

    function find_scope(compressor) {
        var level = 0, node = compressor.self();
        do {
            if (node.variables) return node;
        } while (node = compressor.parent(level++));
    }

    function find_try(compressor, level, node, scope, may_throw, sync) {
        for (var parent; parent = compressor.parent(level++); node = parent) {
            if (parent === scope) return false;
            if (sync && parent instanceof AST_Lambda) {
                if (parent.name || is_async(parent) || is_generator(parent)) return true;
            } else if (parent instanceof AST_Try) {
                if (parent.bfinally && parent.bfinally !== node) return true;
                if (may_throw && parent.bcatch && parent.bcatch !== node) return true;
            }
        }
        return false;
    }

    var identifier_atom = makePredicate("Infinity NaN undefined");
    function is_lhs_read_only(lhs, compressor) {
        if (lhs instanceof AST_Assign) {
            if (lhs.operator != "=") return true;
            if (lhs.right.tail_node().is_constant()) return true;
            return is_lhs_read_only(lhs.left, compressor);
        }
        if (lhs instanceof AST_Atom) return true;
        if (lhs instanceof AST_ObjectIdentity) return true;
        if (lhs instanceof AST_PropAccess) {
            if (lhs.property === "__proto__") return true;
            lhs = lhs.expression;
            if (lhs instanceof AST_SymbolRef) {
                if (lhs.is_immutable()) return false;
                lhs = lhs.fixed_value();
            }
            if (!lhs) return true;
            if (lhs.tail_node().is_constant()) return true;
            return is_lhs_read_only(lhs, compressor);
        }
        if (lhs instanceof AST_SymbolRef) {
            if (lhs.is_immutable()) return true;
            var def = lhs.definition();
            return compressor.exposed(def) && identifier_atom[def.name];
        }
        return false;
    }

    function make_node(ctor, orig, props) {
        if (props) {
            props.start = orig.start;
            props.end = orig.end;
        } else {
            props = orig;
        }
        return new ctor(props);
    }

    function make_sequence(orig, expressions) {
        if (expressions.length == 1) return expressions[0];
        return make_node(AST_Sequence, orig, { expressions: expressions.reduce(merge_sequence, []) });
    }

    function make_node_from_constant(val, orig) {
        switch (typeof val) {
          case "string":
            return make_node(AST_String, orig, { value: val });
          case "number":
            if (isNaN(val)) return make_node(AST_NaN, orig);
            if (isFinite(val)) {
                return 1 / val < 0 ? make_node(AST_UnaryPrefix, orig, {
                    operator: "-",
                    expression: make_node(AST_Number, orig, { value: -val }),
                }) : make_node(AST_Number, orig, { value: val });
            }
            return val < 0 ? make_node(AST_UnaryPrefix, orig, {
                operator: "-",
                expression: make_node(AST_Infinity, orig),
            }) : make_node(AST_Infinity, orig);
          case "boolean":
            return make_node(val ? AST_True : AST_False, orig);
          case "undefined":
            return make_node(AST_Undefined, orig);
          default:
            if (val === null) {
                return make_node(AST_Null, orig);
            }
            if (val instanceof RegExp) {
                return make_node(AST_RegExp, orig, { value: val });
            }
            throw new Error(string_template("Can't handle constant of type: {type}", { type: typeof val }));
        }
    }

    function needs_unbinding(val) {
        return val instanceof AST_PropAccess
            || is_undeclared_ref(val) && val.name == "eval";
    }

    // we shouldn't compress (1,func)(something) to
    // func(something) because that changes the meaning of
    // the func (becomes lexical instead of global).
    function maintain_this_binding(parent, orig, val) {
        var wrap = false;
        if (parent.TYPE == "Call") {
            wrap = parent.expression === orig && needs_unbinding(val);
        } else if (parent instanceof AST_Template) {
            wrap = parent.tag === orig && needs_unbinding(val);
        } else if (parent instanceof AST_UnaryPrefix) {
            wrap = parent.operator == "delete"
                || parent.operator == "typeof" && is_undeclared_ref(val);
        }
        return wrap ? make_sequence(orig, [ make_node(AST_Number, orig, { value: 0 }), val ]) : val;
    }

    function merge_expression(base, target) {
        var fixed_by_id = new Dictionary();
        base.walk(new TreeWalker(function(node) {
            if (!(node instanceof AST_SymbolRef)) return;
            var def = node.definition();
            var fixed = node.fixed;
            if (!fixed || !fixed_by_id.has(def.id)) {
                fixed_by_id.set(def.id, fixed);
            } else if (fixed_by_id.get(def.id) !== fixed) {
                fixed_by_id.set(def.id, false);
            }
        }));
        if (fixed_by_id.size() > 0) target.walk(new TreeWalker(function(node) {
            if (!(node instanceof AST_SymbolRef)) return;
            var def = node.definition();
            var fixed = node.fixed;
            if (!fixed || !fixed_by_id.has(def.id)) return;
            if (fixed_by_id.get(def.id) !== fixed) node.fixed = false;
        }));
        return target;
    }

    function merge_sequence(array, node) {
        if (node instanceof AST_Sequence) {
            [].push.apply(array, node.expressions);
        } else {
            array.push(node);
        }
        return array;
    }

    function is_lexical_definition(stat) {
        return stat instanceof AST_Const || stat instanceof AST_DefClass || stat instanceof AST_Let;
    }

    function safe_to_trim(stat) {
        if (stat instanceof AST_LambdaDefinition) {
            var def = stat.name.definition();
            var scope = stat.name.scope;
            if (def.orig.length > 1 && def.scope.resolve() !== scope) return false;
            return def.scope === scope || all(def.references, function(ref) {
                var s = ref.scope;
                do {
                    if (s === scope) return true;
                } while (s = s.parent_scope);
            });
        }
        return !is_lexical_definition(stat);
    }

    function as_statement_array(thing) {
        if (thing === null) return [];
        if (thing instanceof AST_BlockStatement) return all(thing.body, safe_to_trim) ? thing.body : [ thing ];
        if (thing instanceof AST_EmptyStatement) return [];
        if (is_statement(thing)) return [ thing ];
        throw new Error("Can't convert thing to statement array");
    }

    function is_empty(thing) {
        if (thing === null) return true;
        if (thing instanceof AST_EmptyStatement) return true;
        if (thing instanceof AST_BlockStatement) return thing.body.length == 0;
        return false;
    }

    function has_declarations_only(block) {
        return all(block.body, function(stat) {
            return is_empty(stat)
                || stat instanceof AST_Defun
                || stat instanceof AST_Var && declarations_only(stat);
        });
    }

    function loop_body(x) {
        if (x instanceof AST_IterationStatement) {
            return x.body instanceof AST_BlockStatement ? x.body : x;
        }
        return x;
    }

    function is_iife_call(node) {
        if (node.TYPE != "Call") return false;
        do {
            node = node.expression;
        } while (node instanceof AST_PropAccess);
        return node instanceof AST_LambdaExpression ? !is_arrow(node) : is_iife_call(node);
    }

    function is_iife_single(call) {
        var exp = call.expression;
        if (exp.name) return false;
        if (!(call instanceof AST_New)) return true;
        var found = false;
        exp.walk(new TreeWalker(function(node) {
            if (found) return true;
            if (node instanceof AST_NewTarget) return found = true;
            if (node instanceof AST_Scope && node !== exp) return true;
        }));
        return !found;
    }

    function is_undeclared_ref(node) {
        return node instanceof AST_SymbolRef && node.definition().undeclared;
    }

    var global_names = makePredicate("Array Boolean clearInterval clearTimeout console Date decodeURI decodeURIComponent encodeURI encodeURIComponent Error escape eval EvalError Function isFinite isNaN JSON Map Math Number parseFloat parseInt RangeError ReferenceError RegExp Object Set setInterval setTimeout String SyntaxError TypeError unescape URIError WeakMap WeakSet");
    AST_SymbolRef.DEFMETHOD("is_declared", function(compressor) {
        return this.defined
            || !this.definition().undeclared
            || compressor.option("unsafe") && global_names[this.name];
    });

    function is_static_field_or_init(prop) {
        return prop.static && prop.value && (prop instanceof AST_ClassField || prop instanceof AST_ClassInit);
    }

    function declarations_only(node) {
        return all(node.definitions, function(var_def) {
            return !var_def.value;
        });
    }

    function is_declaration(stat, lexical) {
        if (stat instanceof AST_DefClass) return lexical && !stat.extends && all(stat.properties, function(prop) {
            if (prop.key instanceof AST_Node) return false;
            return !is_static_field_or_init(prop);
        });
        if (stat instanceof AST_Definitions) return (lexical || stat instanceof AST_Var) && declarations_only(stat);
        if (stat instanceof AST_ExportDeclaration) return is_declaration(stat.body, lexical);
        if (stat instanceof AST_ExportDefault) return is_declaration(stat.body, lexical);
        return stat instanceof AST_LambdaDefinition;
    }

    function is_last_statement(body, stat) {
        var index = body.lastIndexOf(stat);
        if (index < 0) return false;
        while (++index < body.length) {
            if (!is_declaration(body[index], true)) return false;
        }
        return true;
    }

    // Certain combination of unused name + side effect leads to invalid AST:
    //    https://github.com/mishoo/UglifyJS/issues/44
    //    https://github.com/mishoo/UglifyJS/issues/1838
    //    https://github.com/mishoo/UglifyJS/issues/3371
    // We fix it at this stage by moving the `var` outside the `for`.
    function patch_for_init(node, in_list) {
        var block;
        if (node.init instanceof AST_BlockStatement) {
            block = node.init;
            node.init = block.body.pop();
            block.body.push(node);
        }
        if (node.init instanceof AST_Defun) {
            if (!block) block = make_node(AST_BlockStatement, node, { body: [ node ] });
            block.body.splice(-1, 0, node.init);
            node.init = null;
        } else if (node.init instanceof AST_SimpleStatement) {
            node.init = node.init.body;
        } else if (is_empty(node.init)) {
            node.init = null;
        }
        if (!block) return;
        return in_list ? List.splice(block.body) : block;
    }

    function tighten_body(statements, compressor) {
        var in_lambda = last_of(compressor, function(node) {
            return node instanceof AST_Lambda;
        });
        var block_scope, iife_in_try, in_iife_single, in_loop, in_try, scope;
        find_loop_scope_try();
        var changed, last_changed, max_iter = 10;
        do {
            last_changed = changed;
            changed = 0;
            if (eliminate_spurious_blocks(statements)) changed = 1;
            if (!changed && last_changed == 1) break;
            if (compressor.option("dead_code")) {
                if (eliminate_dead_code(statements, compressor)) changed = 2;
                if (!changed && last_changed == 2) break;
            }
            if (compressor.option("if_return")) {
                if (handle_if_return(statements, compressor)) changed = 3;
                if (!changed && last_changed == 3) break;
            }
            if (compressor.option("awaits") && compressor.option("side_effects")) {
                if (trim_awaits(statements, compressor)) changed = 4;
                if (!changed && last_changed == 4) break;
            }
            if (compressor.option("inline") >= 4) {
                if (inline_iife(statements, compressor)) changed = 5;
                if (!changed && last_changed == 5) break;
            }
            if (compressor.sequences_limit > 0) {
                if (sequencesize(statements, compressor)) changed = 6;
                if (!changed && last_changed == 6) break;
                if (sequencesize_2(statements, compressor)) changed = 7;
                if (!changed && last_changed == 7) break;
            }
            if (compressor.option("join_vars")) {
                if (join_consecutive_vars(statements)) changed = 8;
                if (!changed && last_changed == 8) break;
            }
            if (compressor.option("collapse_vars")) {
                if (collapse(statements, compressor)) changed = 9;
            }
        } while (changed && max_iter-- > 0);
        return statements;

        function last_of(compressor, predicate) {
            var block = compressor.self(), level = 0, stat;
            do {
                if (block instanceof AST_Catch) {
                    block = compressor.parent(level++);
                } else if (block instanceof AST_LabeledStatement) {
                    block = block.body;
                } else if (block instanceof AST_SwitchBranch) {
                    var branches = compressor.parent(level);
                    if (branches.body[branches.body.length - 1] === block || has_break(block.body)) {
                        level++;
                        block = branches;
                    }
                }
                do {
                    stat = block;
                    if (predicate(stat)) return stat;
                    block = compressor.parent(level++);
                } while (block instanceof AST_If);
            } while (stat
                && (block instanceof AST_BlockStatement
                    || block instanceof AST_Catch
                    || block instanceof AST_Scope
                    || block instanceof AST_SwitchBranch
                    || block instanceof AST_Try)
                && is_last_statement(block.body, stat));

            function has_break(stats) {
                for (var i = stats.length; --i >= 0;) {
                    if (stats[i] instanceof AST_Break) return true;
                }
                return false;
            }
        }

        function find_loop_scope_try() {
            var node = compressor.self(), level = 0;
            do {
                if (!block_scope && node.variables) block_scope = node;
                if (node instanceof AST_Catch) {
                    if (compressor.parent(level).bfinally) {
                        if (!in_try) in_try = {};
                        in_try.bfinally = true;
                    }
                    level++;
                } else if (node instanceof AST_Finally) {
                    level++;
                } else if (node instanceof AST_IterationStatement) {
                    in_loop = true;
                } else if (node instanceof AST_Scope) {
                    scope = node;
                    break;
                } else if (node instanceof AST_Try) {
                    if (!in_try) in_try = {};
                    if (node.bcatch) in_try.bcatch = true;
                    if (node.bfinally) in_try.bfinally = true;
                }
            } while (node = compressor.parent(level++));
        }

        // Search from right to left for assignment-like expressions:
        // - `var a = x;`
        // - `a = x;`
        // - `++a`
        // For each candidate, scan from left to right for first usage, then try
        // to fold assignment into the site for compression.
        // Will not attempt to collapse assignments into or past code blocks
        // which are not sequentially executed, e.g. loops and conditionals.
        function collapse(statements, compressor) {
            if (scope.pinned()) return;
            var args;
            var assignments = new Dictionary();
            var candidates = [];
            var changed = false;
            var declare_only = new Dictionary();
            var force_single;
            var stat_index = statements.length;
            var scanner = new TreeTransformer(function(node, descend) {
                if (abort) return node;
                // Skip nodes before `candidate` as quickly as possible
                if (!hit) {
                    if (node !== hit_stack[hit_index]) return node;
                    hit_index++;
                    if (hit_index < hit_stack.length) return handle_custom_scan_order(node, scanner);
                    hit = true;
                    stop_after = (value_def ? find_stop_value : find_stop)(node, 0);
                    if (stop_after === node) abort = true;
                    return node;
                }
                var parent = scanner.parent();
                // Stop only if candidate is found within conditional branches
                if (!stop_if_hit && in_conditional(node, parent)) {
                    stop_if_hit = parent;
                }
                // Cascade compound assignments
                if (compound && scan_lhs && can_replace && !stop_if_hit
                    && node instanceof AST_Assign && node.operator != "=" && node.left.equals(lhs)) {
                    replaced++;
                    changed = true;
                    AST_Node.info("Cascading {this} [{start}]", node);
                    can_replace = false;
                    lvalues = get_lvalues(lhs);
                    node.right.transform(scanner);
                    clear_write_only(candidate);
                    var folded;
                    if (abort) {
                        folded = candidate;
                    } else {
                        abort = true;
                        folded = make_node(AST_Binary, candidate, {
                            operator: compound,
                            left: lhs.fixed && lhs.definition().fixed ? lhs.fixed.to_binary(candidate) : lhs,
                            right: rvalue,
                        });
                    }
                    return make_node(AST_Assign, node, {
                        operator: "=",
                        left: node.left,
                        right: make_node(AST_Binary, node, {
                            operator: node.operator.slice(0, -1),
                            left: folded,
                            right: node.right,
                        }),
                    });
                }
                // Stop immediately if these node types are encountered
                if (should_stop(node, parent)) {
                    abort = true;
                    return node;
                }
                // Skip transient nodes caused by single-use variable replacement
                if (node.single_use) return node;
                // Replace variable with assignment when found
                var hit_rhs;
                if (!(node instanceof AST_SymbolDeclaration)
                    && (scan_lhs && lhs.equals(node)
                        || scan_rhs && (hit_rhs = scan_rhs(node, this)))) {
                    if (!can_replace || stop_if_hit && (hit_rhs || !lhs_local || !replace_all)) {
                        if (!hit_rhs && !value_def) abort = true;
                        return node;
                    }
                    if (is_lhs(node, parent)) {
                        if (value_def && !hit_rhs) assign_used = true;
                        return node;
                    }
                    if (!hit_rhs && verify_ref && node.fixed !== lhs.fixed) {
                        abort = true;
                        return node;
                    }
                    if (value_def) {
                        if (stop_if_hit && assign_pos == 0) assign_pos = remaining - replaced;
                        if (!hit_rhs) replaced++;
                        return node;
                    }
                    replaced++;
                    changed = abort = true;
                    AST_Node.info("Collapsing {this} [{start}]", node);
                    if (candidate.TYPE == "Binary") {
                        update_symbols(candidate, node);
                        return make_node(AST_Assign, candidate, {
                            operator: "=",
                            left: candidate.right.left,
                            right: candidate.operator == "&&" ? make_node(AST_Conditional, candidate, {
                                condition: candidate.left,
                                consequent: candidate.right.right,
                                alternative: node,
                            }) : make_node(AST_Conditional, candidate, {
                                condition: candidate.left,
                                consequent: node,
                                alternative: candidate.right.right,
                            }),
                        });
                    }
                    if (candidate instanceof AST_UnaryPostfix) return make_node(AST_UnaryPrefix, candidate, {
                        operator: candidate.operator,
                        expression: lhs.fixed && lhs.definition().fixed ? lhs.fixed.to_prefix(candidate) : lhs,
                    });
                    if (candidate instanceof AST_UnaryPrefix) {
                        clear_write_only(candidate);
                        return candidate;
                    }
                    update_symbols(rvalue, node);
                    if (candidate instanceof AST_VarDef) {
                        var def = candidate.name.definition();
                        if (def.references.length - def.replaced == 1 && !compressor.exposed(def)) {
                            def.replaced++;
                            return maintain_this_binding(parent, node, rvalue);
                        }
                        return make_node(AST_Assign, candidate, {
                            operator: "=",
                            left: node,
                            right: rvalue,
                        });
                    }
                    clear_write_only(rvalue);
                    var assign = candidate.clone();
                    assign.right = rvalue;
                    return assign;
                }
                // Stop signals related to AST_SymbolRef
                if (should_stop_ref(node, parent)) {
                    abort = true;
                    return node;
                }
                // These node types have child nodes that execute sequentially,
                // but are otherwise not safe to scan into or beyond them.
                if (is_last_node(node, parent) || may_throw(node)) {
                    stop_after = node;
                    if (node instanceof AST_Scope) abort = true;
                }
                // Scan but don't replace inside getter/setter
                if (node instanceof AST_Accessor) {
                    var replace = can_replace;
                    can_replace = false;
                    descend(node, scanner);
                    can_replace = replace;
                    return signal_abort(node);
                }
                // Scan but don't replace inside destructuring expression
                if (node instanceof AST_Destructured) {
                    var replace = can_replace;
                    can_replace = false;
                    descend(node, scanner);
                    can_replace = replace;
                    return signal_abort(node);
                }
                // Scan but don't replace inside default value
                if (node instanceof AST_DefaultValue) {
                    node.name = node.name.transform(scanner);
                    var replace = can_replace;
                    can_replace = false;
                    node.value = node.value.transform(scanner);
                    can_replace = replace;
                    return signal_abort(node);
                }
                // Scan but don't replace inside block scope with colliding variable
                if (node instanceof AST_BlockScope
                    && !(node instanceof AST_Scope)
                    && !(node.variables && node.variables.all(function(def) {
                        return !enclosed.has(def.name) && !lvalues.has(def.name);
                    }))) {
                    var replace = can_replace;
                    can_replace = false;
                    if (!handle_custom_scan_order(node, scanner)) descend(node, scanner);
                    can_replace = replace;
                    return signal_abort(node);
                }
                if (handle_custom_scan_order(node, scanner)) return signal_abort(node);
            }, signal_abort);
            var multi_replacer = new TreeTransformer(function(node) {
                if (abort) return node;
                // Skip nodes before `candidate` as quickly as possible
                if (!hit) {
                    if (node !== hit_stack[hit_index]) return node;
                    hit_index++;
                    switch (hit_stack.length - hit_index) {
                      case 0:
                        hit = true;
                        if (assign_used) return node;
                        if (node !== candidate) return node;
                        if (node instanceof AST_VarDef) return node;
                        def.replaced++;
                        var parent = multi_replacer.parent();
                        if (parent instanceof AST_Sequence && parent.tail_node() !== node) {
                            value_def.replaced++;
                            if (rvalue === rhs_value) return List.skip;
                            return make_sequence(rhs_value, rhs_value.expressions.slice(0, -1));
                        }
                        return rvalue;
                      case 1:
                        if (!assign_used && node.body === candidate) {
                            hit = true;
                            def.replaced++;
                            value_def.replaced++;
                            return null;
                        }
                      default:
                        return handle_custom_scan_order(node, multi_replacer);
                    }
                }
                // Replace variable when found
                if (node instanceof AST_SymbolRef && node.definition() === def) {
                    if (is_lhs(node, multi_replacer.parent())) return node;
                    if (!--replaced) abort = true;
                    AST_Node.info("Replacing {this} [{start}]", node);
                    var ref = rvalue.clone();
                    ref.scope = node.scope;
                    ref.reference();
                    if (replaced == assign_pos) {
                        abort = true;
                        return make_node(AST_Assign, candidate, {
                            operator: "=",
                            left: node,
                            right: ref,
                        });
                    }
                    def.replaced++;
                    return ref;
                }
                // Skip (non-executed) functions and (leading) default case in switch statements
                if (node instanceof AST_Default || node instanceof AST_Scope) return node;
            }, function(node) {
                return patch_sequence(node, multi_replacer);
            });
            while (--stat_index >= 0) {
                // Treat parameters as collapsible in IIFE, i.e.
                //   function(a, b){ ... }(x());
                // would be translated into equivalent assignments:
                //   var a = x(), b = undefined;
                if (stat_index == 0 && compressor.option("unused")) extract_args();
                // Find collapsible assignments
                var hit_stack = [];
                extract_candidates(statements[stat_index]);
                while (candidates.length > 0) {
                    hit_stack = candidates.pop();
                    var hit_index = 0;
                    var candidate = hit_stack[hit_stack.length - 1];
                    var assign_pos = -1;
                    var assign_used = false;
                    var verify_ref = false;
                    var remaining;
                    var value_def = null;
                    var stop_after = null;
                    var stop_if_hit = null;
                    var lhs = get_lhs(candidate);
                    var side_effects = lhs && lhs.has_side_effects(compressor);
                    var scan_lhs = lhs && (!side_effects || lhs instanceof AST_SymbolRef)
                            && !is_lhs_read_only(lhs, compressor);
                    var scan_rhs = foldable(candidate);
                    if (!scan_lhs && !scan_rhs) continue;
                    var compound = candidate instanceof AST_Assign && candidate.operator.slice(0, -1);
                    var funarg = candidate.name instanceof AST_SymbolFunarg;
                    var may_throw = return_false;
                    if (candidate.may_throw(compressor)) {
                        if (funarg && is_async(scope)) continue;
                        may_throw = in_try ? function(node) {
                            return node.has_side_effects(compressor);
                        } : side_effects_external;
                    }
                    var read_toplevel = false;
                    var modify_toplevel = false;
                    var defun_scopes = get_defun_scopes(lhs);
                    // Locate symbols which may execute code outside of scanning range
                    var enclosed = new Dictionary();
                    var well_defined = true;
                    var lvalues = get_lvalues(candidate);
                    var lhs_local = is_lhs_local(lhs);
                    var rhs_value = get_rvalue(candidate);
                    var rvalue = rhs_value;
                    if (!side_effects) {
                        if (!compound && rvalue instanceof AST_Sequence) rvalue = rvalue.tail_node();
                        side_effects = value_has_side_effects();
                    }
                    var check_destructured = in_try || !lhs_local ? function(node) {
                        return node instanceof AST_Destructured;
                    } : return_false;
                    var replace_all = replace_all_symbols(candidate);
                    var hit = funarg;
                    var abort = false;
                    var replaced = 0;
                    var can_replace = !args || !hit;
                    if (!can_replace) {
                        for (var j = candidate.arg_index + 1; !abort && j < args.length; j++) {
                            if (args[j]) args[j].transform(scanner);
                        }
                        can_replace = true;
                    }
                    for (var i = stat_index; !abort && i < statements.length; i++) {
                        statements[i].transform(scanner);
                    }
                    if (value_def) {
                        if (!replaced || remaining > replaced + assign_used) {
                            candidates.push(hit_stack);
                            force_single = true;
                            continue;
                        }
                        if (replaced == assign_pos) assign_used = true;
                        var def = lhs.definition();
                        abort = false;
                        hit_index = 0;
                        hit = funarg;
                        for (var i = stat_index; !abort && i < statements.length; i++) {
                            if (!statements[i].transform(multi_replacer)) statements.splice(i--, 1);
                        }
                        replaced = candidate instanceof AST_VarDef
                            && candidate === hit_stack[hit_stack.length - 1]
                            && def.references.length == def.replaced
                            && !compressor.exposed(def);
                        value_def.last_ref = false;
                        value_def.single_use = false;
                        changed = true;
                    }
                    if (replaced) remove_candidate(candidate);
                }
            }
            return changed;

            function signal_abort(node) {
                if (abort) return node;
                if (stop_after === node) abort = true;
                if (stop_if_hit === node) stop_if_hit = null;
                return node;
            }

            function handle_custom_scan_order(node, tt) {
                if (!(node instanceof AST_BlockScope)) return;
                // Skip (non-executed) functions
                if (node instanceof AST_Scope) return node;
                // Scan computed keys, static fields & initializers in class
                if (node instanceof AST_Class) {
                    var replace = can_replace;
                    can_replace = false;
                    if (node.name) node.name.transform(tt);
                    if (!abort && node.extends) node.extends.transform(tt);
                    var fields = [], stats = [];
                    for (var i = 0; !abort && i < node.properties.length; i++) {
                        var prop = node.properties[i];
                        if (prop.key instanceof AST_Node) prop.key = prop.key.transform(tt);
                        if (!prop.static) continue;
                        if (prop instanceof AST_ClassField) {
                            if (prop.value) fields.push(prop);
                        } else if (prop instanceof AST_ClassInit) {
                            [].push.apply(stats, prop.value.body);
                        }
                    }
                    for (var i = 0; !abort && i < stats.length; i++) {
                        stats[i].transform(tt);
                    }
                    for (var i = 0; !abort && i < fields.length; i++) {
                        fields[i].value.transform(tt);
                    }
                    can_replace = replace;
                    return node;
                }
                // Scan object only in a for-in/of statement
                if (node instanceof AST_ForEnumeration) {
                    node.object = node.object.transform(tt);
                    abort = true;
                    return node;
                }
                // Scan first case expression only in a switch statement
                if (node instanceof AST_Switch) {
                    node.expression = node.expression.transform(tt);
                    for (var i = 0; !abort && i < node.body.length; i++) {
                        var branch = node.body[i];
                        if (branch instanceof AST_Case) {
                            if (!hit) {
                                if (branch !== hit_stack[hit_index]) continue;
                                hit_index++;
                            }
                            branch.expression = branch.expression.transform(tt);
                            if (!replace_all || verify_ref) break;
                            scan_rhs = false;
                        }
                    }
                    abort = true;
                    return node;
                }
            }

            function is_direct_assignment(node, parent) {
                if (parent instanceof AST_Assign) return parent.operator == "=" && parent.left === node;
                if (parent instanceof AST_DefaultValue) return parent.name === node;
                if (parent instanceof AST_DestructuredArray) return true;
                if (parent instanceof AST_DestructuredKeyVal) return parent.value === node;
            }

            function should_stop(node, parent) {
                if (node === rvalue) return true;
                if (parent instanceof AST_For) {
                    if (node !== parent.init) return true;
                }
                if (node instanceof AST_Assign) return node.operator != "=" && lhs.equals(node.left);
                if (node instanceof AST_BlockStatement) {
                    return defun_scopes && !all(defun_scopes, function(scope) {
                        return node !== scope;
                    });
                }
                if (node instanceof AST_Call) {
                    if (!(lhs instanceof AST_PropAccess)) return false;
                    if (!lhs.equals(node.expression)) return false;
                    return !(rvalue instanceof AST_LambdaExpression && !rvalue.contains_this());
                }
                if (node instanceof AST_Class) return !compressor.has_directive("use strict");
                if (node instanceof AST_Debugger) return true;
                if (node instanceof AST_Defun) return funarg && lhs.name === node.name.name;
                if (node instanceof AST_DestructuredKeyVal) return node.key instanceof AST_Node;
                if (node instanceof AST_DWLoop) return true;
                if (node instanceof AST_LoopControl) return true;
                if (node instanceof AST_Try) return true;
                if (node instanceof AST_With) return true;
                return false;
            }

            function should_stop_ref(node, parent) {
                if (!(node instanceof AST_SymbolRef)) return false;
                if (node.is_declared(compressor)) {
                    if (node.fixed_value()) return false;
                    if (can_drop_symbol(node)) {
                        return !(parent instanceof AST_PropAccess && parent.expression === node)
                            && is_arguments(node.definition());
                    }
                } else if (is_direct_assignment(node, parent)) {
                    return false;
                }
                if (!replace_all) return true;
                scan_rhs = false;
                return false;
            }

            function in_conditional(node, parent) {
                if (parent instanceof AST_Assign) return parent.left !== node && lazy_op[parent.operator.slice(0, -1)];
                if (parent instanceof AST_Binary) return parent.left !== node && lazy_op[parent.operator];
                if (parent instanceof AST_Call) return parent.optional && parent.expression !== node;
                if (parent instanceof AST_Case) return parent.expression !== node;
                if (parent instanceof AST_Conditional) return parent.condition !== node;
                if (parent instanceof AST_If) return parent.condition !== node;
                if (parent instanceof AST_Sub) return parent.optional && parent.expression !== node;
            }

            function is_last_node(node, parent) {
                if (node instanceof AST_Await) return true;
                if (node.TYPE == "Binary") return !can_drop_op(node, compressor);
                if (node instanceof AST_Call) {
                    var def, fn = node.expression;
                    if (fn instanceof AST_SymbolRef) {
                        def = fn.definition();
                        fn = fn.fixed_value();
                    }
                    if (!(fn instanceof AST_Lambda)) return !node.is_expr_pure(compressor);
                    if (def && recursive_ref(compressor, def, fn)) return true;
                    if (fn.collapse_scanning) return false;
                    fn.collapse_scanning = true;
                    var replace = can_replace;
                    can_replace = false;
                    var after = stop_after;
                    var if_hit = stop_if_hit;
                    for (var i = 0; !abort && i < fn.argnames.length; i++) {
                        if (arg_may_throw(reject, fn.argnames[i], node.args[i])) abort = true;
                    }
                    if (!abort) {
                        if (fn.rest && arg_may_throw(reject, fn.rest, make_node(AST_Array, node, {
                            elements: node.args.slice(i),
                        }))) {
                            abort = true;
                        } else if (is_arrow(fn) && fn.value) {
                            fn.value.transform(scanner);
                        } else for (var i = 0; !abort && i < fn.body.length; i++) {
                            var stat = fn.body[i];
                            if (stat instanceof AST_Return) {
                                if (stat.value) stat.value.transform(scanner);
                                break;
                            }
                            stat.transform(scanner);
                        }
                    }
                    stop_if_hit = if_hit;
                    stop_after = after;
                    can_replace = replace;
                    fn.collapse_scanning = false;
                    if (!abort) return false;
                    abort = false;
                    return true;
                }
                if (node instanceof AST_Class) {
                    if (!in_try) return false;
                    var base = node.extends;
                    if (!base) return false;
                    if (base instanceof AST_SymbolRef) base = base.fixed_value();
                    return !safe_for_extends(base);
                }
                if (node instanceof AST_Exit) {
                    if (in_try) {
                        if (in_try.bfinally) return true;
                        if (in_try.bcatch && node instanceof AST_Throw) return true;
                    }
                    return side_effects || lhs instanceof AST_PropAccess || may_modify(lhs);
                }
                if (node instanceof AST_Function) {
                    return compressor.option("ie") && node.name && lvalues.has(node.name.name);
                }
                if (node instanceof AST_ObjectIdentity) return symbol_in_lvalues(node);
                if (node instanceof AST_PropAccess) {
                    var exp = node.expression;
                    if (compressor.option("unsafe")) {
                        if (is_undeclared_ref(exp) && global_names[exp.name]) return false;
                        if (is_static_fn(exp)) return false;
                    }
                    if (exp instanceof AST_SymbolRef && is_arguments(exp.definition())) return true;
                    if (side_effects) return true;
                    if (!well_defined) return true;
                    if (value_def) return false;
                    if (!in_try && lhs_local) return false;
                    if (node.optional) return false;
                    return exp.may_throw_on_access(compressor);
                }
                if (node instanceof AST_Spread) return true;
                if (node instanceof AST_SymbolRef) {
                    var assign_direct = symbol_in_lvalues(node);
                    if (is_undeclared_ref(node) && node.is_declared(compressor)) return false;
                    if (assign_direct) return !is_direct_assignment(node, parent);
                    if (side_effects && may_modify(node)) return true;
                    var def = node.definition();
                    return (in_try || def.scope.resolve() !== scope) && !can_drop_symbol(node);
                }
                if (node instanceof AST_Template) return !node.is_expr_pure(compressor);
                if (node instanceof AST_VarDef) {
                    if (check_destructured(node.name)) return true;
                    return (node.value || parent instanceof AST_Let) && node.name.match_symbol(function(node) {
                        return node instanceof AST_SymbolDeclaration
                            && (lvalues.has(node.name) || side_effects && may_modify(node));
                    }, true);
                }
                if (node instanceof AST_Yield) return true;
                var sym = is_lhs(node.left, node);
                if (!sym) return false;
                if (sym instanceof AST_PropAccess) return true;
                if (check_destructured(sym)) return true;
                return sym.match_symbol(function(node) {
                    if (node instanceof AST_PropAccess) return true;
                    if (node instanceof AST_SymbolRef) {
                        return lvalues.has(node.name) || read_toplevel && compressor.exposed(node.definition());
                    }
                }, true);

                function reject(node) {
                    node.transform(scanner);
                    return abort;
                }
            }

            function arg_may_throw(reject, node, value) {
                if (node instanceof AST_DefaultValue) {
                    return reject(node.value)
                        || arg_may_throw(reject, node.name, node.value)
                        || !is_undefined(value) && arg_may_throw(reject, node.name, value);
                }
                if (!value) return !(node instanceof AST_Symbol);
                if (node instanceof AST_Destructured) {
                    if (node.rest && arg_may_throw(reject, node.rest)) return true;
                    if (node instanceof AST_DestructuredArray) {
                        if (value instanceof AST_Array) return !all(node.elements, function(element, index) {
                            return !arg_may_throw(reject, element, value[index]);
                        });
                        if (!value.is_string(compressor)) return true;
                        return !all(node.elements, function(element) {
                            return !arg_may_throw(reject, element);
                        });
                    }
                    if (node instanceof AST_DestructuredObject) {
                        if (value.may_throw_on_access(compressor)) return true;
                        return !all(node.properties, function(prop) {
                            if (prop.key instanceof AST_Node && reject(prop.key)) return false;
                            return !arg_may_throw(reject, prop.value);
                        });
                    }
                }
            }

            function extract_args() {
                if (in_iife_single === false) return;
                var iife = compressor.parent(), fn = compressor.self();
                if (in_iife_single === undefined) {
                    if (!(fn instanceof AST_LambdaExpression)
                        || is_generator(fn)
                        || fn.uses_arguments
                        || fn.pinned()
                        || !(iife instanceof AST_Call)
                        || iife.expression !== fn
                        || !all(iife.args, function(arg) {
                            return !(arg instanceof AST_Spread);
                        })) {
                        in_iife_single = false;
                        return;
                    }
                    if (!is_iife_single(iife)) return;
                    in_iife_single = true;
                }
                var fn_strict = fn.in_strict_mode(compressor)
                    && !fn.parent_scope.resolve(true).in_strict_mode(compressor);
                var has_await;
                if (is_async(fn)) {
                    has_await = function(node) {
                        return node instanceof AST_Symbol && node.name == "await";
                    };
                    iife_in_try = true;
                } else {
                    has_await = function(node) {
                        return node instanceof AST_Await && !tw.find_parent(AST_Scope);
                    };
                    if (iife_in_try === undefined) iife_in_try = find_try(compressor, 1, iife, null, true, true);
                }
                var arg_scope = null;
                var tw = new TreeWalker(function(node, descend) {
                    if (!arg) return true;
                    if (has_await(node) || node instanceof AST_Yield) {
                        arg = null;
                        return true;
                    }
                    if (node instanceof AST_ObjectIdentity) {
                        if (fn_strict || !arg_scope) arg = null;
                        return true;
                    }
                    if (node instanceof AST_SymbolRef) {
                        var def;
                        if (node.in_arg && !is_safe_lexical(node.definition())
                            || (def = fn.variables.get(node.name)) && def !== node.definition()) {
                            arg = null;
                        }
                        return true;
                    }
                    if (node instanceof AST_Scope && !is_arrow(node)) {
                        var save_scope = arg_scope;
                        arg_scope = node;
                        descend();
                        arg_scope = save_scope;
                        return true;
                    }
                });
                args = iife.args.slice();
                var len = args.length;
                var names = new Dictionary();
                for (var i = fn.argnames.length; --i >= 0;) {
                    var sym = fn.argnames[i];
                    var arg = args[i];
                    var value = null;
                    if (sym instanceof AST_DefaultValue) {
                        value = sym.value;
                        sym = sym.name;
                        args[len + i] = value;
                    }
                    if (sym instanceof AST_Destructured) {
                        if (iife_in_try && arg_may_throw(function(node) {
                            return node.has_side_effects(compressor);
                        }, sym, arg)) {
                            candidates.length = 0;
                            break;
                        }
                        args[len + i] = fn.argnames[i];
                        continue;
                    }
                    if (names.has(sym.name)) continue;
                    names.set(sym.name, true);
                    if (value) arg = is_undefined(arg) ? value : null;
                    if (!arg && !value) {
                        arg = make_node(AST_Undefined, sym).transform(compressor);
                    } else if (arg instanceof AST_Lambda && arg.pinned()) {
                        arg = null;
                    } else if (arg) {
                        arg.walk(tw);
                    }
                    if (!arg) continue;
                    var candidate = make_node(AST_VarDef, sym, {
                        name: sym,
                        value: arg,
                    });
                    candidate.name_index = i;
                    candidate.arg_index = value ? len + i : i;
                    candidates.unshift([ candidate ]);
                }
                if (fn.rest) args.push(fn.rest);
            }

            function extract_candidates(expr, unused) {
                hit_stack.push(expr);
                if (expr instanceof AST_Array) {
                    expr.elements.forEach(function(node) {
                        extract_candidates(node, unused);
                    });
                } else if (expr instanceof AST_Assign) {
                    var lhs = expr.left;
                    if (!(lhs instanceof AST_Destructured)) candidates.push(hit_stack.slice());
                    extract_candidates(lhs);
                    extract_candidates(expr.right);
                    if (lhs instanceof AST_SymbolRef && expr.operator == "=") {
                        assignments.set(lhs.name, (assignments.get(lhs.name) || 0) + 1);
                    }
                } else if (expr instanceof AST_Await) {
                    extract_candidates(expr.expression, unused);
                } else if (expr instanceof AST_Binary) {
                    var lazy = lazy_op[expr.operator];
                    if (unused
                        && lazy
                        && expr.operator != "??"
                        && expr.right instanceof AST_Assign
                        && expr.right.operator == "="
                        && !(expr.right.left instanceof AST_Destructured)) {
                        candidates.push(hit_stack.slice());
                    }
                    extract_candidates(expr.left, !lazy && unused);
                    extract_candidates(expr.right, unused);
                } else if (expr instanceof AST_Call) {
                    extract_candidates(expr.expression);
                    expr.args.forEach(extract_candidates);
                } else if (expr instanceof AST_Case) {
                    extract_candidates(expr.expression);
                } else if (expr instanceof AST_Conditional) {
                    extract_candidates(expr.condition);
                    extract_candidates(expr.consequent, unused);
                    extract_candidates(expr.alternative, unused);
                } else if (expr instanceof AST_Definitions) {
                    expr.definitions.forEach(extract_candidates);
                } else if (expr instanceof AST_Dot) {
                    extract_candidates(expr.expression);
                } else if (expr instanceof AST_DWLoop) {
                    extract_candidates(expr.condition);
                    if (!(expr.body instanceof AST_Block)) {
                        extract_candidates(expr.body);
                    }
                } else if (expr instanceof AST_Exit) {
                    if (expr.value) extract_candidates(expr.value);
                } else if (expr instanceof AST_For) {
                    if (expr.init) extract_candidates(expr.init, true);
                    if (expr.condition) extract_candidates(expr.condition);
                    if (expr.step) extract_candidates(expr.step, true);
                    if (!(expr.body instanceof AST_Block)) {
                        extract_candidates(expr.body);
                    }
                } else if (expr instanceof AST_ForEnumeration) {
                    extract_candidates(expr.object);
                    if (!(expr.body instanceof AST_Block)) {
                        extract_candidates(expr.body);
                    }
                } else if (expr instanceof AST_If) {
                    extract_candidates(expr.condition);
                    if (!(expr.body instanceof AST_Block)) {
                        extract_candidates(expr.body);
                    }
                    if (expr.alternative && !(expr.alternative instanceof AST_Block)) {
                        extract_candidates(expr.alternative);
                    }
                } else if (expr instanceof AST_Object) {
                    expr.properties.forEach(function(prop) {
                        hit_stack.push(prop);
                        if (prop.key instanceof AST_Node) extract_candidates(prop.key);
                        if (prop instanceof AST_ObjectKeyVal) extract_candidates(prop.value, unused);
                        hit_stack.pop();
                    });
                } else if (expr instanceof AST_Sequence) {
                    var end = expr.expressions.length - (unused ? 0 : 1);
                    expr.expressions.forEach(function(node, index) {
                        extract_candidates(node, index < end);
                    });
                } else if (expr instanceof AST_SimpleStatement) {
                    extract_candidates(expr.body, true);
                } else if (expr instanceof AST_Spread) {
                    extract_candidates(expr.expression);
                } else if (expr instanceof AST_Sub) {
                    extract_candidates(expr.expression);
                    extract_candidates(expr.property);
                } else if (expr instanceof AST_Switch) {
                    extract_candidates(expr.expression);
                    expr.body.forEach(extract_candidates);
                } else if (expr instanceof AST_Unary) {
                    if (UNARY_POSTFIX[expr.operator]) {
                        candidates.push(hit_stack.slice());
                    } else {
                        extract_candidates(expr.expression);
                    }
                } else if (expr instanceof AST_VarDef) {
                    if (expr.name instanceof AST_SymbolVar) {
                        if (expr.value) {
                            var def = expr.name.definition();
                            if (def.references.length > def.replaced) {
                                candidates.push(hit_stack.slice());
                            }
                        } else {
                            declare_only.set(expr.name.name, (declare_only.get(expr.name.name) || 0) + 1);
                        }
                    }
                    if (expr.value) extract_candidates(expr.value);
                } else if (expr instanceof AST_Yield) {
                    if (expr.expression) extract_candidates(expr.expression);
                }
                hit_stack.pop();
            }

            function find_stop(node, level) {
                var parent = scanner.parent(level);
                if (parent instanceof AST_Array) return node;
                if (parent instanceof AST_Assign) return node;
                if (parent instanceof AST_Await) return node;
                if (parent instanceof AST_Binary) return node;
                if (parent instanceof AST_Call) return node;
                if (parent instanceof AST_Case) return node;
                if (parent instanceof AST_Conditional) return node;
                if (parent instanceof AST_Definitions) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Exit) return node;
                if (parent instanceof AST_If) return node;
                if (parent instanceof AST_IterationStatement) return node;
                if (parent instanceof AST_ObjectProperty) return node;
                if (parent instanceof AST_PropAccess) return node;
                if (parent instanceof AST_Sequence) {
                    return (parent.tail_node() === node ? find_stop : find_stop_unused)(parent, level + 1);
                }
                if (parent instanceof AST_SimpleStatement) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Spread) return node;
                if (parent instanceof AST_Switch) return node;
                if (parent instanceof AST_Unary) return node;
                if (parent instanceof AST_VarDef) return node;
                if (parent instanceof AST_Yield) return node;
                return null;
            }

            function find_stop_logical(parent, op, level) {
                var node;
                do {
                    node = parent;
                    parent = scanner.parent(++level);
                } while (parent instanceof AST_Assign && parent.operator.slice(0, -1) == op
                    || parent instanceof AST_Binary && parent.operator == op);
                return node;
            }

            function find_stop_expr(expr, cont, node, parent, level) {
                var replace = can_replace;
                can_replace = false;
                var after = stop_after;
                var if_hit = stop_if_hit;
                var stack = scanner.stack;
                scanner.stack = [ parent ];
                expr.transform(scanner);
                scanner.stack = stack;
                stop_if_hit = if_hit;
                stop_after = after;
                can_replace = replace;
                if (abort) {
                    abort = false;
                    return node;
                }
                return cont(parent, level + 1);
            }

            function find_stop_value(node, level) {
                var parent = scanner.parent(level);
                if (parent instanceof AST_Array) return find_stop_value(parent, level + 1);
                if (parent instanceof AST_Assign) {
                    if (may_throw(parent)) return node;
                    if (parent.left.match_symbol(function(ref) {
                        return ref instanceof AST_SymbolRef && (lhs.name == ref.name || value_def.name == ref.name);
                    })) return node;
                    var op;
                    if (parent.left === node || !lazy_op[op = parent.operator.slice(0, -1)]) {
                        return find_stop_value(parent, level + 1);
                    }
                    return find_stop_logical(parent, op, level);
                }
                if (parent instanceof AST_Await) return find_stop_value(parent, level + 1);
                if (parent instanceof AST_Binary) {
                    var op;
                    if (parent.left === node || !lazy_op[op = parent.operator]) {
                        return find_stop_value(parent, level + 1);
                    }
                    return find_stop_logical(parent, op, level);
                }
                if (parent instanceof AST_Call) return parent;
                if (parent instanceof AST_Case) {
                    if (parent.expression !== node) return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_Conditional) {
                    if (parent.condition !== node) return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_Definitions) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Do) return node;
                if (parent instanceof AST_Exit) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_For) {
                    if (parent.init !== node && parent.condition !== node) return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_ForEnumeration) {
                    if (parent.init !== node) return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_If) {
                    if (parent.condition !== node) return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_ObjectProperty) {
                    var obj = scanner.parent(level + 1);
                    return all(obj.properties, function(prop) {
                        return prop instanceof AST_ObjectKeyVal;
                    }) ? find_stop_value(obj, level + 2) : obj;
                }
                if (parent instanceof AST_PropAccess) {
                    var exp = parent.expression;
                    return exp === node ? find_stop_value(parent, level + 1) : node;
                }
                if (parent instanceof AST_Sequence) {
                    return (parent.tail_node() === node ? find_stop_value : find_stop_unused)(parent, level + 1);
                }
                if (parent instanceof AST_SimpleStatement) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Spread) return find_stop_value(parent, level + 1);
                if (parent instanceof AST_Switch) {
                    if (parent.expression !== node) return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_Unary) {
                    if (parent.operator == "delete") return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_VarDef) return parent.name.match_symbol(function(sym) {
                    return sym instanceof AST_SymbolDeclaration && (lhs.name == sym.name || value_def.name == sym.name);
                }) ? node : find_stop_value(parent, level + 1);
                if (parent instanceof AST_While) {
                    if (parent.condition !== node) return node;
                    return find_stop_value(parent, level + 1);
                }
                if (parent instanceof AST_Yield) return find_stop_value(parent, level + 1);
                return null;
            }

            function find_stop_unused(node, level) {
                var parent = scanner.parent(level);
                if (is_last_node(node, parent)) return node;
                if (in_conditional(node, parent)) return node;
                if (parent instanceof AST_Array) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Assign) return check_assignment(parent.left);
                if (parent instanceof AST_Await) return node;
                if (parent instanceof AST_Binary) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Call) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Case) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Conditional) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Definitions) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Exit) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_If) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_IterationStatement) return node;
                if (parent instanceof AST_ObjectProperty) {
                    var obj = scanner.parent(level + 1);
                    return all(obj.properties, function(prop) {
                        return prop instanceof AST_ObjectKeyVal;
                    }) ? find_stop_unused(obj, level + 2) : obj;
                }
                if (parent instanceof AST_PropAccess) {
                    var exp = parent.expression;
                    if (exp === node) return find_stop_unused(parent, level + 1);
                    return find_stop_expr(exp, find_stop_unused, node, parent, level);
                }
                if (parent instanceof AST_Sequence) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_SimpleStatement) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Spread) return node;
                if (parent instanceof AST_Switch) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_Unary) return find_stop_unused(parent, level + 1);
                if (parent instanceof AST_VarDef) return check_assignment(parent.name);
                if (parent instanceof AST_Yield) return node;
                return null;

                function check_assignment(lhs) {
                    if (may_throw(parent)) return node;
                    if (lhs !== node && lhs instanceof AST_Destructured) {
                        return find_stop_expr(lhs, find_stop_unused, node, parent, level);
                    }
                    return find_stop_unused(parent, level + 1);
                }
            }

            function mangleable_var(rhs) {
                if (force_single) {
                    force_single = false;
                    return;
                }
                if (remaining < 1) return;
                rhs = rhs.tail_node();
                var value = rhs instanceof AST_Assign && rhs.operator == "=" ? rhs.left : rhs;
                if (!(value instanceof AST_SymbolRef)) return;
                var def = value.definition();
                if (def.undeclared) return;
                if (is_arguments(def)) return;
                if (value !== rhs) {
                    if (is_lhs_read_only(value, compressor)) return;
                    var referenced = def.references.length - def.replaced;
                    if (referenced < 2) return;
                    var expr = candidate.clone();
                    expr[expr instanceof AST_Assign ? "right" : "value"] = value;
                    if (candidate.name_index >= 0) {
                        expr.name_index = candidate.name_index;
                        expr.arg_index = candidate.arg_index;
                    }
                    candidate = expr;
                }
                return value_def = def;
            }

            function remaining_refs(def) {
                return def.references.length - def.replaced - (assignments.get(def.name) || 0);
            }

            function get_lhs(expr) {
                if (expr instanceof AST_Assign) {
                    var lhs = expr.left;
                    if (!(lhs instanceof AST_SymbolRef)) return lhs;
                    var def = lhs.definition();
                    if (scope.uses_arguments && is_funarg(def)) return lhs;
                    if (compressor.exposed(def)) return lhs;
                    remaining = remaining_refs(def);
                    if (def.fixed && lhs.fixed) {
                        var matches = def.references.filter(function(ref) {
                            return ref.fixed === lhs.fixed;
                        }).length - 1;
                        if (matches < remaining) {
                            remaining = matches;
                            assign_pos = 0;
                            verify_ref = true;
                        }
                    }
                    if (expr.operator == "=") mangleable_var(expr.right);
                    return lhs;
                }
                if (expr instanceof AST_Binary) return expr.right.left;
                if (expr instanceof AST_Unary) return expr.expression;
                if (expr instanceof AST_VarDef) {
                    var lhs = expr.name;
                    var def = lhs.definition();
                    if (def.const_redefs) return;
                    if (!member(lhs, def.orig)) return;
                    if (scope.uses_arguments && is_funarg(def)) return;
                    var declared = def.orig.length - def.eliminated - (declare_only.get(def.name) || 0);
                    remaining = remaining_refs(def);
                    if (def.fixed) remaining = Math.min(remaining, def.references.filter(function(ref) {
                        if (!ref.fixed) return true;
                        if (!ref.fixed.assigns) return true;
                        var assign = ref.fixed.assigns[0];
                        return assign === lhs || get_rvalue(assign) === expr.value;
                    }).length);
                    if (declared > 1 && !(lhs instanceof AST_SymbolFunarg)) {
                        mangleable_var(expr.value);
                        return make_node(AST_SymbolRef, lhs);
                    }
                    if (mangleable_var(expr.value) || remaining == 1 && !compressor.exposed(def)) {
                        return make_node(AST_SymbolRef, lhs);
                    }
                    return;
                }
            }

            function get_rvalue(expr) {
                if (expr instanceof AST_Assign) return expr.right;
                if (expr instanceof AST_Binary) {
                    var node = expr.clone();
                    node.right = expr.right.right;
                    return node;
                }
                if (expr instanceof AST_VarDef) return expr.value;
            }

            function invariant(expr) {
                if (expr instanceof AST_Array) return false;
                if (expr instanceof AST_Binary && lazy_op[expr.operator]) {
                    return invariant(expr.left) && invariant(expr.right);
                }
                if (expr instanceof AST_Call) return false;
                if (expr instanceof AST_Conditional) {
                    return invariant(expr.consequent) && invariant(expr.alternative);
                }
                if (expr instanceof AST_Object) return false;
                return !expr.has_side_effects(compressor);
            }

            function foldable(expr) {
                if (expr instanceof AST_Assign && expr.right.single_use) return;
                var lhs_ids = Object.create(null);
                var marker = new TreeWalker(function(node) {
                    if (!(node instanceof AST_SymbolRef)) return;
                    for (var level = 0, parent, child = node; parent = marker.parent(level++); child = parent) {
                        if (is_direct_assignment(child, parent)) {
                            if (parent instanceof AST_DestructuredKeyVal) parent = marker.parent(level++);
                            continue;
                        }
                        lhs_ids[node.definition().id] = true;
                        return;
                    }
                    lhs_ids[node.definition().id] = "a";
                });
                while (expr instanceof AST_Assign && expr.operator == "=") {
                    expr.left.walk(marker);
                    expr = expr.right;
                }
                if (expr instanceof AST_ObjectIdentity) return rhs_exact_match;
                if (expr instanceof AST_SymbolRef) {
                    if (lhs_ids[expr.definition().id] === "a") return;
                    var value = expr.evaluate(compressor);
                    if (value === expr) return rhs_exact_match;
                    return rhs_fuzzy_match(value, rhs_exact_match);
                }
                if (expr.is_truthy()) return rhs_fuzzy_match(true, return_false);
                if (expr.is_constant()) {
                    var ev = expr.evaluate(compressor);
                    if (!(ev instanceof AST_Node)) return rhs_fuzzy_match(ev, rhs_exact_match);
                }
                if (!(lhs instanceof AST_SymbolRef)) return false;
                if (!invariant(expr)) return false;
                var circular;
                expr.walk(new TreeWalker(function(node) {
                    if (circular) return true;
                    if (node instanceof AST_SymbolRef && lhs_ids[node.definition().id]) circular = true;
                }));
                return !circular && rhs_exact_match;

                function rhs_exact_match(node) {
                    return expr.equals(node);
                }
            }

            function rhs_fuzzy_match(value, fallback) {
                return function(node, tw) {
                    if (tw.in_boolean_context()) {
                        if (value && node.is_truthy() && !node.has_side_effects(compressor)) {
                            return true;
                        }
                        if (node.is_constant()) {
                            var ev = node.evaluate(compressor);
                            if (!(ev instanceof AST_Node)) return !ev == !value;
                        }
                    }
                    return fallback(node);
                };
            }

            function clear_write_only(assign) {
                while (assign.write_only) {
                    assign.write_only = false;
                    if (!(assign instanceof AST_Assign)) break;
                    assign = assign.right;
                }
            }

            function update_symbols(value, node) {
                var clear_defined = node instanceof AST_SymbolRef && !node.defined;
                var scope = node.scope || find_scope(scanner) || block_scope;
                value.walk(new TreeWalker(function(node) {
                    if (node instanceof AST_BlockScope) return true;
                    if (node instanceof AST_Symbol) {
                        if (clear_defined && node instanceof AST_SymbolRef) node.defined = false;
                        node.scope = scope;
                    }
                }));
            }

            function may_be_global(node) {
                if (node instanceof AST_SymbolRef) {
                    node = node.fixed_value();
                    if (!node) return true;
                }
                if (node instanceof AST_Assign) return node.operator == "=" && may_be_global(node.right);
                return node instanceof AST_PropAccess || node instanceof AST_ObjectIdentity;
            }

            function get_lvalues(expr) {
                var lvalues = new Dictionary();
                if (expr instanceof AST_VarDef) {
                    if (!expr.name.definition().fixed) well_defined = false;
                    lvalues.add(expr.name.name, lhs);
                }
                var find_arguments = scope.uses_arguments && !compressor.has_directive("use strict");
                var scan_toplevel = scope instanceof AST_Toplevel;
                var tw = new TreeWalker(function(node) {
                    if (node.inlined_node) node.inlined_node.walk(tw);
                    var value;
                    if (node instanceof AST_SymbolRef) {
                        value = node.fixed_value();
                        if (!value) {
                            value = node;
                            var def = node.definition();
                            var escaped = node.fixed && node.fixed.escaped || def.escaped;
                            if (!def.undeclared
                                && (def.assignments || !escaped || escaped.cross_scope)
                                && (has_escaped(def, node.scope, node, tw.parent()) || !same_scope(def))) {
                                well_defined = false;
                            }
                        }
                    } else if (node instanceof AST_ObjectIdentity) {
                        value = node;
                    }
                    if (value) {
                        lvalues.add(node.name, is_modified(compressor, tw, node, value, 0));
                    } else if (node instanceof AST_Lambda) {
                        for (var level = 0, parent, child = node; parent = tw.parent(level++); child = parent) {
                            if (parent instanceof AST_Assign) {
                                if (parent.left === child) break;
                                if (parent.operator == "=") continue;
                                if (lazy_op[parent.operator.slice(0, -1)]) continue;
                                break;
                            }
                            if (parent instanceof AST_Binary) {
                                if (lazy_op[parent.operator]) continue;
                                break;
                            }
                            if (parent instanceof AST_Call) return;
                            if (parent instanceof AST_Scope) return;
                            if (parent instanceof AST_Sequence) {
                                if (parent.tail_node() === child) continue;
                                break;
                            }
                            if (parent instanceof AST_Template) {
                                if (parent.tag) return;
                                break;
                            }
                        }
                        node.enclosed.forEach(function(def) {
                            if (def.scope !== node) enclosed.set(def.name, true);
                        });
                        return true;
                    } else if (find_arguments && node instanceof AST_Sub) {
                        scope.each_argname(function(argname) {
                            if (!compressor.option("reduce_vars") || argname.definition().assignments) {
                                if (!argname.definition().fixed) well_defined = false;
                                lvalues.add(argname.name, true);
                            }
                        });
                        find_arguments = false;
                    }
                    if (!scan_toplevel) return;
                    if (node.TYPE == "Call") {
                        if (modify_toplevel) return;
                        var exp = node.expression;
                        if (exp instanceof AST_PropAccess) return;
                        if (exp instanceof AST_LambdaExpression && !exp.contains_this()) return;
                        modify_toplevel = true;
                    } else if (node instanceof AST_PropAccess && may_be_global(node.expression)) {
                        if (node === lhs && !(expr instanceof AST_Unary)) {
                            modify_toplevel = true;
                        } else {
                            read_toplevel = true;
                        }
                    }
                });
                expr.walk(tw);
                return lvalues;
            }

            function remove_candidate(expr) {
                var value = rvalue === rhs_value ? null : make_sequence(rhs_value, rhs_value.expressions.slice(0, -1));
                var index = expr.name_index;
                if (index >= 0) {
                    var args, argname = scope.argnames[index];
                    if (argname instanceof AST_DefaultValue) {
                        scope.argnames[index] = argname = argname.clone();
                        argname.value = value || make_node(AST_Number, argname, { value: 0 });
                    } else if ((args = compressor.parent().args)[index]) {
                        scope.argnames[index] = argname.clone();
                        args[index] = value || make_node(AST_Number, args[index], { value: 0 });
                    }
                    return;
                }
                var end = hit_stack.length - 1;
                var last = hit_stack[end];
                if (last instanceof AST_VarDef || hit_stack[end - 1].body === last) end--;
                var tt = new TreeTransformer(function(node, descend, in_list) {
                    if (hit) return node;
                    if (node !== hit_stack[hit_index]) return node;
                    hit_index++;
                    if (hit_index <= end) return handle_custom_scan_order(node, tt);
                    hit = true;
                    if (node instanceof AST_Definitions) {
                        declare_only.set(last.name.name, (declare_only.get(last.name.name) || 0) + 1);
                        if (value_def) value_def.replaced++;
                        var defns = node.definitions;
                        var index = defns.indexOf(last);
                        var defn = last.clone();
                        defn.value = null;
                        if (!value) {
                            node.definitions[index] = defn;
                            return node;
                        }
                        var body = [ make_node(AST_SimpleStatement, value, { body: value }) ];
                        if (index > 0) {
                            var head = node.clone();
                            head.definitions = defns.slice(0, index);
                            body.unshift(head);
                            node = node.clone();
                            node.definitions = defns.slice(index);
                        }
                        body.push(node);
                        node.definitions[0] = defn;
                        return in_list ? List.splice(body) : make_node(AST_BlockStatement, node, { body: body });
                    }
                    if (!value) return in_list ? List.skip : null;
                    return is_statement(node) ? make_node(AST_SimpleStatement, value, { body: value }) : value;
                }, function(node, in_list) {
                    if (node instanceof AST_For) return patch_for_init(node, in_list);
                    return patch_sequence(node, tt);
                });
                abort = false;
                hit = false;
                hit_index = 0;
                if (!(statements[stat_index] = statements[stat_index].transform(tt))) statements.splice(stat_index, 1);
            }

            function patch_sequence(node, tt) {
                if (node instanceof AST_Sequence) switch (node.expressions.length) {
                  case 0: return null;
                  case 1: return maintain_this_binding(tt.parent(), node, node.expressions[0]);
                }
            }

            function get_defun_scopes(lhs) {
                if (!(lhs instanceof AST_SymbolDeclaration
                    || lhs instanceof AST_SymbolRef
                    || lhs instanceof AST_Destructured)) return;
                var scopes = [];
                lhs.mark_symbol(function(node) {
                    if (node instanceof AST_Symbol) {
                        var def = node.definition();
                        var scope = def.scope.resolve();
                        def.orig.forEach(function(sym) {
                            if (sym instanceof AST_SymbolDefun) {
                                if (sym.scope !== scope) push_uniq(scopes, sym.scope);
                            }
                        });
                    }
                });
                if (scopes.length == 0) return;
                return scopes;
            }

            function is_lhs_local(lhs) {
                var sym = root_expr(lhs);
                if (!(sym instanceof AST_SymbolRef)) return false;
                if (sym.definition().scope.resolve() !== scope) return false;
                if (!in_loop) return true;
                if (compound) return false;
                if (candidate instanceof AST_Unary) return false;
                var lvalue = lvalues.get(sym.name);
                return !lvalue || lvalue[0] === lhs;
            }

            function value_has_side_effects() {
                if (candidate instanceof AST_Unary) return false;
                return rvalue.has_side_effects(compressor);
            }

            function replace_all_symbols(expr) {
                if (expr instanceof AST_Unary) return false;
                if (side_effects) return false;
                if (value_def) return true;
                if (!(lhs instanceof AST_SymbolRef)) return false;
                var referenced;
                if (expr instanceof AST_VarDef) {
                    referenced = 1;
                } else if (expr.operator == "=") {
                    referenced = 2;
                } else {
                    return false;
                }
                var def = lhs.definition();
                if (def.references.length - def.replaced == referenced) return true;
                if (!def.fixed) return false;
                if (!lhs.fixed) return false;
                var assigns = lhs.fixed.assigns;
                var matched = 0;
                if (!all(def.references, function(ref, index) {
                    var fixed = ref.fixed;
                    if (!fixed) return false;
                    if (fixed.to_binary || fixed.to_prefix) return false;
                    if (fixed === lhs.fixed) {
                        matched++;
                        return true;
                    }
                    return assigns && fixed.assigns && assigns[0] !== fixed.assigns[0];
                })) return false;
                if (matched != referenced) return false;
                verify_ref = true;
                return true;
            }

            function symbol_in_lvalues(sym) {
                var lvalue = lvalues.get(sym.name);
                if (!lvalue || all(lvalue, function(lhs) {
                    return !lhs;
                })) return;
                if (lvalue[0] !== lhs) return true;
                scan_rhs = false;
            }

            function may_modify(sym) {
                var def = sym.definition();
                if (def.orig.length == 1 && def.orig[0] instanceof AST_SymbolDefun) return false;
                if (def.scope.resolve() !== scope) return true;
                if (modify_toplevel && compressor.exposed(def)) return true;
                return !all(def.references, function(ref) {
                    return ref.scope.resolve(true) === scope;
                });
            }

            function side_effects_external(node, lhs) {
                if (node instanceof AST_Assign) return side_effects_external(node.left, true);
                if (node instanceof AST_Unary) return side_effects_external(node.expression, true);
                if (node instanceof AST_VarDef) return node.value && side_effects_external(node.value);
                if (lhs) {
                    if (node instanceof AST_Dot) return side_effects_external(node.expression, true);
                    if (node instanceof AST_Sub) return side_effects_external(node.expression, true);
                    if (node instanceof AST_SymbolRef) return node.definition().scope.resolve() !== scope;
                }
                return false;
            }
        }

        function eliminate_spurious_blocks(statements) {
            var changed = false, seen_dirs = [];
            for (var i = 0; i < statements.length;) {
                var stat = statements[i];
                if (stat instanceof AST_BlockStatement) {
                    if (all(stat.body, safe_to_trim)) {
                        changed = true;
                        eliminate_spurious_blocks(stat.body);
                        [].splice.apply(statements, [i, 1].concat(stat.body));
                        i += stat.body.length;
                        continue;
                    }
                }
                if (stat instanceof AST_Directive) {
                    if (member(stat.value, seen_dirs)) {
                        changed = true;
                        statements.splice(i, 1);
                        continue;
                    }
                    seen_dirs.push(stat.value);
                }
                if (stat instanceof AST_EmptyStatement) {
                    changed = true;
                    statements.splice(i, 1);
                    continue;
                }
                i++;
            }
            return changed;
        }

        function handle_if_return(statements, compressor) {
            var changed = false;
            var parent = compressor.parent();
            var self = compressor.self();
            var declare_only, jump, merge_jump;
            var in_iife = in_lambda && parent && parent.TYPE == "Call" && parent.expression === self;
            var chain_if_returns = in_lambda && compressor.option("conditionals") && compressor.option("sequences");
            var drop_return_void = !(in_try && in_try.bfinally && in_async_generator(scope));
            var multiple_if_returns = has_multiple_if_returns(statements);
            for (var i = statements.length; --i >= 0;) {
                var stat = statements[i];
                var j = next_index(i);
                var next = statements[j];

                if (in_lambda && declare_only && !next && stat instanceof AST_Return
                    && drop_return_void && !(self instanceof AST_SwitchBranch)) {
                    var body = stat.value;
                    if (!body) {
                        changed = true;
                        statements.splice(i, 1);
                        continue;
                    }
                    var tail = body.tail_node();
                    if (is_undefined(tail)) {
                        changed = true;
                        if (body instanceof AST_UnaryPrefix) {
                            body = body.expression;
                        } else if (tail instanceof AST_UnaryPrefix) {
                            body = body.clone();
                            body.expressions[body.expressions.length - 1] = tail.expression;
                        }
                        statements[i] = make_node(AST_SimpleStatement, stat, { body: body });
                        continue;
                    }
                }

                if (stat instanceof AST_If) {
                    var ab = aborts(stat.body);
                    // if (foo()) { bar(); return; } else baz(); moo(); ---> if (foo()) bar(); else { baz(); moo(); }
                    if (can_merge_flow(ab)) {
                        if (ab.label) remove(ab.label.thedef.references, ab);
                        changed = true;
                        stat = stat.clone();
                        stat.body = make_node(AST_BlockStatement, stat, {
                            body: as_statement_array_with_return(stat.body, ab),
                        });
                        stat.alternative = make_node(AST_BlockStatement, stat, {
                            body: as_statement_array(stat.alternative).concat(extract_functions(merge_jump, jump)),
                        });
                        adjust_refs(ab.value, merge_jump);
                        statements[i] = stat;
                        statements[i] = stat.transform(compressor);
                        continue;
                    }
                    // if (foo()) { bar(); return x; } return y; ---> if (!foo()) return y; bar(); return x;
                    if (ab && !stat.alternative && next instanceof AST_Jump) {
                        var cond = stat.condition;
                        var preference = i + 1 == j && stat.body instanceof AST_BlockStatement;
                        cond = best_of_expression(cond, cond.negate(compressor), preference);
                        if (cond !== stat.condition) {
                            changed = true;
                            stat = stat.clone();
                            stat.condition = cond;
                            var body = stat.body;
                            stat.body = make_node(AST_BlockStatement, next, {
                                body: extract_functions(true, null, j + 1),
                            });
                            statements.splice(i, 1, stat, body);
                            // proceed further only if `TreeWalker.stack` is in a consistent state
                            //    https://github.com/mishoo/UglifyJS/issues/5595
                            //    https://github.com/mishoo/UglifyJS/issues/5597
                            if (!in_lambda || self instanceof AST_Block && self.body === statements) {
                                statements[i] = stat.transform(compressor);
                            }
                            continue;
                        }
                    }
                    var alt = aborts(stat.alternative);
                    // if (foo()) bar(); else { baz(); return; } moo(); ---> if (foo()) { bar(); moo(); } else baz();
                    if (can_merge_flow(alt)) {
                        if (alt.label) remove(alt.label.thedef.references, alt);
                        changed = true;
                        stat = stat.clone();
                        stat.body = make_node(AST_BlockStatement, stat.body, {
                            body: as_statement_array(stat.body).concat(extract_functions(merge_jump, jump)),
                        });
                        stat.alternative = make_node(AST_BlockStatement, stat.alternative, {
                            body: as_statement_array_with_return(stat.alternative, alt),
                        });
                        adjust_refs(alt.value, merge_jump);
                        statements[i] = stat;
                        statements[i] = stat.transform(compressor);
                        continue;
                    }
                    if (compressor.option("typeofs")) {
                        if (ab && !alt) {
                            var stats = make_node(AST_BlockStatement, self, { body: statements.slice(i + 1) });
                            mark_locally_defined(stat.condition, null, stats);
                        }
                        if (!ab && alt) {
                            var stats = make_node(AST_BlockStatement, self, { body: statements.slice(i + 1) });
                            mark_locally_defined(stat.condition, stats);
                        }
                    }
                }

                if (stat instanceof AST_If && stat.body instanceof AST_Return) {
                    var value = stat.body.value;
                    var in_bool = stat.body.in_bool || next instanceof AST_Return && next.in_bool;
                    // if (foo()) return x; return y; ---> return foo() ? x : y;
                    if (!stat.alternative && next instanceof AST_Return
                        && (drop_return_void || !value == !next.value)) {
                        changed = true;
                        stat = stat.clone();
                        stat.alternative = make_node(AST_BlockStatement, next, {
                            body: extract_functions(true, null, j + 1),
                        });
                        statements[i] = stat;
                        statements[i] = stat.transform(compressor);
                        continue;
                    }
                    // if (foo()) return x; [ return ; ] ---> return foo() ? x : undefined;
                    // if (foo()) return bar() ? x : void 0; ---> return foo() && bar() ? x : void 0;
                    // if (foo()) return bar() ? void 0 : x; ---> return !foo() || bar() ? void 0 : x;
                    if (in_lambda && declare_only && !next && !stat.alternative && (in_bool
                        || value && multiple_if_returns
                        || value instanceof AST_Conditional && (is_undefined(value.consequent, compressor)
                            || is_undefined(value.alternative, compressor)))) {
                        changed = true;
                        stat = stat.clone();
                        stat.alternative = make_node(AST_Return, stat, { value: null });
                        statements[i] = stat;
                        statements[i] = stat.transform(compressor);
                        continue;
                    }
                    // if (a) return b; if (c) return d; e; ---> return a ? b : c ? d : void e;
                    //
                    // if sequences is not enabled, this can lead to an endless loop (issue #866).
                    // however, with sequences on this helps producing slightly better output for
                    // the example code.
                    var prev, prev_stat;
                    if (chain_if_returns && !stat.alternative
                        && (!(prev_stat = statements[prev = prev_index(i)]) && in_iife
                            || prev_stat instanceof AST_If && prev_stat.body instanceof AST_Return)
                        && (!next ? !declare_only
                            : next instanceof AST_SimpleStatement && next_index(j) == statements.length)) {
                        changed = true;
                        var exprs = [];
                        stat = stat.clone();
                        exprs.push(stat.condition);
                        stat.condition = make_sequence(stat, exprs);
                        stat.alternative = make_node(AST_BlockStatement, self, {
                            body: extract_functions().concat(make_node(AST_Return, self, { value: null })),
                        });
                        statements[i] = stat.transform(compressor);
                        i = prev + 1;
                        continue;
                    }
                }

                if (stat instanceof AST_Break || stat instanceof AST_Exit) {
                    jump = stat;
                    continue;
                }

                if (declare_only && jump && jump === next) eliminate_returns(stat);
            }
            return changed;

            function has_multiple_if_returns(statements) {
                var n = 0;
                for (var i = statements.length; --i >= 0;) {
                    var stat = statements[i];
                    if (stat instanceof AST_If && stat.body instanceof AST_Return) {
                        if (++n > 1) return true;
                    }
                }
                return false;
            }

            function match_target(target) {
                return last_of(compressor, function(node) {
                    return node === target;
                });
            }

            function match_return(ab, exact) {
                if (!jump) return false;
                if (jump.TYPE != ab.TYPE) return false;
                var value = ab.value;
                if (!value) return false;
                var equals = jump.equals(ab);
                if (!equals && value instanceof AST_Sequence) {
                    value = value.tail_node();
                    if (jump.value && jump.value.equals(value)) equals = 2;
                }
                if (!equals && !exact && jump.value instanceof AST_Sequence) {
                    if (jump.value.tail_node().equals(value)) equals = 3;
                }
                return equals;
            }

            function can_drop_abort(ab) {
                if (ab instanceof AST_Exit) {
                    if (merge_jump = match_return(ab)) return true;
                    if (!in_lambda) return false;
                    if (!(ab instanceof AST_Return)) return false;
                    var value = ab.value;
                    if (value) {
                        if (!drop_return_void) return false;
                        if (!is_undefined(value.tail_node())) return false;
                    }
                    if (!(self instanceof AST_SwitchBranch)) return true;
                    if (!jump) return false;
                    if (jump instanceof AST_Exit && jump.value) return false;
                    merge_jump = 4;
                    return true;
                }
                if (!(ab instanceof AST_LoopControl)) return false;
                if (self instanceof AST_SwitchBranch) {
                    if (jump instanceof AST_Exit) {
                        if (!in_lambda) return false;
                        if (jump.value) return false;
                        merge_jump = true;
                    } else if (jump) {
                        if (compressor.loopcontrol_target(jump) !== parent) return false;
                        merge_jump = true;
                    } else if (jump === false) {
                        return false;
                    }
                }
                var lct = compressor.loopcontrol_target(ab);
                if (ab instanceof AST_Continue) return match_target(loop_body(lct));
                if (lct instanceof AST_IterationStatement) return false;
                return match_target(lct);
            }

            function can_merge_flow(ab) {
                merge_jump = false;
                if (!can_drop_abort(ab)) return false;
                for (var j = statements.length; --j > i;) {
                    var stat = statements[j];
                    if (stat instanceof AST_DefClass) {
                        if (stat.name.definition().preinit) return false;
                    } else if (stat instanceof AST_Const || stat instanceof AST_Let) {
                        if (!all(stat.definitions, function(defn) {
                            return !defn.name.match_symbol(function(node) {
                                return node instanceof AST_SymbolDeclaration && node.definition().preinit;
                            });
                        })) return false;
                    }
                }
                return true;
            }

            function extract_functions(mode, stop, end) {
                var defuns = [];
                var lexical = false;
                var start = i + 1;
                if (!mode) {
                    end = statements.length;
                    jump = null;
                } else if (stop) {
                    end = statements.lastIndexOf(stop);
                } else {
                    stop = statements[end];
                    if (stop !== jump) jump = false;
                }
                var tail = statements.splice(start, end - start).filter(function(stat) {
                    if (stat instanceof AST_LambdaDefinition) {
                        defuns.push(stat);
                        return false;
                    }
                    if (is_lexical_definition(stat)) lexical = true;
                    return true;
                });
                if (mode === 3) {
                    tail.push(make_node(AST_SimpleStatement, stop.value, {
                        body: make_sequence(stop.value, stop.value.expressions.slice(0, -1)),
                    }));
                    stop.value = stop.value.tail_node();
                }
                [].push.apply(lexical ? tail : statements, defuns);
                return tail;
            }

            function trim_return(value, mode) {
                if (value) switch (mode) {
                  case 4:
                    return value;
                  case 3:
                    if (!(value instanceof AST_Sequence)) break;
                  case 2:
                    return make_sequence(value, value.expressions.slice(0, -1));
                }
            }

            function as_statement_array_with_return(node, ab) {
                var body = as_statement_array(node);
                var block = body, last;
                while ((last = block[block.length - 1]) !== ab) {
                    block = last.body;
                }
                block.pop();
                var value = ab.value;
                if (merge_jump) value = trim_return(value, merge_jump);
                if (value) block.push(make_node(AST_SimpleStatement, value, { body: value }));
                return body;
            }

            function adjust_refs(value, mode) {
                if (!mode) return;
                if (!value) return;
                switch (mode) {
                  case 4:
                    return;
                  case 3:
                  case 2:
                    value = value.tail_node();
                }
                merge_expression(value, jump.value);
            }

            function next_index(i) {
                declare_only = true;
                for (var j = i; ++j < statements.length;) {
                    var stat = statements[j];
                    if (is_declaration(stat)) continue;
                    if (stat instanceof AST_Var) {
                        declare_only = false;
                        continue;
                    }
                    break;
                }
                return j;
            }

            function prev_index(i) {
                for (var j = i; --j >= 0;) {
                    var stat = statements[j];
                    if (stat instanceof AST_Var) continue;
                    if (is_declaration(stat)) continue;
                    break;
                }
                return j;
            }

            function eliminate_returns(stat, keep_throws, in_block) {
                if (stat instanceof AST_Exit) {
                    var mode = !(keep_throws && stat instanceof AST_Throw) && match_return(stat, true);
                    if (mode) {
                        changed = true;
                        var value = trim_return(stat.value, mode);
                        if (value) return make_node(AST_SimpleStatement, value, { body: value });
                        return in_block ? null : make_node(AST_EmptyStatement, stat);
                    }
                } else if (stat instanceof AST_If) {
                    stat.body = eliminate_returns(stat.body, keep_throws);
                    if (stat.alternative) stat.alternative = eliminate_returns(stat.alternative, keep_throws);
                } else if (stat instanceof AST_LabeledStatement) {
                    stat.body = eliminate_returns(stat.body, keep_throws);
                } else if (stat instanceof AST_Try) {
                    if (!stat.bfinally || !jump.value || jump.value.is_constant()) {
                        if (stat.bcatch) eliminate_returns(stat.bcatch, keep_throws);
                        var trimmed = eliminate_returns(stat.body.pop(), true, true);
                        if (trimmed) stat.body.push(trimmed);
                    }
                } else if (stat instanceof AST_Block && !(stat instanceof AST_Scope || stat instanceof AST_Switch)) {
                    var trimmed = eliminate_returns(stat.body.pop(), keep_throws, true);
                    if (trimmed) stat.body.push(trimmed);
                }
                return stat;
            }
        }

        function eliminate_dead_code(statements, compressor) {
            var has_quit;
            var self = compressor.self();
            if (self instanceof AST_Catch) {
                self = compressor.parent();
            } else if (self instanceof AST_LabeledStatement) {
                self = self.body;
            }
            for (var i = 0, n = 0, len = statements.length; i < len; i++) {
                var stat = statements[i];
                if (stat instanceof AST_LoopControl) {
                    var lct = compressor.loopcontrol_target(stat);
                    if (loop_body(lct) !== self
                        || stat instanceof AST_Break && lct instanceof AST_IterationStatement) {
                        statements[n++] = stat;
                    } else if (stat.label) {
                        remove(stat.label.thedef.references, stat);
                    }
                } else {
                    statements[n++] = stat;
                }
                if (aborts(stat)) {
                    has_quit = statements.slice(i + 1);
                    break;
                }
            }
            statements.length = n;
            if (has_quit) has_quit.forEach(function(stat) {
                extract_declarations_from_unreachable_code(compressor, stat, statements);
            });
            return statements.length != len;
        }

        function trim_awaits(statements, compressor) {
            if (!in_lambda || in_try && in_try.bfinally) return;
            var changed = false;
            for (var index = statements.length; --index >= 0;) {
                var stat = statements[index];
                if (!(stat instanceof AST_SimpleStatement)) break;
                var node = stat.body.tail_node();
                if (!(node instanceof AST_Await)) break;
                var exp = node.expression;
                if (!needs_enqueuing(compressor, exp)) break;
                changed = true;
                exp = exp.drop_side_effect_free(compressor, true);
                if (stat.body instanceof AST_Sequence) {
                    var expressions = stat.body.expressions.slice();
                    expressions.pop();
                    if (exp) expressions.push(exp);
                    stat.body = make_sequence(stat.body, expressions);
                    break;
                }
                if (exp) {
                    stat.body = exp;
                    break;
                }
            }
            statements.length = index + 1;
            return changed;
        }

        function inline_iife(statements, compressor) {
            var changed = false;
            var index = statements.length - 1;
            if (in_lambda && index >= 0) {
                var no_return = in_try && in_try.bfinally && in_async_generator(scope);
                var inlined = statements[index].try_inline(compressor, block_scope, no_return);
                if (inlined) {
                    statements[index--] = inlined;
                    changed = true;
                }
            }
            var loop = in_loop && in_try ? "try" : in_loop;
            for (; index >= 0; index--) {
                var inlined = statements[index].try_inline(compressor, block_scope, true, loop);
                if (!inlined) continue;
                statements[index] = inlined;
                changed = true;
            }
            return changed;
        }

        function sequencesize(statements, compressor) {
            if (statements.length < 2) return;
            var seq = [], n = 0;
            function push_seq() {
                if (!seq.length) return;
                var body = make_sequence(seq[0], seq);
                statements[n++] = make_node(AST_SimpleStatement, body, { body: body });
                seq = [];
            }
            for (var i = 0, len = statements.length; i < len; i++) {
                var stat = statements[i];
                if (stat instanceof AST_SimpleStatement) {
                    if (seq.length >= compressor.sequences_limit) push_seq();
                    merge_sequence(seq, stat.body);
                } else if (is_declaration(stat)) {
                    statements[n++] = stat;
                } else {
                    push_seq();
                    statements[n++] = stat;
                }
            }
            push_seq();
            statements.length = n;
            return n != len;
        }

        function to_simple_statement(block, decls) {
            if (!(block instanceof AST_BlockStatement)) return block;
            var stat = null;
            for (var i = 0; i < block.body.length; i++) {
                var line = block.body[i];
                if (line instanceof AST_Var && declarations_only(line)) {
                    decls.push(line);
                } else if (stat || is_lexical_definition(line)) {
                    return false;
                } else {
                    stat = line;
                }
            }
            return stat;
        }

        function sequencesize_2(statements, compressor) {
            var changed = false, n = 0, prev;
            for (var i = 0; i < statements.length; i++) {
                var stat = statements[i];
                if (prev) {
                    if (stat instanceof AST_Exit) {
                        if (stat.value || !in_async_generator(scope)) {
                            stat.value = cons_seq(stat.value || make_node(AST_Undefined, stat)).optimize(compressor);
                        }
                    } else if (stat instanceof AST_For) {
                        if (!(stat.init instanceof AST_Definitions)) {
                            var abort = false;
                            prev.body.walk(new TreeWalker(function(node) {
                                if (abort || node instanceof AST_Scope) return true;
                                if (node instanceof AST_Binary && node.operator == "in") {
                                    abort = true;
                                    return true;
                                }
                            }));
                            if (!abort) {
                                if (stat.init) stat.init = cons_seq(stat.init);
                                else {
                                    stat.init = prev.body;
                                    n--;
                                    changed = true;
                                }
                            }
                        }
                    } else if (stat instanceof AST_ForIn) {
                        if (!is_lexical_definition(stat.init)) stat.object = cons_seq(stat.object);
                    } else if (stat instanceof AST_If) {
                        stat.condition = cons_seq(stat.condition);
                    } else if (stat instanceof AST_Switch) {
                        stat.expression = cons_seq(stat.expression);
                    } else if (stat instanceof AST_With) {
                        stat.expression = cons_seq(stat.expression);
                    }
                }
                if (compressor.option("conditionals") && stat instanceof AST_If) {
                    var decls = [];
                    var body = to_simple_statement(stat.body, decls);
                    var alt = to_simple_statement(stat.alternative, decls);
                    if (body !== false && alt !== false && decls.length > 0) {
                        var len = decls.length;
                        decls.push(make_node(AST_If, stat, {
                            condition: stat.condition,
                            body: body || make_node(AST_EmptyStatement, stat.body),
                            alternative: alt,
                        }));
                        decls.unshift(n, 1);
                        [].splice.apply(statements, decls);
                        i += len;
                        n += len + 1;
                        prev = null;
                        changed = true;
                        continue;
                    }
                }
                statements[n++] = stat;
                prev = stat instanceof AST_SimpleStatement ? stat : null;
            }
            statements.length = n;
            return changed;

            function cons_seq(right) {
                n--;
                changed = true;
                var left = prev.body;
                return make_sequence(left, [ left, right ]);
            }
        }

        function extract_exprs(body) {
            if (body instanceof AST_Assign) return [ body ];
            if (body instanceof AST_Sequence) return body.expressions.slice();
        }

        function join_assigns(defn, body, keep) {
            var exprs = extract_exprs(body);
            if (!exprs) return;
            keep = keep || 0;
            var trimmed = false;
            for (var i = exprs.length - keep; --i >= 0;) {
                var expr = exprs[i];
                if (!can_trim(expr)) continue;
                var tail;
                if (expr.left instanceof AST_SymbolRef) {
                    tail = exprs.slice(i + 1);
                } else if (expr.left instanceof AST_PropAccess && can_trim(expr.left.expression)) {
                    tail = exprs.slice(i + 1);
                    var flattened = expr.clone();
                    expr = expr.left.expression;
                    flattened.left = flattened.left.clone();
                    flattened.left.expression = expr.left.clone();
                    tail.unshift(flattened);
                } else {
                    continue;
                }
                if (tail.length == 0) continue;
                if (!trim_assigns(expr.left, expr.right, tail)) continue;
                trimmed = true;
                exprs = exprs.slice(0, i).concat(expr, tail);
            }
            if (defn instanceof AST_Definitions) {
                for (var i = defn.definitions.length; --i >= 0;) {
                    var def = defn.definitions[i];
                    if (!def.value) continue;
                    if (trim_assigns(def.name, def.value, exprs)) trimmed = true;
                    if (merge_conditional_assignments(def, exprs, keep)) trimmed = true;
                    break;
                }
                if (defn instanceof AST_Var && join_var_assign(defn.definitions, exprs, keep)) trimmed = true;
            }
            return trimmed && exprs;

            function can_trim(node) {
                return node instanceof AST_Assign && node.operator == "=";
            }
        }

        function merge_assigns(prev, defn) {
            if (!(prev instanceof AST_SimpleStatement)) return;
            if (declarations_only(defn)) return;
            var exprs = extract_exprs(prev.body);
            if (!exprs) return;
            var definitions = [];
            if (!join_var_assign(definitions, exprs.reverse(), 0)) return;
            defn.definitions = definitions.reverse().concat(defn.definitions);
            return exprs.reverse();
        }

        function merge_conditional_assignments(var_def, exprs, keep) {
            if (!compressor.option("conditionals")) return;
            if (var_def.name instanceof AST_Destructured) return;
            var trimmed = false;
            var def = var_def.name.definition();
            while (exprs.length > keep) {
                var cond = to_conditional_assignment(compressor, def, var_def.value, exprs[0]);
                if (!cond) break;
                var_def.value = cond;
                exprs.shift();
                trimmed = true;
            }
            return trimmed;
        }

        function join_var_assign(definitions, exprs, keep) {
            var trimmed = false;
            while (exprs.length > keep) {
                var expr = exprs[0];
                if (!(expr instanceof AST_Assign)) break;
                if (expr.operator != "=") break;
                var lhs = expr.left;
                if (!(lhs instanceof AST_SymbolRef)) break;
                if (is_undeclared_ref(lhs)) break;
                if (lhs.scope.resolve() !== scope) break;
                var def = lhs.definition();
                if (def.scope !== scope) break;
                if (def.orig.length > def.eliminated + 1) break;
                if (def.orig[0].TYPE != "SymbolVar") break;
                var name = make_node(AST_SymbolVar, lhs);
                definitions.push(make_node(AST_VarDef, expr, {
                    name: name,
                    value: expr.right,
                }));
                def.orig.push(name);
                def.replaced++;
                exprs.shift();
                trimmed = true;
            }
            return trimmed;
        }

        function trim_assigns(name, value, exprs) {
            var names = new Dictionary();
            names.set(name.name, true);
            while (value instanceof AST_Assign && value.operator == "=") {
                if (value.left instanceof AST_SymbolRef) names.set(value.left.name, true);
                value = value.right;
            }
            if (value instanceof AST_Array) {
                var trimmed = false;
                do {
                    if (!try_join_array(exprs[0])) break;
                    exprs.shift();
                    trimmed = true;
                } while (exprs.length);
                return trimmed;
            } else if (value instanceof AST_Object) {
                var trimmed = false;
                do {
                    if (!try_join_object(exprs[0])) break;
                    exprs.shift();
                    trimmed = true;
                } while (exprs.length);
                return trimmed;
            }

            function try_join_array(node) {
                if (!(node instanceof AST_Assign)) return;
                if (node.operator != "=") return;
                if (!(node.left instanceof AST_PropAccess)) return;
                var sym = node.left.expression;
                if (!(sym instanceof AST_SymbolRef)) return;
                if (!names.has(sym.name)) return;
                if (!node.right.is_constant_expression(scope)) return;
                var prop = node.left.property;
                if (prop instanceof AST_Node) {
                    if (try_join_array(prop)) prop = node.left.property = prop.right.clone();
                    prop = prop.evaluate(compressor);
                }
                if (prop instanceof AST_Node) return;
                if (!RE_POSITIVE_INTEGER.test("" + prop)) return;
                prop = +prop;
                var elements = value.elements;
                var len = elements.length;
                if (prop > len + 4) return;
                for (var i = Math.min(len, prop + 1); --i >= 0;) {
                    if (elements[i] instanceof AST_Spread) return;
                }
                if (prop < len) {
                    var element = elements[prop].drop_side_effect_free(compressor);
                    elements[prop] = element ? make_sequence(node, [ element, node.right ]) : node.right;
                } else {
                    while (prop > len) elements[len++] = make_node(AST_Hole, value);
                    elements[prop] = node.right;
                }
                return true;
            }

            function try_join_object(node) {
                if (!(node instanceof AST_Assign)) return;
                if (node.operator != "=") return;
                if (!(node.left instanceof AST_PropAccess)) return;
                var sym = node.left.expression;
                if (!(sym instanceof AST_SymbolRef)) return;
                if (!names.has(sym.name)) return;
                if (!node.right.is_constant_expression(scope)) return;
                var prop = node.left.property;
                if (prop instanceof AST_Node) {
                    if (try_join_object(prop)) prop = node.left.property = prop.right.clone();
                    prop = prop.evaluate(compressor);
                }
                if (prop instanceof AST_Node) return;
                prop = "" + prop;
                var diff = prop == "__proto__" || compressor.has_directive("use strict") ? function(node) {
                    var key = node.key;
                    return typeof key == "string" && key != prop && key != "__proto__";
                } : function(node) {
                    var key = node.key;
                    if (node instanceof AST_ObjectGetter || node instanceof AST_ObjectSetter) {
                        return typeof key == "string" && key != prop;
                    }
                    return key !== "__proto__";
                };
                if (!all(value.properties, diff)) return;
                value.properties.push(make_node(AST_ObjectKeyVal, node, {
                    key: prop,
                    value: node.right,
                }));
                return true;
            }
        }

        function join_consecutive_vars(statements) {
            var changed = false, defs, prev_defs;
            for (var i = 0, j = -1; i < statements.length; i++) {
                var stat = statements[i];
                var prev = statements[j];
                if (stat instanceof AST_Definitions) {
                    if (prev && prev.TYPE == stat.TYPE) {
                        prev.definitions = prev.definitions.concat(stat.definitions);
                        changed = true;
                    } else if (stat && prev instanceof AST_Let && stat.can_letify(compressor)) {
                        prev.definitions = prev.definitions.concat(to_let(stat, block_scope).definitions);
                        changed = true;
                    } else if (prev && stat instanceof AST_Let && prev.can_letify(compressor)) {
                        defs = prev_defs;
                        statements[j] = prev = to_let(prev, block_scope);
                        prev.definitions = prev.definitions.concat(stat.definitions);
                        changed = true;
                    } else if (defs && defs.TYPE == stat.TYPE && declarations_only(stat)) {
                        defs.definitions = defs.definitions.concat(stat.definitions);
                        changed = true;
                    } else if (stat instanceof AST_Var) {
                        var exprs = merge_assigns(prev, stat);
                        if (exprs) {
                            if (exprs.length) {
                                prev.body = make_sequence(prev, exprs);
                                j++;
                            }
                            changed = true;
                        } else {
                            j++;
                        }
                        prev_defs = defs;
                        statements[j] = defs = stat;
                    } else {
                        statements[++j] = stat;
                    }
                    continue;
                } else if (stat instanceof AST_Exit) {
                    stat.value = join_assigns_expr(stat.value);
                } else if (stat instanceof AST_For) {
                    var exprs = join_assigns(prev, stat.init);
                    if (exprs) {
                        changed = true;
                        stat.init = exprs.length ? make_sequence(stat.init, exprs) : null;
                    } else if (prev instanceof AST_Var && (!stat.init || stat.init.TYPE == prev.TYPE)) {
                        if (stat.init) {
                            prev.definitions = prev.definitions.concat(stat.init.definitions);
                        }
                        stat = stat.clone();
                        prev_defs = defs;
                        defs = stat.init = prev;
                        statements[j] = merge_defns(stat);
                        changed = true;
                        continue;
                    } else if (defs && stat.init && defs.TYPE == stat.init.TYPE && declarations_only(stat.init)) {
                        defs.definitions = defs.definitions.concat(stat.init.definitions);
                        stat.init = null;
                        changed = true;
                    } else if (stat.init instanceof AST_Var) {
                        prev_defs = defs;
                        defs = stat.init;
                        exprs = merge_assigns(prev, stat.init);
                        if (exprs) {
                            changed = true;
                            if (exprs.length == 0) {
                                statements[j] = merge_defns(stat);
                                continue;
                            }
                            prev.body = make_sequence(prev, exprs);
                        }
                    }
                } else if (stat instanceof AST_ForEnumeration) {
                    if (defs && defs.TYPE == stat.init.TYPE) {
                        var defns = defs.definitions.slice();
                        stat.init = stat.init.definitions[0].name.convert_symbol(AST_SymbolRef, function(ref, name) {
                            defns.push(make_node(AST_VarDef, name, {
                                name: name,
                                value: null,
                            }));
                            name.definition().references.push(ref);
                        });
                        defs.definitions = defns;
                        changed = true;
                    }
                    stat.object = join_assigns_expr(stat.object);
                } else if (stat instanceof AST_If) {
                    stat.condition = join_assigns_expr(stat.condition);
                } else if (stat instanceof AST_SimpleStatement) {
                    var exprs = join_assigns(prev, stat.body), next;
                    if (exprs) {
                        changed = true;
                        if (!exprs.length) continue;
                        stat.body = make_sequence(stat.body, exprs);
                    } else if (prev instanceof AST_Definitions
                        && (next = statements[i + 1])
                        && prev.TYPE == next.TYPE
                        && (next = next.definitions[0]).value) {
                        changed = true;
                        next.value = make_sequence(stat, [ stat.body, next.value ]);
                        continue;
                    }
                } else if (stat instanceof AST_Switch) {
                    stat.expression = join_assigns_expr(stat.expression);
                } else if (stat instanceof AST_With) {
                    stat.expression = join_assigns_expr(stat.expression);
                }
                statements[++j] = defs ? merge_defns(stat) : stat;
            }
            statements.length = j + 1;
            return changed;

            function join_assigns_expr(value) {
                var exprs = join_assigns(prev, value, 1);
                if (!exprs) return value;
                changed = true;
                var tail = value.tail_node();
                if (exprs[exprs.length - 1] !== tail) exprs.push(tail.left);
                return make_sequence(value, exprs);
            }

            function merge_defns(stat) {
                return stat.transform(new TreeTransformer(function(node, descend, in_list) {
                    if (node instanceof AST_Definitions) {
                        if (defs === node) return node;
                        if (defs.TYPE != node.TYPE) return node;
                        var parent = this.parent();
                        if (parent instanceof AST_ForEnumeration && parent.init === node) return node;
                        if (!declarations_only(node)) return node;
                        defs.definitions = defs.definitions.concat(node.definitions);
                        changed = true;
                        if (parent instanceof AST_For && parent.init === node) return null;
                        return in_list ? List.skip : make_node(AST_EmptyStatement, node);
                    }
                    if (node instanceof AST_ExportDeclaration) return node;
                    if (node instanceof AST_Scope) return node;
                    if (!is_statement(node)) return node;
                }));
            }
        }
    }

    function extract_declarations_from_unreachable_code(compressor, stat, target) {
        var block;
        var dropped = false;
        stat.walk(new TreeWalker(function(node, descend) {
            if (node instanceof AST_DefClass) {
                node.extends = null;
                node.properties = [];
                push(node);
                return true;
            }
            if (node instanceof AST_Definitions) {
                var defns = [];
                if (node.remove_initializers(compressor, defns)) {
                    AST_Node.warn("Dropping initialization in unreachable code [{start}]", node);
                }
                if (defns.length > 0) {
                    node.definitions = defns;
                    push(node);
                }
                return true;
            }
            if (node instanceof AST_LambdaDefinition) {
                push(node);
                return true;
            }
            if (node instanceof AST_Scope) return true;
            if (node instanceof AST_BlockScope) {
                var save = block;
                block = [];
                descend();
                if (block.required) {
                    target.push(make_node(AST_BlockStatement, stat, { body: block }));
                } else if (block.length) {
                    [].push.apply(target, block);
                }
                block = save;
                return true;
            }
            if (!(node instanceof AST_LoopControl)) dropped = true;
        }));
        if (dropped) AST_Node.warn("Dropping unreachable code [{start}]", stat);

        function push(node) {
            if (block) {
                block.push(node);
                if (!safe_to_trim(node)) block.required = true;
            } else {
                target.push(node);
            }
        }
    }

    function is_undefined(node, compressor) {
        return node == null
            || node.is_undefined
            || node instanceof AST_Undefined
            || node instanceof AST_UnaryPrefix
                && node.operator == "void"
                && !(compressor && node.expression.has_side_effects(compressor));
    }

    // in_strict_mode()
    // return true if scope executes in Strict Mode
    (function(def) {
        def(AST_Class, return_true);
        def(AST_Scope, function(compressor) {
            var body = this.body;
            for (var i = 0; i < body.length; i++) {
                var stat = body[i];
                if (!(stat instanceof AST_Directive)) break;
                if (stat.value == "use strict") return true;
            }
            var parent = this.parent_scope;
            if (!parent) return compressor.option("module");
            return parent.resolve(true).in_strict_mode(compressor);
        });
    })(function(node, func) {
        node.DEFMETHOD("in_strict_mode", func);
    });

    // is_truthy()
    // return true if `!!node === true`
    (function(def) {
        def(AST_Node, return_false);
        def(AST_Array, return_true);
        def(AST_Assign, function() {
            return this.operator == "=" && this.right.is_truthy();
        });
        def(AST_Lambda, return_true);
        def(AST_Object, return_true);
        def(AST_RegExp, return_true);
        def(AST_Sequence, function() {
            return this.tail_node().is_truthy();
        });
        def(AST_SymbolRef, function() {
            var fixed = this.fixed_value();
            if (!fixed) return false;
            this.is_truthy = return_false;
            var result = fixed.is_truthy();
            delete this.is_truthy;
            return result;
        });
    })(function(node, func) {
        node.DEFMETHOD("is_truthy", func);
    });

    // is_negative_zero()
    // return true if the node may represent -0
    (function(def) {
        def(AST_Node, return_true);
        def(AST_Array, return_false);
        function binary(op, left, right) {
            switch (op) {
              case "-":
                return left.is_negative_zero()
                    && (!(right instanceof AST_Constant) || right.value == 0);
              case "&&":
              case "||":
                return left.is_negative_zero() || right.is_negative_zero();
              case "*":
              case "/":
              case "%":
              case "**":
                return true;
              default:
                return false;
            }
        }
        def(AST_Assign, function() {
            var op = this.operator;
            if (op == "=") return this.right.is_negative_zero();
            return binary(op.slice(0, -1), this.left, this.right);
        });
        def(AST_Binary, function() {
            return binary(this.operator, this.left, this.right);
        });
        def(AST_Constant, function() {
            return this.value == 0 && 1 / this.value < 0;
        });
        def(AST_Lambda, return_false);
        def(AST_Object, return_false);
        def(AST_RegExp, return_false);
        def(AST_Sequence, function() {
            return this.tail_node().is_negative_zero();
        });
        def(AST_SymbolRef, function() {
            var fixed = this.fixed_value();
            if (!fixed) return true;
            this.is_negative_zero = return_true;
            var result = fixed.is_negative_zero();
            delete this.is_negative_zero;
            return result;
        });
        def(AST_UnaryPrefix, function() {
            return this.operator == "+" && this.expression.is_negative_zero()
                || this.operator == "-";
        });
    })(function(node, func) {
        node.DEFMETHOD("is_negative_zero", func);
    });

    // may_throw_on_access()
    // returns true if this node may be null, undefined or contain `AST_Accessor`
    (function(def) {
        AST_Node.DEFMETHOD("may_throw_on_access", function(compressor, force) {
            return !compressor.option("pure_getters") || this._dot_throw(compressor, force);
        });
        function is_strict(compressor, force) {
            return force || /strict/.test(compressor.option("pure_getters"));
        }
        def(AST_Node, is_strict);
        def(AST_Array, return_false);
        def(AST_Assign, function(compressor) {
            var op = this.operator;
            var sym = this.left;
            var rhs = this.right;
            if (op != "=") {
                return lazy_op[op.slice(0, -1)] && (sym._dot_throw(compressor) || rhs._dot_throw(compressor));
            }
            if (!rhs._dot_throw(compressor)) return false;
            if (!(sym instanceof AST_SymbolRef)) return true;
            if (rhs instanceof AST_Binary && rhs.operator == "||" && sym.name == rhs.left.name) {
                return rhs.right._dot_throw(compressor);
            }
            return true;
        });
        def(AST_Binary, function(compressor) {
            return lazy_op[this.operator] && (this.left._dot_throw(compressor) || this.right._dot_throw(compressor));
        });
        def(AST_Class, function(compressor, force) {
            return is_strict(compressor, force) && !all(this.properties, function(prop) {
                if (prop.private) return true;
                if (!prop.static) return true;
                return !(prop instanceof AST_ClassGetter || prop instanceof AST_ClassSetter);
            });
        });
        def(AST_Conditional, function(compressor) {
            return this.consequent._dot_throw(compressor) || this.alternative._dot_throw(compressor);
        });
        def(AST_Constant, return_false);
        def(AST_Dot, function(compressor, force) {
            if (!is_strict(compressor, force)) return false;
            var exp = this.expression;
            if (exp instanceof AST_SymbolRef) exp = exp.fixed_value();
            return !(this.property == "prototype" && is_lambda(exp));
        });
        def(AST_Lambda, return_false);
        def(AST_Null, return_true);
        def(AST_Object, function(compressor, force) {
            return is_strict(compressor, force) && !all(this.properties, function(prop) {
                if (prop instanceof AST_ObjectGetter || prop instanceof AST_ObjectSetter) return false;
                return !(prop.key === "__proto__" && prop.value._dot_throw(compressor, force));
            });
        });
        def(AST_ObjectIdentity, function(compressor, force) {
            return is_strict(compressor, force) && !this.scope.resolve().new;
        });
        def(AST_Sequence, function(compressor) {
            return this.tail_node()._dot_throw(compressor);
        });
        def(AST_SymbolRef, function(compressor, force) {
            if (this.defined) return false;
            if (this.is_undefined) return true;
            if (!is_strict(compressor, force)) return false;
            if (is_undeclared_ref(this) && this.is_declared(compressor)) return false;
            if (this.is_immutable()) return false;
            var def = this.definition();
            if (is_arguments(def) && !def.scope.rest && all(def.scope.argnames, function(argname) {
                return argname instanceof AST_SymbolFunarg;
            })) return def.scope.uses_arguments > 2;
            var fixed = this.fixed_value(true);
            if (!fixed) return true;
            this._dot_throw = return_true;
            if (fixed._dot_throw(compressor)) {
                delete this._dot_throw;
                return true;
            }
            this._dot_throw = return_false;
            return false;
        });
        def(AST_UnaryPrefix, function() {
            return this.operator == "void";
        });
        def(AST_UnaryPostfix, return_false);
        def(AST_Undefined, return_true);
    })(function(node, func) {
        node.DEFMETHOD("_dot_throw", func);
    });

    (function(def) {
        def(AST_Node, return_false);
        def(AST_Array, return_true);
        function is_binary_defined(compressor, op, node) {
            switch (op) {
              case "&&":
                return node.left.is_defined(compressor) && node.right.is_defined(compressor);
              case "||":
                return node.left.is_truthy() || node.right.is_defined(compressor);
              case "??":
                return node.left.is_defined(compressor) || node.right.is_defined(compressor);
              default:
                return true;
            }
        }
        def(AST_Assign, function(compressor) {
            var op = this.operator;
            if (op == "=") return this.right.is_defined(compressor);
            return is_binary_defined(compressor, op.slice(0, -1), this);
        });
        def(AST_Binary, function(compressor) {
            return is_binary_defined(compressor, this.operator, this);
        });
        def(AST_Conditional, function(compressor) {
            return this.consequent.is_defined(compressor) && this.alternative.is_defined(compressor);
        });
        def(AST_Constant, return_true);
        def(AST_Hole, return_false);
        def(AST_Lambda, return_true);
        def(AST_Object, return_true);
        def(AST_Sequence, function(compressor) {
            return this.tail_node().is_defined(compressor);
        });
        def(AST_SymbolRef, function(compressor) {
            if (this.is_undefined) return false;
            if (is_undeclared_ref(this) && this.is_declared(compressor)) return true;
            if (this.is_immutable()) return true;
            var fixed = this.fixed_value();
            if (!fixed) return false;
            this.is_defined = return_false;
            var result = fixed.is_defined(compressor);
            delete this.is_defined;
            return result;
        });
        def(AST_UnaryPrefix, function() {
            return this.operator != "void";
        });
        def(AST_UnaryPostfix, return_true);
        def(AST_Undefined, return_false);
    })(function(node, func) {
        node.DEFMETHOD("is_defined", func);
    });

    /* -----[ boolean/negation helpers ]----- */

    // methods to determine whether an expression has a boolean result type
    (function(def) {
        def(AST_Node, return_false);
        def(AST_Assign, function(compressor) {
            return this.operator == "=" && this.right.is_boolean(compressor);
        });
        var binary = makePredicate("in instanceof == != === !== < <= >= >");
        def(AST_Binary, function(compressor) {
            return binary[this.operator] || lazy_op[this.operator]
                && this.left.is_boolean(compressor)
                && this.right.is_boolean(compressor);
        });
        def(AST_Boolean, return_true);
        var fn = makePredicate("every hasOwnProperty isPrototypeOf propertyIsEnumerable some");
        def(AST_Call, function(compressor) {
            if (!compressor.option("unsafe")) return false;
            var exp = this.expression;
            return exp instanceof AST_Dot && (fn[exp.property]
                || exp.property == "test" && exp.expression instanceof AST_RegExp);
        });
        def(AST_Conditional, function(compressor) {
            return this.consequent.is_boolean(compressor) && this.alternative.is_boolean(compressor);
        });
        def(AST_New, return_false);
        def(AST_Sequence, function(compressor) {
            return this.tail_node().is_boolean(compressor);
        });
        def(AST_SymbolRef, function(compressor) {
            var fixed = this.fixed_value();
            if (!fixed) return false;
            this.is_boolean = return_false;
            var result = fixed.is_boolean(compressor);
            delete this.is_boolean;
            return result;
        });
        var unary = makePredicate("! delete");
        def(AST_UnaryPrefix, function() {
            return unary[this.operator];
        });
    })(function(node, func) {
        node.DEFMETHOD("is_boolean", func);
    });

    // methods to determine if an expression has a numeric result type
    (function(def) {
        def(AST_Node, return_false);
        var binary = makePredicate("- * / % ** & | ^ << >> >>>");
        def(AST_Assign, function(compressor) {
            return binary[this.operator.slice(0, -1)]
                || this.operator == "=" && this.right.is_number(compressor);
        });
        def(AST_Binary, function(compressor) {
            if (binary[this.operator]) return true;
            if (this.operator != "+") return false;
            return (this.left.is_boolean(compressor) || this.left.is_number(compressor))
                && (this.right.is_boolean(compressor) || this.right.is_number(compressor));
        });
        var fn = makePredicate([
            "charCodeAt",
            "getDate",
            "getDay",
            "getFullYear",
            "getHours",
            "getMilliseconds",
            "getMinutes",
            "getMonth",
            "getSeconds",
            "getTime",
            "getTimezoneOffset",
            "getUTCDate",
            "getUTCDay",
            "getUTCFullYear",
            "getUTCHours",
            "getUTCMilliseconds",
            "getUTCMinutes",
            "getUTCMonth",
            "getUTCSeconds",
            "getYear",
            "indexOf",
            "lastIndexOf",
            "localeCompare",
            "push",
            "search",
            "setDate",
            "setFullYear",
            "setHours",
            "setMilliseconds",
            "setMinutes",
            "setMonth",
            "setSeconds",
            "setTime",
            "setUTCDate",
            "setUTCFullYear",
            "setUTCHours",
            "setUTCMilliseconds",
            "setUTCMinutes",
            "setUTCMonth",
            "setUTCSeconds",
            "setYear",
        ]);
        def(AST_Call, function(compressor) {
            if (!compressor.option("unsafe")) return false;
            var exp = this.expression;
            return exp instanceof AST_Dot && (fn[exp.property]
                || is_undeclared_ref(exp.expression) && exp.expression.name == "Math");
        });
        def(AST_Conditional, function(compressor) {
            return this.consequent.is_number(compressor) && this.alternative.is_number(compressor);
        });
        def(AST_New, return_false);
        def(AST_Number, return_true);
        def(AST_Sequence, function(compressor) {
            return this.tail_node().is_number(compressor);
        });
        def(AST_SymbolRef, function(compressor, keep_unary) {
            var fixed = this.fixed_value();
            if (!fixed) return false;
            if (keep_unary
                && fixed instanceof AST_UnaryPrefix
                && fixed.operator == "+"
                && fixed.expression.equals(this)) {
                return false;
            }
            this.is_number = return_false;
            var result = fixed.is_number(compressor);
            delete this.is_number;
            return result;
        });
        var unary = makePredicate("+ - ~ ++ --");
        def(AST_Unary, function() {
            return unary[this.operator];
        });
    })(function(node, func) {
        node.DEFMETHOD("is_number", func);
    });

    // methods to determine if an expression has a string result type
    (function(def) {
        def(AST_Node, return_false);
        def(AST_Assign, function(compressor) {
            switch (this.operator) {
              case "+=":
                if (this.left.is_string(compressor)) return true;
              case "=":
                return this.right.is_string(compressor);
            }
        });
        def(AST_Binary, function(compressor) {
            return this.operator == "+" &&
                (this.left.is_string(compressor) || this.right.is_string(compressor));
        });
        var fn = makePredicate([
            "charAt",
            "substr",
            "substring",
            "toExponential",
            "toFixed",
            "toLowerCase",
            "toPrecision",
            "toString",
            "toUpperCase",
            "trim",
        ]);
        def(AST_Call, function(compressor) {
            if (!compressor.option("unsafe")) return false;
            var exp = this.expression;
            return exp instanceof AST_Dot && fn[exp.property];
        });
        def(AST_Conditional, function(compressor) {
            return this.consequent.is_string(compressor) && this.alternative.is_string(compressor);
        });
        def(AST_Sequence, function(compressor) {
            return this.tail_node().is_string(compressor);
        });
        def(AST_String, return_true);
        def(AST_SymbolRef, function(compressor) {
            var fixed = this.fixed_value();
            if (!fixed) return false;
            this.is_string = return_false;
            var result = fixed.is_string(compressor);
            delete this.is_string;
            return result;
        });
        def(AST_Template, function(compressor) {
            return !this.tag || is_raw_tag(compressor, this.tag);
        });
        def(AST_UnaryPrefix, function() {
            return this.operator == "typeof";
        });
    })(function(node, func) {
        node.DEFMETHOD("is_string", func);
    });

    var lazy_op = makePredicate("&& || ??");

    (function(def) {
        function to_node(value, orig) {
            if (value instanceof AST_Node) return value.clone(true);
            if (Array.isArray(value)) return make_node(AST_Array, orig, {
                elements: value.map(function(value) {
                    return to_node(value, orig);
                })
            });
            if (value && typeof value == "object") {
                var props = [];
                for (var key in value) if (HOP(value, key)) {
                    props.push(make_node(AST_ObjectKeyVal, orig, {
                        key: key,
                        value: to_node(value[key], orig),
                    }));
                }
                return make_node(AST_Object, orig, { properties: props });
            }
            return make_node_from_constant(value, orig);
        }

        function warn(node) {
            AST_Node.warn("global_defs {this} redefined [{start}]", node);
        }

        AST_Toplevel.DEFMETHOD("resolve_defines", function(compressor) {
            if (!compressor.option("global_defs")) return this;
            this.figure_out_scope({ ie: compressor.option("ie") });
            return this.transform(new TreeTransformer(function(node) {
                var def = node._find_defs(compressor, "");
                if (!def) return;
                var level = 0, child = node, parent;
                while (parent = this.parent(level++)) {
                    if (!(parent instanceof AST_PropAccess)) break;
                    if (parent.expression !== child) break;
                    child = parent;
                }
                if (is_lhs(child, parent)) {
                    warn(node);
                    return;
                }
                return def;
            }));
        });
        def(AST_Node, noop);
        def(AST_Dot, function(compressor, suffix) {
            return this.expression._find_defs(compressor, "." + this.property + suffix);
        });
        def(AST_SymbolDeclaration, function(compressor) {
            if (!this.definition().global) return;
            if (HOP(compressor.option("global_defs"), this.name)) warn(this);
        });
        def(AST_SymbolRef, function(compressor, suffix) {
            if (!this.definition().global) return;
            var defines = compressor.option("global_defs");
            var name = this.name + suffix;
            if (HOP(defines, name)) return to_node(defines[name], this);
        });
    })(function(node, func) {
        node.DEFMETHOD("_find_defs", func);
    });

    function best_of_expression(ast1, ast2, threshold) {
        var delta = ast2.print_to_string().length - ast1.print_to_string().length;
        return delta < (threshold || 0) ? ast2 : ast1;
    }

    function best_of_statement(ast1, ast2, threshold) {
        return best_of_expression(make_node(AST_SimpleStatement, ast1, {
            body: ast1,
        }), make_node(AST_SimpleStatement, ast2, {
            body: ast2,
        }), threshold).body;
    }

    function best_of(compressor, ast1, ast2, threshold) {
        return (first_in_statement(compressor) ? best_of_statement : best_of_expression)(ast1, ast2, threshold);
    }

    function convert_to_predicate(obj) {
        var map = Object.create(null);
        Object.keys(obj).forEach(function(key) {
            map[key] = makePredicate(obj[key]);
        });
        return map;
    }

    function skip_directives(body) {
        for (var i = 0; i < body.length; i++) {
            var stat = body[i];
            if (!(stat instanceof AST_Directive)) return stat;
        }
    }

    function arrow_first_statement() {
        if (this.value) return make_node(AST_Return, this.value, { value: this.value });
        return skip_directives(this.body);
    }
    AST_Arrow.DEFMETHOD("first_statement", arrow_first_statement);
    AST_AsyncArrow.DEFMETHOD("first_statement", arrow_first_statement);
    AST_Lambda.DEFMETHOD("first_statement", function() {
        return skip_directives(this.body);
    });

    AST_Lambda.DEFMETHOD("length", function() {
        var argnames = this.argnames;
        for (var i = 0; i < argnames.length; i++) {
            if (argnames[i] instanceof AST_DefaultValue) break;
        }
        return i;
    });

    function try_evaluate(compressor, node) {
        var ev = node.evaluate(compressor);
        if (ev === node) return node;
        ev = make_node_from_constant(ev, node).optimize(compressor);
        return best_of(compressor, node, ev, compressor.eval_threshold);
    }

    var object_fns = [
        "constructor",
        "toString",
        "valueOf",
    ];
    var native_fns = convert_to_predicate({
        Array: [
            "indexOf",
            "join",
            "lastIndexOf",
            "slice",
        ].concat(object_fns),
        Boolean: object_fns,
        Function: object_fns,
        Number: [
            "toExponential",
            "toFixed",
            "toPrecision",
        ].concat(object_fns),
        Object: object_fns,
        RegExp: [
            "exec",
            "test",
        ].concat(object_fns),
        String: [
            "charAt",
            "charCodeAt",
            "concat",
            "indexOf",
            "italics",
            "lastIndexOf",
            "match",
            "replace",
            "search",
            "slice",
            "split",
            "substr",
            "substring",
            "toLowerCase",
            "toUpperCase",
            "trim",
        ].concat(object_fns),
    });
    var static_fns = convert_to_predicate({
        Array: [
            "isArray",
        ],
        Math: [
            "abs",
            "acos",
            "asin",
            "atan",
            "ceil",
            "cos",
            "exp",
            "floor",
            "log",
            "round",
            "sin",
            "sqrt",
            "tan",
            "atan2",
            "pow",
            "max",
            "min",
        ],
        Number: [
            "isFinite",
            "isNaN",
        ],
        Object: [
            "create",
            "getOwnPropertyDescriptor",
            "getOwnPropertyNames",
            "getPrototypeOf",
            "isExtensible",
            "isFrozen",
            "isSealed",
            "keys",
        ],
        String: [
            "fromCharCode",
            "raw",
        ],
    });

    function is_static_fn(node) {
        if (!(node instanceof AST_Dot)) return false;
        var expr = node.expression;
        if (!is_undeclared_ref(expr)) return false;
        var static_fn = static_fns[expr.name];
        return static_fn && (static_fn[node.property] || expr.name == "Math" && node.property == "random");
    }

    // Accommodate when compress option evaluate=false
    // as well as the common constant expressions !0 and -1
    (function(def) {
        def(AST_Node, return_false);
        def(AST_Constant, return_true);
        def(AST_RegExp, return_false);
        var unaryPrefix = makePredicate("! ~ - + void");
        def(AST_UnaryPrefix, function() {
            return unaryPrefix[this.operator] && this.expression instanceof AST_Constant;
        });
    })(function(node, func) {
        node.DEFMETHOD("is_constant", func);
    });

    // methods to evaluate a constant expression
    (function(def) {
        // If the node has been successfully reduced to a constant,
        // then its value is returned; otherwise the element itself
        // is returned.
        //
        // They can be distinguished as constant value is never a
        // descendant of AST_Node.
        //
        // When `ignore_side_effects` is `true`, inspect the constant value
        // produced without worrying about any side effects caused by said
        // expression.
        AST_Node.DEFMETHOD("evaluate", function(compressor, ignore_side_effects) {
            if (!compressor.option("evaluate")) return this;
            var cached = [];
            var val = this._eval(compressor, ignore_side_effects, cached, 1);
            cached.forEach(function(node) {
                delete node._eval;
            });
            if (ignore_side_effects) return val;
            if (!val || val instanceof RegExp) return val;
            if (typeof val == "function" || typeof val == "object") return this;
            return val;
        });
        var scan_modified = new TreeWalker(function(node) {
            if (node instanceof AST_Assign) modified(node.left);
            if (node instanceof AST_ForEnumeration) modified(node.init);
            if (node instanceof AST_Unary && UNARY_POSTFIX[node.operator]) modified(node.expression);
        });
        function modified(node) {
            if (node instanceof AST_DestructuredArray) {
                node.elements.forEach(modified);
            } else if (node instanceof AST_DestructuredObject) {
                node.properties.forEach(function(prop) {
                    modified(prop.value);
                });
            } else if (node instanceof AST_PropAccess) {
                modified(node.expression);
            } else if (node instanceof AST_SymbolRef) {
                node.definition().references.forEach(function(ref) {
                    delete ref._eval;
                });
            }
        }
        def(AST_Statement, function() {
            throw new Error(string_template("Cannot evaluate a statement [{start}]", this));
        });
        def(AST_Accessor, return_this);
        def(AST_BigInt, return_this);
        def(AST_Class, return_this);
        def(AST_Node, return_this);
        def(AST_Constant, function() {
            return this.value;
        });
        def(AST_Assign, function(compressor, ignore_side_effects, cached, depth) {
            var lhs = this.left;
            if (!ignore_side_effects) {
                if (!(lhs instanceof AST_SymbolRef)) return this;
                if (!HOP(lhs, "_eval")) {
                    if (!lhs.fixed) return this;
                    var def = lhs.definition();
                    if (!def.fixed) return this;
                    if (def.undeclared) return this;
                    if (def.last_ref !== lhs) return this;
                    if (def.single_use == "m") return this;
                    if (this.right.has_side_effects(compressor)) return this;
                }
            }
            var op = this.operator;
            var node;
            if (!HOP(lhs, "_eval") && lhs instanceof AST_SymbolRef && lhs.fixed && lhs.definition().fixed) {
                node = lhs;
            } else if (op == "=") {
                node = this.right;
            } else {
                node = make_node(AST_Binary, this, {
                    operator: op.slice(0, -1),
                    left: lhs,
                    right: this.right,
                });
            }
            lhs.walk(scan_modified);
            var value = node._eval(compressor, ignore_side_effects, cached, depth);
            if (typeof value == "object") return this;
            modified(lhs);
            return value;
        });
        def(AST_Sequence, function(compressor, ignore_side_effects, cached, depth) {
            if (!ignore_side_effects) return this;
            var exprs = this.expressions;
            for (var i = 0, last = exprs.length - 1; i < last; i++) {
                exprs[i].walk(scan_modified);
            }
            var tail = exprs[last];
            var value = tail._eval(compressor, ignore_side_effects, cached, depth);
            return value === tail ? this : value;
        });
        def(AST_Lambda, function(compressor) {
            if (compressor.option("unsafe")) {
                var fn = function() {};
                fn.node = this;
                fn.toString = function() {
                    return "function(){}";
                };
                return fn;
            }
            return this;
        });
        def(AST_Array, function(compressor, ignore_side_effects, cached, depth) {
            if (compressor.option("unsafe")) {
                var elements = [];
                for (var i = 0; i < this.elements.length; i++) {
                    var element = this.elements[i];
                    if (element instanceof AST_Hole) return this;
                    var value = element._eval(compressor, ignore_side_effects, cached, depth);
                    if (element === value) return this;
                    elements.push(value);
                }
                return elements;
            }
            return this;
        });
        def(AST_Object, function(compressor, ignore_side_effects, cached, depth) {
            if (compressor.option("unsafe")) {
                var val = {};
                for (var i = 0; i < this.properties.length; i++) {
                    var prop = this.properties[i];
                    if (!(prop instanceof AST_ObjectKeyVal)) return this;
                    var key = prop.key;
                    if (key instanceof AST_Node) {
                        key = key._eval(compressor, ignore_side_effects, cached, depth);
                        if (key === prop.key) return this;
                    }
                    switch (key) {
                      case "__proto__":
                      case "toString":
                      case "valueOf":
                        return this;
                    }
                    val[key] = prop.value._eval(compressor, ignore_side_effects, cached, depth);
                    if (val[key] === prop.value) return this;
                }
                return val;
            }
            return this;
        });
        var non_converting_unary = makePredicate("! typeof void");
        def(AST_UnaryPrefix, function(compressor, ignore_side_effects, cached, depth) {
            var e = this.expression;
            var op = this.operator;
            // Function would be evaluated to an array and so typeof would
            // incorrectly return "object". Hence making is a special case.
            if (compressor.option("typeofs")
                && op == "typeof"
                && (e instanceof AST_Lambda
                    || e instanceof AST_SymbolRef
                        && e.fixed_value() instanceof AST_Lambda)) {
                return typeof function(){};
            }
            var def = e instanceof AST_SymbolRef && e.definition();
            if (!non_converting_unary[op] && !(def && def.fixed)) depth++;
            e.walk(scan_modified);
            var v = e._eval(compressor, ignore_side_effects, cached, depth);
            if (v === e) {
                if (ignore_side_effects && op == "void") return;
                return this;
            }
            switch (op) {
              case "!": return !v;
              case "typeof":
                // typeof <RegExp> returns "object" or "function" on different platforms
                // so cannot evaluate reliably
                if (v instanceof RegExp) return this;
                return typeof v;
              case "void": return;
              case "~": return ~v;
              case "-": return -v;
              case "+": return +v;
              case "++":
              case "--":
                if (!def) return this;
                if (!ignore_side_effects) {
                    if (def.undeclared) return this;
                    if (def.last_ref !== e) return this;
                }
                if (HOP(e, "_eval")) v = +(op[0] + 1) + +v;
                modified(e);
                return v;
            }
            return this;
        });
        def(AST_UnaryPostfix, function(compressor, ignore_side_effects, cached, depth) {
            var e = this.expression;
            if (!(e instanceof AST_SymbolRef)) {
                if (!ignore_side_effects) return this;
            } else if (!HOP(e, "_eval")) {
                if (!e.fixed) return this;
                if (!ignore_side_effects) {
                    var def = e.definition();
                    if (!def.fixed) return this;
                    if (def.undeclared) return this;
                    if (def.last_ref !== e) return this;
                }
            }
            if (!(e instanceof AST_SymbolRef && e.definition().fixed)) depth++;
            e.walk(scan_modified);
            var v = e._eval(compressor, ignore_side_effects, cached, depth);
            if (v === e) return this;
            modified(e);
            return +v;
        });
        var non_converting_binary = makePredicate("&& || === !==");
        def(AST_Binary, function(compressor, ignore_side_effects, cached, depth) {
            if (!non_converting_binary[this.operator]) depth++;
            var left = this.left._eval(compressor, ignore_side_effects, cached, depth);
            if (left === this.left) return this;
            if (this.operator == (left ? "||" : "&&")) return left;
            var rhs_ignore_side_effects = ignore_side_effects && !(left && typeof left == "object");
            var right = this.right._eval(compressor, rhs_ignore_side_effects, cached, depth);
            if (right === this.right) return this;
            var result;
            switch (this.operator) {
              case "&&" : result = left &&  right; break;
              case "||" : result = left ||  right; break;
              case "??" :
                result = left == null ? right : left;
                break;
              case "|"  : result = left |   right; break;
              case "&"  : result = left &   right; break;
              case "^"  : result = left ^   right; break;
              case "+"  : result = left +   right; break;
              case "-"  : result = left -   right; break;
              case "*"  : result = left *   right; break;
              case "/"  : result = left /   right; break;
              case "%"  : result = left %   right; break;
              case "<<" : result = left <<  right; break;
              case ">>" : result = left >>  right; break;
              case ">>>": result = left >>> right; break;
              case "==" : result = left ==  right; break;
              case "===": result = left === right; break;
              case "!=" : result = left !=  right; break;
              case "!==": result = left !== right; break;
              case "<"  : result = left <   right; break;
              case "<=" : result = left <=  right; break;
              case ">"  : result = left >   right; break;
              case ">=" : result = left >=  right; break;
              case "**":
                result = Math.pow(left, right);
                break;
              case "in":
                if (right && typeof right == "object" && HOP(right, left)) {
                    result = true;
                    break;
                }
              default:
                return this;
            }
            if (isNaN(result)) return compressor.find_parent(AST_With) ? this : result;
            if (compressor.option("unsafe_math")
                && !ignore_side_effects
                && result
                && typeof result == "number"
                && (this.operator == "+" || this.operator == "-")) {
                var digits = Math.max(0, decimals(left), decimals(right));
                // 53-bit significand ---> 15.95 decimal places
                if (digits < 16) return +result.toFixed(digits);
            }
            return result;

            function decimals(operand) {
                var match = /(\.[0-9]*)?(e[^e]+)?$/.exec(+operand);
                return (match[1] || ".").length - 1 - (match[2] || "").slice(1);
            }
        });
        def(AST_Conditional, function(compressor, ignore_side_effects, cached, depth) {
            var condition = this.condition._eval(compressor, ignore_side_effects, cached, depth);
            if (condition === this.condition) return this;
            var node = condition ? this.consequent : this.alternative;
            var value = node._eval(compressor, ignore_side_effects, cached, depth);
            return value === node ? this : value;
        });
        function verify_escaped(ref, depth) {
            var escaped = ref.definition().escaped;
            switch (escaped.length) {
              case 0:
                return true;
              case 1:
                var found = false;
                escaped[0].walk(new TreeWalker(function(node) {
                    if (found) return true;
                    if (node === ref) return found = true;
                    if (node instanceof AST_Scope) return true;
                }));
                return found;
              default:
                return depth <= escaped.depth;
            }
        }
        def(AST_SymbolRef, function(compressor, ignore_side_effects, cached, depth) {
            this._eval = return_this;
            try {
                var fixed = this.fixed_value();
                if (!fixed) return this;
                var value;
                if (HOP(fixed, "_eval")) {
                    value = fixed._eval();
                } else {
                    value = fixed._eval(compressor, ignore_side_effects, cached, depth);
                    if (value === fixed) return this;
                    fixed._eval = function() {
                        return value;
                    };
                    cached.push(fixed);
                }
                return value && typeof value == "object" && !verify_escaped(this, depth) ? this : value;
            } finally {
                delete this._eval;
            }
        });
        var global_objs = {
            Array: Array,
            Math: Math,
            Number: Number,
            Object: Object,
            String: String,
        };
        var static_values = convert_to_predicate({
            Math: [
                "E",
                "LN10",
                "LN2",
                "LOG2E",
                "LOG10E",
                "PI",
                "SQRT1_2",
                "SQRT2",
            ],
            Number: [
                "MAX_VALUE",
                "MIN_VALUE",
                "NaN",
                "NEGATIVE_INFINITY",
                "POSITIVE_INFINITY",
            ],
        });
        var regexp_props = makePredicate("global ignoreCase multiline source");
        def(AST_PropAccess, function(compressor, ignore_side_effects, cached, depth) {
            if (compressor.option("unsafe")) {
                var val;
                var exp = this.expression;
                if (!is_undeclared_ref(exp)) {
                    val = exp._eval(compressor, ignore_side_effects, cached, depth + 1);
                    if (val == null || val === exp) return this;
                }
                var key = this.property;
                if (key instanceof AST_Node) {
                    key = key._eval(compressor, ignore_side_effects, cached, depth);
                    if (key === this.property) return this;
                }
                if (val === undefined) {
                    var static_value = static_values[exp.name];
                    if (!static_value || !static_value[key]) return this;
                    val = global_objs[exp.name];
                } else if (val instanceof RegExp) {
                    if (!regexp_props[key]) return this;
                } else if (typeof val == "object") {
                    if (!HOP(val, key)) return this;
                } else if (typeof val == "function") switch (key) {
                  case "name":
                    return val.node.name ? val.node.name.name : "";
                  case "length":
                    return val.node.length();
                  default:
                    return this;
                }
                return val[key];
            }
            return this;
        });
        function eval_all(nodes, compressor, ignore_side_effects, cached, depth) {
            var values = [];
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                var value = node._eval(compressor, ignore_side_effects, cached, depth);
                if (node === value) return;
                values.push(value);
            }
            return values;
        }
        def(AST_Call, function(compressor, ignore_side_effects, cached, depth) {
            var exp = this.expression;
            var fn = exp instanceof AST_SymbolRef ? exp.fixed_value() : exp;
            if (fn instanceof AST_Arrow || fn instanceof AST_Defun || fn instanceof AST_Function) {
                if (fn.evaluating) return this;
                if (fn.name && fn.name.definition().recursive_refs > 0) return this;
                if (this.is_expr_pure(compressor)) return this;
                var args = eval_all(this.args, compressor, ignore_side_effects, cached, depth);
                if (!all(fn.argnames, function(sym, index) {
                    if (sym instanceof AST_DefaultValue) {
                        if (!args) return false;
                        if (args[index] === undefined) {
                            var value = sym.value._eval(compressor, ignore_side_effects, cached, depth);
                            if (value === sym.value) return false;
                            args[index] = value;
                        }
                        sym = sym.name;
                    }
                    return !(sym instanceof AST_Destructured);
                })) return this;
                if (fn.rest instanceof AST_Destructured) return this;
                if (!args && !ignore_side_effects) return this;
                var stat = fn.first_statement();
                if (!(stat instanceof AST_Return)) {
                    if (ignore_side_effects) {
                        fn.walk(scan_modified);
                        var found = false;
                        fn.evaluating = true;
                        walk_body(fn, new TreeWalker(function(node) {
                            if (found) return true;
                            if (node instanceof AST_Return) {
                                if (node.value && node.value._eval(compressor, true, cached, depth) !== undefined) {
                                    found = true;
                                }
                                return true;
                            }
                            if (node instanceof AST_Scope && node !== fn) return true;
                        }));
                        fn.evaluating = false;
                        if (!found) return;
                    }
                    return this;
                }
                var val = stat.value;
                if (!val) return;
                var cached_args = [];
                if (!args || all(fn.argnames, function(sym, i) {
                    return assign(sym, args[i]);
                }) && !(fn.rest && !assign(fn.rest, args.slice(fn.argnames.length))) || ignore_side_effects) {
                    if (ignore_side_effects) fn.argnames.forEach(function(sym) {
                        if (sym instanceof AST_DefaultValue) sym.value.walk(scan_modified);
                    });
                    fn.evaluating = true;
                    val = val._eval(compressor, ignore_side_effects, cached, depth);
                    fn.evaluating = false;
                }
                cached_args.forEach(function(node) {
                    delete node._eval;
                });
                return val === stat.value ? this : val;
            } else if (compressor.option("unsafe") && exp instanceof AST_PropAccess) {
                var key = exp.property;
                if (key instanceof AST_Node) {
                    key = key._eval(compressor, ignore_side_effects, cached, depth);
                    if (key === exp.property) return this;
                }
                var val;
                var e = exp.expression;
                if (is_undeclared_ref(e)) {
                    var static_fn = static_fns[e.name];
                    if (!static_fn || !static_fn[key]) return this;
                    val = global_objs[e.name];
                } else {
                    val = e._eval(compressor, ignore_side_effects, cached, depth + 1);
                    if (val == null || val === e) return this;
                    var native_fn = native_fns[val.constructor.name];
                    if (!native_fn || !native_fn[key]) return this;
                    if (val instanceof RegExp && val.global && !(e instanceof AST_RegExp)) return this;
                }
                var args = eval_all(this.args, compressor, ignore_side_effects, cached, depth);
                if (!args) return this;
                if (key == "replace" && typeof args[1] == "function") return this;
                try {
                    return val[key].apply(val, args);
                } catch (ex) {
                    AST_Node.warn("Error evaluating {this} [{start}]", this);
                } finally {
                    if (val instanceof RegExp) val.lastIndex = 0;
                }
            }
            return this;

            function assign(sym, arg) {
                if (sym instanceof AST_DefaultValue) sym = sym.name;
                var def = sym.definition();
                if (def.orig[def.orig.length - 1] !== sym) return false;
                var value = arg;
                def.references.forEach(function(node) {
                    node._eval = function() {
                        return value;
                    };
                    cached_args.push(node);
                });
                return true;
            }
        });
        def(AST_New, return_this);
        def(AST_Template, function(compressor, ignore_side_effects, cached, depth) {
            if (!compressor.option("templates")) return this;
            if (this.tag) {
                if (!is_raw_tag(compressor, this.tag)) return this;
                decode = function(str) {
                    return str;
                };
            }
            var exprs = eval_all(this.expressions, compressor, ignore_side_effects, cached, depth);
            if (!exprs) return this;
            var malformed = false;
            var ret = decode(this.strings[0]);
            for (var i = 0; i < exprs.length; i++) {
                ret += exprs[i] + decode(this.strings[i + 1]);
            }
            if (!malformed) return ret;
            this._eval = return_this;
            return this;

            function decode(str) {
                str = decode_template(str);
                if (typeof str != "string") malformed = true;
                return str;
            }
        });
    })(function(node, func) {
        node.DEFMETHOD("_eval", func);
    });

    // method to negate an expression
    (function(def) {
        function basic_negation(exp) {
            return make_node(AST_UnaryPrefix, exp, {
                operator: "!",
                expression: exp,
            });
        }
        function best(orig, alt, first_in_statement) {
            var negated = basic_negation(orig);
            if (first_in_statement) return best_of_expression(negated, make_node(AST_SimpleStatement, alt, {
                body: alt,
            })) === negated ? negated : alt;
            return best_of_expression(negated, alt);
        }
        def(AST_Node, function() {
            return basic_negation(this);
        });
        def(AST_Statement, function() {
            throw new Error("Cannot negate a statement");
        });
        def(AST_Binary, function(compressor, first_in_statement) {
            var self = this.clone(), op = this.operator;
            if (compressor.option("unsafe_comps")) {
                switch (op) {
                  case "<=" : self.operator = ">"  ; return self;
                  case "<"  : self.operator = ">=" ; return self;
                  case ">=" : self.operator = "<"  ; return self;
                  case ">"  : self.operator = "<=" ; return self;
                }
            }
            switch (op) {
              case "==" : self.operator = "!="; return self;
              case "!=" : self.operator = "=="; return self;
              case "===": self.operator = "!=="; return self;
              case "!==": self.operator = "==="; return self;
              case "&&":
                self.operator = "||";
                self.left = self.left.negate(compressor, first_in_statement);
                self.right = self.right.negate(compressor);
                return best(this, self, first_in_statement);
              case "||":
                self.operator = "&&";
                self.left = self.left.negate(compressor, first_in_statement);
                self.right = self.right.negate(compressor);
                return best(this, self, first_in_statement);
            }
            return basic_negation(this);
        });
        def(AST_ClassExpression, function() {
            return basic_negation(this);
        });
        def(AST_Conditional, function(compressor, first_in_statement) {
            var self = this.clone();
            self.consequent = self.consequent.negate(compressor);
            self.alternative = self.alternative.negate(compressor);
            return best(this, self, first_in_statement);
        });
        def(AST_LambdaExpression, function() {
            return basic_negation(this);
        });
        def(AST_Sequence, function(compressor) {
            var expressions = this.expressions.slice();
            expressions.push(expressions.pop().negate(compressor));
            return make_sequence(this, expressions);
        });
        def(AST_UnaryPrefix, function() {
            if (this.operator == "!")
                return this.expression;
            return basic_negation(this);
        });
    })(function(node, func) {
        node.DEFMETHOD("negate", function(compressor, first_in_statement) {
            return func.call(this, compressor, first_in_statement);
        });
    });

    var global_pure_fns = makePredicate("Boolean decodeURI decodeURIComponent Date encodeURI encodeURIComponent Error escape EvalError isFinite isNaN Number Object parseFloat parseInt RangeError ReferenceError String SyntaxError TypeError unescape URIError");
    var global_pure_constructors = makePredicate("Map Set WeakMap WeakSet");
    AST_Call.DEFMETHOD("is_expr_pure", function(compressor) {
        if (compressor.option("unsafe")) {
            var expr = this.expression;
            if (is_undeclared_ref(expr)) {
                if (global_pure_fns[expr.name]) return true;
                if (this instanceof AST_New && global_pure_constructors[expr.name]) return true;
            }
            if (is_static_fn(expr)) return true;
        }
        return compressor.option("annotations") && this.pure || !compressor.pure_funcs(this);
    });
    AST_Template.DEFMETHOD("is_expr_pure", function(compressor) {
        var tag = this.tag;
        if (!tag) return true;
        if (compressor.option("unsafe")) {
            if (is_undeclared_ref(tag) && global_pure_fns[tag.name]) return true;
            if (tag instanceof AST_Dot && is_undeclared_ref(tag.expression)) {
                var static_fn = static_fns[tag.expression.name];
                return static_fn && (static_fn[tag.property]
                    || tag.expression.name == "Math" && tag.property == "random");
            }
        }
        return !compressor.pure_funcs(this);
    });
    AST_Node.DEFMETHOD("is_call_pure", return_false);
    AST_Call.DEFMETHOD("is_call_pure", function(compressor) {
        if (!compressor.option("unsafe")) return false;
        var dot = this.expression;
        if (!(dot instanceof AST_Dot)) return false;
        var exp = dot.expression;
        var map;
        var prop = dot.property;
        if (exp instanceof AST_Array) {
            map = native_fns.Array;
        } else if (exp.is_boolean(compressor)) {
            map = native_fns.Boolean;
        } else if (exp.is_number(compressor)) {
            map = native_fns.Number;
        } else if (exp instanceof AST_RegExp) {
            map = native_fns.RegExp;
        } else if (exp.is_string(compressor)) {
            map = native_fns.String;
            if (prop == "replace") {
                var arg = this.args[1];
                if (arg && !arg.is_string(compressor)) return false;
            }
        } else if (!dot.may_throw_on_access(compressor)) {
            map = native_fns.Object;
        }
        return map && map[prop];
    });

    // determine if object spread syntax may cause runtime exception
    (function(def) {
        def(AST_Node, return_false);
        def(AST_Array, return_true);
        def(AST_Assign, function() {
            switch (this.operator) {
              case "=":
                return this.right.safe_to_spread();
              case "&&=":
              case "||=":
              case "??=":
                return this.left.safe_to_spread() && this.right.safe_to_spread();
            }
            return true;
        });
        def(AST_Binary, function() {
            return !lazy_op[this.operator] || this.left.safe_to_spread() && this.right.safe_to_spread();
        });
        def(AST_Constant, return_true);
        def(AST_Lambda, return_true);
        def(AST_Object, function() {
            return all(this.properties, function(prop) {
                return !(prop instanceof AST_ObjectGetter || prop instanceof AST_Spread);
            });
        });
        def(AST_Sequence, function() {
            return this.tail_node().safe_to_spread();
        });
        def(AST_SymbolRef, function() {
            var fixed = this.fixed_value();
            return fixed && fixed.safe_to_spread();
        });
        def(AST_Unary, return_true);
    })(function(node, func) {
        node.DEFMETHOD("safe_to_spread", func);
    });

    // determine if expression has side effects
    (function(def) {
        function any(list, compressor, spread) {
            return !all(list, spread ? function(node) {
                return node instanceof AST_Spread ? !spread(node, compressor) : !node.has_side_effects(compressor);
            } : function(node) {
                return !node.has_side_effects(compressor);
            });
        }
        function array_spread(node, compressor) {
            var exp = node.expression;
            return !exp.is_string(compressor) || exp.has_side_effects(compressor);
        }
        def(AST_Node, return_true);
        def(AST_Array, function(compressor) {
            return any(this.elements, compressor, array_spread);
        });
        def(AST_Assign, function(compressor) {
            var lhs = this.left;
            if (!(lhs instanceof AST_PropAccess)) return true;
            var node = lhs.expression;
            return !(node instanceof AST_ObjectIdentity)
                || !node.scope.resolve().new
                || lhs instanceof AST_Sub && lhs.property.has_side_effects(compressor)
                || this.right.has_side_effects(compressor);
        });
        def(AST_Binary, function(compressor) {
            return this.left.has_side_effects(compressor)
                || this.right.has_side_effects(compressor)
                || !can_drop_op(this, compressor);
        });
        def(AST_Block, function(compressor) {
            return any(this.body, compressor);
        });
        def(AST_Call, function(compressor) {
            if (!this.is_expr_pure(compressor)
                && (!this.is_call_pure(compressor) || this.expression.has_side_effects(compressor))) {
                return true;
            }
            return any(this.args, compressor, array_spread);
        });
        def(AST_Case, function(compressor) {
            return this.expression.has_side_effects(compressor)
                || any(this.body, compressor);
        });
        def(AST_Class, function(compressor) {
            var base = this.extends;
            if (base) {
                if (base instanceof AST_SymbolRef) base = base.fixed_value();
                if (!safe_for_extends(base)) return true;
            }
            return any(this.properties, compressor);
        });
        def(AST_ClassProperty, function(compressor) {
            return this.key instanceof AST_Node && this.key.has_side_effects(compressor)
                || this.static && this.value && this.value.has_side_effects(compressor);
        });
        def(AST_Conditional, function(compressor) {
            return this.condition.has_side_effects(compressor)
                || this.consequent.has_side_effects(compressor)
                || this.alternative.has_side_effects(compressor);
        });
        def(AST_Constant, return_false);
        def(AST_Definitions, function(compressor) {
            return any(this.definitions, compressor);
        });
        def(AST_DestructuredArray, function(compressor) {
            return any(this.elements, compressor);
        });
        def(AST_DestructuredKeyVal, function(compressor) {
            return this.key instanceof AST_Node && this.key.has_side_effects(compressor)
                || this.value.has_side_effects(compressor);
        });
        def(AST_DestructuredObject, function(compressor) {
            return any(this.properties, compressor);
        });
        def(AST_Dot, function(compressor) {
            return this.expression.may_throw_on_access(compressor)
                || this.expression.has_side_effects(compressor);
        });
        def(AST_EmptyStatement, return_false);
        def(AST_If, function(compressor) {
            return this.condition.has_side_effects(compressor)
                || this.body && this.body.has_side_effects(compressor)
                || this.alternative && this.alternative.has_side_effects(compressor);
        });
        def(AST_LabeledStatement, function(compressor) {
            return this.body.has_side_effects(compressor);
        });
        def(AST_Lambda, return_false);
        def(AST_Object, function(compressor) {
            return any(this.properties, compressor, function(node, compressor) {
                var exp = node.expression;
                return !exp.safe_to_spread() || exp.has_side_effects(compressor);
            });
        });
        def(AST_ObjectIdentity, return_false);
        def(AST_ObjectProperty, function(compressor) {
            return this.key instanceof AST_Node && this.key.has_side_effects(compressor)
                || this.value.has_side_effects(compressor);
        });
        def(AST_Sequence, function(compressor) {
            return any(this.expressions, compressor);
        });
        def(AST_SimpleStatement, function(compressor) {
            return this.body.has_side_effects(compressor);
        });
        def(AST_Sub, function(compressor) {
            return this.expression.may_throw_on_access(compressor)
                || this.expression.has_side_effects(compressor)
                || this.property.has_side_effects(compressor);
        });
        def(AST_Switch, function(compressor) {
            return this.expression.has_side_effects(compressor)
                || any(this.body, compressor);
        });
        def(AST_SymbolDeclaration, return_false);
        def(AST_SymbolRef, function(compressor) {
            return !this.is_declared(compressor) || !can_drop_symbol(this, compressor);
        });
        def(AST_Template, function(compressor) {
            return !this.is_expr_pure(compressor) || any(this.expressions, compressor);
        });
        def(AST_Try, function(compressor) {
            return any(this.body, compressor)
                || this.bcatch && this.bcatch.has_side_effects(compressor)
                || this.bfinally && this.bfinally.has_side_effects(compressor);
        });
        def(AST_Unary, function(compressor) {
            return unary_side_effects[this.operator]
                || this.expression.has_side_effects(compressor);
        });
        def(AST_VarDef, function() {
            return this.value;
        });
    })(function(node, func) {
        node.DEFMETHOD("has_side_effects", func);
    });

    // determine if expression may throw
    (function(def) {
        def(AST_Node, return_true);

        def(AST_Constant, return_false);
        def(AST_EmptyStatement, return_false);
        def(AST_Lambda, return_false);
        def(AST_ObjectIdentity, return_false);
        def(AST_SymbolDeclaration, return_false);

        function any(list, compressor) {
            for (var i = list.length; --i >= 0;)
                if (list[i].may_throw(compressor))
                    return true;
            return false;
        }

        function call_may_throw(exp, compressor) {
            if (exp.may_throw(compressor)) return true;
            if (exp instanceof AST_SymbolRef) exp = exp.fixed_value();
            if (!(exp instanceof AST_Lambda)) return true;
            if (any(exp.argnames, compressor)) return true;
            if (any(exp.body, compressor)) return true;
            return is_arrow(exp) && exp.value && exp.value.may_throw(compressor);
        }

        def(AST_Array, function(compressor) {
            return any(this.elements, compressor);
        });
        def(AST_Assign, function(compressor) {
            if (this.right.may_throw(compressor)) return true;
            if (!compressor.has_directive("use strict")
                && this.operator == "="
                && this.left instanceof AST_SymbolRef) {
                return false;
            }
            return this.left.may_throw(compressor);
        });
        def(AST_Await, function(compressor) {
            return this.expression.may_throw(compressor);
        });
        def(AST_Binary, function(compressor) {
            return this.left.may_throw(compressor)
                || this.right.may_throw(compressor)
                || !can_drop_op(this, compressor);
        });
        def(AST_Block, function(compressor) {
            return any(this.body, compressor);
        });
        def(AST_Call, function(compressor) {
            if (any(this.args, compressor)) return true;
            if (this.is_expr_pure(compressor)) return false;
            this.may_throw = return_true;
            var ret = call_may_throw(this.expression, compressor);
            delete this.may_throw;
            return ret;
        });
        def(AST_Case, function(compressor) {
            return this.expression.may_throw(compressor)
                || any(this.body, compressor);
        });
        def(AST_Conditional, function(compressor) {
            return this.condition.may_throw(compressor)
                || this.consequent.may_throw(compressor)
                || this.alternative.may_throw(compressor);
        });
        def(AST_DefaultValue, function(compressor) {
            return this.name.may_throw(compressor)
                || this.value && this.value.may_throw(compressor);
        });
        def(AST_Definitions, function(compressor) {
            return any(this.definitions, compressor);
        });
        def(AST_Dot, function(compressor) {
            return !this.optional && this.expression.may_throw_on_access(compressor)
                || this.expression.may_throw(compressor);
        });
        def(AST_ForEnumeration, function(compressor) {
            if (this.init.may_throw(compressor)) return true;
            var obj = this.object;
            if (obj.may_throw(compressor)) return true;
            obj = obj.tail_node();
            if (!(obj instanceof AST_Array || obj.is_string(compressor))) return true;
            return this.body.may_throw(compressor);
        });
        def(AST_If, function(compressor) {
            return this.condition.may_throw(compressor)
                || this.body && this.body.may_throw(compressor)
                || this.alternative && this.alternative.may_throw(compressor);
        });
        def(AST_LabeledStatement, function(compressor) {
            return this.body.may_throw(compressor);
        });
        def(AST_Object, function(compressor) {
            return any(this.properties, compressor);
        });
        def(AST_ObjectProperty, function(compressor) {
            return this.value.may_throw(compressor)
                || this.key instanceof AST_Node && this.key.may_throw(compressor);
        });
        def(AST_Return, function(compressor) {
            return this.value && this.value.may_throw(compressor);
        });
        def(AST_Sequence, function(compressor) {
            return any(this.expressions, compressor);
        });
        def(AST_SimpleStatement, function(compressor) {
            return this.body.may_throw(compressor);
        });
        def(AST_Sub, function(compressor) {
            return !this.optional && this.expression.may_throw_on_access(compressor)
                || this.expression.may_throw(compressor)
                || this.property.may_throw(compressor);
        });
        def(AST_Switch, function(compressor) {
            return this.expression.may_throw(compressor)
                || any(this.body, compressor);
        });
        def(AST_SymbolRef, function(compressor) {
            return !this.is_declared(compressor) || !can_drop_symbol(this, compressor);
        });
        def(AST_Template, function(compressor) {
            if (any(this.expressions, compressor)) return true;
            if (this.is_expr_pure(compressor)) return false;
            if (!this.tag) return false;
            this.may_throw = return_true;
            var ret = call_may_throw(this.tag, compressor);
            delete this.may_throw;
            return ret;
        });
        def(AST_Try, function(compressor) {
            return (this.bcatch ? this.bcatch.may_throw(compressor) : any(this.body, compressor))
                || this.bfinally && this.bfinally.may_throw(compressor);
        });
        def(AST_Unary, function(compressor) {
            return this.expression.may_throw(compressor)
                && !(this.operator == "typeof" && this.expression instanceof AST_SymbolRef);
        });
        def(AST_VarDef, function(compressor) {
            return this.name.may_throw(compressor)
                || this.value && this.value.may_throw(compressor);
        });
    })(function(node, func) {
        node.DEFMETHOD("may_throw", func);
    });

    // determine if expression is constant
    (function(def) {
        function all_constant(list, scope) {
            for (var i = list.length; --i >= 0;)
                if (!list[i].is_constant_expression(scope))
                    return false;
            return true;
        }

        function walk_scoped(self, scope) {
            var result = true;
            var scopes = [];
            self.walk(new TreeWalker(function(node, descend) {
                if (!result) return true;
                if (node instanceof AST_BlockScope) {
                    if (node === self) return;
                    scopes.push(node);
                    descend();
                    scopes.pop();
                    return true;
                }
                if (node instanceof AST_SymbolRef) {
                    if (self.inlined || node.redef || node.in_arg) {
                        result = false;
                        return true;
                    }
                    if (self.variables && self.variables.has(node.name)) return true;
                    var def = node.definition();
                    if (member(def.scope, scopes)) return true;
                    if (scope && !def.redefined()) {
                        var scope_def = scope.find_variable(node.name);
                        if (scope_def ? scope_def === def : def.undeclared) {
                            result = "f";
                            return true;
                        }
                    }
                    result = false;
                    return true;
                }
                if (node instanceof AST_ObjectIdentity) {
                    if (is_arrow(self) && all(scopes, function(s) {
                        return !(s instanceof AST_Scope) || is_arrow(s);
                    })) result = false;
                    return true;
                }
            }));
            return result;
        }

        def(AST_Node, return_false);
        def(AST_Array, function(scope) {
            return all_constant(this.elements, scope);
        });
        def(AST_Binary, function(scope) {
            return this.left.is_constant_expression(scope)
                && this.right.is_constant_expression(scope)
                && can_drop_op(this);
        });
        def(AST_Class, function(scope) {
            var base = this.extends;
            if (base && !safe_for_extends(base)) return false;
            return all_constant(this.properties, scope);
        });
        def(AST_ClassProperty, function(scope) {
            if (typeof this.key != "string") return false;
            var value = this.value;
            if (!value) return true;
            return this.static ? value.is_constant_expression(scope) : walk_scoped(value, scope);
        });
        def(AST_Constant, return_true);
        def(AST_Lambda, function(scope) {
            return walk_scoped(this, scope);
        });
        def(AST_Object, function(scope) {
            return all_constant(this.properties, scope);
        });
        def(AST_ObjectIdentity, function(scope) {
            return this.scope.resolve() === scope;
        });
        def(AST_ObjectProperty, function(scope) {
            return typeof this.key == "string" && this.value.is_constant_expression(scope);
        });
        def(AST_Unary, function(scope) {
            return this.expression.is_constant_expression(scope);
        });
    })(function(node, func) {
        node.DEFMETHOD("is_constant_expression", func);
    });

    // tell me if a statement aborts
    function aborts(thing) {
        return thing && thing.aborts();
    }
    (function(def) {
        def(AST_Statement, return_null);
        def(AST_Jump, return_this);
        function block_aborts() {
            var n = this.body.length;
            return n > 0 && aborts(this.body[n - 1]);
        }
        def(AST_BlockStatement, block_aborts);
        def(AST_SwitchBranch, block_aborts);
        def(AST_If, function() {
            return this.alternative && aborts(this.body) && aborts(this.alternative) && this;
        });
    })(function(node, func) {
        node.DEFMETHOD("aborts", func);
    });

    /* -----[ optimizers ]----- */

    var directives = makePredicate(["use asm", "use strict"]);
    OPT(AST_Directive, function(self, compressor) {
        if (compressor.option("directives")
            && (!directives[self.value] || compressor.has_directive(self.value) !== self)) {
            return make_node(AST_EmptyStatement, self);
        }
        return self;
    });

    OPT(AST_Debugger, function(self, compressor) {
        if (compressor.option("drop_debugger"))
            return make_node(AST_EmptyStatement, self);
        return self;
    });

    OPT(AST_LabeledStatement, function(self, compressor) {
        if (self.body instanceof AST_If || self.body instanceof AST_Break) {
            var body = tighten_body([ self.body ], compressor);
            switch (body.length) {
              case 0:
                self.body = make_node(AST_EmptyStatement, self);
                break;
              case 1:
                self.body = body[0];
                break;
              default:
                self.body = make_node(AST_BlockStatement, self, { body: body });
                break;
            }
        }
        return compressor.option("unused") && self.label.references.length == 0 ? self.body : self;
    });

    OPT(AST_LoopControl, function(self, compressor) {
        if (!compressor.option("dead_code")) return self;
        var label = self.label;
        if (label) {
            var lct = compressor.loopcontrol_target(self);
            self.label = null;
            if (compressor.loopcontrol_target(self) === lct) {
                remove(label.thedef.references, self);
            } else {
                self.label = label;
            }
        }
        return self;
    });

    OPT(AST_Block, function(self, compressor) {
        self.body = tighten_body(self.body, compressor);
        return self;
    });

    function trim_block(node, parent, in_list) {
        switch (node.body.length) {
          case 0:
            return in_list ? List.skip : make_node(AST_EmptyStatement, node);
          case 1:
            var stat = node.body[0];
            if (!safe_to_trim(stat)) return node;
            if (parent instanceof AST_IterationStatement && stat instanceof AST_LambdaDefinition) return node;
            return stat;
        }
        return node;
    }

    OPT(AST_BlockStatement, function(self, compressor) {
        self.body = tighten_body(self.body, compressor);
        return trim_block(self, compressor.parent());
    });

    function drop_rest_farg(fn, compressor) {
        if (!compressor.option("rests")) return;
        if (fn.uses_arguments) return;
        if (!(fn.rest instanceof AST_DestructuredArray)) return;
        if (!compressor.drop_fargs(fn, compressor.parent())) return;
        fn.argnames = fn.argnames.concat(fn.rest.elements);
        fn.rest = fn.rest.rest;
    }

    OPT(AST_Lambda, function(self, compressor) {
        drop_rest_farg(self, compressor);
        self.body = tighten_body(self.body, compressor);
        return self;
    });

    OPT(AST_Function, function(self, compressor) {
        drop_rest_farg(self, compressor);
        self.body = tighten_body(self.body, compressor);
        var parent = compressor.parent();
        if (compressor.option("inline")) for (var i = 0; i < self.body.length; i++) {
            var stat = self.body[i];
            if (stat instanceof AST_Directive) continue;
            if (stat instanceof AST_Return) {
                if (i != self.body.length - 1) break;
                var call = stat.value;
                if (!call || call.TYPE != "Call") break;
                if (call.is_expr_pure(compressor)) break;
                var exp = call.expression, fn;
                if (!(exp instanceof AST_SymbolRef)) {
                    fn = exp;
                } else if (self.name && self.name.definition() === exp.definition()) {
                    break;
                } else {
                    fn = exp.fixed_value();
                }
                if (!(fn instanceof AST_Defun || fn instanceof AST_Function)) break;
                if (fn.rest) break;
                if (fn.uses_arguments) break;
                if (fn === exp) {
                    if (fn.parent_scope !== self) break;
                    if (!all(fn.enclosed, function(def) {
                        return def.scope !== self;
                    })) break;
                }
                if ((fn !== exp || fn.name)
                    && (parent instanceof AST_ClassMethod || parent instanceof AST_ObjectMethod)
                    && parent.value === compressor.self()) break;
                if (fn.contains_this()) break;
                var len = fn.argnames.length;
                if (len > 0 && compressor.option("inline") < 2) break;
                if (len > self.argnames.length) break;
                if (!all(self.argnames, function(argname) {
                    return argname instanceof AST_SymbolFunarg;
                })) break;
                if (!all(call.args, function(arg) {
                    return !(arg instanceof AST_Spread);
                })) break;
                for (var j = 0; j < len; j++) {
                    var arg = call.args[j];
                    if (!(arg instanceof AST_SymbolRef)) break;
                    if (arg.definition() !== self.argnames[j].definition()) break;
                }
                if (j < len) break;
                for (; j < call.args.length; j++) {
                    if (call.args[j].has_side_effects(compressor)) break;
                }
                if (j < call.args.length) break;
                if (len < self.argnames.length && !compressor.drop_fargs(self, parent)) {
                    if (!compressor.drop_fargs(fn, call)) break;
                    do {
                        fn.argnames.push(fn.make_var(AST_SymbolFunarg, fn, "argument_" + len));
                    } while (++len < self.argnames.length);
                }
                return exp;
            }
            break;
        }
        return self;
    });

    var NO_MERGE = makePredicate("arguments await yield");
    AST_Scope.DEFMETHOD("merge_variables", function(compressor) {
        if (!compressor.option("merge_vars")) return;
        var in_arg = [], in_try, root, segment = {}, self = this;
        var first = [], last = [], index = 0;
        var declarations = new Dictionary();
        var references = Object.create(null);
        var prev = Object.create(null);
        var tw = new TreeWalker(function(node, descend) {
            if (node instanceof AST_Assign) {
                var lhs = node.left;
                var rhs = node.right;
                if (lhs instanceof AST_Destructured) {
                    rhs.walk(tw);
                    walk_destructured(AST_SymbolRef, mark, lhs);
                    return true;
                }
                if (lazy_op[node.operator.slice(0, -1)]) {
                    lhs.walk(tw);
                    push();
                    rhs.walk(tw);
                    if (lhs instanceof AST_SymbolRef) mark(lhs);
                    pop();
                    return true;
                }
                if (lhs instanceof AST_SymbolRef) {
                    if (node.operator != "=") mark(lhs, true);
                    rhs.walk(tw);
                    mark(lhs);
                    return true;
                }
                return;
            }
            if (node instanceof AST_Binary) {
                if (!lazy_op[node.operator]) return;
                walk_cond(node);
                return true;
            }
            if (node instanceof AST_Break) {
                var target = tw.loopcontrol_target(node);
                if (!(target instanceof AST_IterationStatement)) insert(target);
                return true;
            }
            if (node instanceof AST_Call) {
                var exp = node.expression;
                if (exp instanceof AST_LambdaExpression) {
                    node.args.forEach(function(arg) {
                        arg.walk(tw);
                    });
                    exp.walk(tw);
                } else {
                    descend();
                    mark_expression(exp);
                }
                return true;
            }
            if (node instanceof AST_Class) {
                if (node.name) node.name.walk(tw);
                if (node.extends) node.extends.walk(tw);
                node.properties.filter(function(prop) {
                    if (prop.key instanceof AST_Node) prop.key.walk(tw);
                    return prop.value;
                }).forEach(function(prop) {
                    if (prop.static) {
                        prop.value.walk(tw);
                    } else {
                        push();
                        segment.block = node;
                        prop.value.walk(tw);
                        pop();
                    }
                });
                return true;
            }
            if (node instanceof AST_Conditional) {
                walk_cond(node.condition, node.consequent, node.alternative);
                return true;
            }
            if (node instanceof AST_Continue) {
                var target = tw.loopcontrol_target(node);
                if (target instanceof AST_Do) insert(target);
                return true;
            }
            if (node instanceof AST_Do) {
                push();
                segment.block = node;
                segment.loop = true;
                var save = segment;
                node.body.walk(tw);
                if (segment.inserted === node) segment = save;
                node.condition.walk(tw);
                pop();
                return true;
            }
            if (node instanceof AST_For) {
                if (node.init) node.init.walk(tw);
                push();
                segment.block = node;
                segment.loop = true;
                if (node.condition) node.condition.walk(tw);
                node.body.walk(tw);
                if (node.step) node.step.walk(tw);
                pop();
                return true;
            }
            if (node instanceof AST_ForEnumeration) {
                node.object.walk(tw);
                push();
                segment.block = node;
                segment.loop = true;
                node.init.walk(tw);
                node.body.walk(tw);
                pop();
                return true;
            }
            if (node instanceof AST_If) {
                walk_cond(node.condition, node.body, node.alternative);
                return true;
            }
            if (node instanceof AST_LabeledStatement) {
                push();
                segment.block = node;
                var save = segment;
                node.body.walk(tw);
                if (segment.inserted === node) segment = save;
                pop();
                return true;
            }
            if (node instanceof AST_Scope) {
                push();
                segment.block = node;
                if (node === self) root = segment;
                if (node instanceof AST_Lambda) {
                    if (node.name) references[node.name.definition().id] = false;
                    var marker = node.uses_arguments && !tw.has_directive("use strict") ? function(node) {
                        references[node.definition().id] = false;
                    } : function(node) {
                        mark(node);
                    };
                    in_arg.push(node);
                    node.argnames.forEach(function(argname) {
                        walk_destructured(AST_SymbolFunarg, marker, argname);
                    });
                    if (node.rest) walk_destructured(AST_SymbolFunarg, marker, node.rest);
                    in_arg.pop();
                }
                walk_lambda(node, tw);
                pop();
                return true;
            }
            if (node instanceof AST_Sub) {
                var exp = node.expression;
                if (node.optional) {
                    exp.walk(tw);
                    push();
                    node.property.walk(tw);
                    pop();
                } else {
                    descend();
                }
                mark_expression(exp);
                return true;
            }
            if (node instanceof AST_Switch) {
                node.expression.walk(tw);
                var save = segment;
                node.body.forEach(function(branch) {
                    if (branch instanceof AST_Default) return;
                    branch.expression.walk(tw);
                    if (save === segment) push();
                });
                segment = save;
                node.body.forEach(function(branch) {
                    push();
                    segment.block = node;
                    var save = segment;
                    walk_body(branch, tw);
                    if (segment.inserted === node) segment = save;
                    pop();
                });
                return true;
            }
            if (node instanceof AST_SymbolDeclaration) {
                references[node.definition().id] = false;
                return true;
            }
            if (node instanceof AST_SymbolRef) {
                mark(node, true);
                return true;
            }
            if (node instanceof AST_Try) {
                var save_try = in_try;
                in_try = node;
                walk_body(node, tw);
                if (node.bcatch) {
                    if (node.bcatch.argname) node.bcatch.argname.mark_symbol(function(node) {
                        if (node instanceof AST_SymbolCatch) {
                            var def = node.definition();
                            references[def.id] = false;
                            if (def = def.redefined()) references[def.id] = false;
                        }
                    }, tw);
                    if (node.bfinally || (in_try = save_try)) {
                        walk_body(node.bcatch, tw);
                    } else {
                        push();
                        walk_body(node.bcatch, tw);
                        pop();
                    }
                }
                in_try = save_try;
                if (node.bfinally) node.bfinally.walk(tw);
                return true;
            }
            if (node instanceof AST_Unary) {
                if (!UNARY_POSTFIX[node.operator]) return;
                var sym = node.expression;
                if (!(sym instanceof AST_SymbolRef)) return;
                mark(sym, true);
                return true;
            }
            if (node instanceof AST_VarDef) {
                var assigned = node.value;
                if (assigned) {
                    assigned.walk(tw);
                } else {
                    assigned = segment.block instanceof AST_ForEnumeration && segment.block.init === tw.parent();
                }
                walk_destructured(AST_SymbolDeclaration, assigned ? function(node) {
                    if (node instanceof AST_SymbolVar) {
                        mark(node);
                    } else {
                        node.walk(tw);
                    }
                } : function(node) {
                    if (node instanceof AST_SymbolVar) {
                        var id = node.definition().id;
                        var refs = references[id];
                        if (refs) {
                            refs.push(node);
                        } else if (!(id in references)) {
                            declarations.add(id, node);
                        }
                    } else {
                        node.walk(tw);
                    }
                }, node.name);
                return true;
            }
            if (node instanceof AST_While) {
                push();
                segment.block = node;
                segment.loop = true;
                descend();
                pop();
                return true;
            }

            function mark_expression(exp) {
                if (!compressor.option("ie")) return;
                var sym = root_expr(exp);
                if (sym instanceof AST_SymbolRef) sym.walk(tw);
            }

            function walk_cond(condition, consequent, alternative) {
                var save = segment;
                var segments = scan_branches(1, condition, consequent, alternative);
                if (consequent) {
                    segment = segments.consequent.segment;
                    for (var i = segments.consequent.level; --i >= 0;) pop();
                    if (segment !== save) return;
                }
                if (alternative) {
                    segment = segments.alternative.segment;
                    for (var i = segments.alternative.level; --i >= 0;) pop();
                    if (segment !== save) return;
                }
                segment = save;
            }

            function scan_branches(level, condition, consequent, alternative) {
                var segments = {
                    consequent: {
                        segment: segment,
                        level: level,
                    },
                    alternative: {
                        segment: segment,
                        level: level,
                    },
                }
                if (condition instanceof AST_Binary) switch (condition.operator) {
                  case "&&":
                    segments.consequent = scan_branches(level + 1, condition.left, condition.right).consequent;
                    break;
                  case "||":
                    segments.alternative = scan_branches(level + 1, condition.left, null, condition.right).alternative;
                    break;
                  case "??":
                    segments.alternative = scan_branches(level + 1, condition.left, condition.right, condition.right).alternative;
                    break;
                  default:
                    condition.walk(tw);
                    break;
                } else if (condition instanceof AST_Conditional) {
                    scan_branches(level + 1, condition.condition, condition.consequent, condition.alternative);
                } else {
                    condition.walk(tw);
                }
                if (consequent) {
                    segment = segments.consequent.segment;
                    push();
                    consequent.walk(tw);
                    segments.consequent.segment = segment;
                }
                if (alternative) {
                    segment = segments.alternative.segment;
                    push();
                    alternative.walk(tw);
                    segments.alternative.segment = segment;
                }
                return segments;
            }
        });
        tw.directives = Object.create(compressor.directives);
        self.walk(tw);
        var changed = false;
        var merged = Object.create(null);
        while (first.length && last.length) {
            var tail = last.shift();
            if (!tail) continue;
            var def = tail.definition;
            var tail_refs = references[def.id];
            if (!tail_refs) continue;
            tail_refs = { end: tail_refs.end };
            while (def.id in merged) def = merged[def.id];
            tail_refs.start = references[def.id].start;
            var skipped = [];
            do {
                var head = first.shift();
                if (tail.index > head.index) continue;
                var prev_def = head.definition;
                if (!(prev_def.id in prev)) continue;
                var head_refs = references[prev_def.id];
                if (!head_refs) continue;
                if (head_refs.start.block !== tail_refs.start.block
                    || !mergeable(head_refs, tail_refs)
                    || (head_refs.start.loop || !same_scope(def)) && !mergeable(tail_refs, head_refs)
                    || compressor.option("webkit") && is_funarg(def) !== is_funarg(prev_def)
                    || prev_def.const_redefs
                    || !all(head_refs.scopes, function(scope) {
                        return scope.find_variable(def.name) === def;
                    })) {
                    skipped.push(head);
                    continue;
                }
                head_refs.forEach(function(sym) {
                    sym.thedef = def;
                    sym.name = def.name;
                    if (sym instanceof AST_SymbolRef) {
                        def.references.push(sym);
                        prev_def.replaced++;
                    } else {
                        def.orig.push(sym);
                        prev_def.eliminated++;
                    }
                });
                if (!prev_def.fixed) def.fixed = false;
                merged[prev_def.id] = def;
                changed = true;
                break;
            } while (first.length);
            if (skipped.length) first = skipped.concat(first);
        }
        return changed;

        function push() {
            segment = Object.create(segment);
        }

        function pop() {
            segment = Object.getPrototypeOf(segment);
        }

        function walk_destructured(symbol_type, mark, lhs) {
            var marker = new TreeWalker(function(node) {
                if (node instanceof AST_Destructured) return;
                if (node instanceof AST_DefaultValue) {
                    push();
                    node.value.walk(tw);
                    pop();
                    node.name.walk(marker);
                } else if (node instanceof AST_DestructuredKeyVal) {
                    if (!(node.key instanceof AST_Node)) {
                        node.value.walk(marker);
                    } else if (node.value instanceof AST_PropAccess) {
                        push();
                        segment.block = node;
                        node.key.walk(tw);
                        node.value.walk(marker);
                        pop();
                    } else {
                        node.key.walk(tw);
                        node.value.walk(marker);
                    }
                } else if (node instanceof symbol_type) {
                    mark(node);
                } else {
                    node.walk(tw);
                }
                return true;
            });
            lhs.walk(marker);
        }

        function mark(sym, read) {
            var def = sym.definition(), ldef;
            if (read && !all(in_arg, function(fn) {
                ldef = fn.variables.get(sym.name);
                if (!ldef) return true;
                if (!is_funarg(ldef)) return true;
                return ldef !== def
                    && !def.undeclared
                    && fn.parent_scope.find_variable(sym.name) !== def;
            })) return references[def.id] = references[ldef.id] = false;
            var seg = segment;
            if (in_try) {
                push();
                seg = segment;
                pop();
            }
            if (def.id in references) {
                var refs = references[def.id];
                if (!refs) return;
                if (refs.start.block !== seg.block) return references[def.id] = false;
                push_ref(sym);
                refs.end = seg;
                if (def.id in prev) {
                    last[prev[def.id]] = null;
                } else if (!read) {
                    return;
                }
            } else if ((ldef = self.variables.get(def.name)) !== def) {
                if (ldef && root === seg) references[ldef.id] = false;
                return references[def.id] = false;
            } else if (compressor.exposed(def) || NO_MERGE[sym.name]) {
                return references[def.id] = false;
            } else {
                var refs = declarations.get(def.id) || [];
                refs.scopes = [];
                push_ref(sym);
                references[def.id] = refs;
                if (!read) {
                    refs.start = seg;
                    return first.push({
                        index: index++,
                        definition: def,
                    });
                }
                if (seg.block !== self) return references[def.id] = false;
                refs.start = root;
            }
            prev[def.id] = last.length;
            last.push({
                index: index++,
                definition: def,
            });

            function push_ref(sym) {
                refs.push(sym);
                push_uniq(refs.scopes, sym.scope);
                var scope = find_scope(tw);
                if (scope !== sym.scope) push_uniq(refs.scopes, scope);
            }
        }

        function insert(target) {
            var stack = [];
            while (true) {
                if (HOP(segment, "block")) {
                    var block = segment.block;
                    if (block instanceof AST_LabeledStatement) block = block.body;
                    if (block === target) break;
                }
                stack.push(segment);
                pop();
            }
            segment.inserted = segment.block;
            push();
            while (stack.length) {
                var seg = stack.pop();
                push();
                if (HOP(seg, "block")) segment.block = seg.block;
                if (HOP(seg, "loop")) segment.loop = seg.loop;
            }
        }

        function must_visit(base, segment) {
            return base === segment || base.isPrototypeOf(segment);
        }

        function mergeable(head, tail) {
            return must_visit(head.start, head.end) || must_visit(head.start, tail.start);
        }
    });

    function fill_holes(orig, elements) {
        for (var i = elements.length; --i >= 0;) {
            if (!elements[i]) elements[i] = make_node(AST_Hole, orig);
        }
    }

    function to_class_expr(defcl, drop_name) {
        var cl = make_node(AST_ClassExpression, defcl);
        if (cl.name) cl.name = drop_name ? null : make_node(AST_SymbolClass, cl.name);
        return cl;
    }

    function to_func_expr(defun, drop_name) {
        var ctor;
        switch (defun.CTOR) {
          case AST_AsyncDefun:
            ctor = AST_AsyncFunction;
            break;
          case AST_AsyncGeneratorDefun:
            ctor = AST_AsyncGeneratorFunction;
            break;
          case AST_Defun:
            ctor = AST_Function;
            break;
          case AST_GeneratorDefun:
            ctor = AST_GeneratorFunction;
            break;
        }
        var fn = make_node(ctor, defun);
        fn.name = drop_name ? null : make_node(AST_SymbolLambda, defun.name);
        return fn;
    }

    AST_Scope.DEFMETHOD("drop_unused", function(compressor) {
        if (!compressor.option("unused")) return;
        var self = this;
        var drop_funcs = !(self instanceof AST_Toplevel) || compressor.toplevel.funcs;
        var drop_vars = !(self instanceof AST_Toplevel) || compressor.toplevel.vars;
        var assign_as_unused = /keep_assign/.test(compressor.option("unused")) ? return_false : function(node, props) {
            var sym, nested = false;
            if (node instanceof AST_Assign) {
                if (node.write_only || node.operator == "=") sym = extract_reference(node.left, props);
            } else if (node instanceof AST_Unary) {
                if (node.write_only) sym = extract_reference(node.expression, props);
            }
            if (!(sym instanceof AST_SymbolRef)) return;
            var def = sym.definition();
            if (export_defaults[def.id]) return;
            if (compressor.exposed(def)) return;
            if (!can_drop_symbol(sym, compressor, nested)) return;
            return sym;

            function extract_reference(node, props) {
                if (node instanceof AST_PropAccess) {
                    var expr = node.expression;
                    if (!expr.may_throw_on_access(compressor, true)) {
                        nested = true;
                        if (props && node instanceof AST_Sub) props.unshift(node.property);
                        return extract_reference(expr, props);
                    }
                } else if (node instanceof AST_Assign && node.operator == "=") {
                    node.write_only = "p";
                    var ref = extract_reference(node.right);
                    if (!props) return ref;
                    props.assign = node;
                    return ref instanceof AST_SymbolRef ? ref : node.left;
                }
                return node;
            }
        };
        var assign_in_use = Object.create(null);
        var export_defaults = Object.create(null);
        var find_variable = function(name) {
            find_variable = compose(self, 0, noop);
            return find_variable(name);

            function compose(child, level, find) {
                var parent = compressor.parent(level);
                if (!parent) return find;
                var in_arg = parent instanceof AST_Lambda && member(child, parent.argnames);
                return compose(parent, level + 1, in_arg ? function(name) {
                    var def = find(name);
                    if (def) return def;
                    def = parent.variables.get(name);
                    if (def) {
                        var sym = def.orig[0];
                        if (sym instanceof AST_SymbolFunarg || sym instanceof AST_SymbolLambda) return def;
                    }
                } : parent.variables ? function(name) {
                    return find(name) || parent.variables.get(name);
                } : find);
            }
        };
        var for_ins = Object.create(null);
        var in_use = [];
        var in_use_ids = Object.create(null); // avoid expensive linear scans of in_use
        var lambda_ids = Object.create(null);
        var value_read = Object.create(null);
        var value_modified = Object.create(null);
        var var_defs = Object.create(null);
        if (self instanceof AST_Toplevel && compressor.top_retain) {
            self.variables.each(function(def) {
                if (compressor.top_retain(def) && !(def.id in in_use_ids)) {
                    AST_Node.info("Retaining variable {name}", def);
                    in_use_ids[def.id] = true;
                    in_use.push(def);
                }
            });
        }
        var assignments = new Dictionary();
        var initializations = new Dictionary();
        // pass 1: find out which symbols are directly used in
        // this scope (not in nested scopes).
        var scope = this;
        var tw = new TreeWalker(function(node, descend) {
            if (node instanceof AST_Lambda && node.uses_arguments && !tw.has_directive("use strict")) {
                node.each_argname(function(argname) {
                    var def = argname.definition();
                    if (!(def.id in in_use_ids)) {
                        in_use_ids[def.id] = true;
                        in_use.push(def);
                    }
                });
            }
            if (node === self) return;
            if (scope === self) {
                if (node instanceof AST_DefClass) {
                    var def = node.name.definition();
                    var drop = drop_funcs && !def.exported;
                    if (!drop && !(def.id in in_use_ids)) {
                        in_use_ids[def.id] = true;
                        in_use.push(def);
                    }
                    var used = tw.parent() instanceof AST_ExportDefault;
                    if (used) {
                        export_defaults[def.id] = true;
                    } else if (drop && !(def.id in lambda_ids)) {
                        lambda_ids[def.id] = 1;
                    }
                    if (node.extends) node.extends.walk(tw);
                    var values = [];
                    node.properties.forEach(function(prop) {
                        if (prop.key instanceof AST_Node) prop.key.walk(tw);
                        var value = prop.value;
                        if (!value) return;
                        if (is_static_field_or_init(prop)) {
                            if (!used && value.contains_this()) used = true;
                            walk_class_prop(value);
                        } else {
                            values.push(value);
                        }
                    });
                    values.forEach(drop && used ? walk_class_prop : function(value) {
                        initializations.add(def.id, value);
                    });
                    return true;
                }
                if (node instanceof AST_LambdaDefinition) {
                    var def = node.name.definition();
                    var drop = drop_funcs && !def.exported;
                    if (!drop && !(def.id in in_use_ids)) {
                        in_use_ids[def.id] = true;
                        in_use.push(def);
                    }
                    initializations.add(def.id, node);
                    if (tw.parent() instanceof AST_ExportDefault) {
                        export_defaults[def.id] = true;
                        return scan_ref_scoped(node, descend, true);
                    }
                    if (drop && !(def.id in lambda_ids)) lambda_ids[def.id] = 1;
                    return true;
                }
                if (node instanceof AST_Definitions) {
                    node.definitions.forEach(function(defn) {
                        var value = defn.value;
                        var side_effects = value
                            && (defn.name instanceof AST_Destructured || value.has_side_effects(compressor));
                        var shared = side_effects && value.tail_node().operator == "=";
                        defn.name.mark_symbol(function(name) {
                            if (!(name instanceof AST_SymbolDeclaration)) return;
                            var def = name.definition();
                            var_defs[def.id] = (var_defs[def.id] || 0) + 1;
                            if (node instanceof AST_Var && def.orig[0] instanceof AST_SymbolCatch) {
                                var redef = def.redefined();
                                if (redef) var_defs[redef.id] = (var_defs[redef.id] || 0) + 1;
                            }
                            if (!(def.id in in_use_ids) && (!drop_vars || def.exported
                                || (node instanceof AST_Const ? def.redefined() : def.const_redefs)
                                || !(node instanceof AST_Var || is_safe_lexical(def)))) {
                                in_use_ids[def.id] = true;
                                in_use.push(def);
                            }
                            if (value) {
                                if (!side_effects) {
                                    initializations.add(def.id, value);
                                } else if (shared) {
                                    verify_safe_usage(def, name, value_modified[def.id]);
                                }
                                assignments.add(def.id, defn);
                            }
                            unmark_lambda(def);
                            return true;
                        }, tw);
                        if (side_effects) value.walk(tw);
                    });
                    return true;
                }
                if (node instanceof AST_SymbolFunarg) {
                    var def = node.definition();
                    var_defs[def.id] = (var_defs[def.id] || 0) + 1;
                    assignments.add(def.id, node);
                    var fixed = node.fixed_value(true);
                    if (fixed && fixed.tail_node().operator == "=") {
                        verify_safe_usage(def, node, value_modified[def.id]);
                    }
                    return true;
                }
                if (node instanceof AST_SymbolImport) {
                    var def = node.definition();
                    if (!(def.id in in_use_ids) && (!drop_vars || !is_safe_lexical(def))) {
                        in_use_ids[def.id] = true;
                        in_use.push(def);
                    }
                    return true;
                }
            }
            return scan_ref_scoped(node, descend, true);

            function walk_class_prop(value) {
                var save_scope = scope;
                scope = node;
                value.walk(tw);
                scope = save_scope;
            }
        });
        tw.directives = Object.create(compressor.directives);
        self.walk(tw);
        var drop_fn_name = compressor.option("keep_fnames") ? return_false : compressor.option("ie") ? function(def) {
            return !compressor.exposed(def) && def.references.length == def.replaced;
        } : function(def) {
            if (!(def.id in in_use_ids)) return true;
            if (def.orig.length - def.eliminated < 2) return false;
            // function argument will always overshadow its name
            if (def.orig[1] instanceof AST_SymbolFunarg) return true;
            // retain if referenced within destructured object of argument
            return all(def.references, function(ref) {
                return !ref.in_arg;
            });
        };
        if (compressor.option("ie")) initializations.each(function(init, id) {
            if (id in in_use_ids) return;
            init.forEach(function(init) {
                init.walk(new TreeWalker(function(node) {
                    if (node instanceof AST_Function && node.name && !drop_fn_name(node.name.definition())) {
                        node.walk(tw);
                        return true;
                    }
                    if (node instanceof AST_Scope) return true;
                }));
            });
        });
        // pass 2: for every used symbol we need to walk its
        // initialization code to figure out if it uses other
        // symbols (that may not be in_use).
        tw = new TreeWalker(scan_ref_scoped);
        for (var i = 0; i < in_use.length; i++) {
            var init = initializations.get(in_use[i].id);
            if (init) init.forEach(function(init) {
                init.walk(tw);
            });
        }
        Object.keys(assign_in_use).forEach(function(id) {
            var assigns = assign_in_use[id];
            if (!assigns) {
                delete assign_in_use[id];
                return;
            }
            assigns = assigns.reduce(function(in_use, assigns) {
                assigns.forEach(function(assign) {
                    push_uniq(in_use, assign);
                });
                return in_use;
            }, []);
            var in_use = (assignments.get(id) || []).filter(function(node) {
                return find_if(node instanceof AST_Unary ? function(assign) {
                    return assign === node;
                } : function(assign) {
                    if (assign === node) return true;
                    if (assign instanceof AST_Unary) return false;
                    return get_rvalue(assign) === get_rvalue(node);
                }, assigns);
            });
            if (assigns.length == in_use.length) {
                assign_in_use[id] = in_use;
            } else {
                delete assign_in_use[id];
            }
        });
        // pass 3: we should drop declarations not in_use
        var calls_to_drop_args = [];
        var fns_with_marked_args = [];
        var trimmer = new TreeTransformer(function(node) {
            if (node instanceof AST_DefaultValue) return trim_default(trimmer, node);
            if (node instanceof AST_Destructured && node.rest) node.rest = node.rest.transform(trimmer);
            if (node instanceof AST_DestructuredArray) {
                var trim = !node.rest;
                for (var i = node.elements.length; --i >= 0;) {
                    var element = node.elements[i].transform(trimmer);
                    if (element) {
                        node.elements[i] = element;
                        trim = false;
                    } else if (trim) {
                        node.elements.pop();
                    } else {
                        node.elements[i] = make_node(AST_Hole, node.elements[i]);
                    }
                }
                return node;
            }
            if (node instanceof AST_DestructuredObject) {
                var properties = [];
                node.properties.forEach(function(prop) {
                    var retain = false;
                    if (prop.key instanceof AST_Node) {
                        prop.key = prop.key.transform(tt);
                        retain = prop.key.has_side_effects(compressor);
                    }
                    if ((retain || node.rest) && is_decl(prop.value)) {
                        prop.value = prop.value.transform(tt);
                        properties.push(prop);
                    } else {
                        var value = prop.value.transform(trimmer);
                        if (!value && node.rest) {
                            if (prop.value instanceof AST_DestructuredArray) {
                                value = make_node(AST_DestructuredArray, prop.value, { elements: [] });
                            } else {
                                value = make_node(AST_DestructuredObject, prop.value, { properties: [] });
                            }
                        }
                        if (value) {
                            prop.value = value;
                            properties.push(prop);
                        }
                    }
                });
                node.properties = properties;
                return node;
            }
            if (node instanceof AST_SymbolDeclaration) return trim_decl(node);
        });
        var tt = new TreeTransformer(function(node, descend, in_list) {
            var parent = tt.parent();
            if (drop_vars) {
                var props = [], sym = assign_as_unused(node, props);
                if (sym) {
                    var value;
                    if (can_drop_lhs(sym, node)) {
                        if (node instanceof AST_Assign) {
                            value = get_rhs(node);
                            if (node.write_only === true) value = value.drop_side_effect_free(compressor);
                        }
                        if (!value) value = make_node(AST_Number, node, { value: 0 });
                    }
                    if (value) {
                        if (props.assign) {
                            var assign = props.assign.drop_side_effect_free(compressor);
                            if (assign) {
                                assign.write_only = true;
                                props.unshift(assign);
                            }
                        }
                        if (!(parent instanceof AST_Sequence)
                            || parent.tail_node() === node
                            || value.has_side_effects(compressor)) {
                            props.push(value);
                        }
                        switch (props.length) {
                          case 0:
                            return List.skip;
                          case 1:
                            return maintain_this_binding(parent, node, props[0].transform(tt));
                          default:
                            return make_sequence(node, props.map(function(prop) {
                                return prop.transform(tt);
                            }));
                        }
                    }
                } else if (node instanceof AST_UnaryPostfix
                    && node.expression instanceof AST_SymbolRef
                    && indexOf_assign(node.expression.definition(), node) < 0) {
                    return make_node(AST_UnaryPrefix, node, {
                        operator: "+",
                        expression: node.expression,
                    });
                }
            }
            if (node instanceof AST_Binary && node.operator == "instanceof") {
                var sym = node.right;
                if (!(sym instanceof AST_SymbolRef)) return;
                if (sym.definition().id in in_use_ids) return;
                var lhs = node.left.drop_side_effect_free(compressor);
                var value = make_node(AST_False, node).optimize(compressor);
                return lhs ? make_sequence(node, [ lhs, value ]) : value;
            }
            if (node instanceof AST_Call) {
                calls_to_drop_args.push(node);
                node.args = node.args.map(function(arg) {
                    return arg.transform(tt);
                });
                node.expression = node.expression.transform(tt);
                return node;
            }
            if (scope !== self) return;
            if (drop_funcs && node !== self && node instanceof AST_DefClass) {
                var def = node.name.definition();
                if (!(def.id in in_use_ids)) {
                    log(node.name, "Dropping unused class {name}");
                    def.eliminated++;
                    descend(node, tt);
                    var trimmed = to_class_expr(node, true);
                    if (parent instanceof AST_ExportDefault) return trimmed;
                    trimmed = trimmed.drop_side_effect_free(compressor, true);
                    if (trimmed) return make_node(AST_SimpleStatement, node, { body: trimmed });
                    return in_list ? List.skip : make_node(AST_EmptyStatement, node);
                }
            }
            if (node instanceof AST_ClassExpression && node.name && drop_fn_name(node.name.definition())) {
                node.name = null;
            }
            if (node instanceof AST_Lambda) {
                if (drop_funcs && node !== self && node instanceof AST_LambdaDefinition) {
                    var def = node.name.definition();
                    if (!(def.id in in_use_ids)) {
                        log(node.name, "Dropping unused function {name}");
                        def.eliminated++;
                        if (parent instanceof AST_ExportDefault) {
                            descend_scope();
                            return to_func_expr(node, true);
                        }
                        return in_list ? List.skip : make_node(AST_EmptyStatement, node);
                    }
                }
                descend_scope();
                if (node instanceof AST_LambdaExpression && node.name && drop_fn_name(node.name.definition())) {
                    node.name = null;
                }
                if (!(node instanceof AST_Accessor)) {
                    var args, spread, trim = compressor.drop_fargs(node, parent);
                    if (trim && parent instanceof AST_Call && parent.expression === node) {
                        args = parent.args;
                        for (spread = 0; spread < args.length; spread++) {
                            if (args[spread] instanceof AST_Spread) break;
                        }
                    }
                    var argnames = node.argnames;
                    var rest = node.rest;
                    var after = false, before = false;
                    if (rest) {
                        before = true;
                        if (!args || spread < argnames.length || rest instanceof AST_SymbolFunarg) {
                            rest = rest.transform(trimmer);
                        } else {
                            var trimmed = trim_destructured(rest, make_node(AST_Array, parent, {
                                elements: args.slice(argnames.length),
                            }), trim_decl, !node.uses_arguments, rest);
                            rest = trimmed.name;
                            args.length = argnames.length;
                            if (trimmed.value.elements.length) [].push.apply(args, trimmed.value.elements);
                        }
                        if (rest instanceof AST_Destructured && !rest.rest) {
                            if (rest instanceof AST_DestructuredArray) {
                                if (rest.elements.length == 0) rest = null;
                            } else if (rest.properties.length == 0) {
                                rest = null;
                            }
                        }
                        node.rest = rest;
                        if (rest) {
                            trim = false;
                            after = true;
                        }
                    }
                    var default_length = trim ? -1 : node.length();
                    var trim_value = args && !node.uses_arguments && parent !== compressor.parent();
                    for (var i = argnames.length; --i >= 0;) {
                        var sym = argnames[i];
                        if (sym instanceof AST_SymbolFunarg) {
                            var def = sym.definition();
                            if (def.id in in_use_ids) {
                                trim = false;
                                if (indexOf_assign(def, sym) < 0) sym.unused = null;
                            } else if (trim) {
                                log(sym, "Dropping unused function argument {name}");
                                argnames.pop();
                                def.eliminated++;
                                sym.unused = true;
                            } else {
                                sym.unused = true;
                            }
                        } else {
                            before = true;
                            var funarg;
                            if (!args || spread < i) {
                                funarg = sym.transform(trimmer);
                            } else {
                                var trimmed = trim_destructured(sym, args[i], trim_decl, trim_value, sym);
                                funarg = trimmed.name;
                                if (trimmed.value) args[i] = trimmed.value;
                            }
                            if (funarg) {
                                trim = false;
                                argnames[i] = funarg;
                                if (!after) after = !(funarg instanceof AST_SymbolFunarg);
                            } else if (trim) {
                                log_default(sym, "Dropping unused default argument {name}");
                                argnames.pop();
                            } else if (i > default_length) {
                                log_default(sym, "Dropping unused default argument assignment {name}");
                                if (sym.name instanceof AST_SymbolFunarg) {
                                    sym.name.unused = true;
                                } else {
                                    after = true;
                                }
                                argnames[i] = sym.name;
                            } else {
                                log_default(sym, "Dropping unused default argument value {name}");
                                argnames[i] = sym = sym.clone();
                                sym.value = make_node(AST_Number, sym, { value: 0 });
                                after = true;
                            }
                        }
                    }
                    if (before && !after && node.uses_arguments && !tt.has_directive("use strict")) {
                        node.rest = make_node(AST_DestructuredArray, node, { elements: [] });
                    }
                    fns_with_marked_args.push(node);
                }
                return node;
            }
            if (node instanceof AST_Catch && node.argname instanceof AST_Destructured) {
                node.argname.transform(trimmer);
            }
            if (node instanceof AST_Definitions && !(parent instanceof AST_ForEnumeration && parent.init === node)) {
                // place uninitialized names at the start
                var body = [], head = [], tail = [];
                // for unused names whose initialization has
                // side effects, we can cascade the init. code
                // into the next one, or next statement.
                var side_effects = [];
                var duplicated = 0;
                var is_var = node instanceof AST_Var;
                node.definitions.forEach(function(def) {
                    if (def.value) def.value = def.value.transform(tt);
                    var value = def.value;
                    if (def.name instanceof AST_Destructured) {
                        var trimmed = trim_destructured(def.name, value, function(node) {
                            if (!drop_vars) return node;
                            if (node.definition().id in in_use_ids) return node;
                            if (is_catch(node)) return node;
                            if (is_var && !can_drop_symbol(node)) return node;
                            return null;
                        }, true);
                        if (trimmed.name) {
                            def = make_node(AST_VarDef, def, {
                                name: trimmed.name,
                                value: value = trimmed.value,
                            });
                            flush();
                        } else if (trimmed.value) {
                            side_effects.push(trimmed.value);
                        }
                        return;
                    }
                    var sym = def.name.definition();
                    var drop_sym = is_var ? can_drop_symbol(def.name) : is_safe_lexical(sym);
                    if (!drop_sym || !drop_vars || sym.id in in_use_ids) {
                        var index;
                        if (value && ((index = indexOf_assign(sym, def)) < 0 || self_assign(value.tail_node()))) {
                            def = def.clone();
                            value = value.drop_side_effect_free(compressor);
                            if (value) AST_Node.warn("Side effects in definition of variable {name} [{start}]", def.name);
                            if (node instanceof AST_Const) {
                                def.value = value || make_node(AST_Number, def, { value: 0 });
                            } else {
                                def.value = null;
                                if (value) side_effects.push(value);
                            }
                            value = null;
                            if (index >= 0) assign_in_use[sym.id][index] = def;
                        }
                        var old_def, fn;
                        if (!value && !(node instanceof AST_Let)) {
                            if (parent instanceof AST_ExportDeclaration) {
                                flush();
                            } else if (drop_sym && var_defs[sym.id] > 1) {
                                AST_Node.info("Dropping declaration of variable {name} [{start}]", def.name);
                                var_defs[sym.id]--;
                                sym.eliminated++;
                            } else {
                                head.push(def);
                            }
                        } else if (compressor.option("functions")
                            && !compressor.option("ie")
                            && drop_sym
                            && value
                            && var_defs[sym.id] == 1
                            && sym.assignments == 0
                            && (fn = value.tail_node()) instanceof AST_LambdaExpression
                            && !is_arguments(sym)
                            && !is_arrow(fn)
                            && assigned_once(fn, sym.references)
                            && can_declare_defun(fn)
                            && (old_def = rename_def(fn, def.name.name)) !== false) {
                            AST_Node.warn("Declaring {name} as function [{start}]", def.name);
                            var ctor;
                            switch (fn.CTOR) {
                              case AST_AsyncFunction:
                                ctor = AST_AsyncDefun;
                                break;
                              case AST_AsyncGeneratorFunction:
                                ctor = AST_AsyncGeneratorDefun;
                                break;
                              case AST_Function:
                                ctor = AST_Defun;
                                break;
                              case AST_GeneratorFunction:
                                ctor = AST_GeneratorDefun;
                                break;
                            }
                            var defun = make_node(ctor, fn);
                            defun.name = make_node(AST_SymbolDefun, def.name);
                            var name_def = def.name.scope.resolve().def_function(defun.name);
                            if (old_def) old_def.forEach(function(node) {
                                node.name = name_def.name;
                                node.thedef = name_def;
                                node.reference();
                            });
                            body.push(defun);
                            if (value !== fn) [].push.apply(side_effects, value.expressions.slice(0, -1));
                            sym.eliminated++;
                        } else {
                            if (drop_sym
                                && var_defs[sym.id] > 1
                                && !(parent instanceof AST_ExportDeclaration)
                                && sym.orig.indexOf(def.name) > sym.eliminated) {
                                var_defs[sym.id]--;
                                duplicated++;
                            }
                            flush();
                        }
                    } else if (is_catch(def.name)) {
                        value = value && value.drop_side_effect_free(compressor);
                        if (value) side_effects.push(value);
                        if (var_defs[sym.id] > 1) {
                            AST_Node.warn("Dropping duplicated declaration of variable {name} [{start}]", def.name);
                            var_defs[sym.id]--;
                            sym.eliminated++;
                        } else {
                            def.value = null;
                            head.push(def);
                        }
                    } else {
                        value = value && value.drop_side_effect_free(compressor);
                        if (value) {
                            AST_Node.warn("Side effects in initialization of unused variable {name} [{start}]", def.name);
                            side_effects.push(value);
                        } else {
                            log(def.name, "Dropping unused variable {name}");
                        }
                        sym.eliminated++;
                    }

                    function self_assign(ref) {
                        return ref instanceof AST_SymbolRef && ref.definition() === sym;
                    }

                    function assigned_once(fn, refs) {
                        if (refs.length == 0) return fn === def.name.fixed_value();
                        return all(refs, function(ref) {
                            return fn === ref.fixed_value();
                        });
                    }

                    function can_declare_defun(fn) {
                        if (!is_var || compressor.has_directive("use strict") || !(fn instanceof AST_Function)) {
                            return parent instanceof AST_Scope;
                        }
                        return parent instanceof AST_Block
                            || parent instanceof AST_For && parent.init === node
                            || parent instanceof AST_If;
                    }

                    function rename_def(fn, name) {
                        if (!fn.name) return null;
                        var def = fn.name.definition();
                        if (def.orig.length > 1) return null;
                        if (def.assignments > 0) return false;
                        if (def.name == name) return def;
                        if (compressor.option("keep_fnames")) return false;
                        var forbidden;
                        switch (name) {
                          case "await":
                            forbidden = is_async;
                            break;
                          case "yield":
                            forbidden = is_generator;
                            break;
                        }
                        return all(def.references, function(ref) {
                            var scope = ref.scope;
                            if (scope.find_variable(name) !== sym) return false;
                            if (forbidden) do {
                                scope = scope.resolve();
                                if (forbidden(scope)) return false;
                            } while (scope !== fn && (scope = scope.parent_scope));
                            return true;
                        }) && def;
                    }

                    function is_catch(node) {
                        var sym = node.definition();
                        return sym.orig[0] instanceof AST_SymbolCatch && sym.scope.resolve() === node.scope.resolve();
                    }

                    function flush() {
                        if (side_effects.length > 0) {
                            if (tail.length == 0) {
                                body.push(make_node(AST_SimpleStatement, node, {
                                    body: make_sequence(node, side_effects),
                                }));
                            } else if (value) {
                                side_effects.push(value);
                                def.value = make_sequence(value, side_effects);
                            } else {
                                def.value = make_node(AST_UnaryPrefix, def, {
                                    operator: "void",
                                    expression: make_sequence(def, side_effects),
                                });
                            }
                            side_effects = [];
                        }
                        tail.push(def);
                    }
                });
                switch (head.length) {
                  case 0:
                    if (tail.length == 0) break;
                    if (tail.length == duplicated) {
                        [].unshift.apply(side_effects, tail.map(function(def) {
                            AST_Node.info("Dropping duplicated definition of variable {name} [{start}]", def.name);
                            var sym = def.name.definition();
                            var ref = make_node(AST_SymbolRef, def.name);
                            sym.references.push(ref);
                            var assign = make_node(AST_Assign, def, {
                                operator: "=",
                                left: ref,
                                right: def.value,
                            });
                            var index = indexOf_assign(sym, def);
                            if (index >= 0) assign_in_use[sym.id][index] = assign;
                            sym.assignments++;
                            sym.eliminated++;
                            return assign;
                        }));
                        break;
                    }
                  case 1:
                    if (tail.length == 0) {
                        var id = head[0].name.definition().id;
                        if (id in for_ins) {
                            node.definitions = head;
                            for_ins[id].init = node;
                            break;
                        }
                    }
                  default:
                    var seq;
                    if (tail.length > 0 && (seq = tail[0].value) instanceof AST_Sequence) {
                        tail[0].value = seq.tail_node();
                        body.push(make_node(AST_SimpleStatement, node, {
                            body: make_sequence(seq, seq.expressions.slice(0, -1)),
                        }));
                    }
                    node.definitions = head.concat(tail);
                    body.push(node);
                }
                if (side_effects.length > 0) {
                    body.push(make_node(AST_SimpleStatement, node, { body: make_sequence(node, side_effects) }));
                }
                return insert_statements(body, node, in_list);
            }
            if (node instanceof AST_Assign) {
                descend(node, tt);
                if (!(node.left instanceof AST_Destructured)) return node;
                var trimmed = trim_destructured(node.left, node.right, function(node) {
                    return node;
                }, node.write_only === true);
                if (trimmed.name) return make_node(AST_Assign, node, {
                    operator: node.operator,
                    left: trimmed.name,
                    right: trimmed.value,
                });
                if (trimmed.value) return trimmed.value;
                if (parent instanceof AST_Sequence && parent.tail_node() !== node) return List.skip;
                return make_node(AST_Number, node, { value: 0 });
            }
            if (node instanceof AST_LabeledStatement && node.body instanceof AST_For) {
                // Certain combination of unused name + side effect leads to invalid AST:
                //    https://github.com/mishoo/UglifyJS/issues/1830
                // We fix it at this stage by moving the label inwards, back to the `for`.
                descend(node, tt);
                if (node.body instanceof AST_BlockStatement) {
                    var block = node.body;
                    node.body = block.body.pop();
                    block.body.push(node);
                    return in_list ? List.splice(block.body) : block;
                }
                return node;
            }
            if (node instanceof AST_Scope) {
                descend_scope();
                return node;
            }
            if (node instanceof AST_SymbolImport) {
                if (!compressor.option("imports") || node.definition().id in in_use_ids) return node;
                return in_list ? List.skip : null;
            }

            function descend_scope() {
                var save_scope = scope;
                scope = node;
                descend(node, tt);
                scope = save_scope;
            }
        }, function(node, in_list) {
            if (node instanceof AST_BlockStatement) return trim_block(node, tt.parent(), in_list);
            if (node instanceof AST_ExportDeclaration) {
                var block = node.body;
                if (!(block instanceof AST_BlockStatement)) return;
                node.body = block.body.pop();
                block.body.push(node);
                return in_list ? List.splice(block.body) : block;
            }
            if (node instanceof AST_For) return patch_for_init(node, in_list);
            if (node instanceof AST_ForIn) {
                if (!drop_vars || !compressor.option("loops")) return;
                if (!is_empty(node.body)) return;
                var sym = get_init_symbol(node);
                if (!sym) return;
                var def = sym.definition();
                if (def.id in in_use_ids) return;
                log(sym, "Dropping unused loop variable {name}");
                if (for_ins[def.id] === node) delete for_ins[def.id];
                var body = [];
                var value = node.object.drop_side_effect_free(compressor);
                if (value) {
                    AST_Node.warn("Side effects in object of for-in loop [{start}]", value);
                    body.push(make_node(AST_SimpleStatement, node, { body: value }));
                }
                if (node.init instanceof AST_Definitions && def.orig[0] instanceof AST_SymbolCatch) {
                    body.push(node.init);
                }
                return insert_statements(body, node, in_list);
            }
            if (node instanceof AST_Import) {
                if (node.properties && node.properties.length == 0) node.properties = null;
                return node;
            }
            if (node instanceof AST_Sequence) {
                if (node.expressions.length > 1) return;
                return maintain_this_binding(tt.parent(), node, node.expressions[0]);
            }
        });
        tt.push(compressor.parent());
        tt.directives = Object.create(compressor.directives);
        self.transform(tt);
        if (self instanceof AST_Lambda
            && self.body.length == 1
            && self.body[0] instanceof AST_Directive
            && self.body[0].value == "use strict") {
            self.body.length = 0;
        }
        calls_to_drop_args.forEach(function(call) {
            drop_unused_call_args(call, compressor, fns_with_marked_args);
        });

        function log(sym, text) {
            AST_Node[sym.definition().references.length > 0 ? "info" : "warn"](text + " [{start}]", sym);
        }

        function log_default(node, text) {
            if (node.name instanceof AST_SymbolFunarg) {
                log(node.name, text);
            } else {
                AST_Node.info(text + " [{start}]", node);
            }
        }

        function get_rvalue(expr) {
            return expr[expr instanceof AST_Assign ? "right" : "value"];
        }

        function insert_statements(body, orig, in_list) {
            switch (body.length) {
              case 0:
                return in_list ? List.skip : make_node(AST_EmptyStatement, orig);
              case 1:
                return body[0];
              default:
                return in_list ? List.splice(body) : make_node(AST_BlockStatement, orig, { body: body });
            }
        }

        function track_assigns(def, node) {
            if (def.scope.resolve() !== self) return false;
            if (!def.fixed || !node.fixed) assign_in_use[def.id] = false;
            return assign_in_use[def.id] !== false;
        }

        function add_assigns(def, node) {
            if (!assign_in_use[def.id]) assign_in_use[def.id] = [];
            if (node.fixed.assigns) push_uniq(assign_in_use[def.id], node.fixed.assigns);
        }

        function indexOf_assign(def, node) {
            var nodes = assign_in_use[def.id];
            return nodes && nodes.indexOf(node);
        }

        function unmark_lambda(def) {
            if (lambda_ids[def.id] > 1 && !(def.id in in_use_ids)) {
                in_use_ids[def.id] = true;
                in_use.push(def);
            }
            lambda_ids[def.id] = 0;
        }

        function verify_safe_usage(def, read, modified) {
            if (def.id in in_use_ids) return;
            if (read && modified) {
                in_use_ids[def.id] = read;
                in_use.push(def);
            } else {
                value_read[def.id] = read;
                value_modified[def.id] = modified;
            }
        }

        function can_drop_lhs(sym, node) {
            var def = sym.definition();
            var in_use = in_use_ids[def.id];
            if (!in_use) return true;
            if (node[node instanceof AST_Assign ? "left" : "expression"] !== sym) return false;
            return in_use === sym && def.references.length - def.replaced == 1 || indexOf_assign(def, node) < 0;
        }

        function get_rhs(assign) {
            var rhs = assign.right;
            if (!assign.write_only) return rhs;
            if (!(rhs instanceof AST_Binary && lazy_op[rhs.operator])) return rhs;
            if (!(rhs.left instanceof AST_SymbolRef)) return rhs;
            if (!(assign.left instanceof AST_SymbolRef)) return rhs;
            var def = assign.left.definition();
            if (rhs.left.definition() !== def) return rhs;
            if (rhs.right.has_side_effects(compressor)) return rhs;
            if (track_assigns(def, rhs.left)) add_assigns(def, rhs.left);
            return rhs.right;
        }

        function get_init_symbol(for_in) {
            var init = for_in.init;
            if (init instanceof AST_Definitions) {
                init = init.definitions[0].name;
                return init instanceof AST_SymbolDeclaration && init;
            }
            while (init instanceof AST_PropAccess) init = init.expression.tail_node();
            if (init instanceof AST_SymbolRef) return init;
        }

        function scan_ref_scoped(node, descend, init) {
            if (node instanceof AST_Assign && node.left instanceof AST_SymbolRef) {
                var def = node.left.definition();
                if (def.scope.resolve() === self) assignments.add(def.id, node);
            }
            if (node instanceof AST_SymbolRef && node.in_arg) var_defs[node.definition().id] = 0;
            if (node instanceof AST_Unary && node.expression instanceof AST_SymbolRef) {
                var def = node.expression.definition();
                if (def.scope.resolve() === self) assignments.add(def.id, node);
            }
            var props = [], sym = assign_as_unused(node, props);
            if (sym) {
                var node_def = sym.definition();
                if (node_def.scope.resolve() !== self && self.variables.get(sym.name) !== node_def) return;
                if (is_arguments(node_def) && !all(self.argnames, function(argname) {
                    return !argname.match_symbol(function(node) {
                        if (node instanceof AST_SymbolFunarg) {
                            var def = node.definition();
                            return def.references.length > def.replaced;
                        }
                    }, true);
                })) return;
                if (node.write_only === "p" && node.right.may_throw_on_access(compressor, true)) return;
                var assign = props.assign;
                if (assign) {
                    initializations.add(node_def.id, assign.left);
                    assign.write_only = true;
                    assign.walk(tw);
                }
                props.forEach(function(prop) {
                    prop.walk(tw);
                });
                if (node instanceof AST_Assign) {
                    var fixed = sym.fixed_value();
                    var right = get_rhs(node);
                    var safe = fixed && fixed.is_constant();
                    var shared = false;
                    if (init
                        && node.write_only === true
                        && (safe || node.left === sym || right.equals(sym))
                        && !right.has_side_effects(compressor)) {
                        initializations.add(node_def.id, right);
                    } else {
                        right.walk(tw);
                        shared = right.tail_node().operator == "=";
                    }
                    if (node.left === sym) {
                        if (!node.write_only || shared) {
                            verify_safe_usage(node_def, sym, value_modified[node_def.id]);
                        }
                    } else if (!safe) {
                        verify_safe_usage(node_def, value_read[node_def.id], true);
                    }
                }
                if (track_assigns(node_def, sym) && is_lhs(sym, node) !== sym) add_assigns(node_def, sym);
                unmark_lambda(node_def);
                return true;
            }
            if (node instanceof AST_Binary) {
                if (node.operator != "instanceof") return;
                var sym = node.right;
                if (!(sym instanceof AST_SymbolRef)) return;
                var id = sym.definition().id;
                if (!lambda_ids[id]) return;
                node.left.walk(tw);
                lambda_ids[id]++;
                return true;
            }
            if (node instanceof AST_ForIn) {
                if (node.init instanceof AST_SymbolRef && scope === self) {
                    var id = node.init.definition().id;
                    if (!(id in for_ins)) for_ins[id] = node;
                }
                if (!drop_vars || !compressor.option("loops")) return;
                if (!is_empty(node.body)) return;
                if (node.init.has_side_effects(compressor)) return;
                var sym = get_init_symbol(node);
                if (!sym) return;
                var def = sym.definition();
                if (def.scope.resolve() !== self) {
                    var d = find_variable(sym.name);
                    if (d === def || d && d.redefined() === def) return;
                }
                node.object.walk(tw);
                return true;
            }
            if (node instanceof AST_SymbolRef) {
                var node_def = node.definition();
                if (!(node_def.id in in_use_ids)) {
                    in_use_ids[node_def.id] = true;
                    in_use.push(node_def);
                }
                if (cross_scope(node_def.scope, node.scope)) {
                    var redef = node_def.redefined();
                    if (redef && !(redef.id in in_use_ids)) {
                        in_use_ids[redef.id] = true;
                        in_use.push(redef);
                    }
                }
                if (track_assigns(node_def, node)) add_assigns(node_def, node);
                return true;
            }
            if (node instanceof AST_Scope) {
                var save_scope = scope;
                scope = node;
                descend();
                scope = save_scope;
                return true;
            }
        }

        function is_decl(node) {
            return (node instanceof AST_DefaultValue ? node.name : node) instanceof AST_SymbolDeclaration;
        }

        function trim_decl(node) {
            if (node.definition().id in in_use_ids) return node;
            if (node instanceof AST_SymbolFunarg) node.unused = true;
            return null;
        }

        function trim_default(trimmer, node) {
            node.value = node.value.transform(tt);
            var name = node.name.transform(trimmer);
            if (!name) {
                if (node.name instanceof AST_Destructured) return null;
                var value = node.value.drop_side_effect_free(compressor);
                if (!value) return null;
                log(node.name, "Side effects in default value of unused variable {name}");
                node = node.clone();
                node.name.unused = null;
                node.value = value;
            }
            return node;
        }

        function trim_destructured(node, value, process, drop, root) {
            var unwind = true;
            var trimmer = new TreeTransformer(function(node) {
                if (node instanceof AST_DefaultValue) {
                    if (!(compressor.option("default_values") && value && value.is_defined(compressor))) {
                        var save_drop = drop;
                        drop = false;
                        var trimmed = trim_default(trimmer, node);
                        drop = save_drop;
                        if (!trimmed && drop && value) value = value.drop_side_effect_free(compressor);
                        return trimmed;
                    } else if (node === root) {
                        root = node = node.name;
                    } else {
                        node = node.name;
                    }
                }
                if (node instanceof AST_DestructuredArray) {
                    var save_drop = drop;
                    var save_unwind = unwind;
                    var save_value = value;
                    if (value instanceof AST_SymbolRef) {
                        drop = false;
                        value = value.fixed_value();
                    }
                    var last_side_effects, native, values;
                    if (value instanceof AST_Array) {
                        native = true;
                        values = value.elements;
                        if (save_unwind) for (last_side_effects = values.length; --last_side_effects >= 0;) {
                            if (values[last_side_effects].has_side_effects(compressor)) break;
                        }
                    } else {
                        native = value && value.is_string(compressor);
                        values = false;
                        last_side_effects = node.elements.length;
                    }
                    var elements = [], newValues = drop && [], pos = 0;
                    node.elements.forEach(function(element, index) {
                        if (save_unwind) unwind = index >= last_side_effects;
                        value = values && values[index];
                        if (value instanceof AST_Hole) {
                            value = null;
                        } else if (value instanceof AST_Spread) {
                            if (drop) {
                                newValues.length = pos;
                                fill_holes(save_value, newValues);
                                [].push.apply(newValues, values.slice(index));
                                save_value.elements = newValues;
                            }
                            value = values = false;
                        }
                        element = element.transform(trimmer);
                        if (element) elements[pos] = element;
                        if (drop && value) newValues[pos] = value;
                        if (element || value || !drop || !values) pos++;
                    });
                    value = values && make_node(AST_Array, save_value, {
                        elements: values.slice(node.elements.length),
                    });
                    if (node.rest) {
                        var was_drop = drop;
                        drop = false;
                        node.rest = node.rest.transform(compressor.option("rests") ? trimmer : tt);
                        drop = was_drop;
                        if (node.rest) elements.length = pos;
                    }
                    if (drop) {
                        if (value && !node.rest) value = value.drop_side_effect_free(compressor);
                        if (value instanceof AST_Array) {
                            value = value.elements;
                        } else if (value instanceof AST_Sequence) {
                            value = value.expressions;
                        } else if (value) {
                            value = [ value ];
                        }
                        if (value && value.length) {
                            newValues.length = pos;
                            [].push.apply(newValues, value);
                        }
                    }
                    value = save_value;
                    unwind = save_unwind;
                    drop = save_drop;
                    if (values && newValues) {
                        fill_holes(value, newValues);
                        value = value.clone();
                        value.elements = newValues;
                    }
                    if (!native) {
                        elements.length = node.elements.length;
                    } else if (!node.rest) SHORTHAND: switch (elements.length) {
                      case 0:
                        if (node === root) break;
                        if (drop) value = value.drop_side_effect_free(compressor);
                        return null;
                      default:
                        if (!drop) break;
                        if (!unwind) break;
                        if (node === root) break;
                        var pos = elements.length, sym;
                        while (--pos >= 0) {
                            var element = elements[pos];
                            if (element) {
                                sym = element;
                                break;
                            }
                        }
                        if (pos < 0) break;
                        for (var i = pos; --i >= 0;) {
                            if (elements[i]) break SHORTHAND;
                        }
                        if (sym.has_side_effects(compressor)) break;
                        if (value.has_side_effects(compressor) && sym.match_symbol(function(node) {
                            return node instanceof AST_PropAccess;
                        })) break;
                        value = make_node(AST_Sub, node, {
                            expression: value,
                            property: make_node(AST_Number, node, { value: pos }),
                        });
                        return sym;
                    }
                    fill_holes(node, elements);
                    node.elements = elements;
                    return node;
                }
                if (node instanceof AST_DestructuredObject) {
                    var save_drop = drop;
                    var save_unwind = unwind;
                    var save_value = value;
                    if (value instanceof AST_SymbolRef) {
                        drop = false;
                        value = value.fixed_value();
                    }
                    var last_side_effects, prop_keys, prop_map, values;
                    if (value instanceof AST_Object) {
                        last_side_effects = -1;
                        prop_keys = [];
                        prop_map = new Dictionary();
                        values = value.properties.map(function(prop, index) {
                            if (save_unwind && prop.has_side_effects(compressor)) last_side_effects = index;
                            prop = prop.clone();
                            if (prop instanceof AST_Spread) {
                                prop_map = false;
                            } else {
                                var key = prop.key;
                                if (key instanceof AST_Node) key = key.evaluate(compressor, true);
                                if (key instanceof AST_Node) {
                                    prop_map = false;
                                } else if (prop_map && !(prop instanceof AST_ObjectSetter)) {
                                    prop_map.set(key, prop);
                                }
                                prop_keys[index] = key;
                            }
                            return prop;
                        });
                    } else {
                        last_side_effects = node.properties.length;
                    }
                    if (node.rest) {
                        value = false;
                        node.rest = node.rest.transform(compressor.option("rests") ? trimmer : tt);
                    }
                    var can_drop = new Dictionary();
                    var drop_keys = drop && new Dictionary();
                    var properties = [];
                    node.properties.map(function(prop) {
                        var key = prop.key;
                        if (key instanceof AST_Node) {
                            prop.key = key = key.transform(tt);
                            key = key.evaluate(compressor, true);
                        }
                        if (key instanceof AST_Node) {
                            drop_keys = false;
                        } else {
                            can_drop.set(key, !can_drop.has(key));
                        }
                        return key;
                    }).forEach(function(key, index) {
                        var prop = node.properties[index], trimmed;
                        if (save_unwind) unwind = index >= last_side_effects;
                        if (key instanceof AST_Node) {
                            drop = false;
                            value = false;
                            trimmed = prop.value.transform(trimmer) || retain_lhs(prop.value);
                        } else {
                            drop = drop_keys && can_drop.get(key);
                            var mapped = prop_map && prop_map.get(key);
                            if (mapped) {
                                value = mapped.value;
                                if (value instanceof AST_Accessor) value = false;
                            } else {
                                value = false;
                            }
                            trimmed = prop.value.transform(trimmer);
                            if (!trimmed) {
                                if (node.rest || retain_key(prop)) trimmed = retain_lhs(prop.value);
                                if (drop_keys && !drop_keys.has(key)) {
                                    if (mapped) {
                                        drop_keys.set(key, mapped);
                                        if (value === null) {
                                            prop_map.set(key, retain_key(mapped) && make_node(AST_ObjectKeyVal, mapped, {
                                                key: mapped.key,
                                                value: make_node(AST_Number, mapped, { value: 0 }),
                                            }));
                                        }
                                    } else {
                                        drop_keys.set(key, true);
                                    }
                                }
                            } else if (drop_keys) {
                                drop_keys.set(key, false);
                            }
                            if (value) mapped.value = value;
                        }
                        if (trimmed) {
                            prop.value = trimmed;
                            properties.push(prop);
                        }
                    });
                    value = save_value;
                    unwind = save_unwind;
                    drop = save_drop;
                    if (drop_keys && prop_keys) {
                        value = value.clone();
                        value.properties = List(values, function(prop, index) {
                            if (prop instanceof AST_Spread) return prop;
                            var key = prop_keys[index];
                            if (key instanceof AST_Node) return prop;
                            if (key === "__proto__") return prop;
                            if (drop_keys.has(key)) {
                                var mapped = drop_keys.get(key);
                                if (!mapped) return prop;
                                if (mapped === prop) return prop_map.get(key) || List.skip;
                            } else if (node.rest) {
                                return prop;
                            }
                            var trimmed = prop.value.drop_side_effect_free(compressor);
                            if (trimmed) {
                                prop.value = trimmed;
                                return prop;
                            }
                            return retain_key(prop) ? make_node(AST_ObjectKeyVal, prop, {
                                key: prop.key,
                                value: make_node(AST_Number, prop, { value: 0 }),
                            }) : List.skip;
                        });
                    }
                    if (value && !node.rest) switch (properties.length) {
                      case 0:
                        if (node === root) break;
                        if (value.may_throw_on_access(compressor, true)) break;
                        if (drop) value = value.drop_side_effect_free(compressor);
                        return null;
                      case 1:
                        if (!drop) break;
                        if (!unwind) break;
                        if (node === root) break;
                        var prop = properties[0];
                        if (prop.key instanceof AST_Node) break;
                        if (prop.value.has_side_effects(compressor)) break;
                        if (value.has_side_effects(compressor) && prop.value.match_symbol(function(node) {
                            return node instanceof AST_PropAccess;
                        })) break;
                        value = is_identifier_string(prop.key) ? make_node(AST_Dot, node, {
                            expression: value,
                            property: prop.key,
                        }) : make_node(AST_Sub, node, {
                            expression: value,
                            property: make_node_from_constant(prop.key, prop),
                        });
                        return prop.value;
                    }
                    node.properties = properties;
                    return node;
                }
                if (node instanceof AST_Hole) {
                    node = null;
                } else {
                    node = process(node);
                }
                if (!node && drop && value) value = value.drop_side_effect_free(compressor);
                return node;
            });
            return {
                name: node.transform(trimmer),
                value: value,
            };

            function retain_key(prop) {
                return prop.key instanceof AST_Node && prop.key.has_side_effects(compressor);
            }

            function clear_write_only(node) {
                if (node instanceof AST_Assign) {
                    node.write_only = false;
                    clear_write_only(node.right);
                } else if (node instanceof AST_Binary) {
                    if (!lazy_op[node.operator]) return;
                    clear_write_only(node.left);
                    clear_write_only(node.right);
                } else if (node instanceof AST_Conditional) {
                    clear_write_only(node.consequent);
                    clear_write_only(node.alternative);
                } else if (node instanceof AST_Sequence) {
                    clear_write_only(node.tail_node());
                } else if (node instanceof AST_Unary) {
                    node.write_only = false;
                }
            }

            function retain_lhs(node) {
                if (node instanceof AST_DefaultValue) return retain_lhs(node.name);
                if (node instanceof AST_Destructured) {
                    if (value === null) {
                        value = make_node(AST_Number, node, { value: 0 });
                    } else if (value) {
                        if (value.may_throw_on_access(compressor, true)) {
                            value = make_node(AST_Array, node, {
                                elements: value instanceof AST_Sequence ? value.expressions : [ value ],
                            });
                        } else {
                            clear_write_only(value);
                        }
                    }
                    return make_node(AST_DestructuredObject, node, { properties: [] });
                }
                node.unused = null;
                return node;
            }
        }
    });

    AST_Scope.DEFMETHOD("hoist_declarations", function(compressor) {
        if (compressor.has_directive("use asm")) return;
        var hoist_funs = compressor.option("hoist_funs");
        var hoist_vars = compressor.option("hoist_vars");
        var self = this;
        if (hoist_vars) {
            // let's count var_decl first, we seem to waste a lot of
            // space if we hoist `var` when there's only one.
            var var_decl = 0;
            self.walk(new TreeWalker(function(node) {
                if (var_decl > 1) return true;
                if (node instanceof AST_ExportDeclaration) return true;
                if (node instanceof AST_Scope && node !== self) return true;
                if (node instanceof AST_Var) {
                    var_decl++;
                    return true;
                }
            }));
            if (var_decl <= 1) hoist_vars = false;
        }
        if (!hoist_funs && !hoist_vars) return;
        var consts = new Dictionary();
        var dirs = [];
        var hoisted = [];
        var vars = new Dictionary();
        var tt = new TreeTransformer(function(node, descend, in_list) {
            if (node === self) return;
            if (node instanceof AST_Directive) {
                dirs.push(node);
                return in_list ? List.skip : make_node(AST_EmptyStatement, node);
            }
            if (node instanceof AST_LambdaDefinition) {
                if (!hoist_funs) return node;
                var p = tt.parent();
                if (p instanceof AST_ExportDeclaration) return node;
                if (p instanceof AST_ExportDefault) return node;
                if (p !== self && compressor.has_directive("use strict")) return node;
                hoisted.push(node);
                return in_list ? List.skip : make_node(AST_EmptyStatement, node);
            }
            if (node instanceof AST_Var) {
                if (!hoist_vars) return node;
                var p = tt.parent();
                if (p instanceof AST_ExportDeclaration) return node;
                if (!all(node.definitions, function(defn) {
                    var sym = defn.name;
                    return sym instanceof AST_SymbolVar
                        && !consts.has(sym.name)
                        && self.find_variable(sym.name) === sym.definition();
                })) return node;
                node.definitions.forEach(function(defn) {
                    var name = defn.name.name;
                    if (!vars.has(name)) vars.set(name, defn);
                });
                var seq = node.to_assignments();
                if (p instanceof AST_ForEnumeration && p.init === node) {
                    if (seq) return seq;
                    var sym = node.definitions[0].name;
                    return make_node(AST_SymbolRef, sym);
                }
                if (p instanceof AST_For && p.init === node) return seq;
                if (!seq) return in_list ? List.skip : make_node(AST_EmptyStatement, node);
                return make_node(AST_SimpleStatement, node, { body: seq });
            }
            if (node instanceof AST_Scope) return node;
            if (node instanceof AST_SymbolConst) {
                consts.set(node.name, true);
                return node;
            }
        });
        self.transform(tt);
        if (vars.size() > 0) {
            // collect only vars which don't show up in self's arguments list
            var defns = [];
            if (self instanceof AST_Lambda) self.each_argname(function(argname) {
                if (all(argname.definition().references, function(ref) {
                    return !ref.in_arg;
                })) vars.del(argname.name);
            });
            vars.each(function(defn) {
                var name = defn.name;
                defn = defn.clone();
                defn.name = name.clone();
                defn.value = null;
                defns.push(defn);
                var orig = name.definition().orig;
                orig.splice(orig.indexOf(name), 0, defn.name);
            });
            if (defns.length > 0) hoisted.push(make_node(AST_Var, self, { definitions: defns }));
        }
        self.body = dirs.concat(hoisted, self.body);
    });

    function scan_local_returns(fn, transform) {
        fn.walk(new TreeWalker(function(node) {
            if (node instanceof AST_Return) {
                transform(node);
                return true;
            }
            if (node instanceof AST_Scope && node !== fn) return true;
        }));
    }

    function map_self_returns(fn) {
        var map = Object.create(null);
        scan_local_returns(fn, function(node) {
            var value = node.value;
            if (value) value = value.tail_node();
            if (value instanceof AST_SymbolRef) {
                var id = value.definition().id;
                map[id] = (map[id] || 0) + 1;
            }
        });
        return map;
    }

    function can_trim_returns(def, self_returns, compressor) {
        if (compressor.exposed(def)) return false;
        switch (def.references.length - def.replaced - (self_returns[def.id] || 0)) {
          case def.drop_return:
            return "d";
          case def.bool_return:
            return true;
        }
    }

    function process_boolean_returns(fn, compressor) {
        scan_local_returns(fn, function(node) {
            node.in_bool = true;
            var value = node.value;
            if (value) {
                var ev = fuzzy_eval(compressor, value);
                if (!ev) {
                    value = value.drop_side_effect_free(compressor);
                    node.value = value ? make_sequence(node.value, [
                        value,
                        make_node(AST_Number, node.value, { value: 0 }),
                    ]) : null;
                } else if (!(ev instanceof AST_Node)) {
                    value = value.drop_side_effect_free(compressor);
                    node.value = value ? make_sequence(node.value, [
                        value,
                        make_node(AST_Number, node.value, { value: 1 }),
                    ]) : make_node(AST_Number, node.value, { value: 1 });
                }
            }
        });
    }

    AST_Scope.DEFMETHOD("process_returns", noop);
    AST_Defun.DEFMETHOD("process_returns", function(compressor) {
        if (!compressor.option("booleans")) return;
        if (compressor.parent() instanceof AST_ExportDefault) return;
        switch (can_trim_returns(this.name.definition(), map_self_returns(this), compressor)) {
          case "d":
            drop_returns(compressor, this, true);
            break;
          case true:
            process_boolean_returns(this, compressor);
            break;
        }
    });
    AST_Function.DEFMETHOD("process_returns", function(compressor) {
        if (!compressor.option("booleans")) return;
        var drop = true;
        var self_returns = map_self_returns(this);
        if (this.name && !can_trim(this.name.definition())) return;
        var parent = compressor.parent();
        if (parent instanceof AST_Assign) {
            if (parent.operator != "=") return;
            var sym = parent.left;
            if (!(sym instanceof AST_SymbolRef)) return;
            if (!can_trim(sym.definition())) return;
        } else if (parent instanceof AST_Call && parent.expression !== this) {
            var exp = parent.expression;
            if (exp instanceof AST_SymbolRef) exp = exp.fixed_value();
            if (!(exp instanceof AST_Lambda)) return;
            if (exp.uses_arguments || exp.pinned()) return;
            var args = parent.args, sym;
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg === this) {
                    sym = exp.argnames[i];
                    if (!sym && exp.rest) return;
                    break;
                }
                if (arg instanceof AST_Spread) return;
            }
            if (sym instanceof AST_DefaultValue) sym = sym.name;
            if (sym instanceof AST_SymbolFunarg && !can_trim(sym.definition())) return;
        } else if (parent.TYPE == "Call") {
            compressor.pop();
            var in_bool = compressor.in_boolean_context();
            compressor.push(this);
            switch (in_bool) {
              case true:
                drop = false;
              case "d":
                break;
              default:
                return;
            }
        } else return;
        if (drop) {
            drop_returns(compressor, this, true);
        } else {
            process_boolean_returns(this, compressor);
        }

        function can_trim(def) {
            switch (can_trim_returns(def, self_returns, compressor)) {
              case true:
                drop = false;
              case "d":
                return true;
            }
        }
    });

    AST_BlockScope.DEFMETHOD("var_names", function() {
        var var_names = this._var_names;
        if (!var_names) {
            this._var_names = var_names = new Dictionary();
            this.enclosed.forEach(function(def) {
                var_names.set(def.name, true);
            });
            this.variables.each(function(def, name) {
                var_names.set(name, true);
            });
        }
        return var_names;
    });

    AST_Scope.DEFMETHOD("make_var", function(type, orig, prefix) {
        var scopes = [ this ];
        if (orig instanceof AST_SymbolDeclaration) orig.definition().references.forEach(function(ref) {
            var s = ref.scope;
            do {
                if (!push_uniq(scopes, s)) return;
                s = s.parent_scope;
            } while (s && s !== this);
        });
        prefix = prefix.replace(/^[^a-z_$]|[^a-z0-9_$]/gi, "_");
        var name = prefix;
        for (var i = 0; !all(scopes, function(scope) {
            return !scope.var_names().has(name);
        }); i++) name = prefix + "$" + i;
        var sym = make_node(type, orig, {
            name: name,
            scope: this,
        });
        var def = this.def_variable(sym);
        scopes.forEach(function(scope) {
            scope.enclosed.push(def);
            scope.var_names().set(name, true);
        });
        return sym;
    });

    AST_Scope.DEFMETHOD("hoist_properties", function(compressor) {
        if (!compressor.option("hoist_props") || compressor.has_directive("use asm")) return;
        var self = this;
        if (is_arrow(self) && self.value) return;
        var top_retain = self instanceof AST_Toplevel && compressor.top_retain || return_false;
        var defs_by_id = Object.create(null);
        var tt = new TreeTransformer(function(node, descend) {
            if (node instanceof AST_Assign) {
                if (node.operator != "=") return;
                if (!node.write_only) return;
                if (!can_hoist(node.left, node.right, 1)) return;
                descend(node, tt);
                var defs = new Dictionary();
                var assignments = [];
                var decls = [];
                node.right.properties.forEach(function(prop) {
                    var decl = make_sym(AST_SymbolVar, node.left, prop.key);
                    decls.push(make_node(AST_VarDef, node, {
                        name: decl,
                        value: null,
                    }));
                    var sym = make_node(AST_SymbolRef, node, {
                        name: decl.name,
                        scope: self,
                        thedef: decl.definition(),
                    });
                    sym.reference();
                    assignments.push(make_node(AST_Assign, node, {
                        operator: "=",
                        left: sym,
                        right: prop.value,
                    }));
                });
                defs.value = node.right;
                defs_by_id[node.left.definition().id] = defs;
                self.body.splice(self.body.indexOf(tt.stack[1]) + 1, 0, make_node(AST_Var, node, {
                    definitions: decls,
                }));
                return make_sequence(node, assignments);
            }
            if (node instanceof AST_Scope) {
                if (node === self) return;
                var parent = tt.parent();
                if (parent.TYPE == "Call" && parent.expression === node) return;
                return node;
            }
            if (node instanceof AST_VarDef) {
                if (!can_hoist(node.name, node.value, 0)) return;
                descend(node, tt);
                var defs = new Dictionary();
                var var_defs = [];
                var decl = node.clone();
                decl.value = node.name instanceof AST_SymbolConst ? make_node(AST_Number, node, { value: 0 }) : null;
                var_defs.push(decl);
                node.value.properties.forEach(function(prop) {
                    var_defs.push(make_node(AST_VarDef, node, {
                        name: make_sym(node.name.CTOR, node.name, prop.key),
                        value: prop.value,
                    }));
                });
                defs.value = node.value;
                defs_by_id[node.name.definition().id] = defs;
                return List.splice(var_defs);
            }

            function make_sym(type, sym, key) {
                var new_var = self.make_var(type, sym, sym.name + "_" + key);
                defs.set(key, new_var.definition());
                return new_var;
            }
        });
        self.transform(tt);
        self.transform(new TreeTransformer(function(node, descend) {
            if (node instanceof AST_PropAccess) {
                if (!(node.expression instanceof AST_SymbolRef)) return;
                var defs = defs_by_id[node.expression.definition().id];
                if (!defs) return;
                if (node.expression.fixed_value() !== defs.value) return;
                var def = defs.get(node.get_property());
                var sym = make_node(AST_SymbolRef, node, {
                    name: def.name,
                    scope: node.expression.scope,
                    thedef: def,
                });
                sym.reference();
                return sym;
            }
            if (node instanceof AST_SymbolRef) {
                var defs = defs_by_id[node.definition().id];
                if (!defs) return;
                if (node.fixed_value() !== defs.value) return;
                return make_node(AST_Object, node, { properties: [] });
            }
        }));

        function can_hoist(sym, right, count) {
            if (!(sym instanceof AST_Symbol)) return;
            var def = sym.definition();
            if (def.assignments != count) return;
            if (def.references.length - def.replaced == count) return;
            if (def.single_use) return;
            if (self.find_variable(sym.name) !== def) return;
            if (top_retain(def)) return;
            if (sym.fixed_value() !== right) return;
            var fixed = sym.fixed || def.fixed;
            if (fixed.direct_access) return;
            if (fixed.escaped && fixed.escaped.depth == 1) return;
            return right instanceof AST_Object
                && right.properties.length > 0
                && can_drop_symbol(sym, compressor)
                && all(right.properties, function(prop) {
                    return can_hoist_property(prop) && prop.key !== "__proto__";
                });
        }
    });

    function fn_name_unused(fn, compressor) {
        if (!fn.name || !compressor.option("ie")) return true;
        var def = fn.name.definition();
        if (compressor.exposed(def)) return false;
        return all(def.references, function(sym) {
            return !(sym instanceof AST_SymbolRef);
        });
    }

    function drop_returns(compressor, exp, ignore_name) {
        if (!(exp instanceof AST_Lambda)) return;
        var arrow = is_arrow(exp);
        var async = is_async(exp);
        var changed = false;
        var drop_body = false;
        if (arrow && compressor.option("arrows")) {
            if (!exp.value) {
                drop_body = true;
            } else if (!async || needs_enqueuing(compressor, exp.value)) {
                var dropped = exp.value.drop_side_effect_free(compressor);
                if (dropped !== exp.value) {
                    changed = true;
                    exp.value = dropped;
                }
            }
        } else if (!is_generator(exp)) {
            if (!ignore_name && exp.name) {
                var def = exp.name.definition();
                drop_body = def.references.length == def.replaced;
            } else {
                drop_body = true;
            }
        }
        if (drop_body) {
            exp.process_expression(false, function(node) {
                var value = node.value;
                if (value) {
                    if (async && !needs_enqueuing(compressor, value)) return node;
                    value = value.drop_side_effect_free(compressor, true);
                }
                changed = true;
                if (!value) return make_node(AST_EmptyStatement, node);
                return make_node(AST_SimpleStatement, node, { body: value });
            });
            scan_local_returns(exp, function(node) {
                var value = node.value;
                if (value) {
                    if (async && !needs_enqueuing(compressor, value)) return;
                    var dropped = value.drop_side_effect_free(compressor);
                    if (dropped !== value) {
                        changed = true;
                        if (dropped && async && !needs_enqueuing(compressor, dropped)) {
                            dropped = dropped.negate(compressor);
                        }
                        node.value = dropped;
                    }
                }
            });
        }
        if (async && compressor.option("awaits")) {
            if (drop_body) exp.process_expression("awaits", function(node) {
                var body = node.body;
                if (body instanceof AST_Await) {
                    if (needs_enqueuing(compressor, body.expression)) {
                        changed = true;
                        body = body.expression.drop_side_effect_free(compressor, true);
                        if (!body) return make_node(AST_EmptyStatement, node);
                        node.body = body;
                    }
                } else if (body instanceof AST_Sequence) {
                    var exprs = body.expressions;
                    for (var i = exprs.length; --i >= 0;) {
                        var tail = exprs[i];
                        if (!(tail instanceof AST_Await)) break;
                        var value = tail.expression;
                        if (!needs_enqueuing(compressor, value)) break;
                        changed = true;
                        if (exprs[i] = value.drop_side_effect_free(compressor)) break;
                    }
                    switch (i) {
                      case -1:
                        return make_node(AST_EmptyStatement, node);
                      case 0:
                        node.body = exprs[0];
                        break;
                      default:
                        exprs.length = i + 1;
                        break;
                    }
                }
                return node;
            });
            var abort = !drop_body && exp.name || arrow && exp.value && !needs_enqueuing(compressor, exp.value);
            var tw = new TreeWalker(function(node) {
                if (abort) return true;
                if (tw.parent() === exp && node.may_throw(compressor)) return abort = true;
                if (node instanceof AST_Await) return abort = true;
                if (node instanceof AST_ForAwaitOf) return abort = true;
                if (node instanceof AST_Return) {
                    if (node.value && !needs_enqueuing(compressor, node.value)) return abort = true;
                    return;
                }
                if (node instanceof AST_Scope && node !== exp) return true;
            });
            exp.walk(tw);
            if (!abort) {
                var ctor;
                switch (exp.CTOR) {
                  case AST_AsyncArrow:
                    ctor = AST_Arrow;
                    break;
                  case AST_AsyncFunction:
                    ctor = AST_Function;
                    break;
                  case AST_AsyncGeneratorFunction:
                    ctor = AST_GeneratorFunction;
                    break;
                }
                return make_node(ctor, exp);
            }
        }
        return changed && exp.clone();
    }

    // drop_side_effect_free()
    // remove side-effect-free parts which only affects return value
    (function(def) {
        // Drop side-effect-free elements from an array of expressions.
        // Returns an array of expressions with side-effects or null
        // if all elements were dropped. Note: original array may be
        // returned if nothing changed.
        function trim(nodes, compressor, first_in_statement, spread) {
            var len = nodes.length;
            var ret = [], changed = false;
            for (var i = 0; i < len; i++) {
                var node = nodes[i];
                var trimmed;
                if (spread && node instanceof AST_Spread) {
                    trimmed = spread(node, compressor, first_in_statement);
                } else {
                    trimmed = node.drop_side_effect_free(compressor, first_in_statement);
                }
                if (trimmed !== node) changed = true;
                if (trimmed) {
                    ret.push(trimmed);
                    first_in_statement = false;
                }
            }
            return ret.length ? changed ? ret : nodes : null;
        }
        function array_spread(node, compressor, first_in_statement) {
            var exp = node.expression;
            if (!exp.is_string(compressor)) return node;
            return exp.drop_side_effect_free(compressor, first_in_statement);
        }
        function convert_spread(node) {
            return node instanceof AST_Spread ? make_node(AST_Array, node, { elements: [ node ] }) : node;
        }
        def(AST_Node, return_this);
        def(AST_Accessor, return_null);
        def(AST_Array, function(compressor, first_in_statement) {
            var values = trim(this.elements, compressor, first_in_statement, array_spread);
            if (!values) return null;
            if (values === this.elements && all(values, function(node) {
                return node instanceof AST_Spread;
            })) return this;
            return make_sequence(this, values.map(convert_spread));
        });
        def(AST_Assign, function(compressor) {
            var left = this.left;
            if (left instanceof AST_PropAccess) {
                var expr = left.expression;
                if (expr.may_throw_on_access(compressor, true)) return this;
                if (compressor.has_directive("use strict") && expr.is_constant()) return this;
            }
            if (left.has_side_effects(compressor)) return this;
            if (lazy_op[this.operator.slice(0, -1)]) return this;
            this.write_only = true;
            if (!root_expr(left).is_constant_expression(compressor.find_parent(AST_Scope))) return this;
            return this.right.drop_side_effect_free(compressor);
        });
        def(AST_Await, function(compressor) {
            if (!compressor.option("awaits")) return this;
            var exp = this.expression;
            if (!needs_enqueuing(compressor, exp)) return this;
            if (exp instanceof AST_UnaryPrefix && exp.operator == "!") exp = exp.expression;
            var dropped = exp.drop_side_effect_free(compressor);
            if (dropped === exp) return this;
            if (!dropped) {
                dropped = make_node(AST_Number, exp, { value: 0 });
            } else if (!needs_enqueuing(compressor, dropped)) {
                dropped = dropped.negate(compressor);
            }
            var node = this.clone();
            node.expression = dropped;
            return node;
        });
        def(AST_Binary, function(compressor, first_in_statement) {
            var left = this.left;
            var right = this.right;
            var op = this.operator;
            if (!can_drop_op(this, compressor)) {
                var lhs = left.drop_side_effect_free(compressor, first_in_statement);
                if (lhs === left) return this;
                var node = this.clone();
                if (lhs) {
                    node.left = lhs;
                } else if (op == "instanceof" && !left.is_constant()) {
                    node.left = make_node(AST_Array, left, { elements: [] });
                } else {
                    node.left = make_node(AST_Number, left, { value: 0 });
                }
                return node;
            }
            var rhs = right.drop_side_effect_free(compressor, first_in_statement);
            if (!rhs) return left.drop_side_effect_free(compressor, first_in_statement);
            if (lazy_op[op] && rhs.has_side_effects(compressor)) {
                var node = this;
                if (rhs !== right) {
                    node = node.clone();
                    node.right = rhs.drop_side_effect_free(compressor);
                }
                if (op == "??") return node;
                var negated = node.clone();
                negated.operator = op == "&&" ? "||" : "&&";
                negated.left = left.negate(compressor, first_in_statement);
                var negated_rhs = negated.right.tail_node();
                if (negated_rhs instanceof AST_Binary && negated.operator == negated_rhs.operator) swap_chain(negated);
                var best = first_in_statement ? best_of_statement : best_of_expression;
                return op == "&&" ? best(node, negated) : best(negated, node);
            }
            var lhs = left.drop_side_effect_free(compressor, first_in_statement);
            if (!lhs) return rhs;
            rhs = rhs.drop_side_effect_free(compressor);
            if (!rhs) return lhs;
            return make_sequence(this, [ lhs, rhs ]);
        });
        function assign_this_only(fn, compressor) {
            fn.new = true;
            var result = all(fn.body, function(stat) {
                return !stat.has_side_effects(compressor);
            }) && all(fn.argnames, function(argname) {
                return !argname.match_symbol(return_false);
            }) && !(fn.rest && fn.rest.match_symbol(return_false));
            fn.new = false;
            return result;
        }
        def(AST_Call, function(compressor, first_in_statement) {
            var self = this;
            if (self.is_expr_pure(compressor)) {
                if (self.pure) AST_Node.warn("Dropping __PURE__ call [{start}]", self);
                var args = trim(self.args, compressor, first_in_statement, array_spread);
                return args && make_sequence(self, args.map(convert_spread));
            }
            var exp = self.expression;
            if (self.is_call_pure(compressor)) {
                var exprs = self.args.slice();
                exprs.unshift(exp.expression);
                exprs = trim(exprs, compressor, first_in_statement, array_spread);
                return exprs && make_sequence(self, exprs.map(convert_spread));
            }
            if (compressor.option("yields") && is_generator(exp) && fn_name_unused(exp, compressor)) {
                var call = self.clone();
                call.expression = make_node(AST_Function, exp);
                call.expression.body = [];
                return call;
            }
            var dropped = drop_returns(compressor, exp);
            if (dropped) {
                // always shallow clone to ensure stripping of negated IIFEs
                self = self.clone();
                self.expression = dropped;
                // avoid extraneous traversal
                if (exp._squeezed) self.expression._squeezed = true;
            }
            if (self instanceof AST_New) {
                var fn = exp;
                if (fn instanceof AST_SymbolRef) fn = fn.fixed_value();
                if (fn instanceof AST_Lambda) {
                    if (assign_this_only(fn, compressor)) {
                        var exprs = self.args.slice();
                        exprs.unshift(exp);
                        exprs = trim(exprs, compressor, first_in_statement, array_spread);
                        return exprs && make_sequence(self, exprs.map(convert_spread));
                    }
                    if (!fn.contains_this()) {
                        self = make_node(AST_Call, self);
                        self.expression = self.expression.clone();
                        self.args = self.args.slice();
                    }
                }
            }
            self.call_only = true;
            return self;
        });
        def(AST_ClassExpression, function(compressor, first_in_statement) {
            var self = this;
            var exprs = [], values = [], init = 0;
            var props = self.properties;
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                if (prop.key instanceof AST_Node) exprs.push(prop.key);
                if (!is_static_field_or_init(prop)) continue;
                var value = prop.value;
                if (!value.has_side_effects(compressor)) continue;
                if (value.contains_this()) return self;
                if (prop instanceof AST_ClassInit) {
                    init++;
                    values.push(prop);
                } else {
                    values.push(value);
                }
            }
            var base = self.extends;
            if (base) {
                if (base instanceof AST_SymbolRef) base = base.fixed_value();
                base = !safe_for_extends(base);
                if (!base) exprs.unshift(self.extends);
            }
            exprs = trim(exprs, compressor, first_in_statement);
            if (exprs) first_in_statement = false;
            values = trim(values, compressor, first_in_statement);
            if (!exprs) {
                if (!base && !values && !self.name) return null;
                exprs = [];
            }
            if (base || self.name || !compressor.has_directive("use strict")) {
                var node = to_class_expr(self);
                if (!base) node.extends = null;
                node.properties = [];
                if (values) {
                    if (values.length == init) {
                        if (exprs.length) values.unshift(make_node(AST_ClassField, self, {
                            key: make_sequence(self, exprs),
                            value: null,
                        }));
                        node.properties = values;
                    } else node.properties.push(make_node(AST_ClassField, self, {
                        static: true,
                        key: exprs.length ? make_sequence(self, exprs) : "c",
                        value: make_value(),
                    }));
                } else if (exprs.length) node.properties.push(make_node(AST_ClassMethod, self, {
                    key: make_sequence(self, exprs),
                    value: make_node(AST_Function, self, {
                        argnames: [],
                        body: [],
                    }).init_vars(node),
                }));
                return node;
            }
            if (values) exprs.push(make_node(AST_Call, self, {
                expression: make_node(AST_Arrow, self, {
                    argnames: [],
                    body: [],
                    value: make_value(),
                }).init_vars(self.parent_scope, self),
                args: [],
            }));
            return make_sequence(self, exprs);

            function make_value() {
                return make_sequence(self, values.map(function(node) {
                    if (!(node instanceof AST_ClassInit)) return node;
                    var fn = make_node(AST_Arrow, node.value);
                    fn.argnames = [];
                    return make_node(AST_Call, node, {
                        expression: fn,
                        args: [],
                    });
                }));
            }
        });
        def(AST_Conditional, function(compressor) {
            var consequent = this.consequent.drop_side_effect_free(compressor);
            var alternative = this.alternative.drop_side_effect_free(compressor);
            if (consequent === this.consequent && alternative === this.alternative) return this;
            var exprs;
            if (compressor.option("ie")) {
                exprs = [];
                if (consequent instanceof AST_Function) {
                    exprs.push(consequent);
                    consequent = null;
                }
                if (alternative instanceof AST_Function) {
                    exprs.push(alternative);
                    alternative = null;
                }
            }
            var node;
            if (!consequent) {
                node = alternative ? make_node(AST_Binary, this, {
                    operator: "||",
                    left: this.condition,
                    right: alternative,
                }) : this.condition.drop_side_effect_free(compressor);
            } else if (!alternative) {
                node = make_node(AST_Binary, this, {
                    operator: "&&",
                    left: this.condition,
                    right: consequent,
                });
            } else {
                node = this.clone();
                node.consequent = consequent;
                node.alternative = alternative;
            }
            if (!exprs) return node;
            if (node) exprs.push(node);
            return exprs.length == 0 ? null : make_sequence(this, exprs);
        });
        def(AST_Constant, return_null);
        def(AST_Dot, function(compressor, first_in_statement) {
            var expr = this.expression;
            if (expr.may_throw_on_access(compressor)) return this;
            return expr.drop_side_effect_free(compressor, first_in_statement);
        });
        def(AST_Function, function(compressor) {
            return fn_name_unused(this, compressor) ? null : this;
        });
        def(AST_LambdaExpression, return_null);
        def(AST_Object, function(compressor, first_in_statement) {
            var exprs = [];
            this.properties.forEach(function(prop) {
                if (prop instanceof AST_Spread) {
                    exprs.push(prop);
                } else {
                    if (prop.key instanceof AST_Node) exprs.push(prop.key);
                    exprs.push(prop.value);
                }
            });
            var values = trim(exprs, compressor, first_in_statement, function(node, compressor, first_in_statement) {
                var exp = node.expression;
                return exp.safe_to_spread() ? exp.drop_side_effect_free(compressor, first_in_statement) : node;
            });
            if (!values) return null;
            if (values === exprs && !all(values, function(node) {
                return !(node instanceof AST_Spread);
            })) return this;
            return make_sequence(this, values.map(function(node) {
                return node instanceof AST_Spread ? make_node(AST_Object, node, { properties: [ node ] }) : node;
            }));
        });
        def(AST_ObjectIdentity, return_null);
        def(AST_Sequence, function(compressor, first_in_statement) {
            var expressions = trim(this.expressions, compressor, first_in_statement);
            if (!expressions) return null;
            var end = expressions.length - 1;
            var last = expressions[end];
            if (compressor.option("awaits") && end > 0 && last instanceof AST_Await && last.expression.is_constant()) {
                expressions = expressions.slice(0, -1);
                end--;
                var expr = expressions[end];
                last.expression = needs_enqueuing(compressor, expr) ? expr : expr.negate(compressor);
                expressions[end] = last;
            }
            var assign, cond, lhs;
            if (compressor.option("conditionals")
                && end > 0
                && (assign = expressions[end - 1]) instanceof AST_Assign
                && assign.operator == "="
                && (lhs = assign.left) instanceof AST_SymbolRef
                && (cond = to_conditional_assignment(compressor, lhs.definition(), assign.right, last))) {
                assign = assign.clone();
                assign.right = cond;
                expressions = expressions.slice(0, -2);
                expressions.push(assign.drop_side_effect_free(compressor, first_in_statement));
            }
            return expressions === this.expressions ? this : make_sequence(this, expressions);
        });
        def(AST_Sub, function(compressor, first_in_statement) {
            var self = this;
            var expr = self.expression;
            if (expr.may_throw_on_access(compressor)) return self;
            var prop = self.property;
            if (self.optional) {
                prop = prop.drop_side_effect_free(compressor);
                if (!prop) return expr.drop_side_effect_free(compressor, first_in_statement);
                self = self.clone();
                self.property = prop;
                return self;
            }
            expr = expr.drop_side_effect_free(compressor, first_in_statement);
            if (!expr) return prop.drop_side_effect_free(compressor, first_in_statement);
            prop = prop.drop_side_effect_free(compressor);
            if (!prop) return expr;
            return make_sequence(self, [ expr, prop ]);
        });
        def(AST_SymbolRef, function(compressor) {
            return this.is_declared(compressor) && can_drop_symbol(this, compressor) ? null : this;
        });
        def(AST_Template, function(compressor, first_in_statement) {
            var self = this;
            if (self.is_expr_pure(compressor)) {
                var expressions = self.expressions;
                if (expressions.length == 0) return null;
                return make_sequence(self, expressions).drop_side_effect_free(compressor, first_in_statement);
            }
            var tag = self.tag;
            var dropped = drop_returns(compressor, tag);
            if (dropped) {
                // always shallow clone to signal internal changes
                self = self.clone();
                self.tag = dropped;
                // avoid extraneous traversal
                if (tag._squeezed) self.tag._squeezed = true;
            }
            return self;
        });
        def(AST_Unary, function(compressor, first_in_statement) {
            var exp = this.expression;
            if (unary_side_effects[this.operator]) {
                this.write_only = !exp.has_side_effects(compressor);
                return this;
            }
            if (this.operator == "typeof" && exp instanceof AST_SymbolRef && can_drop_symbol(exp, compressor)) {
                return null;
            }
            var node = exp.drop_side_effect_free(compressor, first_in_statement);
            if (first_in_statement && node && is_iife_call(node)) {
                if (node === exp && this.operator == "!") return this;
                return node.negate(compressor, first_in_statement);
            }
            return node;
        });
    })(function(node, func) {
        node.DEFMETHOD("drop_side_effect_free", func);
    });

    OPT(AST_SimpleStatement, function(self, compressor) {
        if (compressor.option("side_effects")) {
            var body = self.body;
            var node = body.drop_side_effect_free(compressor, true);
            if (!node) {
                AST_Node.warn("Dropping side-effect-free statement [{start}]", self);
                return make_node(AST_EmptyStatement, self);
            }
            if (node !== body) {
                return make_node(AST_SimpleStatement, self, { body: node });
            }
        }
        return self;
    });

    OPT(AST_While, function(self, compressor) {
        return compressor.option("loops") ? make_node(AST_For, self).optimize(compressor) : self;
    });

    function has_loop_control(loop, parent, type) {
        if (!type) type = AST_LoopControl;
        var found = false;
        var tw = new TreeWalker(function(node) {
            if (found || node instanceof AST_Scope) return true;
            if (node instanceof type && tw.loopcontrol_target(node) === loop) {
                return found = true;
            }
        });
        if (parent instanceof AST_LabeledStatement) tw.push(parent);
        tw.push(loop);
        loop.body.walk(tw);
        return found;
    }

    OPT(AST_Do, function(self, compressor) {
        if (!compressor.option("loops")) return self;
        var cond = fuzzy_eval(compressor, self.condition);
        if (!(cond instanceof AST_Node)) {
            if (cond && !has_loop_control(self, compressor.parent(), AST_Continue)) return make_node(AST_For, self, {
                body: make_node(AST_BlockStatement, self.body, {
                    body: [
                        self.body,
                        make_node(AST_SimpleStatement, self.condition, { body: self.condition }),
                    ],
                }),
            }).optimize(compressor);
            if (!has_loop_control(self, compressor.parent())) return make_node(AST_BlockStatement, self.body, {
                body: [
                    self.body,
                    make_node(AST_SimpleStatement, self.condition, { body: self.condition }),
                ],
            }).optimize(compressor);
        }
        if (self.body instanceof AST_BlockStatement && !has_loop_control(self, compressor.parent(), AST_Continue)) {
            var body = self.body.body;
            for (var i = body.length; --i >= 0;) {
                var stat = body[i];
                if (stat instanceof AST_If
                    && !stat.alternative
                    && stat.body instanceof AST_Break
                    && compressor.loopcontrol_target(stat.body) === self) {
                    if (has_block_scope_refs(stat.condition)) break;
                    self.condition = make_node(AST_Binary, self, {
                        operator: "&&",
                        left: stat.condition.negate(compressor),
                        right: self.condition,
                    });
                    body.splice(i, 1);
                } else if (stat instanceof AST_SimpleStatement) {
                    if (has_block_scope_refs(stat.body)) break;
                    self.condition = make_sequence(self, [
                        stat.body,
                        self.condition,
                    ]);
                    body.splice(i, 1);
                } else if (!is_declaration(stat, true)) {
                    break;
                }
            }
            self.body = trim_block(self.body, compressor.parent());
        }
        if (self.body instanceof AST_EmptyStatement) return make_node(AST_For, self).optimize(compressor);
        if (self.body instanceof AST_SimpleStatement) return make_node(AST_For, self, {
            condition: make_sequence(self.condition, [
                self.body.body,
                self.condition,
            ]),
            body: make_node(AST_EmptyStatement, self),
        }).optimize(compressor);
        return self;

        function has_block_scope_refs(node) {
            var found = false;
            node.walk(new TreeWalker(function(node) {
                if (found) return true;
                if (node instanceof AST_SymbolRef) {
                    if (!member(node.definition(), self.enclosed)) found = true;
                    return true;
                }
            }));
            return found;
        }
    });

    function if_break_in_loop(self, compressor) {
        var first = first_statement(self.body);
        if (compressor.option("dead_code")
            && (first instanceof AST_Break
                || first instanceof AST_Continue && external_target(first)
                || first instanceof AST_Exit)) {
            var body = [];
            if (is_statement(self.init)) {
                body.push(self.init);
            } else if (self.init) {
                body.push(make_node(AST_SimpleStatement, self.init, { body: self.init }));
            }
            var retain = external_target(first) || first instanceof AST_Exit;
            if (self.condition && retain) {
                body.push(make_node(AST_If, self, {
                    condition: self.condition,
                    body: first,
                    alternative: null,
                }));
            } else if (self.condition) {
                body.push(make_node(AST_SimpleStatement, self.condition, { body: self.condition }));
            } else if (retain) {
                body.push(first);
            }
            extract_declarations_from_unreachable_code(compressor, self.body, body);
            return make_node(AST_BlockStatement, self, { body: body });
        }
        if (first instanceof AST_If) {
            var ab = first_statement(first.body);
            if (ab instanceof AST_Break && !external_target(ab)) {
                if (self.condition) {
                    self.condition = make_node(AST_Binary, self.condition, {
                        left: self.condition,
                        operator: "&&",
                        right: first.condition.negate(compressor),
                    });
                } else {
                    self.condition = first.condition.negate(compressor);
                }
                var body = as_statement_array(first.alternative);
                extract_declarations_from_unreachable_code(compressor, first.body, body);
                return drop_it(body);
            }
            ab = first_statement(first.alternative);
            if (ab instanceof AST_Break && !external_target(ab)) {
                if (self.condition) {
                    self.condition = make_node(AST_Binary, self.condition, {
                        left: self.condition,
                        operator: "&&",
                        right: first.condition,
                    });
                } else {
                    self.condition = first.condition;
                }
                var body = as_statement_array(first.body);
                extract_declarations_from_unreachable_code(compressor, first.alternative, body);
                return drop_it(body);
            }
        }
        return self;

        function first_statement(body) {
            return body instanceof AST_BlockStatement ? body.body[0] : body;
        }

        function external_target(node) {
            return compressor.loopcontrol_target(node) !== compressor.self();
        }

        function drop_it(rest) {
            if (self.body instanceof AST_BlockStatement) {
                self.body = self.body.clone();
                self.body.body = rest.concat(self.body.body.slice(1));
                self.body = self.body.transform(compressor);
            } else {
                self.body = make_node(AST_BlockStatement, self.body, { body: rest }).transform(compressor);
            }
            return if_break_in_loop(self, compressor);
        }
    }

    OPT(AST_For, function(self, compressor) {
        if (!compressor.option("loops")) return self;
        if (compressor.option("side_effects")) {
            if (self.init) self.init = self.init.drop_side_effect_free(compressor);
            if (self.step) self.step = self.step.drop_side_effect_free(compressor);
        }
        if (self.condition) {
            var cond = fuzzy_eval(compressor, self.condition);
            if (!cond) {
                if (compressor.option("dead_code")) {
                    var body = [];
                    if (is_statement(self.init)) {
                        body.push(self.init);
                    } else if (self.init) {
                        body.push(make_node(AST_SimpleStatement, self.init, { body: self.init }));
                    }
                    body.push(make_node(AST_SimpleStatement, self.condition, { body: self.condition }));
                    extract_declarations_from_unreachable_code(compressor, self.body, body);
                    return make_node(AST_BlockStatement, self, { body: body }).optimize(compressor);
                }
            } else if (!(cond instanceof AST_Node)) {
                self.body = make_node(AST_BlockStatement, self.body, {
                    body: [
                        make_node(AST_SimpleStatement, self.condition, { body: self.condition }),
                        self.body,
                    ],
                });
                self.condition = null;
            }
        }
        return if_break_in_loop(self, compressor);
    });

    OPT(AST_ForEnumeration, function(self, compressor) {
        if (compressor.option("varify") && is_lexical_definition(self.init)) {
            var name = self.init.definitions[0].name;
            if ((compressor.option("module") || name instanceof AST_Destructured || name instanceof AST_SymbolLet)
                && !name.match_symbol(function(node) {
                    if (node instanceof AST_SymbolDeclaration) {
                        var def = node.definition();
                        return !same_scope(def) || may_overlap(compressor, def);
                    }
                }, true)) {
                self.init = to_var(self.init, self.resolve());
            } else if (self.init.can_letify(compressor, true)) {
                self.init = to_let(self.init, self);
            }
        }
        return self;
    });

    function mark_locally_defined(condition, consequent, alternative) {
        if (condition instanceof AST_Sequence) condition = condition.tail_node();
        if (!(condition instanceof AST_Binary)) return;
        if (!(condition.left instanceof AST_String)) {
            switch (condition.operator) {
              case "&&":
                mark_locally_defined(condition.left, consequent);
                mark_locally_defined(condition.right, consequent);
                break;
              case "||":
                mark_locally_defined(negate(condition.left), alternative);
                mark_locally_defined(negate(condition.right), alternative);
                break;
            }
            return;
        }
        if (!(condition.right instanceof AST_UnaryPrefix)) return;
        if (condition.right.operator != "typeof") return;
        var sym = condition.right.expression;
        if (!is_undeclared_ref(sym)) return;
        var body;
        var undef = condition.left.value == "undefined";
        switch (condition.operator) {
          case "==":
            body = undef ? alternative : consequent;
            break;
          case "!=":
            body = undef ? consequent : alternative;
            break;
          default:
            return;
        }
        if (!body) return;
        var abort = false;
        var def = sym.definition();
        var fn;
        var refs = [];
        var scanned = [];
        var tw = new TreeWalker(function(node, descend) {
            if (abort) return true;
            if (node instanceof AST_Assign) {
                var ref = node.left;
                if (!(ref instanceof AST_SymbolRef && ref.definition() === def)) return;
                node.right.walk(tw);
                switch (node.operator) {
                  case "=":
                  case "&&=":
                    abort = true;
                }
                return true;
            }
            if (node instanceof AST_Call) {
                descend();
                fn = node.expression.tail_node();
                var save;
                if (fn instanceof AST_SymbolRef) {
                    fn = fn.fixed_value();
                    save = refs.length;
                }
                if (!(fn instanceof AST_Lambda)) {
                    abort = true;
                } else if (push_uniq(scanned, fn)) {
                    fn.walk(tw);
                }
                if (save >= 0) refs.length = save;
                return true;
            }
            if (node instanceof AST_DWLoop) {
                var save = refs.length;
                descend();
                if (abort) refs.length = save;
                return true;
            }
            if (node instanceof AST_For) {
                if (node.init) node.init.walk(tw);
                var save = refs.length;
                if (node.condition) node.condition.walk(tw);
                node.body.walk(tw);
                if (node.step) node.step.walk(tw);
                if (abort) refs.length = save;
                return true;
            }
            if (node instanceof AST_ForEnumeration) {
                node.object.walk(tw);
                var save = refs.length;
                node.init.walk(tw);
                node.body.walk(tw);
                if (abort) refs.length = save;
                return true;
            }
            if (node instanceof AST_Scope) {
                if (node === fn) return;
                return true;
            }
            if (node instanceof AST_SymbolRef) {
                if (node.definition() === def) refs.push(node);
                return true;
            }
        });
        body.walk(tw);
        refs.forEach(function(ref) {
            ref.defined = true;
        });

        function negate(node) {
            if (!(node instanceof AST_Binary)) return;
            switch (node.operator) {
              case "==":
                node = node.clone();
                node.operator = "!=";
                return node;
              case "!=":
                node = node.clone();
                node.operator = "==";
                return node;
            }
        }
    }

    function fuzzy_eval(compressor, node, nullish) {
        if (node.truthy) return true;
        if (is_undefined(node)) return undefined;
        if (node.falsy && !nullish) return false;
        if (node.is_truthy()) return true;
        return node.evaluate(compressor, true);
    }

    function mark_duplicate_condition(compressor, node) {
        var child;
        var level = 0;
        var negated = false;
        var parent = compressor.self();
        if (!is_statement(parent)) while (true) {
            child = parent;
            parent = compressor.parent(level++);
            if (parent instanceof AST_Binary) {
                switch (child) {
                  case parent.left:
                    if (lazy_op[parent.operator]) continue;
                    break;
                  case parent.right:
                    if (match(parent.left)) switch (parent.operator) {
                      case "&&":
                        node[negated ? "falsy" : "truthy"] = true;
                        break;
                      case "||":
                      case "??":
                        node[negated ? "truthy" : "falsy"] = true;
                        break;
                    }
                    break;
                }
            } else if (parent instanceof AST_Conditional) {
                var cond = parent.condition;
                if (cond === child) continue;
                if (match(cond)) switch (child) {
                  case parent.consequent:
                    node[negated ? "falsy" : "truthy"] = true;
                    break;
                  case parent.alternative:
                    node[negated ? "truthy" : "falsy"] = true;
                    break;
                }
            } else if (parent instanceof AST_Exit) {
                break;
            } else if (parent instanceof AST_If) {
                break;
            } else if (parent instanceof AST_Sequence) {
                if (parent.expressions[0] === child) continue;
            } else if (parent instanceof AST_SimpleStatement) {
                break;
            }
            return;
        }
        while (true) {
            child = parent;
            parent = compressor.parent(level++);
            if (parent instanceof AST_BlockStatement) {
                if (parent.body[0] === child) continue;
            } else if (parent instanceof AST_If) {
                if (match(parent.condition)) switch (child) {
                  case parent.body:
                    node[negated ? "falsy" : "truthy"] = true;
                    break;
                  case parent.alternative:
                    node[negated ? "truthy" : "falsy"] = true;
                    break;
                }
            }
            return;
        }

        function match(cond) {
            if (node.equals(cond)) return true;
            if (!(cond instanceof AST_UnaryPrefix)) return false;
            if (cond.operator != "!") return false;
            if (!node.equals(cond.expression)) return false;
            negated = true;
            return true;
        }
    }

    OPT(AST_If, function(self, compressor) {
        if (is_empty(self.alternative)) self.alternative = null;

        if (!compressor.option("conditionals")) return self;
        if (compressor.option("booleans") && !self.condition.has_side_effects(compressor)) {
            mark_duplicate_condition(compressor, self.condition);
        }
        // if condition can be statically determined, warn and drop
        // one of the blocks.  note, statically determined implies
        // “has no side effects”; also it doesn't work for cases like
        // `x && true`, though it probably should.
        if (compressor.option("dead_code")) {
            var cond = fuzzy_eval(compressor, self.condition);
            if (!cond) {
                AST_Node.warn("Condition always false [{start}]", self.condition);
                var body = [
                    make_node(AST_SimpleStatement, self.condition, { body: self.condition }).transform(compressor),
                ];
                extract_declarations_from_unreachable_code(compressor, self.body, body);
                if (self.alternative) body.push(self.alternative);
                return make_node(AST_BlockStatement, self, { body: body }).optimize(compressor);
            } else if (!(cond instanceof AST_Node)) {
                AST_Node.warn("Condition always true [{start}]", self.condition);
                var body = [
                    make_node(AST_SimpleStatement, self.condition, { body: self.condition }).transform(compressor),
                    self.body,
                ];
                if (self.alternative) extract_declarations_from_unreachable_code(compressor, self.alternative, body);
                return make_node(AST_BlockStatement, self, { body: body }).optimize(compressor);
            }
        }
        var negated = self.condition.negate(compressor);
        var self_condition_length = self.condition.print_to_string().length;
        var negated_length = negated.print_to_string().length;
        var negated_is_best = negated_length < self_condition_length;
        if (self.alternative && negated_is_best) {
            negated_is_best = false; // because we already do the switch here.
            // no need to swap values of self_condition_length and negated_length
            // here because they are only used in an equality comparison later on.
            self.condition = negated;
            var tmp = self.body;
            self.body = self.alternative;
            self.alternative = is_empty(tmp) ? null : tmp;
        }
        var body_defuns = [];
        var body_var_defs = [];
        var body_refs = [];
        var body_exprs = sequencesize(self.body, body_defuns, body_var_defs, body_refs);
        var alt_defuns = [];
        var alt_var_defs = [];
        var alt_refs = [];
        var alt_exprs = sequencesize(self.alternative, alt_defuns, alt_var_defs, alt_refs);
        if (body_exprs instanceof AST_BlockStatement || alt_exprs instanceof AST_BlockStatement) {
            var body = [], var_defs = [];
            if (body_exprs) {
                [].push.apply(body, body_defuns);
                [].push.apply(var_defs, body_var_defs);
                if (body_exprs instanceof AST_BlockStatement) {
                    self.body = body_exprs;
                } else if (body_exprs.length == 0) {
                    self.body = make_node(AST_EmptyStatement, self.body);
                } else {
                    self.body = make_node(AST_SimpleStatement, self.body, {
                        body: make_sequence(self.body, body_exprs),
                    });
                }
                body_refs.forEach(process_to_assign);
            }
            if (alt_exprs) {
                [].push.apply(body, alt_defuns);
                [].push.apply(var_defs, alt_var_defs);
                if (alt_exprs instanceof AST_BlockStatement) {
                    self.alternative = alt_exprs;
                } else if (alt_exprs.length == 0) {
                    self.alternative = null;
                } else {
                    self.alternative = make_node(AST_SimpleStatement, self.alternative, {
                        body: make_sequence(self.alternative, alt_exprs),
                    });
                }
                alt_refs.forEach(process_to_assign);
            }
            if (var_defs.length > 0) body.push(make_node(AST_Var, self, { definitions: var_defs }));
            if (body.length > 0) {
                body.push(self.transform(compressor));
                return make_node(AST_BlockStatement, self, { body: body }).optimize(compressor);
            }
        } else if (body_exprs && alt_exprs) {
            var body = body_defuns.concat(alt_defuns);
            if (body_var_defs.length > 0 || alt_var_defs.length > 0) body.push(make_node(AST_Var, self, {
                definitions: body_var_defs.concat(alt_var_defs),
            }));
            if (body_exprs.length == 0) {
                body.push(make_node(AST_SimpleStatement, self.condition, {
                    body: alt_exprs.length > 0 ? make_node(AST_Binary, self, {
                        operator: "||",
                        left: self.condition,
                        right: make_sequence(self.alternative, alt_exprs),
                    }).transform(compressor) : self.condition.clone(),
                }).optimize(compressor));
            } else if (alt_exprs.length == 0) {
                if (self_condition_length === negated_length && !negated_is_best
                    && self.condition instanceof AST_Binary && self.condition.operator == "||") {
                    // although the code length of self.condition and negated are the same,
                    // negated does not require additional surrounding parentheses.
                    // see https://github.com/mishoo/UglifyJS/issues/979
                    negated_is_best = true;
                }
                body.push(make_node(AST_SimpleStatement, self, {
                    body: make_node(AST_Binary, self, {
                        operator: negated_is_best ? "||" : "&&",
                        left: negated_is_best ? negated : self.condition,
                        right: make_sequence(self.body, body_exprs),
                    }).transform(compressor),
                }).optimize(compressor));
            } else {
                body.push(make_node(AST_SimpleStatement, self, {
                    body: make_node(AST_Conditional, self, {
                        condition: self.condition,
                        consequent: make_sequence(self.body, body_exprs),
                        alternative: make_sequence(self.alternative, alt_exprs),
                    }),
                }).optimize(compressor));
            }
            body_refs.forEach(process_to_assign);
            alt_refs.forEach(process_to_assign);
            return make_node(AST_BlockStatement, self, { body: body }).optimize(compressor);
        }
        if (is_empty(self.body)) self = make_node(AST_If, self, {
            condition: negated,
            body: self.alternative,
            alternative: null,
        });
        if (self.alternative instanceof AST_Exit && self.body.TYPE == self.alternative.TYPE) {
            var cons_value = self.body.value;
            var alt_value = self.alternative.value;
            if (!cons_value && !alt_value) return make_node(AST_BlockStatement, self, {
                body: [
                    make_node(AST_SimpleStatement, self, { body: self.condition }),
                    self.body,
                ],
            }).optimize(compressor);
            if (cons_value && alt_value || !keep_return_void()) {
                var exit = make_node(self.body.CTOR, self, {
                    value: make_node(AST_Conditional, self, {
                        condition: self.condition,
                        consequent: cons_value || make_node(AST_Undefined, self.body).transform(compressor),
                        alternative: alt_value || make_node(AST_Undefined, self.alternative).transform(compressor),
                    }),
                });
                if (exit instanceof AST_Return) exit.in_bool = self.body.in_bool || self.alternative.in_bool;
                return exit;
            }
        }
        if (self.body instanceof AST_If && !self.body.alternative && !self.alternative) {
            self = make_node(AST_If, self, {
                condition: make_node(AST_Binary, self.condition, {
                    operator: "&&",
                    left: self.condition,
                    right: self.body.condition,
                }),
                body: self.body.body,
                alternative: null,
            });
        }
        if (aborts(self.body) && self.alternative) {
            var alt = self.alternative;
            self.alternative = null;
            return make_node(AST_BlockStatement, self, { body: [ self, alt ] }).optimize(compressor);
        }
        if (aborts(self.alternative)) {
            var body = self.body;
            self.body = self.alternative;
            self.condition = negated_is_best ? negated : self.condition.negate(compressor);
            self.alternative = null;
            return make_node(AST_BlockStatement, self, { body: [ self, body ] }).optimize(compressor);
        }
        if (self.alternative) {
            var body_stats = as_array(self.body);
            var body_index = last_index(body_stats);
            var alt_stats = as_array(self.alternative);
            var alt_index = last_index(alt_stats);
            for (var stats = []; body_index >= 0 && alt_index >= 0;) {
                var stat = body_stats[body_index];
                var alt_stat = alt_stats[alt_index];
                if (stat.equals(alt_stat)) {
                    body_stats.splice(body_index--, 1);
                    alt_stats.splice(alt_index--, 1);
                    stats.unshift(merge_expression(stat, alt_stat));
                } else {
                    if (!(stat instanceof AST_SimpleStatement)) break;
                    if (!(alt_stat instanceof AST_SimpleStatement)) break;
                    var expr1 = stat.body.tail_node();
                    var expr2 = alt_stat.body.tail_node();
                    if (!expr1.equals(expr2)) break;
                    body_index = pop_expr(body_stats, stat.body, body_index);
                    alt_index = pop_expr(alt_stats, alt_stat.body, alt_index);
                    stats.unshift(make_node(AST_SimpleStatement, expr1, { body: merge_expression(expr1, expr2) }));
                }
            }
            if (stats.length > 0) {
                self.body = body_stats.length > 0 ? make_node(AST_BlockStatement, self, {
                    body: body_stats,
                }) : make_node(AST_EmptyStatement, self);
                self.alternative = alt_stats.length > 0 ? make_node(AST_BlockStatement, self, {
                    body: alt_stats,
                }) : null;
                stats.unshift(self);
                return make_node(AST_BlockStatement, self, { body: stats }).optimize(compressor);
            }
        }
        if (compressor.option("typeofs")) mark_locally_defined(self.condition, self.body, self.alternative);
        return self;

        function as_array(node) {
            return node instanceof AST_BlockStatement ? node.body : [ node ];
        }

        function keep_return_void() {
            var has_finally = false, level = 0, node = compressor.self();
            do {
                if (node instanceof AST_Catch) {
                    if (compressor.parent(level).bfinally) has_finally = true;
                    level++;
                } else if (node instanceof AST_Finally) {
                    level++;
                } else if (node instanceof AST_Scope) {
                    return has_finally && in_async_generator(node);
                } else if (node instanceof AST_Try) {
                    if (node.bfinally) has_finally = true;
                }
            } while (node = compressor.parent(level++));
        }

        function last_index(stats) {
            for (var index = stats.length; --index >= 0;) {
                if (!is_declaration(stats[index], true)) break;
            }
            return index;
        }

        function pop_expr(stats, body, index) {
            if (body instanceof AST_Sequence) {
                stats[index] = make_node(AST_SimpleStatement, body, {
                    body: make_sequence(body, body.expressions.slice(0, -1)),
                });
            } else {
                stats.splice(index--, 1);
            }
            return index;
        }

        function sequencesize(stat, defuns, var_defs, refs) {
            if (stat == null) return [];
            if (stat instanceof AST_BlockStatement) {
                var exprs = [];
                for (var i = 0; i < stat.body.length; i++) {
                    var line = stat.body[i];
                    if (line instanceof AST_EmptyStatement) continue;
                    if (line instanceof AST_Exit) {
                        if (i == 0) return;
                        if (exprs.length > 0) {
                            line = line.clone();
                            exprs.push(line.value || make_node(AST_Undefined, line).transform(compressor));
                            line.value = make_sequence(stat, exprs);
                        }
                        var block = stat.clone();
                        block.body = block.body.slice(i + 1);
                        block.body.unshift(line);
                        return block;
                    }
                    if (line instanceof AST_LambdaDefinition) {
                        defuns.push(line);
                    } else if (line instanceof AST_SimpleStatement) {
                        if (!compressor.option("sequences") && exprs.length > 0) return;
                        exprs.push(line.body);
                    } else if (line instanceof AST_Var) {
                        if (!compressor.option("sequences") && exprs.length > 0) return;
                        line.remove_initializers(compressor, var_defs);
                        line.definitions.forEach(process_var_def);
                    } else {
                        return;
                    }
                }
                return exprs;
            }
            if (stat instanceof AST_LambdaDefinition) {
                defuns.push(stat);
                return [];
            }
            if (stat instanceof AST_EmptyStatement) return [];
            if (stat instanceof AST_SimpleStatement) return [ stat.body ];
            if (stat instanceof AST_Var) {
                var exprs = [];
                stat.remove_initializers(compressor, var_defs);
                stat.definitions.forEach(process_var_def);
                return exprs;
            }

            function process_var_def(var_def) {
                if (!var_def.value) return;
                exprs.push(make_node(AST_Assign, var_def, {
                    operator: "=",
                    left: var_def.name.convert_symbol(AST_SymbolRef, function(ref) {
                        refs.push(ref);
                    }),
                    right: var_def.value,
                }));
            }
        }
    });

    OPT(AST_Switch, function(self, compressor) {
        if (!compressor.option("switches")) return self;
        if (!compressor.option("dead_code")) return self;
        var body = [];
        var branch;
        var decl = [];
        var default_branch;
        var exact_match;
        var side_effects = [];
        for (var i = 0, len = self.body.length; i < len; i++) {
            branch = self.body[i];
            if (branch instanceof AST_Default) {
                var prev = body[body.length - 1];
                if (default_branch || is_break(branch.body[0], compressor) && (!prev || aborts(prev))) {
                    eliminate_branch(branch, prev);
                    continue;
                } else {
                    default_branch = branch;
                }
            } else {
                var exp = branch.expression;
                var equals = make_node(AST_Binary, self, {
                    operator: "===",
                    left: self.expression,
                    right: exp,
                }).evaluate(compressor, true);
                if (!equals) {
                    if (exp.has_side_effects(compressor)) side_effects.push(exp);
                    eliminate_branch(branch, body[body.length - 1]);
                    continue;
                }
                if (!(equals instanceof AST_Node)) {
                    if (default_branch) {
                        var default_index = body.indexOf(default_branch);
                        body.splice(default_index, 1);
                        eliminate_branch(default_branch, body[default_index - 1]);
                        default_branch = null;
                    }
                    if (exp.has_side_effects(compressor)) {
                        exact_match = branch;
                    } else {
                        default_branch = branch = make_node(AST_Default, branch);
                    }
                    while (++i < len) eliminate_branch(self.body[i], branch);
                }
            }
            if (i + 1 >= len || aborts(branch)) {
                var prev = body[body.length - 1];
                var statements = branch.body;
                if (aborts(prev)) switch (prev.body.length - statements.length) {
                  case 1:
                    var stat = prev.body[prev.body.length - 1];
                    if (!is_break(stat, compressor)) break;
                    statements = statements.concat(stat);
                  case 0:
                    var prev_block = make_node(AST_BlockStatement, prev);
                    var next_block = make_node(AST_BlockStatement, branch, { body: statements });
                    if (prev_block.equals(next_block)) prev.body = [];
                }
            }
            if (side_effects.length) {
                if (branch instanceof AST_Default) {
                    body.push(make_node(AST_Case, self, { expression: make_sequence(self, side_effects), body: [] }));
                } else {
                    side_effects.push(branch.expression);
                    branch.expression = make_sequence(self, side_effects);
                }
                side_effects = [];
            }
            body.push(branch);
        }
        if (side_effects.length && !exact_match) {
            body.push(make_node(AST_Case, self, { expression: make_sequence(self, side_effects), body: [] }));
        }
        while (branch = body[body.length - 1]) {
            var stat = branch.body[branch.body.length - 1];
            if (is_break(stat, compressor)) branch.body.pop();
            if (branch === default_branch) {
                if (!has_declarations_only(branch)) break;
            } else if (branch.expression.has_side_effects(compressor)) {
                break;
            } else if (default_branch) {
                if (!has_declarations_only(default_branch)) break;
                if (body[body.length - 2] !== default_branch) break;
                default_branch.body = default_branch.body.concat(branch.body);
                branch.body = [];
            } else if (!has_declarations_only(branch)) break;
            eliminate_branch(branch);
            if (body.pop() === default_branch) default_branch = null;
        }
        if (!branch) {
            decl.push(make_node(AST_SimpleStatement, self.expression, { body: self.expression }));
            if (side_effects.length) decl.push(make_node(AST_SimpleStatement, self, {
                body: make_sequence(self, side_effects),
            }));
            return make_node(AST_BlockStatement, self, { body: decl }).optimize(compressor);
        }
        if (branch === default_branch) while (branch = body[body.length - 2]) {
            if (branch instanceof AST_Default) break;
            if (!has_declarations_only(branch)) break;
            var exp = branch.expression;
            if (exp.has_side_effects(compressor)) {
                var prev = body[body.length - 3];
                if (prev && !aborts(prev)) break;
                default_branch.body.unshift(make_node(AST_SimpleStatement, self, { body: exp }));
            }
            eliminate_branch(branch);
            body.splice(-2, 1);
        }
        body[0].body = decl.concat(body[0].body);
        self.body = body;
        if (compressor.option("conditionals")) switch (body.length) {
          case 1:
            if (!no_break(body[0])) break;
            var exp = body[0].expression;
            var statements = body[0].body.slice();
            if (body[0] !== default_branch && body[0] !== exact_match) return make_node(AST_If, self, {
                condition: make_node(AST_Binary, self, {
                    operator: "===",
                    left: self.expression,
                    right: exp,
                }),
                body: make_node(AST_BlockStatement, self, { body: statements }),
                alternative: null,
            }).optimize(compressor);
            if (exp) statements.unshift(make_node(AST_SimpleStatement, exp, { body: exp }));
            statements.unshift(make_node(AST_SimpleStatement, self.expression, { body: self.expression }));
            return make_node(AST_BlockStatement, self, { body: statements }).optimize(compressor);
          case 2:
            if (!member(default_branch, body) || !no_break(body[1])) break;
            var statements = body[0].body.slice();
            var exclusive = statements.length && is_break(statements[statements.length - 1], compressor);
            if (exclusive) statements.pop();
            if (!all(statements, no_break)) break;
            var alternative = body[1].body.length && make_node(AST_BlockStatement, body[1]);
            var node = make_node(AST_If, self, {
                condition: make_node(AST_Binary, self, body[0] === default_branch ? {
                    operator: "!==",
                    left: self.expression,
                    right: body[1].expression,
                } : {
                    operator: "===",
                    left: self.expression,
                    right: body[0].expression,
                }),
                body: make_node(AST_BlockStatement, body[0], { body: statements }),
                alternative: exclusive && alternative || null,
            });
            if (!exclusive && alternative) node = make_node(AST_BlockStatement, self, { body: [ node, alternative ] });
            return node.optimize(compressor);
        }
        return self;

        function is_break(node, tw) {
            return node instanceof AST_Break && tw.loopcontrol_target(node) === self;
        }

        function no_break(node) {
            var found = false;
            var tw = new TreeWalker(function(node) {
                if (found
                    || node instanceof AST_Lambda
                    || node instanceof AST_SimpleStatement) return true;
                if (is_break(node, tw)) found = true;
            });
            tw.push(self);
            node.walk(tw);
            return !found;
        }

        function eliminate_branch(branch, prev) {
            if (prev && !aborts(prev)) {
                prev.body = prev.body.concat(branch.body);
            } else {
                extract_declarations_from_unreachable_code(compressor, branch, decl);
            }
        }
    });

    OPT(AST_Try, function(self, compressor) {
        self.body = tighten_body(self.body, compressor);
        if (compressor.option("dead_code")) {
            if (has_declarations_only(self)
                && !(self.bcatch && self.bcatch.argname && self.bcatch.argname.match_symbol(function(node) {
                    return node instanceof AST_SymbolCatch && !can_drop_symbol(node);
                }, true))) {
                var body = [];
                if (self.bcatch) {
                    extract_declarations_from_unreachable_code(compressor, self.bcatch, body);
                    body.forEach(function(stat) {
                        if (!(stat instanceof AST_Var)) return;
                        stat.definitions.forEach(function(var_def) {
                            var def = var_def.name.definition().redefined();
                            if (!def) return;
                            var_def.name = var_def.name.clone();
                            var_def.name.thedef = def;
                        });
                    });
                }
                body.unshift(make_node(AST_BlockStatement, self).optimize(compressor));
                if (self.bfinally) {
                    body.push(make_node(AST_BlockStatement, self.bfinally).optimize(compressor));
                }
                return make_node(AST_BlockStatement, self, { body: body }).optimize(compressor);
            }
            if (self.bfinally && has_declarations_only(self.bfinally)) {
                var body = make_node(AST_BlockStatement, self.bfinally).optimize(compressor);
                body = self.body.concat(body);
                if (!self.bcatch) return make_node(AST_BlockStatement, self, { body: body }).optimize(compressor);
                self.body = body;
                self.bfinally = null;
            }
        }
        return self;
    });

    function remove_initializers(make_value) {
        return function(compressor, defns) {
            var dropped = false;
            this.definitions.forEach(function(defn) {
                if (defn.value) dropped = true;
                defn.name.match_symbol(function(node) {
                    if (node instanceof AST_SymbolDeclaration) defns.push(make_node(AST_VarDef, node, {
                        name: node,
                        value: make_value(compressor, node),
                    }));
                }, true);
            });
            return dropped;
        };
    }

    AST_Const.DEFMETHOD("remove_initializers", remove_initializers(function(compressor, node) {
        return make_node(AST_Undefined, node).optimize(compressor);
    }));
    AST_Let.DEFMETHOD("remove_initializers", remove_initializers(return_null));
    AST_Var.DEFMETHOD("remove_initializers", remove_initializers(return_null));

    AST_Definitions.DEFMETHOD("to_assignments", function() {
        var assignments = this.definitions.reduce(function(a, defn) {
            var def = defn.name.definition();
            var value = defn.value;
            if (value) {
                if (value instanceof AST_Sequence) value = value.clone();
                var name = make_node(AST_SymbolRef, defn.name);
                var assign = make_node(AST_Assign, defn, {
                    operator: "=",
                    left: name,
                    right: value,
                });
                a.push(assign);
                var fixed = function() {
                    return assign.right;
                };
                fixed.assigns = [ assign ];
                fixed.direct_access = def.direct_access;
                fixed.escaped = def.escaped;
                name.fixed = fixed;
                def.references.forEach(function(ref) {
                    if (!ref.fixed) return;
                    var assigns = ref.fixed.assigns;
                    if (!assigns) return;
                    if (assigns[0] !== defn) return;
                    if (assigns.length > 1 || ref.fixed.to_binary || ref.fixed.to_prefix) {
                        assigns[0] = assign;
                    } else {
                        ref.fixed = fixed;
                        if (def.fixed === ref.fixed) def.fixed = fixed;
                    }
                });
                def.references.push(name);
                def.assignments++;
            }
            def.eliminated++;
            return a;
        }, []);
        if (assignments.length == 0) return null;
        return make_sequence(this, assignments);
    });

    function is_safe_lexical(def) {
        return def.name != "arguments" && def.orig.length < (def.orig[0] instanceof AST_SymbolLambda ? 3 : 2);
    }

    function may_overlap(compressor, def) {
        if (compressor.exposed(def)) return true;
        var scope = def.scope.resolve();
        for (var s = def.scope; s !== scope;) {
            s = s.parent_scope;
            if (s.var_names().has(def.name)) return true;
        }
    }

    function to_let(stat, scope) {
        return make_node(AST_Let, stat, {
            definitions: stat.definitions.map(function(defn) {
                return make_node(AST_VarDef, defn, {
                    name: defn.name.convert_symbol(AST_SymbolLet, function(name, node) {
                        var def = name.definition();
                        def.orig[def.orig.indexOf(node)] = name;
                        for (var s = scope; s !== def.scope && (s = s.parent_scope);) {
                            remove(s.enclosed, def);
                        }
                        def.scope = scope;
                        scope.variables.set(def.name, def);
                    }),
                    value: defn.value,
                });
            }),
        });
    }

    function to_var(stat, scope) {
        return make_node(AST_Var, stat, {
            definitions: stat.definitions.map(function(defn) {
                return make_node(AST_VarDef, defn, {
                    name: defn.name.convert_symbol(AST_SymbolVar, function(name, node) {
                        var def = name.definition();
                        def.orig[def.orig.indexOf(node)] = name;
                        if (def.scope === scope) return;
                        def.scope = scope;
                        scope.variables.set(def.name, def);
                        scope.enclosed.push(def);
                        scope.var_names().set(def.name, true);
                    }),
                    value: defn.value,
                });
            }),
        });
    }

    (function(def) {
        def(AST_Node, return_false);
        def(AST_Const, function(compressor, assigned) {
            assigned = assigned ? 1 : 0;
            var defns = this.definitions;
            if (!compressor.option("module") && all(defns, function(defn) {
                return defn.name instanceof AST_SymbolConst;
            })) return false;
            return all(defns, function(defn) {
                return !defn.name.match_symbol(function(node) {
                    if (node instanceof AST_SymbolDeclaration) return node.definition().assignments != assigned;
                }, true);
            });
        });
        def(AST_Var, function(compressor) {
            return all(this.definitions, function(defn) {
                return !defn.name.match_symbol(function(node) {
                    if (!(node instanceof AST_SymbolDeclaration)) return false;
                    var def = node.definition();
                    if (def.first_decl !== node) return true;
                    if (!safe_from_tdz(compressor, node)) return true;
                    var defn_scope = node.scope;
                    if (defn_scope instanceof AST_Scope) return false;
                    return !all(def.references, function(ref) {
                        var scope = ref.scope;
                        do {
                            if (scope === defn_scope) return true;
                        } while (scope = scope.parent_scope);
                        return false;
                    });
                }, true);
            });
        });
    })(function(node, func) {
        node.DEFMETHOD("can_letify", func);
    });

    function safe_from_tdz(compressor, sym) {
        var def = sym.definition();
        return (def.fixed || def.fixed === 0)
            && is_safe_lexical(def)
            && same_scope(def)
            && !may_overlap(compressor, def);
    }

    AST_Definitions.DEFMETHOD("can_varify", function(compressor) {
        return all(this.definitions, function(defn) {
            return !defn.name.match_symbol(function(node) {
                if (node instanceof AST_SymbolDeclaration) return !safe_from_tdz(compressor, node);
            }, true);
        });
    });

    OPT(AST_Const, function(self, compressor) {
        if (!compressor.option("varify")) return self;
        if (self.can_varify(compressor)) return to_var(self, compressor.find_parent(AST_Scope));
        if (self.can_letify(compressor)) return to_let(self, find_scope(compressor));
        return self;
    });

    OPT(AST_Let, function(self, compressor) {
        if (!compressor.option("varify")) return self;
        if (self.can_varify(compressor)) return to_var(self, compressor.find_parent(AST_Scope));
        return self;
    });

    function trim_optional_chain(node, compressor) {
        if (!compressor.option("optional_chains")) return;
        if (node.terminal) do {
            var expr = node.expression;
            if (node.optional) {
                var ev = fuzzy_eval(compressor, expr, true);
                if (ev == null) return make_node(AST_UnaryPrefix, node, {
                    operator: "void",
                    expression: expr,
                }).optimize(compressor);
                if (!(ev instanceof AST_Node)) node.optional = false;
            }
            node = expr;
        } while ((node.TYPE == "Call" || node instanceof AST_PropAccess) && !node.terminal);
    }

    function lift_sequence_in_expression(node, compressor) {
        var exp = node.expression;
        if (!(exp instanceof AST_Sequence)) return node;
        var x = exp.expressions.slice();
        var e = node.clone();
        e.expression = x.pop();
        x.push(e);
        return make_sequence(node, x);
    }

    function drop_unused_call_args(call, compressor, fns_with_marked_args) {
        var exp = call.expression;
        var fn = exp instanceof AST_SymbolRef ? exp.fixed_value() : exp;
        if (!(fn instanceof AST_Lambda)) return;
        if (fn.uses_arguments) return;
        if (fn.pinned()) return;
        if (fns_with_marked_args && fns_with_marked_args.indexOf(fn) < 0) return;
        var args = call.args;
        if (!all(args, function(arg) {
            return !(arg instanceof AST_Spread);
        })) return;
        var argnames = fn.argnames;
        var is_iife = fn === exp && !fn.name;
        if (fn.rest) {
            if (!(is_iife && compressor.option("rests"))) return;
            var insert = argnames.length;
            args = args.slice(0, insert);
            while (args.length < insert) args.push(make_node(AST_Undefined, call).optimize(compressor));
            args.push(make_node(AST_Array, call, { elements: call.args.slice(insert) }));
            argnames = argnames.concat(fn.rest);
            fn.rest = null;
        } else {
            args = args.slice();
            argnames = argnames.slice();
        }
        var pos = 0, last = 0;
        var drop_defaults = is_iife && compressor.option("default_values");
        var drop_fargs = is_iife && compressor.drop_fargs(fn, call) ? function(argname, arg) {
            if (!argname) return true;
            if (argname instanceof AST_DestructuredArray) {
                return argname.elements.length == 0 && !argname.rest && arg instanceof AST_Array;
            }
            if (argname instanceof AST_DestructuredObject) {
                return argname.properties.length == 0 && !argname.rest && arg && !arg.may_throw_on_access(compressor);
            }
            return argname.unused;
        } : return_false;
        var side_effects = [];
        for (var i = 0; i < args.length; i++) {
            var argname = argnames[i];
            if (drop_defaults && argname instanceof AST_DefaultValue && args[i].is_defined(compressor)) {
                argnames[i] = argname = argname.name;
            }
            if (!argname || argname.unused !== undefined) {
                var node = args[i].drop_side_effect_free(compressor);
                if (drop_fargs(argname)) {
                    if (argname) argnames.splice(i, 1);
                    args.splice(i, 1);
                    if (node) side_effects.push(node);
                    i--;
                    continue;
                } else if (node) {
                    side_effects.push(node);
                    args[pos++] = make_sequence(call, side_effects);
                    side_effects = [];
                } else if (argname) {
                    if (side_effects.length) {
                        args[pos++] = make_sequence(call, side_effects);
                        side_effects = [];
                    } else {
                        args[pos++] = make_node(AST_Number, args[i], { value: 0 });
                        continue;
                    }
                }
            } else if (drop_fargs(argname, args[i])) {
                var node = args[i].drop_side_effect_free(compressor);
                argnames.splice(i, 1);
                args.splice(i, 1);
                if (node) side_effects.push(node);
                i--;
                continue;
            } else {
                side_effects.push(args[i]);
                args[pos++] = make_sequence(call, side_effects);
                side_effects = [];
            }
            last = pos;
        }
        for (; i < argnames.length; i++) {
            if (drop_fargs(argnames[i])) argnames.splice(i--, 1);
        }
        fn.argnames = argnames;
        args.length = last;
        call.args = args;
        if (!side_effects.length) return;
        var arg = make_sequence(call, side_effects);
        args.push(args.length < argnames.length ? make_node(AST_UnaryPrefix, call, {
            operator: "void",
            expression: arg,
        }) : arg);
    }

    function avoid_await_yield(compressor, parent_scope) {
        if (!parent_scope) parent_scope = compressor.find_parent(AST_Scope);
        var avoid = [];
        if (is_async(parent_scope) || parent_scope instanceof AST_Toplevel && compressor.option("module")) {
            avoid.push("await");
        }
        if (is_generator(parent_scope)) avoid.push("yield");
        return avoid.length && makePredicate(avoid);
    }

    function safe_from_await_yield(fn, avoid) {
        if (!avoid) return true;
        var safe = true;
        var tw = new TreeWalker(function(node) {
            if (!safe) return true;
            if (node instanceof AST_Scope) {
                if (node === fn) return;
                if (is_arrow(node)) {
                    for (var i = 0; safe && i < node.argnames.length; i++) node.argnames[i].walk(tw);
                } else if (node instanceof AST_LambdaDefinition && avoid[node.name.name]) {
                    safe = false;
                }
                return true;
            }
            if (node instanceof AST_Symbol && avoid[node.name] && node !== fn.name) safe = false;
        });
        fn.walk(tw);
        return safe;
    }

    function safe_from_strict_mode(fn, compressor) {
        return fn.in_strict_mode(compressor) || !compressor.has_directive("use strict");
    }

    OPT(AST_Call, function(self, compressor) {
        var exp = self.expression;
        var terminated = trim_optional_chain(self, compressor);
        if (terminated) return terminated;
        if (compressor.option("sequences")) {
            if (exp instanceof AST_PropAccess) {
                var seq = lift_sequence_in_expression(exp, compressor);
                if (seq !== exp) {
                    var call = self.clone();
                    call.expression = seq.expressions.pop();
                    seq.expressions.push(call);
                    return seq.optimize(compressor);
                }
            } else if (!needs_unbinding(exp.tail_node())) {
                var seq = lift_sequence_in_expression(self, compressor);
                if (seq !== self) return seq.optimize(compressor);
            }
        }
        if (compressor.option("unused")) drop_unused_call_args(self, compressor);
        if (compressor.option("unsafe")) {
            if (is_undeclared_ref(exp)) switch (exp.name) {
              case "Array":
                // Array(n) ---> [ , , ... , ]
                if (self.args.length == 1) {
                    var first = self.args[0];
                    if (first instanceof AST_Number) try {
                        var length = first.value;
                        if (length > 6) break;
                        var elements = Array(length);
                        for (var i = 0; i < length; i++) elements[i] = make_node(AST_Hole, self);
                        return make_node(AST_Array, self, { elements: elements });
                    } catch (ex) {
                        AST_Node.warn("Invalid array length: {length} [{start}]", {
                            length: length,
                            start: self.start,
                        });
                        break;
                    }
                    if (!first.is_boolean(compressor) && !first.is_string(compressor)) break;
                }
                // Array(...) ---> [ ... ]
                return make_node(AST_Array, self, { elements: self.args });
              case "Object":
                // Object() ---> {}
                if (self.args.length == 0) return make_node(AST_Object, self, { properties: [] });
                break;
              case "String":
                // String() ---> ""
                if (self.args.length == 0) return make_node(AST_String, self, { value: "" });
                // String(x) ---> "" + x
                if (self.args.length == 1) return make_node(AST_Binary, self, {
                    operator: "+",
                    left: make_node(AST_String, self, { value: "" }),
                    right: self.args[0],
                }).optimize(compressor);
                break;
              case "Number":
                // Number() ---> 0
                if (self.args.length == 0) return make_node(AST_Number, self, { value: 0 });
                // Number(x) ---> +("" + x)
                if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
                    operator: "+",
                    expression: make_node(AST_Binary, self, {
                        operator: "+",
                        left: make_node(AST_String, self, { value: "" }),
                        right: self.args[0],
                    }),
                }).optimize(compressor);
                break;
              case "Boolean":
                // Boolean() ---> false
                if (self.args.length == 0) return make_node(AST_False, self).optimize(compressor);
                // Boolean(x) ---> !!x
                if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
                    operator: "!",
                    expression: make_node(AST_UnaryPrefix, self, {
                        operator: "!",
                        expression: self.args[0],
                    }),
                }).optimize(compressor);
                break;
              case "RegExp":
                // attempt to convert RegExp(...) to literal
                var params = [];
                if (all(self.args, function(arg) {
                    var value = arg.evaluate(compressor);
                    params.unshift(value);
                    return arg !== value;
                })) try {
                    return best_of(compressor, self, make_node(AST_RegExp, self, {
                        value: RegExp.apply(RegExp, params),
                    }));
                } catch (ex) {
                    AST_Node.warn("Error converting {this} [{start}]", self);
                }
                break;
            } else if (exp instanceof AST_Dot) switch (exp.property) {
              case "toString":
                // x.toString() ---> "" + x
                var expr = exp.expression;
                if (self.args.length == 0 && !(expr.may_throw_on_access(compressor) || expr instanceof AST_Super)) {
                    return make_node(AST_Binary, self, {
                        operator: "+",
                        left: make_node(AST_String, self, { value: "" }),
                        right: expr,
                    }).optimize(compressor);
                }
                break;
              case "join":
                if (exp.expression instanceof AST_Array && self.args.length < 2) EXIT: {
                    var separator = self.args[0];
                    // [].join() ---> ""
                    // [].join(x) ---> (x, "")
                    if (exp.expression.elements.length == 0 && !(separator instanceof AST_Spread)) {
                        return separator ? make_sequence(self, [
                            separator,
                            make_node(AST_String, self, { value: "" }),
                        ]).optimize(compressor) : make_node(AST_String, self, { value: "" });
                    }
                    if (separator) {
                        separator = separator.evaluate(compressor);
                        if (separator instanceof AST_Node) break EXIT; // not a constant
                    }
                    var elements = [];
                    var consts = [];
                    for (var i = 0; i < exp.expression.elements.length; i++) {
                        var el = exp.expression.elements[i];
                        var value = el.evaluate(compressor);
                        if (value !== el) {
                            consts.push(value);
                        } else if (el instanceof AST_Spread) {
                            break EXIT;
                        } else {
                            if (consts.length > 0) {
                                elements.push(make_node(AST_String, self, { value: consts.join(separator) }));
                                consts.length = 0;
                            }
                            elements.push(el);
                        }
                    }
                    if (consts.length > 0) elements.push(make_node(AST_String, self, {
                        value: consts.join(separator),
                    }));
                    // [ x ].join() ---> "" + x
                    // [ x ].join(".") ---> "" + x
                    // [ 1, 2, 3 ].join() ---> "1,2,3"
                    // [ 1, 2, 3 ].join(".") ---> "1.2.3"
                    if (elements.length == 1) {
                        if (elements[0].is_string(compressor)) return elements[0];
                        return make_node(AST_Binary, elements[0], {
                            operator: "+",
                            left: make_node(AST_String, self, { value: "" }),
                            right: elements[0],
                        });
                    }
                    // [ 1, 2, a, 3 ].join("") ---> "12" + a + "3"
                    if (separator == "") {
                        var first;
                        if (elements[0].is_string(compressor) || elements[1].is_string(compressor)) {
                            first = elements.shift();
                        } else {
                            first = make_node(AST_String, self, { value: "" });
                        }
                        return elements.reduce(function(prev, el) {
                            return make_node(AST_Binary, el, {
                                operator: "+",
                                left: prev,
                                right: el,
                            });
                        }, first).optimize(compressor);
                    }
                    // [ x, "foo", "bar", y ].join() ---> [ x, "foo,bar", y ].join()
                    // [ x, "foo", "bar", y ].join("-") ---> [ x, "foo-bar", y ].join("-")
                    // need this awkward cloning to not affect original element
                    // best_of will decide which one to get through.
                    var node = self.clone();
                    node.expression = node.expression.clone();
                    node.expression.expression = node.expression.expression.clone();
                    node.expression.expression.elements = elements;
                    return best_of(compressor, self, node);
                }
                break;
              case "charAt":
                if (self.args.length < 2) {
                    var node = make_node(AST_Binary, self, {
                        operator: "||",
                        left: make_node(AST_Sub, self, {
                            expression: exp.expression,
                            property: self.args.length ? make_node(AST_Binary, self.args[0], {
                                operator: "|",
                                left: make_node(AST_Number, self, { value: 0 }),
                                right: self.args[0],
                            }) : make_node(AST_Number, self, { value: 0 }),
                        }).optimize(compressor),
                        right: make_node(AST_String, self, { value: "" }),
                    });
                    node.is_string = return_true;
                    return node.optimize(compressor);
                }
                break;
              case "apply":
                if (self.args.length == 2 && self.args[1] instanceof AST_Array) {
                    var args = self.args[1].elements.slice();
                    args.unshift(self.args[0]);
                    return make_node(AST_Call, self, {
                        expression: make_node(AST_Dot, exp, {
                            expression: exp.expression,
                            property: "call",
                        }),
                        args: args,
                    }).optimize(compressor);
                }
                break;
              case "call":
                var func = exp.expression;
                if (func instanceof AST_SymbolRef) {
                    func = func.fixed_value();
                }
                if (func instanceof AST_Lambda && !func.contains_this()) {
                    return (self.args.length ? make_sequence(self, [
                        self.args[0],
                        make_node(AST_Call, self, {
                            expression: exp.expression,
                            args: self.args.slice(1),
                        }),
                    ]) : make_node(AST_Call, self, {
                        expression: exp.expression,
                        args: [],
                    })).optimize(compressor);
                }
                break;
            } else if (compressor.option("side_effects")
                && exp instanceof AST_Call
                && exp.args.length == 1
                && is_undeclared_ref(exp.expression)
                && exp.expression.name == "Object") {
                var call = self.clone();
                call.expression = maintain_this_binding(self, exp, exp.args[0]);
                return call.optimize(compressor);
            }
        }
        if (compressor.option("unsafe_Function")
            && is_undeclared_ref(exp)
            && exp.name == "Function") {
            // new Function() ---> function(){}
            if (self.args.length == 0) return make_node(AST_Function, self, {
                argnames: [],
                body: [],
            }).init_vars(exp.scope);
            if (all(self.args, function(x) {
                return x instanceof AST_String;
            })) {
                // quite a corner-case, but we can handle it:
                //   https://github.com/mishoo/UglifyJS/issues/203
                // if the code argument is a constant, then we can minify it.
                try {
                    var code = "n(function(" + self.args.slice(0, -1).map(function(arg) {
                        return arg.value;
                    }).join() + "){" + self.args[self.args.length - 1].value + "})";
                    var ast = parse(code);
                    var mangle = { ie: compressor.option("ie") };
                    ast.figure_out_scope(mangle);
                    var comp = new Compressor(compressor.options);
                    ast = ast.transform(comp);
                    ast.figure_out_scope(mangle);
                    ast.compute_char_frequency(mangle);
                    ast.mangle_names(mangle);
                    var fun;
                    ast.walk(new TreeWalker(function(node) {
                        if (fun) return true;
                        if (node instanceof AST_Lambda) {
                            fun = node;
                            return true;
                        }
                    }));
                    var code = OutputStream();
                    AST_BlockStatement.prototype._codegen.call(fun, code);
                    self.args = [
                        make_node(AST_String, self, {
                            value: fun.argnames.map(function(arg) {
                                return arg.print_to_string();
                            }).join(),
                        }),
                        make_node(AST_String, self.args[self.args.length - 1], {
                            value: code.get().replace(/^\{|\}$/g, "")
                        }),
                    ];
                    return self;
                } catch (ex) {
                    if (ex instanceof JS_Parse_Error) {
                        AST_Node.warn("Error parsing code passed to new Function [{start}]", self.args[self.args.length - 1]);
                        AST_Node.warn(ex.toString());
                    } else {
                        throw ex;
                    }
                }
            }
        }
        var fn = exp instanceof AST_SymbolRef ? exp.fixed_value() : exp;
        var parent = compressor.parent(), current = compressor.self();
        var is_func = fn instanceof AST_Lambda
            && (!is_async(fn) || compressor.option("awaits") && parent instanceof AST_Await)
            && (!is_generator(fn) || compressor.option("yields") && current instanceof AST_Yield && current.nested);
        var stat = is_func && fn.first_statement();
        var has_default = 0, has_destructured = false;
        var has_spread = !all(self.args, function(arg) {
            return !(arg instanceof AST_Spread);
        });
        var can_drop = is_func && all(fn.argnames, function(argname, index) {
            if (has_default == 1 && self.args[index] instanceof AST_Spread) has_default = 2;
            if (argname instanceof AST_DefaultValue) {
                if (!has_default) has_default = 1;
                var arg = has_default == 1 && self.args[index];
                if (!is_undefined(arg)) has_default = 2;
                if (has_arg_refs(fn, argname.value)) return false;
                argname = argname.name;
            }
            if (argname instanceof AST_Destructured) {
                has_destructured = true;
                if (has_arg_refs(fn, argname)) return false;
            }
            return true;
        }) && !(fn.rest instanceof AST_Destructured && has_arg_refs(fn, fn.rest));
        var can_inline = can_drop
            && compressor.option("inline")
            && !self.is_expr_pure(compressor)
            && (exp === fn || safe_from_strict_mode(fn, compressor));
        if (can_inline && stat instanceof AST_Return) {
            var value = stat.value;
            if (exp === fn
                && !fn.name
                && (!value || value.is_constant_expression())
                && safe_from_await_yield(fn, avoid_await_yield(compressor))) {
                return make_sequence(self, convert_args(value)).optimize(compressor);
            }
        }
        if (is_func && !fn.contains_this()) {
            var def, value, var_assigned = false;
            if (can_inline
                && !fn.uses_arguments
                && !fn.pinned()
                && !(fn.name && fn instanceof AST_LambdaExpression)
                && (exp === fn || !recursive_ref(compressor, def = exp.definition(), fn)
                    && fn.is_constant_expression(find_scope(compressor)))
                && (value = can_flatten_body(stat))) {
                var replacing = exp === fn || def.single_use && def.references.length - def.replaced == 1;
                if (can_substitute_directly()) {
                    self._optimized = true;
                    var retValue = value.optimize(compressor).clone(true);
                    var args = self.args.slice();
                    var refs = [];
                    retValue = retValue.transform(new TreeTransformer(function(node) {
                        if (node instanceof AST_SymbolRef) {
                            var def = node.definition();
                            if (fn.variables.get(node.name) !== def) {
                                refs.push(node);
                                return node;
                            }
                            var index = resolve_index(def);
                            var arg = args[index];
                            if (!arg) return make_node(AST_Undefined, self);
                            args[index] = null;
                            var parent = this.parent();
                            return parent ? maintain_this_binding(parent, node, arg) : arg;
                        }
                    }));
                    var save_inlined = fn.inlined;
                    if (exp !== fn) fn.inlined = true;
                    var exprs = [];
                    args.forEach(function(arg) {
                        if (!arg) return;
                        arg = arg.clone(true);
                        arg.walk(new TreeWalker(function(node) {
                            if (node instanceof AST_SymbolRef) refs.push(node);
                        }));
                        exprs.push(arg);
                    }, []);
                    exprs.push(retValue);
                    var node = make_sequence(self, exprs).optimize(compressor);
                    fn.inlined = save_inlined;
                    node = maintain_this_binding(parent, current, node);
                    self.inlined_node = node;
                    if (replacing || best_of_expression(node, self) === node) {
                        refs.forEach(function(ref) {
                            ref.scope = exp === fn ? fn.parent_scope : exp.scope;
                            ref.reference();
                            var def = ref.definition();
                            if (replacing) def.replaced++;
                            def.single_use = false;
                        });
                        return node;
                    } else if (!node.has_side_effects(compressor)) {
                        self.drop_side_effect_free = function(compressor, first_in_statement) {
                            var self = this;
                            var exprs = self.args.slice();
                            exprs.unshift(self.expression);
                            return make_sequence(self, exprs).drop_side_effect_free(compressor, first_in_statement);
                        };
                        self.has_side_effects = function(compressor) {
                            var self = this;
                            var exprs = self.args.slice();
                            exprs.unshift(self.expression);
                            return make_sequence(self, exprs).has_side_effects(compressor);
                        };
                    }
                }
                var arg_used, insert, in_loop, scope;
                if (replacing && can_inject_symbols()) {
                    fn._squeezed = true;
                    if (exp !== fn) fn.parent_scope = exp.scope;
                    var node = make_sequence(self, flatten_fn()).optimize(compressor);
                    return maintain_this_binding(parent, current, node);
                }
            }
            if (compressor.option("side_effects")
                && can_drop
                && all(fn.body, is_empty)
                && (fn === exp ? fn_name_unused(fn, compressor) : !has_default && !has_destructured && !fn.rest)
                && !(is_arrow(fn) && fn.value)
                && safe_from_await_yield(fn, avoid_await_yield(compressor))) {
                return make_sequence(self, convert_args()).optimize(compressor);
            }
        }
        if (compressor.option("arrows")
            && compressor.option("module")
            && (exp instanceof AST_AsyncFunction || exp instanceof AST_Function)
            && !exp.name
            && !exp.uses_arguments
            && !exp.pinned()
            && !exp.contains_this()) {
            var arrow = make_node(is_async(exp) ? AST_AsyncArrow : AST_Arrow, exp, exp);
            arrow.init_vars(exp.parent_scope, exp);
            arrow.variables.del("arguments");
            self.expression = arrow.transform(compressor);
            return self;
        }
        if (compressor.option("drop_console")) {
            if (exp instanceof AST_PropAccess) {
                var name = exp.expression;
                while (name.expression) {
                    name = name.expression;
                }
                if (is_undeclared_ref(name) && name.name == "console") {
                    return make_node(AST_Undefined, self).optimize(compressor);
                }
            }
        }
        if (compressor.option("negate_iife") && parent instanceof AST_SimpleStatement && is_iife_call(current)) {
            return self.negate(compressor, true);
        }
        return try_evaluate(compressor, self);

        function make_void_lhs(orig) {
            return make_node(AST_Sub, orig, {
                expression: make_node(AST_Array, orig, { elements: [] }),
                property: make_node(AST_Number, orig, { value: 0 }),
            });
        }

        function convert_args(value) {
            var args = self.args.slice();
            var destructured = has_default > 1 || has_destructured || fn.rest;
            if (destructured || has_spread) args = [ make_node(AST_Array, self, { elements: args }) ];
            if (destructured) {
                var tt = new TreeTransformer(function(node, descend) {
                    if (node instanceof AST_DefaultValue) return make_node(AST_DefaultValue, node, {
                        name: node.name.transform(tt) || make_void_lhs(node),
                        value: node.value,
                    });
                    if (node instanceof AST_DestructuredArray) {
                        var elements = [];
                        node.elements.forEach(function(node, index) {
                            node = node.transform(tt);
                            if (node) elements[index] = node;
                        });
                        fill_holes(node, elements);
                        return make_node(AST_DestructuredArray, node, { elements: elements });
                    }
                    if (node instanceof AST_DestructuredObject) {
                        var properties = [], side_effects = [];
                        node.properties.forEach(function(prop) {
                            var key = prop.key;
                            var value = prop.value.transform(tt);
                            if (value) {
                                if (side_effects.length) {
                                    if (!(key instanceof AST_Node)) key = make_node_from_constant(key, prop);
                                    side_effects.push(key);
                                    key = make_sequence(node, side_effects);
                                    side_effects = [];
                                }
                                properties.push(make_node(AST_DestructuredKeyVal, prop, {
                                    key: key,
                                    value: value,
                                }));
                            } else if (key instanceof AST_Node) {
                                side_effects.push(key);
                            }
                        });
                        if (side_effects.length) properties.push(make_node(AST_DestructuredKeyVal, node, {
                            key: make_sequence(node, side_effects),
                            value: make_void_lhs(node),
                        }));
                        return make_node(AST_DestructuredObject, node, { properties: properties });
                    }
                    if (node instanceof AST_SymbolFunarg) return null;
                });
                var lhs = [];
                fn.argnames.forEach(function(argname, index) {
                    argname = argname.transform(tt);
                    if (argname) lhs[index] = argname;
                });
                var rest = fn.rest && fn.rest.transform(tt);
                if (rest) lhs.length = fn.argnames.length;
                fill_holes(fn, lhs);
                args[0] = make_node(AST_Assign, self, {
                    operator: "=",
                    left: make_node(AST_DestructuredArray, fn, {
                        elements: lhs,
                        rest: rest,
                    }),
                    right: args[0],
                });
            } else fn.argnames.forEach(function(argname) {
                if (argname instanceof AST_DefaultValue) args.push(argname.value);
            });
            args.push(value || make_node(AST_Undefined, self));
            return args;
        }

        function noop_value() {
            return self.call_only ? make_node(AST_Number, self, { value: 0 }) : make_node(AST_Undefined, self);
        }

        function return_value(stat) {
            if (!stat) return noop_value();
            if (stat instanceof AST_Return) return stat.value || noop_value();
            if (stat instanceof AST_SimpleStatement) {
                return self.call_only ? stat.body : make_node(AST_UnaryPrefix, stat, {
                    operator: "void",
                    expression: stat.body,
                });
            }
        }

        function can_flatten_body(stat) {
            var len = fn.body.length;
            if (len < 2) {
                stat = return_value(stat);
                if (stat) return stat;
            }
            if (compressor.option("inline") < 3) return false;
            stat = null;
            for (var i = 0; i < len; i++) {
                var line = fn.body[i];
                if (line instanceof AST_Var) {
                    if (var_assigned) {
                        if (!stat) continue;
                        if (!(stat instanceof AST_SimpleStatement)) return false;
                        if (!declarations_only(line)) stat = null;
                    } else if (!declarations_only(line)) {
                        if (stat && !(stat instanceof AST_SimpleStatement)) return false;
                        stat = null;
                        var_assigned = true;
                    }
                } else if (line instanceof AST_AsyncDefun
                    || line instanceof AST_Defun
                    || line instanceof AST_EmptyStatement) {
                    continue;
                } else if (stat) {
                    return false;
                } else {
                    stat = line;
                }
            }
            return return_value(stat);
        }

        function resolve_index(def) {
            for (var i = fn.argnames.length; --i >= 0;) {
                if (fn.argnames[i].definition() === def) return i;
            }
        }

        function can_substitute_directly() {
            if (has_default || has_destructured || has_spread || var_assigned || fn.rest) return;
            if (compressor.option("inline") < 2 && fn.argnames.length) return;
            if (!fn.variables.all(function(def) {
                return def.references.length - def.replaced < 2 && def.orig[0] instanceof AST_SymbolFunarg;
            })) return;
            var scope = compressor.find_parent(AST_Scope);
            var abort = false;
            var avoid = avoid_await_yield(compressor, scope);
            var begin;
            var in_order = [];
            var side_effects = false;
            var tw = new TreeWalker(function(node, descend) {
                if (abort) return true;
                if (node instanceof AST_Binary && lazy_op[node.operator]
                    || node instanceof AST_Conditional) {
                    in_order = null;
                    return;
                }
                if (node instanceof AST_Class) return abort = true;
                if (node instanceof AST_Destructured) {
                    side_effects = true;
                    return;
                }
                if (node instanceof AST_Scope) return abort = true;
                if (avoid && node instanceof AST_Symbol && avoid[node.name]) return abort = true;
                if (node instanceof AST_SymbolRef) {
                    var def = node.definition();
                    if (fn.variables.get(node.name) !== def) {
                        in_order = null;
                        return;
                    }
                    if (def.init instanceof AST_LambdaDefinition) return abort = true;
                    if (is_lhs(node, tw.parent())) return abort = true;
                    var index = resolve_index(def);
                    if (!(begin < index)) begin = index;
                    if (!in_order) return;
                    if (side_effects) {
                        in_order = null;
                    } else {
                        in_order.push(fn.argnames[index]);
                    }
                    return;
                }
                if (side_effects) return;
                if (node instanceof AST_Assign && node.left instanceof AST_PropAccess) {
                    node.left.expression.walk(tw);
                    if (node.left instanceof AST_Sub) node.left.property.walk(tw);
                    node.right.walk(tw);
                    side_effects = true;
                    return true;
                }
                if (node.has_side_effects(compressor)) {
                    descend();
                    side_effects = true;
                    return true;
                }
            });
            value.walk(tw);
            if (abort) return;
            var end = self.args.length;
            if (in_order && fn.argnames.length >= end) {
                end = fn.argnames.length;
                while (end-- > begin && fn.argnames[end] === in_order.pop());
                end++;
            }
            return end <= begin || all(self.args.slice(begin, end), side_effects && !in_order ? function(funarg) {
                return funarg.is_constant_expression(scope);
            } : function(funarg) {
                return !funarg.has_side_effects(compressor);
            });
        }

        function var_exists(defined, name) {
            return defined.has(name) || identifier_atom[name] || scope.var_names().has(name);
        }

        function can_inject_args(defined, safe_to_inject) {
            var abort = false;
            fn.each_argname(function(arg) {
                if (abort) return;
                if (arg.unused) return;
                if (!safe_to_inject || var_exists(defined, arg.name)) return abort = true;
                arg_used.set(arg.name, true);
                if (in_loop) in_loop.push(arg.definition());
            });
            return !abort;
        }

        function can_inject_vars(defined, safe_to_inject) {
            for (var i = 0; i < fn.body.length; i++) {
                var stat = fn.body[i];
                if (stat instanceof AST_LambdaDefinition) {
                    var name = stat.name;
                    if (!safe_to_inject) return false;
                    if (arg_used.has(name.name)) return false;
                    if (var_exists(defined, name.name)) return false;
                    if (!all(stat.enclosed, function(def) {
                        return def.scope === scope || def.scope === stat || !defined.has(def.name);
                    })) return false;
                    if (in_loop) in_loop.push(name.definition());
                    continue;
                }
                if (!(stat instanceof AST_Var)) continue;
                if (!safe_to_inject) return false;
                for (var j = stat.definitions.length; --j >= 0;) {
                    var name = stat.definitions[j].name;
                    if (var_exists(defined, name.name)) return false;
                    if (in_loop) in_loop.push(name.definition());
                }
            }
            return true;
        }

        function can_inject_symbols() {
            var defined = new Dictionary();
            var level = 0, child;
            scope = current;
            do {
                if (scope.variables) scope.variables.each(function(def) {
                    defined.set(def.name, true);
                });
                child = scope;
                scope = compressor.parent(level++);
                if (scope instanceof AST_ClassField) {
                    if (!scope.static) return false;
                } else if (scope instanceof AST_DWLoop) {
                    in_loop = [];
                } else if (scope instanceof AST_For) {
                    if (scope.init === child) continue;
                    in_loop = [];
                } else if (scope instanceof AST_ForEnumeration) {
                    if (scope.init === child) continue;
                    if (scope.object === child) continue;
                    in_loop = [];
                }
            } while (!(scope instanceof AST_Scope));
            insert = scope.body.indexOf(child) + 1;
            if (!insert) return false;
            if (!safe_from_await_yield(fn, avoid_await_yield(compressor, scope))) return false;
            var safe_to_inject = (exp !== fn || fn.parent_scope.resolve() === scope) && !scope.pinned();
            if (scope instanceof AST_Toplevel) {
                if (compressor.toplevel.vars) {
                    defined.set("arguments", true);
                } else {
                    safe_to_inject = false;
                }
            }
            arg_used = new Dictionary();
            var inline = compressor.option("inline");
            if (!can_inject_args(defined, inline >= 2 && safe_to_inject)) return false;
            if (!can_inject_vars(defined, inline >= 3 && safe_to_inject)) return false;
            return !in_loop || in_loop.length == 0 || !is_reachable(fn, in_loop);
        }

        function append_var(decls, expressions, name, value) {
            var def = name.definition();
            if (!scope.var_names().has(name.name)) {
                def.first_decl = null;
                scope.var_names().set(name.name, true);
                decls.push(make_node(AST_VarDef, name, {
                    name: name,
                    value: null,
                }));
            }
            scope.variables.set(name.name, def);
            scope.enclosed.push(def);
            if (!value) return;
            var sym = make_node(AST_SymbolRef, name);
            def.assignments++;
            def.references.push(sym);
            expressions.push(make_node(AST_Assign, self, {
                operator: "=",
                left: sym,
                right: value,
            }));
        }

        function flatten_args(decls, expressions) {
            var len = fn.argnames.length;
            for (var i = self.args.length; --i >= len;) {
                expressions.push(self.args[i]);
            }
            var default_args = [];
            for (i = len; --i >= 0;) {
                var argname = fn.argnames[i];
                var name;
                if (argname instanceof AST_DefaultValue) {
                    default_args.push(argname);
                    name = argname.name;
                } else {
                    name = argname;
                }
                var value = self.args[i];
                if (name.unused || scope.var_names().has(name.name)) {
                    if (value) expressions.push(value);
                } else {
                    var symbol = make_node(AST_SymbolVar, name);
                    var def = name.definition();
                    def.orig.push(symbol);
                    def.eliminated++;
                    if (name.unused !== undefined) {
                        append_var(decls, expressions, symbol);
                        if (value) expressions.push(value);
                    } else {
                        if (!value && argname === name && (in_loop
                            || name.name == "arguments" && !is_arrow(fn) && is_arrow(scope))) {
                            value = make_node(AST_Undefined, self);
                        }
                        append_var(decls, expressions, symbol, value);
                    }
                }
            }
            decls.reverse();
            expressions.reverse();
            for (i = default_args.length; --i >= 0;) {
                var node = default_args[i];
                if (node.name.unused !== undefined) {
                    expressions.push(node.value);
                } else {
                    var sym = make_node(AST_SymbolRef, node.name);
                    node.name.definition().references.push(sym);
                    expressions.push(make_node(AST_Assign, node, {
                        operator: "=",
                        left: sym,
                        right: node.value,
                    }));
                }
            }
        }

        function flatten_destructured(decls, expressions) {
            expressions.push(make_node(AST_Assign, self, {
                operator: "=",
                left: make_node(AST_DestructuredArray, self, {
                    elements: fn.argnames.map(function(argname) {
                        if (argname.unused) return make_node(AST_Hole, argname);
                        return argname.convert_symbol(AST_SymbolRef, process);
                    }),
                    rest: fn.rest && fn.rest.convert_symbol(AST_SymbolRef, process),
                }),
                right: make_node(AST_Array, self, { elements: self.args.slice() }),
            }));

            function process(ref, name) {
                if (name.unused) return make_void_lhs(name);
                var def = name.definition();
                def.assignments++;
                def.references.push(ref);
                var symbol = make_node(AST_SymbolVar, name);
                def.orig.push(symbol);
                def.eliminated++;
                append_var(decls, expressions, symbol);
            }
        }

        function flatten_vars(decls, expressions) {
            var args = [ insert, 0 ];
            var decl_var = [], expr_fn = [], expr_var = [], expr_loop = [], exprs = [];
            fn.body.filter(in_loop ? function(stat) {
                if (!(stat instanceof AST_LambdaDefinition)) return true;
                var name = make_node(AST_SymbolVar, flatten_var(stat.name));
                var def = name.definition();
                def.fixed = false;
                def.orig.push(name);
                def.eliminated++;
                append_var(decls, expr_fn, name, to_func_expr(stat, true));
                return false;
            } : function(stat) {
                if (!(stat instanceof AST_LambdaDefinition)) return true;
                var def = stat.name.definition();
                scope.functions.set(def.name, def);
                scope.variables.set(def.name, def);
                scope.enclosed.push(def);
                scope.var_names().set(def.name, true);
                args.push(stat);
                return false;
            }).forEach(function(stat) {
                if (!(stat instanceof AST_Var)) {
                    if (stat instanceof AST_SimpleStatement) exprs.push(stat.body);
                    return;
                }
                for (var j = 0; j < stat.definitions.length; j++) {
                    var var_def = stat.definitions[j];
                    var name = flatten_var(var_def.name);
                    var value = var_def.value;
                    if (value && exprs.length > 0) {
                        exprs.push(value);
                        value = make_sequence(var_def, exprs);
                        exprs = [];
                    }
                    append_var(decl_var, expr_var, name, value);
                    if (!in_loop) continue;
                    if (arg_used.has(name.name)) continue;
                    if (name.definition().orig.length == 1 && fn.functions.has(name.name)) continue;
                    expr_loop.push(init_ref(compressor, name));
                }
            });
            [].push.apply(decls, decl_var);
            [].push.apply(expressions, expr_loop);
            [].push.apply(expressions, expr_fn);
            [].push.apply(expressions, expr_var);
            return args;
        }

        function flatten_fn() {
            var decls = [];
            var expressions = [];
            if (has_default > 1 || has_destructured || has_spread || fn.rest) {
                flatten_destructured(decls, expressions);
            } else {
                flatten_args(decls, expressions);
            }
            var args = flatten_vars(decls, expressions);
            expressions.push(value);
            if (decls.length) args.push(make_node(AST_Var, fn, { definitions: decls }));
            [].splice.apply(scope.body, args);
            fn.enclosed.forEach(function(def) {
                if (scope.var_names().has(def.name)) return;
                scope.enclosed.push(def);
                scope.var_names().set(def.name, true);
            });
            return expressions;
        }
    });

    OPT(AST_New, function(self, compressor) {
        if (compressor.option("unsafe")) {
            var exp = self.expression;
            if (is_undeclared_ref(exp)) switch (exp.name) {
              case "Array":
              case "Error":
              case "Function":
              case "Object":
              case "RegExp":
                return make_node(AST_Call, self).transform(compressor);
            }
        }
        if (compressor.option("sequences")) {
            var seq = lift_sequence_in_expression(self, compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        if (compressor.option("unused")) drop_unused_call_args(self, compressor);
        return self;
    });

    // (a = b, x && a = c) ---> a = x ? c : b
    // (a = b, x || a = c) ---> a = x ? b : c
    function to_conditional_assignment(compressor, def, value, node) {
        if (!(node instanceof AST_Binary)) return;
        if (!(node.operator == "&&" || node.operator == "||")) return;
        if (!(node.right instanceof AST_Assign)) return;
        if (node.right.operator != "=") return;
        if (!(node.right.left instanceof AST_SymbolRef)) return;
        if (node.right.left.definition() !== def) return;
        if (value.has_side_effects(compressor)) return;
        if (!safe_from_assignment(node.left)) return;
        if (!safe_from_assignment(node.right.right)) return;
        def.replaced++;
        return node.operator == "&&" ? make_node(AST_Conditional, node, {
            condition: node.left,
            consequent: node.right.right,
            alternative: value,
        }) : make_node(AST_Conditional, node, {
            condition: node.left,
            consequent: value,
            alternative: node.right.right,
        });

        function safe_from_assignment(node) {
            if (node.has_side_effects(compressor)) return;
            var hit = false;
            node.walk(new TreeWalker(function(node) {
                if (hit) return true;
                if (node instanceof AST_SymbolRef && node.definition() === def) return hit = true;
            }));
            return !hit;
        }
    }

    OPT(AST_Sequence, function(self, compressor) {
        var expressions = filter_for_side_effects();
        var end = expressions.length - 1;
        merge_assignments();
        trim_right_for_undefined();
        if (end == 0) {
            self = maintain_this_binding(compressor.parent(), compressor.self(), expressions[0]);
            if (!(self instanceof AST_Sequence)) self = self.optimize(compressor);
            return self;
        }
        self.expressions = expressions;
        return self;

        function filter_for_side_effects() {
            if (!compressor.option("side_effects")) return self.expressions;
            var expressions = [];
            var first = first_in_statement(compressor);
            var last = self.expressions.length - 1;
            self.expressions.forEach(function(expr, index) {
                if (index < last) expr = expr.drop_side_effect_free(compressor, first);
                if (expr) {
                    merge_sequence(expressions, expr);
                    first = false;
                }
            });
            return expressions;
        }

        function trim_right_for_undefined() {
            if (!compressor.option("side_effects")) return;
            while (end > 0 && is_undefined(expressions[end], compressor)) end--;
            if (end < expressions.length - 1) {
                expressions[end] = make_node(AST_UnaryPrefix, self, {
                    operator: "void",
                    expression: expressions[end],
                });
                expressions.length = end + 1;
            }
        }

        function is_simple_assign(node) {
            return node instanceof AST_Assign
                && node.operator == "="
                && node.left instanceof AST_SymbolRef
                && node.left.definition();
        }

        function merge_assignments() {
            for (var i = 1; i < end; i++) {
                var prev = expressions[i - 1];
                var def = is_simple_assign(prev);
                if (!def) continue;
                var expr = expressions[i];
                if (compressor.option("conditionals")) {
                    var cond = to_conditional_assignment(compressor, def, prev.right, expr);
                    if (cond) {
                        prev.right = cond;
                        expressions.splice(i--, 1);
                        end--;
                        continue;
                    }
                }
                if (compressor.option("dead_code")
                    && is_simple_assign(expr) === def
                    && expr.right.is_constant_expression(def.scope.resolve())) {
                    expressions[--i] = prev.right;
                }
            }
        }
    });

    OPT(AST_UnaryPostfix, function(self, compressor) {
        if (compressor.option("sequences")) {
            var seq = lift_sequence_in_expression(self, compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        return try_evaluate(compressor, self);
    });

    var SIGN_OPS = makePredicate("+ -");
    var MULTIPLICATIVE_OPS = makePredicate("* / %");
    OPT(AST_UnaryPrefix, function(self, compressor) {
        var op = self.operator;
        var exp = self.expression;
        if (compressor.option("sequences") && can_lift()) {
            var seq = lift_sequence_in_expression(self, compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        switch (op) {
          case "+":
            if (!compressor.option("evaluate")) break;
            if (!exp.is_number(compressor, true)) break;
            var parent = compressor.parent();
            if (parent instanceof AST_UnaryPrefix && parent.operator == "delete") break;
            return exp;
          case "-":
            if (exp instanceof AST_Infinity) exp = exp.transform(compressor);
            // avoids infinite recursion of numerals
            if (exp instanceof AST_Number || exp instanceof AST_Infinity) return self;
            break;
          case "!":
            if (!compressor.option("booleans")) break;
            if (exp.is_truthy()) return make_sequence(self, [ exp, make_node(AST_False, self) ]).optimize(compressor);
            if (compressor.in_boolean_context()) {
                // !!foo ---> foo, if we're in boolean context
                if (exp instanceof AST_UnaryPrefix && exp.operator == "!") return exp.expression;
                if (exp instanceof AST_Binary) {
                    var first = first_in_statement(compressor);
                    self = (first ? best_of_statement : best_of_expression)(self, exp.negate(compressor, first));
                }
            }
            break;
          case "delete":
            if (!compressor.option("evaluate")) break;
            if (may_not_delete(exp)) break;
            return make_sequence(self, [ exp, make_node(AST_True, self) ]).optimize(compressor);
          case "typeof":
            if (!compressor.option("booleans")) break;
            if (!compressor.in_boolean_context()) break;
            // typeof always returns a non-empty string, thus always truthy
            AST_Node.warn("Boolean expression always true [{start}]", self);
            var exprs = [ make_node(AST_True, self) ];
            if (!(exp instanceof AST_SymbolRef && can_drop_symbol(exp, compressor))) exprs.unshift(exp);
            return make_sequence(self, exprs).optimize(compressor);
          case "void":
            if (!compressor.option("side_effects")) break;
            exp = exp.drop_side_effect_free(compressor);
            if (!exp) return make_node(AST_Undefined, self).optimize(compressor);
            self.expression = exp;
            return self;
        }
        if (compressor.option("evaluate")
            && exp instanceof AST_Binary
            && SIGN_OPS[op]
            && MULTIPLICATIVE_OPS[exp.operator]
            && (exp.left.is_constant() || !exp.right.has_side_effects(compressor))) {
            return make_node(AST_Binary, self, {
                operator: exp.operator,
                left: make_node(AST_UnaryPrefix, exp.left, {
                    operator: op,
                    expression: exp.left,
                }),
                right: exp.right,
            });
        }
        return try_evaluate(compressor, self);

        function may_not_delete(node) {
            return node instanceof AST_Infinity
                || node instanceof AST_NaN
                || node instanceof AST_NewTarget
                || node instanceof AST_PropAccess
                || node instanceof AST_SymbolRef
                || node instanceof AST_Undefined;
        }

        function can_lift() {
            switch (op) {
              case "delete":
                return !may_not_delete(exp.tail_node());
              case "typeof":
                return !is_undeclared_ref(exp.tail_node());
              default:
                return true;
            }
        }
    });

    OPT(AST_Await, function(self, compressor) {
        if (!compressor.option("awaits")) return self;
        if (compressor.option("sequences")) {
            var seq = lift_sequence_in_expression(self, compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        if (compressor.option("side_effects")) {
            var exp = self.expression;
            if (exp instanceof AST_Await) return exp.optimize(compressor);
            if (exp instanceof AST_UnaryPrefix && exp.expression instanceof AST_Await) return exp.optimize(compressor);
            for (var level = 0, node = self, parent; parent = compressor.parent(level++); node = parent) {
                if (is_arrow(parent)) {
                    if (parent.value === node) return exp.optimize(compressor);
                } else if (parent instanceof AST_Return) {
                    var drop = true;
                    do {
                        node = parent;
                        parent = compressor.parent(level++);
                        if (parent instanceof AST_Try && (parent.bfinally || parent.bcatch) !== node) {
                            drop = false;
                            break;
                        }
                    } while (parent && !(parent instanceof AST_Scope));
                    if (drop) return exp.optimize(compressor);
                } else if (parent instanceof AST_Sequence) {
                    if (parent.tail_node() === node) continue;
                }
                break;
            }
        }
        return self;
    });

    OPT(AST_Yield, function(self, compressor) {
        if (!compressor.option("yields")) return self;
        if (compressor.option("sequences")) {
            var seq = lift_sequence_in_expression(self, compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        var exp = self.expression;
        if (self.nested && exp.TYPE == "Call") {
            var inlined = exp.clone().optimize(compressor);
            if (inlined.TYPE != "Call") return inlined;
        }
        return self;
    });

    AST_Binary.DEFMETHOD("lift_sequences", function(compressor) {
        if (this.left instanceof AST_PropAccess) {
            if (!(this.left.expression instanceof AST_Sequence)) return this;
            var x = this.left.expression.expressions.slice();
            var e = this.clone();
            e.left = e.left.clone();
            e.left.expression = x.pop();
            x.push(e);
            return make_sequence(this, x);
        }
        if (this.left instanceof AST_Sequence) {
            var x = this.left.expressions.slice();
            var e = this.clone();
            e.left = x.pop();
            x.push(e);
            return make_sequence(this, x);
        }
        if (this.right instanceof AST_Sequence) {
            if (this.left.has_side_effects(compressor)) return this;
            var assign = this.operator == "=" && this.left instanceof AST_SymbolRef;
            var x = this.right.expressions;
            var last = x.length - 1;
            for (var i = 0; i < last; i++) {
                if (!assign && x[i].has_side_effects(compressor)) break;
            }
            if (i == last) {
                x = x.slice();
                var e = this.clone();
                e.right = x.pop();
                x.push(e);
                return make_sequence(this, x);
            }
            if (i > 0) {
                var e = this.clone();
                e.right = make_sequence(this.right, x.slice(i));
                x = x.slice(0, i);
                x.push(e);
                return make_sequence(this, x);
            }
        }
        return this;
    });

    var indexFns = makePredicate("indexOf lastIndexOf");
    var commutativeOperators = makePredicate("== === != !== * & | ^");
    function is_object(node, plain) {
        if (node instanceof AST_Assign) return !plain && node.operator == "=" && is_object(node.right);
        if (node instanceof AST_New) return !plain;
        if (node instanceof AST_Sequence) return is_object(node.tail_node(), plain);
        if (node instanceof AST_SymbolRef) return !plain && is_object(node.fixed_value());
        return node instanceof AST_Array
            || node instanceof AST_Class
            || node instanceof AST_Lambda
            || node instanceof AST_Object;
    }

    function can_drop_op(node, compressor) {
        var rhs = node.right;
        switch (node.operator) {
          case "in":
            return is_object(rhs) || compressor && compressor.option("unsafe_comps");
          case "instanceof":
            if (rhs instanceof AST_SymbolRef) rhs = rhs.fixed_value();
            if (rhs instanceof AST_Defun || rhs instanceof AST_Function || is_generator(rhs)) return true;
            if (is_lambda(rhs) && node.left.is_constant()) return true;
            return compressor && compressor.option("unsafe_comps");
          default:
            return true;
        }
    }

    function needs_enqueuing(compressor, node) {
        if (node.is_constant()) return true;
        if (node instanceof AST_Assign) return node.operator != "=" || needs_enqueuing(compressor, node.right);
        if (node instanceof AST_Binary) {
            return !lazy_op[node.operator]
                || needs_enqueuing(compressor, node.left) && needs_enqueuing(compressor, node.right);
        }
        if (node instanceof AST_Call) {
            if (!is_async(node.expression)) return false;
            var has_await = false;
            walk_body(node.expression, new TreeWalker(function(expr) {
                if (has_await) return true;
                if (expr instanceof AST_Await) return has_await = true;
                if (expr !== node && expr instanceof AST_Scope) return true;
            }));
            return !has_await;
        }
        if (node instanceof AST_Conditional) {
            return needs_enqueuing(compressor, node.consequent) && needs_enqueuing(compressor, node.alternative);
        }
        if (node instanceof AST_Sequence) return needs_enqueuing(compressor, node.tail_node());
        if (node instanceof AST_SymbolRef) {
            var fixed = node.fixed_value();
            return fixed && needs_enqueuing(compressor, fixed);
        }
        if (node instanceof AST_Template) return !node.tag || is_raw_tag(compressor, node.tag);
        if (node instanceof AST_Unary) return true;
    }

    function extract_lhs(node, compressor) {
        if (node instanceof AST_Assign) return is_lhs_read_only(node.left, compressor) ? node : node.left;
        if (node instanceof AST_Sequence) return extract_lhs(node.tail_node(), compressor);
        if (node instanceof AST_UnaryPrefix && UNARY_POSTFIX[node.operator]) {
            return is_lhs_read_only(node.expression, compressor) ? node : node.expression;
        }
        return node;
    }

    function repeatable(compressor, node) {
        if (node instanceof AST_Dot) return repeatable(compressor, node.expression);
        if (node instanceof AST_Sub) {
            return repeatable(compressor, node.expression) && repeatable(compressor, node.property);
        }
        if (node instanceof AST_Symbol) return true;
        return !node.has_side_effects(compressor);
    }

    function swap_chain(self, compressor) {
        var rhs = self.right.tail_node();
        if (rhs !== self.right) {
            var exprs = self.right.expressions.slice(0, -1);
            exprs.push(rhs.left);
            rhs = rhs.clone();
            rhs.left = make_sequence(self.right, exprs);
            self.right = rhs;
        }
        self.left = make_node(AST_Binary, self, {
            operator: self.operator,
            left: self.left,
            right: rhs.left,
            start: self.left.start,
            end: rhs.left.end,
        });
        self.right = rhs.right;
        if (compressor) {
            var left = self.left.transform(compressor);
            if (left !== self.left) {
                self = self.clone();
                self.left = left;
            }
            return self;
        }
        if (self.operator == rhs.left.operator) swap_chain(self.left);
    }

    OPT(AST_Binary, function(self, compressor) {
        if (commutativeOperators[self.operator]
            && self.right.is_constant()
            && !self.left.is_constant()
            && !(self.left instanceof AST_Binary
                && PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator])) {
            // if right is a constant, whatever side effects the
            // left side might have could not influence the
            // result.  hence, force switch.
            reverse();
        }
        if (compressor.option("sequences")) {
            var seq = self.lift_sequences(compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        if (compressor.option("assignments") && lazy_op[self.operator]) {
            var lhs = extract_lhs(self.left, compressor);
            var right = self.right;
            // a || (a = x) ---> a = a || x
            // (a = x) && (a = y) ---> a = (a = x) && y
            if (lhs instanceof AST_SymbolRef
                && right instanceof AST_Assign
                && right.operator == "="
                && lhs.equals(right.left)) {
                lhs = lhs.clone();
                var assign = make_node(AST_Assign, self, {
                    operator: "=",
                    left: lhs,
                    right: make_node(AST_Binary, self, {
                        operator: self.operator,
                        left: self.left,
                        right: right.right,
                    }),
                });
                if (lhs.fixed) {
                    lhs.fixed = function() {
                        return assign.right;
                    };
                    lhs.fixed.assigns = [ assign ];
                }
                var def = lhs.definition();
                def.references.push(lhs);
                def.replaced++;
                return assign.optimize(compressor);
            }
        }
        if (compressor.option("comparisons")) switch (self.operator) {
          case "===":
          case "!==":
            if (is_undefined(self.left, compressor) && self.right.is_defined(compressor)) {
                AST_Node.warn("Expression always defined [{start}]", self);
                return make_sequence(self, [
                    self.right,
                    make_node(self.operator == "===" ? AST_False : AST_True, self),
                ]).optimize(compressor);
            }
            var is_strict_comparison = true;
            if ((self.left.is_string(compressor) && self.right.is_string(compressor)) ||
                (self.left.is_number(compressor) && self.right.is_number(compressor)) ||
                (self.left.is_boolean(compressor) && self.right.is_boolean(compressor)) ||
                repeatable(compressor, self.left) && self.left.equals(self.right)) {
                self.operator = self.operator.slice(0, 2);
            }
            // XXX: intentionally falling down to the next case
          case "==":
          case "!=":
            // void 0 == x ---> null == x
            if (!is_strict_comparison && is_undefined(self.left, compressor)) {
                self.left = make_node(AST_Null, self.left);
            }
            // "undefined" == typeof x ---> undefined === x
            else if (compressor.option("typeofs")
                && self.left instanceof AST_String
                && self.left.value == "undefined"
                && self.right instanceof AST_UnaryPrefix
                && self.right.operator == "typeof") {
                var expr = self.right.expression;
                if (expr instanceof AST_SymbolRef ? expr.is_declared(compressor)
                    : !(expr instanceof AST_PropAccess && compressor.option("ie"))) {
                    self.right = expr;
                    self.left = make_node(AST_Undefined, self.left).optimize(compressor);
                    if (self.operator.length == 2) self.operator += "=";
                }
            }
            // obj !== obj ---> false
            else if (self.left instanceof AST_SymbolRef
                && self.right instanceof AST_SymbolRef
                && self.left.definition() === self.right.definition()
                && is_object(self.left)) {
                return make_node(self.operator[0] == "=" ? AST_True : AST_False, self).optimize(compressor);
            }
            break;
          case "&&":
          case "||":
            // void 0 !== x && null !== x ---> null != x
            // void 0 === x.a || null === x.a ---> null == x.a
            var left = self.left;
            if (left.inlined_node) left = left.inlined_node;
            if (!(left instanceof AST_Binary)) break;
            if (left.operator != (self.operator == "&&" ? "!==" : "===")) break;
            var right = self.right;
            if (right.inlined_node) right = right.inlined_node;
            if (!(right instanceof AST_Binary)) break;
            if (left.operator != right.operator) break;
            if (is_undefined(left.left, compressor) && right.left instanceof AST_Null
                || left.left instanceof AST_Null && is_undefined(right.left, compressor)) {
                var expr = extract_lhs(left.right, compressor);
                if (!repeatable(compressor, expr)) break;
                if (!expr.equals(right.right)) break;
                left.operator = left.operator.slice(0, -1);
                left.left = make_node(AST_Null, self);
                return left;
            }
            break;
        }
        var in_bool = false;
        var parent = compressor.parent();
        if (compressor.option("booleans")) {
            var lhs = extract_lhs(self.left, compressor);
            if (lazy_op[self.operator] && repeatable(compressor, lhs)) {
                // a || a ---> a
                // (a = x) && a --> a = x
                if (lhs.equals(self.right)) {
                    return maintain_this_binding(parent, compressor.self(), self.left).optimize(compressor);
                }
                mark_duplicate_condition(compressor, lhs);
            }
            in_bool = compressor.in_boolean_context();
        }
        if (in_bool) switch (self.operator) {
          case "+":
            var ev = self.left.evaluate(compressor, true);
            if (ev && typeof ev == "string" || (ev = self.right.evaluate(compressor, true)) && typeof ev == "string") {
                AST_Node.warn("+ in boolean context always true [{start}]", self);
                var exprs = [];
                if (self.left.evaluate(compressor) instanceof AST_Node) exprs.push(self.left);
                if (self.right.evaluate(compressor) instanceof AST_Node) exprs.push(self.right);
                switch (exprs.length) {
                  case 0:
                    return make_node(AST_True, self).optimize(compressor);
                  case 1:
                    exprs[0] = exprs[0].clone();
                    exprs.push(make_node(AST_True, self));
                    return make_sequence(self, exprs).optimize(compressor);
                }
                self.truthy = true;
            }
            break;
          case "==":
            if (self.left instanceof AST_String && self.left.value == "" && self.right.is_string(compressor)) {
                return make_node(AST_UnaryPrefix, self, {
                    operator: "!",
                    expression: self.right,
                }).optimize(compressor);
            }
            break;
          case "!=":
            if (self.left instanceof AST_String && self.left.value == "" && self.right.is_string(compressor)) {
                return self.right.optimize(compressor);
            }
            break;
        }
        if (compressor.option("comparisons") && self.is_boolean(compressor)) {
            if (parent.TYPE != "Binary") {
                var negated = make_node(AST_UnaryPrefix, self, {
                    operator: "!",
                    expression: self.negate(compressor),
                });
                if (best_of(compressor, self, negated) === negated) return negated;
            }
            switch (self.operator) {
              case ">": reverse("<"); break;
              case ">=": reverse("<="); break;
            }
        }
        if (compressor.option("conditionals") && lazy_op[self.operator]) {
            if (self.left instanceof AST_Binary && self.operator == self.left.operator) {
                var before = make_node(AST_Binary, self, {
                    operator: self.operator,
                    left: self.left.right,
                    right: self.right,
                });
                var after = before.transform(compressor);
                if (before !== after) {
                    self.left = self.left.left;
                    self.right = after;
                }
            }
            // x && (y && z) ---> x && y && z
            // w || (x, y || z) ---> w || (x, y) || z
            var rhs = self.right.tail_node();
            if (rhs instanceof AST_Binary && self.operator == rhs.operator) self = swap_chain(self, compressor);
        }
        if (compressor.option("strings") && self.operator == "+") {
            // "foo" + 42 + "" ---> "foo" + 42
            if (self.right instanceof AST_String
                && self.right.value == ""
                && self.left.is_string(compressor)) {
                return self.left.optimize(compressor);
            }
            // "" + ("foo" + 42) ---> "foo" + 42
            if (self.left instanceof AST_String
                && self.left.value == ""
                && self.right.is_string(compressor)) {
                return self.right.optimize(compressor);
            }
            // "" + 42 + "foo" ---> 42 + "foo"
            if (self.left instanceof AST_Binary
                && self.left.operator == "+"
                && self.left.left instanceof AST_String
                && self.left.left.value == ""
                && self.right.is_string(compressor)
                && (self.left.right.is_constant() || !self.right.has_side_effects(compressor))) {
                self.left = self.left.right;
                return self.optimize(compressor);
            }
            // "x" + (y + "z") ---> "x" + y + "z"
            // w + (x, "y" + z) ---> w + (x, "y") + z
            var rhs = self.right.tail_node();
            if (rhs instanceof AST_Binary
                && self.operator == rhs.operator
                && (self.left.is_string(compressor) && rhs.is_string(compressor)
                    || rhs.left.is_string(compressor)
                        && (self.left.is_constant() || !rhs.right.has_side_effects(compressor)))) {
                self = swap_chain(self, compressor);
            }
        }
        if (compressor.option("evaluate")) {
            var associative = true;
            switch (self.operator) {
              case "&&":
                var ll = fuzzy_eval(compressor, self.left);
                if (!ll) {
                    AST_Node.warn("Condition left of && always false [{start}]", self);
                    return maintain_this_binding(parent, compressor.self(), self.left).optimize(compressor);
                } else if (!(ll instanceof AST_Node)) {
                    AST_Node.warn("Condition left of && always true [{start}]", self);
                    return make_sequence(self, [ self.left, self.right ]).optimize(compressor);
                }
                if (!self.right.evaluate(compressor, true)) {
                    if (in_bool && !(self.right.evaluate(compressor) instanceof AST_Node)) {
                        AST_Node.warn("Boolean && always false [{start}]", self);
                        return make_sequence(self, [ self.left, make_node(AST_False, self) ]).optimize(compressor);
                    } else self.falsy = true;
                } else if ((in_bool || parent.operator == "&&" && parent.left === compressor.self())
                    && !(self.right.evaluate(compressor) instanceof AST_Node)) {
                    AST_Node.warn("Dropping side-effect-free && [{start}]", self);
                    return self.left.optimize(compressor);
                }
                // (x || false) && y ---> x ? y : false
                if (self.left.operator == "||") {
                    var lr = fuzzy_eval(compressor, self.left.right);
                    if (!lr) return make_node(AST_Conditional, self, {
                        condition: self.left.left,
                        consequent: self.right,
                        alternative: self.left.right,
                    }).optimize(compressor);
                }
                break;
              case "??":
                var nullish = true;
              case "||":
                var ll = fuzzy_eval(compressor, self.left, nullish);
                if (nullish ? ll == null : !ll) {
                    AST_Node.warn("Condition left of {operator} always {value} [{start}]", {
                        operator: self.operator,
                        value: nullish ? "nullish" : "false",
                        start: self.start,
                    });
                    return make_sequence(self, [ self.left, self.right ]).optimize(compressor);
                } else if (!(ll instanceof AST_Node)) {
                    AST_Node.warn("Condition left of {operator} always {value} [{start}]", {
                        operator: self.operator,
                        value: nullish ? "defined" : "true",
                        start: self.start,
                    });
                    return maintain_this_binding(parent, compressor.self(), self.left).optimize(compressor);
                }
                var rr;
                if (!nullish && (rr = self.right.evaluate(compressor, true)) && !(rr instanceof AST_Node)) {
                    if (in_bool && !(self.right.evaluate(compressor) instanceof AST_Node)) {
                        AST_Node.warn("Boolean || always true [{start}]", self);
                        return make_sequence(self, [ self.left, make_node(AST_True, self) ]).optimize(compressor);
                    } else self.truthy = true;
                } else if ((in_bool || parent.operator == "||" && parent.left === compressor.self())
                    && !self.right.evaluate(compressor)) {
                    AST_Node.warn("Dropping side-effect-free {operator} [{start}]", self);
                    return self.left.optimize(compressor);
                }
                // x && true || y ---> x ? true : y
                if (!nullish && self.left.operator == "&&") {
                    var lr = fuzzy_eval(compressor, self.left.right);
                    if (lr && !(lr instanceof AST_Node)) return make_node(AST_Conditional, self, {
                        condition: self.left.left,
                        consequent: self.left.right,
                        alternative: self.right,
                    }).optimize(compressor);
                }
                break;
              case "+":
                // "foo" + ("bar" + x) ---> "foobar" + x
                if (self.left instanceof AST_Constant
                    && self.right instanceof AST_Binary
                    && self.right.operator == "+"
                    && self.right.left instanceof AST_Constant
                    && self.right.is_string(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "+",
                        left: make_node(AST_String, self.left, {
                            value: "" + self.left.value + self.right.left.value,
                            start: self.left.start,
                            end: self.right.left.end,
                        }),
                        right: self.right.right,
                    });
                }
                // (x + "foo") + "bar" ---> x + "foobar"
                if (self.right instanceof AST_Constant
                    && self.left instanceof AST_Binary
                    && self.left.operator == "+"
                    && self.left.right instanceof AST_Constant
                    && self.left.is_string(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "+",
                        left: self.left.left,
                        right: make_node(AST_String, self.right, {
                            value: "" + self.left.right.value + self.right.value,
                            start: self.left.right.start,
                            end: self.right.end,
                        }),
                    });
                }
                // a + -b ---> a - b
                if (self.right instanceof AST_UnaryPrefix
                    && self.right.operator == "-"
                    && self.left.is_number(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "-",
                        left: self.left,
                        right: self.right.expression,
                    });
                    break;
                }
                // -a + b ---> b - a
                if (self.left instanceof AST_UnaryPrefix
                    && self.left.operator == "-"
                    && reversible()
                    && self.right.is_number(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "-",
                        left: self.right,
                        right: self.left.expression,
                    });
                    break;
                }
                // (a + b) + 3 ---> 3 + (a + b)
                if (compressor.option("unsafe_math")
                    && self.left instanceof AST_Binary
                    && PRECEDENCE[self.left.operator] == PRECEDENCE[self.operator]
                    && self.right.is_constant()
                    && (self.right.is_boolean(compressor) || self.right.is_number(compressor))
                    && self.left.is_number(compressor)
                    && !self.left.right.is_constant()
                    && (self.left.left.is_boolean(compressor) || self.left.left.is_number(compressor))) {
                    self = make_node(AST_Binary, self, {
                        operator: self.left.operator,
                        left: make_node(AST_Binary, self, {
                            operator: self.operator,
                            left: self.right,
                            right: self.left.left,
                        }),
                        right: self.left.right,
                    });
                    break;
                }
              case "-":
                // a - -b ---> a + b
                if (self.right instanceof AST_UnaryPrefix
                    && self.right.operator == "-"
                    && self.left.is_number(compressor)
                    && self.right.expression.is_number(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "+",
                        left: self.left,
                        right: self.right.expression,
                    });
                    break;
                }
              case "*":
              case "/":
                associative = compressor.option("unsafe_math");
                // +a - b ---> a - b
                // a - +b ---> a - b
                if (self.operator != "+") [ "left", "right" ].forEach(function(operand) {
                    var node = self[operand];
                    if (node instanceof AST_UnaryPrefix && node.operator == "+") {
                        var exp = node.expression;
                        if (exp.is_boolean(compressor) || exp.is_number(compressor) || exp.is_string(compressor)) {
                            self[operand] = exp;
                        }
                    }
                });
              case "&":
              case "|":
              case "^":
                // a + +b ---> +b + a
                if (self.operator != "-"
                    && self.operator != "/"
                    && (self.left.is_boolean(compressor) || self.left.is_number(compressor))
                    && (self.right.is_boolean(compressor) || self.right.is_number(compressor))
                    && reversible()
                    && !(self.left instanceof AST_Binary
                        && self.left.operator != self.operator
                        && PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator])) {
                    self = best_of(compressor, self, make_node(AST_Binary, self, {
                        operator: self.operator,
                        left: self.right,
                        right: self.left,
                    }), self.right instanceof AST_Constant && !(self.left instanceof AST_Constant));
                }
                if (!associative || !self.is_number(compressor)) break;
                // a + (b + c) ---> (a + b) + c
                if (self.right instanceof AST_Binary
                    && self.right.operator != "%"
                    && PRECEDENCE[self.right.operator] == PRECEDENCE[self.operator]
                    && self.right.is_number(compressor)
                    && (self.operator != "+"
                        || self.right.left.is_boolean(compressor)
                        || self.right.left.is_number(compressor))
                    && (self.operator != "-" || !self.left.is_negative_zero())
                    && (self.right.left.is_constant_expression()
                        || !self.right.right.has_side_effects(compressor))
                    && !is_modify_array(self.right.right)) {
                    self = make_node(AST_Binary, self, {
                        operator: align(self.operator, self.right.operator),
                        left: make_node(AST_Binary, self.left, {
                            operator: self.operator,
                            left: self.left,
                            right: self.right.left,
                            start: self.left.start,
                            end: self.right.left.end,
                        }),
                        right: self.right.right,
                    });
                    if (self.operator == "+"
                        && !self.right.is_boolean(compressor)
                        && !self.right.is_number(compressor)) {
                        self.right = make_node(AST_UnaryPrefix, self.right, {
                            operator: "+",
                            expression: self.right,
                        });
                    }
                }
                // (2 * n) * 3 ---> 6 * n
                // (n + 2) + 3 ---> n + 5
                if (self.right instanceof AST_Constant
                    && self.left instanceof AST_Binary
                    && self.left.operator != "%"
                    && PRECEDENCE[self.left.operator] == PRECEDENCE[self.operator]
                    && self.left.is_number(compressor)) {
                    if (self.left.left instanceof AST_Constant) {
                        var lhs = make_binary(self.operator, self.left.left, self.right, {
                            start: self.left.left.start,
                            end: self.right.end,
                        });
                        self = make_binary(self.left.operator, try_evaluate(compressor, lhs), self.left.right, self);
                    } else if (self.left.right instanceof AST_Constant) {
                        var op = align(self.left.operator, self.operator);
                        var rhs = try_evaluate(compressor, make_binary(op, self.left.right, self.right, self.left));
                        if (rhs.is_constant()
                            && !(self.left.operator == "-"
                                && self.right.value != 0
                                && +rhs.value == 0
                                && self.left.left.is_negative_zero())) {
                            self = make_binary(self.left.operator, self.left.left, rhs, self);
                        }
                    }
                }
                break;
              case "instanceof":
                if (!can_drop_op(self, compressor)) break;
                if (is_lambda(self.right)) return make_sequence(self, [
                    self.left,
                    self.right,
                    make_node(AST_False, self),
                ]).optimize(compressor);
                break;
            }
            if (!(parent instanceof AST_UnaryPrefix && parent.operator == "delete")) {
                if (self.left instanceof AST_Number && !self.right.is_constant()) switch (self.operator) {
                  // 0 + n ---> n
                  case "+":
                    if (self.left.value == 0) {
                        if (self.right.is_boolean(compressor)) return make_node(AST_UnaryPrefix, self, {
                            operator: "+",
                            expression: self.right,
                        }).optimize(compressor);
                        if (self.right.is_number(compressor) && !self.right.is_negative_zero()) return self.right;
                    }
                    break;
                  // 1 * n ---> n
                  case "*":
                    if (self.left.value == 1) return make_node(AST_UnaryPrefix, self, {
                        operator: "+",
                        expression: self.right,
                    }).optimize(compressor);
                    break;
                }
                if (self.right instanceof AST_Number && !self.left.is_constant()) switch (self.operator) {
                  // n + 0 ---> n
                  case "+":
                    if (self.right.value == 0) {
                        if (self.left.is_boolean(compressor)) return make_node(AST_UnaryPrefix, self, {
                            operator: "+",
                            expression: self.left,
                        }).optimize(compressor);
                        if (self.left.is_number(compressor) && !self.left.is_negative_zero()) return self.left;
                    }
                    break;
                  // n - 0 ---> n
                  case "-":
                    if (self.right.value == 0) return make_node(AST_UnaryPrefix, self, {
                        operator: "+",
                        expression: self.left,
                    }).optimize(compressor);
                    break;
                  // n / 1 ---> n
                  case "/":
                    if (self.right.value == 1) return make_node(AST_UnaryPrefix, self, {
                        operator: "+",
                        expression: self.left,
                    }).optimize(compressor);
                    break;
                }
            }
        }
        if (compressor.option("typeofs")) switch (self.operator) {
          case "&&":
            mark_locally_defined(self.left, self.right, null);
            break;
          case "||":
            mark_locally_defined(self.left, null, self.right);
            break;
        }
        if (compressor.option("unsafe")) {
            var indexRight = is_indexFn(self.right);
            if (in_bool
                && indexRight
                && (self.operator == "==" || self.operator == "!=")
                && self.left instanceof AST_Number
                && self.left.value == 0) {
                return (self.operator == "==" ? make_node(AST_UnaryPrefix, self, {
                    operator: "!",
                    expression: self.right,
                }) : self.right).optimize(compressor);
            }
            var indexLeft = is_indexFn(self.left);
            if (compressor.option("comparisons") && is_indexOf_match_pattern()) {
                var node = make_node(AST_UnaryPrefix, self, {
                    operator: "!",
                    expression: make_node(AST_UnaryPrefix, self, {
                        operator: "~",
                        expression: indexLeft ? self.left : self.right,
                    }),
                });
                switch (self.operator) {
                  case "<":
                    if (indexLeft) break;
                  case "<=":
                  case "!=":
                    node = make_node(AST_UnaryPrefix, self, {
                        operator: "!",
                        expression: node,
                    });
                    break;
                }
                return node.optimize(compressor);
            }
        }
        return try_evaluate(compressor, self);

        function is_modify_array(node) {
            var found = false;
            node.walk(new TreeWalker(function(node) {
                if (found) return true;
                if (node instanceof AST_Assign) {
                    if (node.left instanceof AST_PropAccess) return found = true;
                } else if (node instanceof AST_Unary) {
                    if (unary_side_effects[node.operator] && node.expression instanceof AST_PropAccess) {
                        return found = true;
                    }
                }
            }));
            return found;
        }

        function align(ref, op) {
            switch (ref) {
              case "-":
                return op == "+" ? "-" : "+";
              case "/":
                return op == "*" ? "/" : "*";
              default:
                return op;
            }
        }

        function make_binary(op, left, right, orig) {
            if (op == "+") {
                if (!left.is_boolean(compressor) && !left.is_number(compressor)) {
                    left = make_node(AST_UnaryPrefix, left, {
                        operator: "+",
                        expression: left,
                    });
                }
                if (!right.is_boolean(compressor) && !right.is_number(compressor)) {
                    right = make_node(AST_UnaryPrefix, right, {
                        operator: "+",
                        expression: right,
                    });
                }
            }
            return make_node(AST_Binary, orig, {
                operator: op,
                left: left,
                right: right,
            });
        }

        function is_indexFn(node) {
            while (node instanceof AST_Assign && node.operator == "=") node = node.right;
            return node.TYPE == "Call"
                && node.expression instanceof AST_Dot
                && indexFns[node.expression.property];
        }

        function is_indexOf_match_pattern() {
            switch (self.operator) {
              case "<=":
                // 0 <= array.indexOf(string) ---> !!~array.indexOf(string)
                return indexRight && self.left instanceof AST_Number && self.left.value == 0;
              case "<":
                // array.indexOf(string) < 0 ---> !~array.indexOf(string)
                if (indexLeft && self.right instanceof AST_Number && self.right.value == 0) return true;
                // -1 < array.indexOf(string) ---> !!~array.indexOf(string)
              case "==":
              case "!=":
                // -1 == array.indexOf(string) ---> !~array.indexOf(string)
                // -1 != array.indexOf(string) ---> !!~array.indexOf(string)
                if (!indexRight) return false;
                return self.left instanceof AST_Number && self.left.value == -1
                    || self.left instanceof AST_UnaryPrefix && self.left.operator == "-"
                        && self.left.expression instanceof AST_Number && self.left.expression.value == 1;
            }
        }

        function reversible() {
            return self.left.is_constant()
                || self.right.is_constant()
                || !self.left.has_side_effects(compressor)
                    && !self.right.has_side_effects(compressor);
        }

        function reverse(op) {
            if (reversible()) {
                if (op) self.operator = op;
                var tmp = self.left;
                self.left = self.right;
                self.right = tmp;
            }
        }
    });

    OPT(AST_SymbolExport, function(self) {
        return self;
    });

    function recursive_ref(compressor, def, fn) {
        var level = 0, node = compressor.self();
        do {
            if (node === fn) return node;
            if (is_lambda(node) && node.name && node.name.definition() === def) return node;
        } while (node = compressor.parent(level++));
    }

    function same_scope(def) {
        var scope = def.scope.resolve();
        return all(def.references, function(ref) {
            return scope === ref.scope.resolve();
        });
    }

    OPT(AST_SymbolRef, function(self, compressor) {
        if (!compressor.option("ie")
            && is_undeclared_ref(self)
            // testing against `self.scope.uses_with` is an optimization
            && !(self.scope.resolve().uses_with && compressor.find_parent(AST_With))) {
            switch (self.name) {
              case "undefined":
                return make_node(AST_Undefined, self).optimize(compressor);
              case "NaN":
                return make_node(AST_NaN, self).optimize(compressor);
              case "Infinity":
                return make_node(AST_Infinity, self).optimize(compressor);
            }
        }
        var parent = compressor.parent();
        if (compressor.option("reduce_vars") && is_lhs(compressor.self(), parent) !== compressor.self()) {
            var def = self.definition();
            var fixed = self.fixed_value();
            var single_use = def.single_use && !(parent instanceof AST_Call && parent.is_expr_pure(compressor));
            if (single_use) {
                if (is_lambda(fixed)) {
                    if ((def.scope !== self.scope.resolve(true) || def.in_loop)
                        && (!compressor.option("reduce_funcs") || def.escaped.depth == 1 || fixed.inlined)) {
                        single_use = false;
                    } else if (def.redefined()) {
                        single_use = false;
                    } else if (recursive_ref(compressor, def, fixed)) {
                        single_use = false;
                    } else if (fixed.name && fixed.name.definition() !== def) {
                        single_use = false;
                    } else if (fixed.parent_scope !== self.scope || is_funarg(def)) {
                        if (!safe_from_strict_mode(fixed, compressor)) {
                            single_use = false;
                        } else if ((single_use = fixed.is_constant_expression(self.scope)) == "f") {
                            var scope = self.scope;
                            do {
                                if (scope instanceof AST_LambdaDefinition || scope instanceof AST_LambdaExpression) {
                                    scope.inlined = true;
                                }
                            } while (scope = scope.parent_scope);
                        }
                    } else if (fixed.name && (fixed.name.name == "await" && is_async(fixed)
                        || fixed.name.name == "yield" && is_generator(fixed))) {
                        single_use = false;
                    } else if (fixed.has_side_effects(compressor)) {
                        single_use = false;
                    } else if (fixed instanceof AST_Class
                        && (compressor.option("ie") || !fixed.is_constant_expression(self.scope))) {
                        single_use = false;
                    }
                    if (single_use) fixed.parent_scope = self.scope;
                } else if (!fixed
                    || def.recursive_refs > 0
                    || !fixed.is_constant_expression()
                    || fixed.drop_side_effect_free(compressor)) {
                    single_use = false;
                }
            }
            if (single_use) {
                def.single_use = false;
                fixed._squeezed = true;
                fixed.single_use = true;
                if (fixed instanceof AST_DefClass) fixed = to_class_expr(fixed);
                if (fixed instanceof AST_LambdaDefinition) fixed = to_func_expr(fixed);
                if (is_lambda(fixed)) {
                    var scopes = [];
                    var scope = self.scope;
                    do {
                        scopes.push(scope);
                        if (scope === def.scope) break;
                    } while (scope = scope.parent_scope);
                    fixed.enclosed.forEach(function(def) {
                        if (fixed.variables.has(def.name)) return;
                        for (var i = 0; i < scopes.length; i++) {
                            var scope = scopes[i];
                            if (!push_uniq(scope.enclosed, def)) return;
                            scope.var_names().set(def.name, true);
                        }
                    });
                }
                var value;
                if (def.recursive_refs > 0) {
                    value = fixed.clone(true);
                    var defun_def = value.name.definition();
                    var lambda_def = value.variables.get(value.name.name);
                    var name = lambda_def && lambda_def.orig[0];
                    var def_fn_name, symbol_type;
                    if (value instanceof AST_Class) {
                        def_fn_name = "def_function";
                        symbol_type = AST_SymbolClass;
                    } else {
                        def_fn_name = "def_variable";
                        symbol_type = AST_SymbolLambda;
                    }
                    if (!(name instanceof symbol_type)) {
                        name = make_node(symbol_type, value.name);
                        name.scope = value;
                        value.name = name;
                        lambda_def = value[def_fn_name](name);
                        lambda_def.recursive_refs = def.recursive_refs;
                    }
                    value.walk(new TreeWalker(function(node) {
                        if (node instanceof AST_SymbolDeclaration) {
                            if (node !== name) {
                                var def = node.definition();
                                def.orig.push(node);
                                def.eliminated++;
                            }
                            return;
                        }
                        if (!(node instanceof AST_SymbolRef)) return;
                        var def = node.definition();
                        if (def === defun_def) {
                            node.thedef = def = lambda_def;
                        } else {
                            def.single_use = false;
                            var fn = node.fixed_value();
                            if (is_lambda(fn)
                                && fn.name
                                && fn.name.definition() === def
                                && def.scope === fn.name.scope
                                && fixed.variables.get(fn.name.name) === def) {
                                fn.name = fn.name.clone();
                                node.thedef = def = value.variables.get(fn.name.name) || value[def_fn_name](fn.name);
                            }
                        }
                        def.references.push(node);
                    }));
                } else {
                    if (fixed instanceof AST_Scope) {
                        compressor.push(fixed);
                        value = fixed.optimize(compressor);
                        compressor.pop();
                    } else {
                        value = fixed.optimize(compressor);
                    }
                    value = value.transform(new TreeTransformer(function(node, descend) {
                        if (node instanceof AST_Scope) return node;
                        node = node.clone();
                        descend(node, this);
                        return node;
                    }));
                }
                def.replaced++;
                return value;
            }
            var state;
            if (fixed && (state = self.fixed || def.fixed).should_replace !== false) {
                var ev, init;
                if (fixed instanceof AST_This) {
                    if (!is_funarg(def) && same_scope(def) && !cross_class(def)) init = fixed;
                } else if ((ev = fixed.evaluate(compressor, true)) !== fixed
                    && typeof ev != "function"
                    && (ev === null
                        || typeof ev != "object"
                        || compressor.option("unsafe_regexp")
                            && ev instanceof RegExp && !def.cross_loop && same_scope(def))) {
                    init = make_node_from_constant(ev, fixed);
                }
                if (init) {
                    if (state.should_replace === undefined) {
                        var value_length = init.optimize(compressor).print_to_string().length;
                        if (!has_symbol_ref(fixed)) {
                            value_length = Math.min(value_length, fixed.print_to_string().length);
                        }
                        var name_length = def.name.length;
                        if (compressor.option("unused") && !compressor.exposed(def)) {
                            var refs = def.references.length - def.replaced - def.assignments;
                            refs = Math.min(refs, def.references.filter(function(ref) {
                                return ref.fixed === state;
                            }).length);
                            name_length += (name_length + 2 + value_length) / Math.max(1, refs);
                        }
                        state.should_replace = value_length - Math.floor(name_length) < compressor.eval_threshold;
                    }
                    if (state.should_replace) {
                        var value;
                        if (has_symbol_ref(fixed)) {
                            value = init.optimize(compressor);
                            if (value === init) value = value.clone(true);
                        } else {
                            value = best_of_expression(init.optimize(compressor), fixed);
                            if (value === init || value === fixed) value = value.clone(true);
                        }
                        def.replaced++;
                        return value;
                    }
                }
            }
        }
        return self;

        function cross_class(def) {
            var scope = self.scope;
            while (scope !== def.scope) {
                if (scope instanceof AST_Class) return true;
                scope = scope.parent_scope;
            }
        }

        function has_symbol_ref(value) {
            var found;
            value.walk(new TreeWalker(function(node) {
                if (node instanceof AST_SymbolRef) found = true;
                if (found) return true;
            }));
            return found;
        }
    });

    function is_raw_tag(compressor, tag) {
        return compressor.option("unsafe")
            && tag instanceof AST_Dot
            && tag.property == "raw"
            && is_undeclared_ref(tag.expression)
            && tag.expression.name == "String";
    }

    function decode_template(str) {
        var malformed = false;
        str = str.replace(/\\(u\{[^{}]*\}?|u[\s\S]{0,4}|x[\s\S]{0,2}|[0-9]+|[\s\S])/g, function(match, seq) {
            var ch = decode_escape_sequence(seq);
            if (typeof ch == "string") return ch;
            malformed = true;
        });
        if (!malformed) return str;
    }

    OPT(AST_Template, function(self, compressor) {
        if (!compressor.option("templates")) return self;
        var tag = self.tag;
        if (!tag || is_raw_tag(compressor, tag)) {
            var exprs = [];
            var strs = [];
            for (var i = 0, status; i < self.strings.length; i++) {
                var str = self.strings[i];
                if (!tag) {
                    var trimmed = decode_template(str);
                    if (trimmed) str = escape_literal(trimmed);
                }
                if (i > 0) {
                    var node = self.expressions[i - 1];
                    var value = should_join(node);
                    if (value) {
                        var prev = strs[strs.length - 1];
                        var joined = prev + value + str;
                        var decoded;
                        if (tag || typeof (decoded = decode_template(joined)) == status) {
                            strs[strs.length - 1] = decoded ? escape_literal(decoded) : joined;
                            continue;
                        }
                    }
                    exprs.push(node);
                }
                strs.push(str);
                if (!tag) status = typeof trimmed;
            }
            if (!tag && strs.length > 1) {
                if (strs[strs.length - 1] == "") return make_node(AST_Binary, self, {
                    operator: "+",
                    left: make_node(AST_Template, self, {
                        expressions: exprs.slice(0, -1),
                        strings: strs.slice(0, -1),
                    }).transform(compressor),
                    right: exprs[exprs.length - 1],
                }).optimize(compressor);
                if (strs[0] == "") {
                    var left = make_node(AST_Binary, self, {
                        operator: "+",
                        left: make_node(AST_String, self, { value: "" }),
                        right: exprs[0],
                    });
                    for (var i = 1; strs[i] == "" && i < exprs.length; i++) {
                        left = make_node(AST_Binary, self, {
                            operator: "+",
                            left: left,
                            right: exprs[i],
                        });
                    }
                    return best_of(compressor, self, make_node(AST_Binary, self, {
                        operator: "+",
                        left: left.transform(compressor),
                        right: make_node(AST_Template, self, {
                            expressions: exprs.slice(i),
                            strings: strs.slice(i),
                        }).transform(compressor),
                    }).optimize(compressor));
                }
            }
            self.expressions = exprs;
            self.strings = strs;
        }
        return try_evaluate(compressor, self);

        function escape_literal(str) {
            return str.replace(/\r|\\|`|\${/g, function(s) {
                return "\\" + (s == "\r" ? "r" : s);
            });
        }

        function should_join(node) {
            var ev = node.evaluate(compressor);
            if (ev === node) return;
            if (tag && /\r|\\|`/.test(ev)) return;
            ev = escape_literal("" + ev);
            if (ev.length > node.print_to_string().length + "${}".length) return;
            return ev;
        }
    });

    function is_atomic(lhs, self) {
        return lhs instanceof AST_SymbolRef || lhs.TYPE === self.TYPE;
    }

    OPT(AST_Undefined, function(self, compressor) {
        if (compressor.option("unsafe_undefined")) {
            var undef = find_scope(compressor).find_variable("undefined");
            if (undef) {
                var ref = make_node(AST_SymbolRef, self, {
                    name: "undefined",
                    scope: undef.scope,
                    thedef: undef,
                });
                ref.is_undefined = true;
                return ref;
            }
        }
        var lhs = is_lhs(compressor.self(), compressor.parent());
        if (lhs && is_atomic(lhs, self)) return self;
        return make_node(AST_UnaryPrefix, self, {
            operator: "void",
            expression: make_node(AST_Number, self, { value: 0 }),
        });
    });

    OPT(AST_Infinity, function(self, compressor) {
        var lhs = is_lhs(compressor.self(), compressor.parent());
        if (lhs && is_atomic(lhs, self)) return self;
        if (compressor.option("keep_infinity") && !lhs && !find_scope(compressor).find_variable("Infinity")) {
            return self;
        }
        return make_node(AST_Binary, self, {
            operator: "/",
            left: make_node(AST_Number, self, { value: 1 }),
            right: make_node(AST_Number, self, { value: 0 }),
        });
    });

    OPT(AST_NaN, function(self, compressor) {
        var lhs = is_lhs(compressor.self(), compressor.parent());
        if (lhs && is_atomic(lhs, self)) return self;
        if (!lhs && !find_scope(compressor).find_variable("NaN")) return self;
        return make_node(AST_Binary, self, {
            operator: "/",
            left: make_node(AST_Number, self, { value: 0 }),
            right: make_node(AST_Number, self, { value: 0 }),
        });
    });

    function is_reachable(self, defs) {
        var reachable = false;
        var find_ref = new TreeWalker(function(node) {
            if (reachable) return true;
            if (node instanceof AST_SymbolRef && member(node.definition(), defs)) return reachable = true;
        });
        var scan_scope = new TreeWalker(function(node) {
            if (reachable) return true;
            if (node instanceof AST_Lambda && node !== self) {
                if (!(node.name || is_async(node) || is_generator(node))) {
                    var parent = scan_scope.parent();
                    if (parent instanceof AST_Call && parent.expression === node) return;
                }
                node.walk(find_ref);
                return true;
            }
        });
        self.walk(scan_scope);
        return reachable;
    }

    var ASSIGN_OPS = makePredicate("+ - * / % >> << >>> | ^ &");
    var ASSIGN_OPS_COMMUTATIVE = makePredicate("* | ^ &");
    OPT(AST_Assign, function(self, compressor) {
        if (compressor.option("dead_code")) {
            if (self.left instanceof AST_PropAccess) {
                if (self.operator == "=") {
                    var exp = self.left.expression;
                    if (self.left.equals(self.right)) {
                        var defined = exp.defined;
                        exp.defined = false;
                        var drop_lhs = !self.left.has_side_effects(compressor);
                        exp.defined = defined;
                        if (drop_lhs) return self.right;
                    }
                    if (exp instanceof AST_Lambda
                        || !compressor.has_directive("use strict")
                            && exp instanceof AST_Constant
                            && !exp.may_throw_on_access(compressor)) {
                        var value = self.left instanceof AST_Dot ? self.right : make_sequence(self, [
                            self.left.property,
                            self.right,
                        ]);
                        return maintain_this_binding(compressor.parent(), self, value).optimize(compressor);
                    }
                }
            } else if (self.left instanceof AST_SymbolRef && can_drop_symbol(self.left, compressor)) {
                var parent;
                if (self.operator == "=" && self.left.equals(self.right)
                    && !((parent = compressor.parent()) instanceof AST_UnaryPrefix && parent.operator == "delete")) {
                    return self.right;
                }
                if (self.left.is_immutable()) return strip_assignment();
                var def = self.left.definition();
                var scope = def.scope.resolve();
                var local = scope === compressor.find_parent(AST_Lambda);
                var level = 0, node;
                parent = compressor.self();
                if (!(scope.uses_arguments && is_funarg(def)) || compressor.has_directive("use strict")) do {
                    node = parent;
                    parent = compressor.parent(level++);
                    if (parent instanceof AST_Assign) {
                        if (parent.left instanceof AST_SymbolRef && parent.left.definition() === def) {
                            if (in_try(level, parent, !local)) break;
                            return strip_assignment(def);
                        }
                        if (parent.left.match_symbol(function(node) {
                            if (node instanceof AST_PropAccess) return true;
                        })) break;
                        continue;
                    }
                    if (parent instanceof AST_Exit) {
                        if (!local) break;
                        if (in_try(level, parent)) break;
                        if (is_reachable(scope, [ def ])) break;
                        return strip_assignment(def);
                    }
                    if (parent instanceof AST_SimpleStatement) {
                        if (!local) break;
                        if (is_reachable(scope, [ def ])) break;
                        var stat;
                        do {
                            stat = parent;
                            parent = compressor.parent(level++);
                            if (parent === scope && is_last_statement(parent.body, stat)) return strip_assignment(def);
                        } while (is_tail_block(stat, parent));
                        break;
                    }
                    if (parent instanceof AST_VarDef) {
                        if (!(parent.name instanceof AST_SymbolDeclaration)) continue;
                        if (parent.name.definition() !== def) continue;
                        if (in_try(level, parent)) break;
                        return strip_assignment(def);
                    }
                } while (is_tail(node, parent));
            }
        }
        if (compressor.option("sequences")) {
            var seq = self.lift_sequences(compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        if (compressor.option("assignments")) {
            if (self.operator == "=" && self.left instanceof AST_SymbolRef && self.right instanceof AST_Binary) {
                // x = expr1 OP expr2
                if (self.right.left instanceof AST_SymbolRef
                    && self.right.left.name == self.left.name
                    && ASSIGN_OPS[self.right.operator]) {
                    // x = x - 2 ---> x -= 2
                    return make_compound(self.right.right);
                }
                if (self.right.right instanceof AST_SymbolRef
                    && self.right.right.name == self.left.name
                    && ASSIGN_OPS_COMMUTATIVE[self.right.operator]
                    && !self.right.left.has_side_effects(compressor)) {
                    // x = 2 & x ---> x &= 2
                    return make_compound(self.right.left);
                }
            }
            if ((self.operator == "-=" || self.operator == "+="
                    && (self.left.is_boolean(compressor) || self.left.is_number(compressor)))
                && self.right instanceof AST_Number
                && self.right.value == 1) {
                var op = self.operator.slice(0, -1);
                return make_node(AST_UnaryPrefix, self, {
                    operator: op + op,
                    expression: self.left,
                });
            }
        }
        return try_evaluate(compressor, self);

        function is_tail(node, parent) {
            if (parent instanceof AST_Binary) switch (node) {
              case parent.left:
                return parent.right.is_constant_expression(scope);
              case parent.right:
                return true;
              default:
                return false;
            }
            if (parent instanceof AST_Conditional) switch (node) {
              case parent.condition:
                return parent.consequent.is_constant_expression(scope)
                    && parent.alternative.is_constant_expression(scope);
              case parent.consequent:
              case parent.alternative:
                return true;
              default:
                return false;
            }
            if (parent instanceof AST_Sequence) {
                var exprs = parent.expressions;
                var stop = exprs.indexOf(node);
                if (stop < 0) return false;
                for (var i = exprs.length; --i > stop;) {
                    if (!exprs[i].is_constant_expression(scope)) return false;
                }
                return true;
            }
            return parent instanceof AST_UnaryPrefix;
        }

        function is_tail_block(stat, parent) {
            if (parent instanceof AST_BlockStatement) return is_last_statement(parent.body, stat);
            if (parent instanceof AST_Catch) return is_last_statement(parent.body, stat);
            if (parent instanceof AST_Finally) return is_last_statement(parent.body, stat);
            if (parent instanceof AST_If) return parent.body === stat || parent.alternative === stat;
            if (parent instanceof AST_Try) return parent.bfinally ? parent.bfinally === stat : parent.bcatch === stat;
        }

        function in_try(level, node, sync) {
            var right = self.right;
            self.right = make_node(AST_Null, right);
            var may_throw = node.may_throw(compressor);
            self.right = right;
            return find_try(compressor, level, node, scope, may_throw, sync);
        }

        function make_compound(rhs) {
            var fixed = self.left.fixed;
            if (fixed) fixed.to_binary = replace_ref(function(node) {
                return node.left;
            }, fixed);
            return make_node(AST_Assign, self, {
                operator: self.right.operator + "=",
                left: self.left,
                right: rhs,
            });
        }

        function strip_assignment(def) {
            if (def) def.fixed = false;
            return (self.operator != "=" ? make_node(AST_Binary, self, {
                operator: self.operator.slice(0, -1),
                left: self.left,
                right: self.right,
            }) : maintain_this_binding(compressor.parent(), self, self.right)).optimize(compressor);
        }
    });

    OPT(AST_Conditional, function(self, compressor) {
        if (compressor.option("sequences") && self.condition instanceof AST_Sequence) {
            var expressions = self.condition.expressions.slice();
            var node = self.clone();
            node.condition = expressions.pop();
            expressions.push(node);
            return make_sequence(self, expressions).optimize(compressor);
        }
        if (!compressor.option("conditionals")) return self;
        var condition = self.condition;
        if (compressor.option("booleans") && !condition.has_side_effects(compressor)) {
            mark_duplicate_condition(compressor, condition);
        }
        condition = fuzzy_eval(compressor, condition);
        if (!condition) {
            AST_Node.warn("Condition always false [{start}]", self);
            return make_sequence(self, [ self.condition, self.alternative ]).optimize(compressor);
        } else if (!(condition instanceof AST_Node)) {
            AST_Node.warn("Condition always true [{start}]", self);
            return make_sequence(self, [ self.condition, self.consequent ]).optimize(compressor);
        }
        var first = first_in_statement(compressor);
        var negated = condition.negate(compressor, first);
        if ((first ? best_of_statement : best_of_expression)(condition, negated) === negated) {
            self = make_node(AST_Conditional, self, {
                condition: negated,
                consequent: self.alternative,
                alternative: self.consequent,
            });
            negated = condition;
            condition = self.condition;
        }
        var consequent = self.consequent;
        var alternative = self.alternative;
        var cond_lhs = extract_lhs(condition, compressor);
        if (repeatable(compressor, cond_lhs)) {
            // x ? x : y ---> x || y
            if (cond_lhs.equals(consequent)) return make_node(AST_Binary, self, {
                operator: "||",
                left: condition,
                right: alternative,
            }).optimize(compressor);
            // x ? y : x ---> x && y
            if (cond_lhs.equals(alternative)) return make_node(AST_Binary, self, {
                operator: "&&",
                left: condition,
                right: consequent,
            }).optimize(compressor);
        }
        // if (foo) exp = something; else exp = something_else;
        //                   |
        //                   v
        // exp = foo ? something : something_else;
        var seq_tail = consequent.tail_node();
        if (seq_tail instanceof AST_Assign) {
            var is_eq = seq_tail.operator == "=";
            var alt_tail = is_eq ? alternative.tail_node() : alternative;
            if ((is_eq || consequent === seq_tail)
                && alt_tail instanceof AST_Assign
                && seq_tail.operator == alt_tail.operator
                && seq_tail.left.equals(alt_tail.left)
                && (is_eq && seq_tail.left instanceof AST_SymbolRef
                    || !condition.has_side_effects(compressor)
                        && can_shift_lhs_of_tail(consequent)
                        && can_shift_lhs_of_tail(alternative))) {
                return make_node(AST_Assign, self, {
                    operator: seq_tail.operator,
                    left: seq_tail.left,
                    right: make_node(AST_Conditional, self, {
                        condition: condition,
                        consequent: pop_lhs(consequent),
                        alternative: pop_lhs(alternative),
                    }),
                });
            }
        }
        var alt_tail = alternative.tail_node();
        // x ? y : y ---> x, y
        // x ? (a, c) : (b, c) ---> x ? a : b, c
        if (seq_tail.equals(alt_tail)) return make_sequence(self, consequent.equals(alternative) ? [
            condition,
            consequent,
        ] : [
            make_node(AST_Conditional, self, {
                condition: condition,
                consequent: pop_seq(consequent),
                alternative: pop_seq(alternative),
            }),
            alt_tail,
        ]).optimize(compressor);
        // x ? y.p : z.p ---> (x ? y : z).p
        // x ? y(a) : z(a) ---> (x ? y : z)(a)
        // x ? y.f(a) : z.f(a) ---> (x ? y : z).f(a)
        var combined = combine_tail(consequent, alternative, true);
        if (combined) return combined;
        // x ? y(a) : y(b) ---> y(x ? a : b)
        var arg_index;
        if (consequent instanceof AST_Call
            && alternative.TYPE == consequent.TYPE
            && (arg_index = arg_diff(consequent, alternative)) >= 0
            && consequent.expression.equals(alternative.expression)
            && !condition.has_side_effects(compressor)
            && !consequent.expression.has_side_effects(compressor)) {
            var node = consequent.clone();
            var arg = consequent.args[arg_index];
            node.args[arg_index] = arg instanceof AST_Spread ? make_node(AST_Spread, self, {
                expression: make_node(AST_Conditional, self, {
                    condition: condition,
                    consequent: arg.expression,
                    alternative: alternative.args[arg_index].expression,
                }),
            }) : make_node(AST_Conditional, self, {
                condition: condition,
                consequent: arg,
                alternative: alternative.args[arg_index],
            });
            return node;
        }
        // x ? (y ? a : b) : b ---> x && y ? a : b
        if (seq_tail instanceof AST_Conditional
            && seq_tail.alternative.equals(alternative)) {
            return make_node(AST_Conditional, self, {
                condition: make_node(AST_Binary, self, {
                    left: condition,
                    operator: "&&",
                    right: fuse(consequent, seq_tail, "condition"),
                }),
                consequent: seq_tail.consequent,
                alternative: merge_expression(seq_tail.alternative, alternative),
            });
        }
        // x ? (y ? a : b) : a ---> !x || y ? a : b
        if (seq_tail instanceof AST_Conditional
            && seq_tail.consequent.equals(alternative)) {
            return make_node(AST_Conditional, self, {
                condition: make_node(AST_Binary, self, {
                    left: negated,
                    operator: "||",
                    right: fuse(consequent, seq_tail, "condition"),
                }),
                consequent: merge_expression(seq_tail.consequent, alternative),
                alternative: seq_tail.alternative,
            });
        }
        // x ? a : (y ? a : b) ---> x || y ? a : b
        if (alt_tail instanceof AST_Conditional
            && consequent.equals(alt_tail.consequent)) {
            return make_node(AST_Conditional, self, {
                condition: make_node(AST_Binary, self, {
                    left: condition,
                    operator: "||",
                    right: fuse(alternative, alt_tail, "condition"),
                }),
                consequent: merge_expression(consequent, alt_tail.consequent),
                alternative: alt_tail.alternative,
            });
        }
        // x ? b : (y ? a : b) ---> !x && y ? a : b
        if (alt_tail instanceof AST_Conditional
            && consequent.equals(alt_tail.alternative)) {
            return make_node(AST_Conditional, self, {
                condition: make_node(AST_Binary, self, {
                    left: negated,
                    operator: "&&",
                    right: fuse(alternative, alt_tail, "condition"),
                }),
                consequent: alt_tail.consequent,
                alternative: merge_expression(consequent, alt_tail.alternative),
            });
        }
        // x ? y && a : a ---> (!x || y) && a
        if (seq_tail instanceof AST_Binary
            && seq_tail.operator == "&&"
            && seq_tail.right.equals(alternative)) {
            return make_node(AST_Binary, self, {
                operator: "&&",
                left: make_node(AST_Binary, self, {
                    operator: "||",
                    left: negated,
                    right: fuse(consequent, seq_tail, "left"),
                }),
                right: merge_expression(seq_tail.right, alternative),
            }).optimize(compressor);
        }
        // x ? y || a : a ---> x && y || a
        if (seq_tail instanceof AST_Binary
            && seq_tail.operator == "||"
            && seq_tail.right.equals(alternative)) {
            return make_node(AST_Binary, self, {
                operator: "||",
                left: make_node(AST_Binary, self, {
                    operator: "&&",
                    left: condition,
                    right: fuse(consequent, seq_tail, "left"),
                }),
                right: merge_expression(seq_tail.right, alternative),
            }).optimize(compressor);
        }
        // x ? a : y && a ---> (x || y) && a
        if (alt_tail instanceof AST_Binary
            && alt_tail.operator == "&&"
            && alt_tail.right.equals(consequent)) {
            return make_node(AST_Binary, self, {
                operator: "&&",
                left: make_node(AST_Binary, self, {
                    operator: "||",
                    left: condition,
                    right: fuse(alternative, alt_tail, "left"),
                }),
                right: merge_expression(consequent, alt_tail.right),
            }).optimize(compressor);
        }
        // x ? a : y || a ---> !x && y || a
        if (alt_tail instanceof AST_Binary
            && alt_tail.operator == "||"
            && alt_tail.right.equals(consequent)) {
            return make_node(AST_Binary, self, {
                operator: "||",
                left: make_node(AST_Binary, self, {
                    operator: "&&",
                    left: negated,
                    right: fuse(alternative, alt_tail, "left"),
                }),
                right: merge_expression(consequent, alt_tail.right),
            }).optimize(compressor);
        }
        var in_bool = compressor.option("booleans") && compressor.in_boolean_context();
        if (is_true(consequent)) {
            // c ? true : false ---> !!c
            if (is_false(alternative)) return booleanize(condition);
            // c ? true : x ---> !!c || x
            return make_node(AST_Binary, self, {
                operator: "||",
                left: booleanize(condition),
                right: alternative,
            }).optimize(compressor);
        }
        if (is_false(consequent)) {
            // c ? false : true ---> !c
            if (is_true(alternative)) return booleanize(condition.negate(compressor));
            // c ? false : x ---> !c && x
            return make_node(AST_Binary, self, {
                operator: "&&",
                left: booleanize(condition.negate(compressor)),
                right: alternative,
            }).optimize(compressor);
        }
        // c ? x : true ---> !c || x
        if (is_true(alternative)) return make_node(AST_Binary, self, {
            operator: "||",
            left: booleanize(condition.negate(compressor)),
            right: consequent,
        }).optimize(compressor);
        // c ? x : false ---> !!c && x
        if (is_false(alternative)) return make_node(AST_Binary, self, {
            operator: "&&",
            left: booleanize(condition),
            right: consequent,
        }).optimize(compressor);
        if (compressor.option("typeofs")) mark_locally_defined(condition, consequent, alternative);
        return self;

        function booleanize(node) {
            if (node.is_boolean(compressor)) return node;
            // !!expression
            return make_node(AST_UnaryPrefix, node, {
                operator: "!",
                expression: node.negate(compressor),
            });
        }

        // AST_True or !0
        function is_true(node) {
            return node instanceof AST_True
                || in_bool
                    && node instanceof AST_Constant
                    && node.value
                || (node instanceof AST_UnaryPrefix
                    && node.operator == "!"
                    && node.expression instanceof AST_Constant
                    && !node.expression.value);
        }
        // AST_False or !1 or void 0
        function is_false(node) {
            return node instanceof AST_False
                || in_bool
                    && (node instanceof AST_Constant
                            && !node.value
                        || node instanceof AST_UnaryPrefix
                            && node.operator == "void"
                            && !node.expression.has_side_effects(compressor))
                || (node instanceof AST_UnaryPrefix
                    && node.operator == "!"
                    && node.expression instanceof AST_Constant
                    && node.expression.value);
        }

        function arg_diff(consequent, alternative) {
            var a = consequent.args;
            var b = alternative.args;
            var len = a.length;
            if (len != b.length) return -2;
            for (var i = 0; i < len; i++) {
                if (!a[i].equals(b[i])) {
                    if (a[i] instanceof AST_Spread !== b[i] instanceof AST_Spread) return -3;
                    for (var j = i + 1; j < len; j++) {
                        if (!a[j].equals(b[j])) return -2;
                    }
                    return i;
                }
            }
            return -1;
        }

        function fuse(node, tail, prop) {
            if (node === tail) return tail[prop];
            var exprs = node.expressions.slice(0, -1);
            exprs.push(tail[prop]);
            return make_sequence(node, exprs);
        }

        function is_tail_equivalent(consequent, alternative) {
            if (consequent.TYPE != alternative.TYPE) return;
            if (consequent.optional != alternative.optional) return;
            if (consequent instanceof AST_Call) {
                if (arg_diff(consequent, alternative) != -1) return;
                return consequent.TYPE != "Call"
                    || !(consequent.expression instanceof AST_PropAccess
                        || alternative.expression instanceof AST_PropAccess)
                    || is_tail_equivalent(consequent.expression, alternative.expression);
            }
            if (!(consequent instanceof AST_PropAccess)) return;
            var p = consequent.property;
            var q = alternative.property;
            return (p instanceof AST_Node ? p.equals(q) : p == q)
                && !(consequent.expression instanceof AST_Super || alternative.expression instanceof AST_Super);
        }

        function combine_tail(consequent, alternative, top) {
            var seq_tail = consequent.tail_node();
            var alt_tail = alternative.tail_node();
            if (!is_tail_equivalent(seq_tail, alt_tail)) return !top && make_node(AST_Conditional, self, {
                condition: condition,
                consequent: consequent,
                alternative: alternative,
            });
            var node = seq_tail.clone();
            var seq_expr = fuse(consequent, seq_tail, "expression");
            var alt_expr = fuse(alternative, alt_tail, "expression");
            var combined = combine_tail(seq_expr, alt_expr);
            if (seq_tail.expression instanceof AST_Sequence) {
                combined = maintain_this_binding(seq_tail, seq_tail.expression, combined);
            }
            node.expression = combined;
            return node;
        }

        function can_shift_lhs_of_tail(node) {
            return node === node.tail_node() || all(node.expressions.slice(0, -1), function(expr) {
                return !expr.has_side_effects(compressor);
            });
        }

        function pop_lhs(node) {
            if (!(node instanceof AST_Sequence)) return node.right;
            var exprs = node.expressions.slice();
            exprs.push(exprs.pop().right);
            return make_sequence(node, exprs);
        }

        function pop_seq(node) {
            if (!(node instanceof AST_Sequence)) return make_node(AST_Number, node, { value: 0 });
            return make_sequence(node, node.expressions.slice(0, -1));
        }
    });

    OPT(AST_Boolean, function(self, compressor) {
        if (!compressor.option("booleans")) return self;
        if (compressor.in_boolean_context()) return make_node(AST_Number, self, { value: +self.value });
        var p = compressor.parent();
        if (p instanceof AST_Binary && (p.operator == "==" || p.operator == "!=")) {
            AST_Node.warn("Non-strict equality against boolean: {operator} {value} [{start}]", {
                operator: p.operator,
                value: self.value,
                start: p.start,
            });
            return make_node(AST_Number, self, { value: +self.value });
        }
        return make_node(AST_UnaryPrefix, self, {
            operator: "!",
            expression: make_node(AST_Number, self, { value: 1 - self.value }),
        });
    });

    OPT(AST_Spread, function(self, compressor) {
        var exp = self.expression;
        if (compressor.option("spreads") && exp instanceof AST_Array && !(compressor.parent() instanceof AST_Object)) {
            return List.splice(exp.elements.map(function(node) {
                return node instanceof AST_Hole ? make_node(AST_Undefined, node).optimize(compressor) : node;
            }));
        }
        return self;
    });

    function safe_to_flatten(value, compressor) {
        if (!value) return false;
        var parent = compressor.parent();
        if (parent.TYPE != "Call") return true;
        if (parent.expression !== compressor.self()) return true;
        if (value instanceof AST_SymbolRef) {
            value = value.fixed_value();
            if (!value) return false;
        }
        return value instanceof AST_Lambda && !value.contains_this();
    }

    OPT(AST_Sub, function(self, compressor) {
        var expr = self.expression;
        var prop = self.property;
        var terminated = trim_optional_chain(self, compressor);
        if (terminated) return terminated;
        if (compressor.option("properties")) {
            var key = prop.evaluate(compressor);
            if (key !== prop) {
                if (typeof key == "string") {
                    if (key == "undefined") {
                        key = undefined;
                    } else {
                        var value = parseFloat(key);
                        if (value.toString() == key) {
                            key = value;
                        }
                    }
                }
                prop = self.property = best_of_expression(prop, make_node_from_constant(key, prop).transform(compressor));
                var property = "" + key;
                if (is_identifier_string(property)
                    && property.length <= prop.print_to_string().length + 1) {
                    return make_node(AST_Dot, self, {
                        optional: self.optional,
                        expression: expr,
                        property: property,
                        quoted: true,
                    }).optimize(compressor);
                }
            }
        }
        var parent = compressor.parent();
        var assigned = is_lhs(compressor.self(), parent);
        var def, fn, fn_parent, index;
        if (compressor.option("arguments")
            && expr instanceof AST_SymbolRef
            && is_arguments(def = expr.definition())
            && !expr.in_arg
            && prop instanceof AST_Number
            && Math.floor(index = prop.value) == index
            && (fn = def.scope) === find_lambda()
            && fn.uses_arguments < (assigned ? 2 : 3)) {
            if (parent instanceof AST_UnaryPrefix && parent.operator == "delete") {
                if (!def.deleted) def.deleted = [];
                def.deleted[index] = true;
            }
            var argname = fn.argnames[index];
            if (def.deleted && def.deleted[index]) {
                argname = null;
            } else if (argname) {
                var arg_def;
                if (!(argname instanceof AST_SymbolFunarg)
                    || argname.name == "await"
                    || expr.scope.find_variable(argname.name) !== (arg_def = argname.definition())) {
                    argname = null;
                } else if (compressor.has_directive("use strict")
                    || fn.name
                    || fn.rest
                    || !(fn_parent instanceof AST_Call
                        && index < fn_parent.args.length
                        && all(fn_parent.args.slice(0, index + 1), function(arg) {
                            return !(arg instanceof AST_Spread);
                        }))
                    || !all(fn.argnames, function(argname) {
                        return argname instanceof AST_SymbolFunarg;
                    })) {
                    if (has_reassigned() || arg_def.assignments || arg_def.orig.length > 1) argname = null;
                }
            } else if ((assigned || !has_reassigned())
                && index < fn.argnames.length + 5
                && compressor.drop_fargs(fn, fn_parent)
                && !fn.rest) {
                while (index >= fn.argnames.length) {
                    argname = fn.make_var(AST_SymbolFunarg, fn, "argument_" + fn.argnames.length);
                    fn.argnames.push(argname);
                }
            }
            if (argname && find_if(function(node) {
                return node.name === argname.name;
            }, fn.argnames) === argname) {
                if (assigned) def.reassigned--;
                var sym = make_node(AST_SymbolRef, argname);
                sym.reference();
                argname.unused = undefined;
                return sym;
            }
        }
        if (assigned) return self;
        if (compressor.option("sequences")
            && parent.TYPE != "Call"
            && !(parent instanceof AST_ForEnumeration && parent.init === self)) {
            var seq = lift_sequence_in_expression(self, compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        if (key !== prop) {
            var sub = self.flatten_object(property, compressor);
            if (sub) {
                expr = self.expression = sub.expression;
                prop = self.property = sub.property;
            }
        }
        var elements;
        if (compressor.option("properties")
            && compressor.option("side_effects")
            && prop instanceof AST_Number
            && expr instanceof AST_Array
            && all(elements = expr.elements, function(value) {
                return !(value instanceof AST_Spread);
            })) {
            var index = prop.value;
            var retValue = elements[index];
            if (safe_to_flatten(retValue, compressor)) {
                var is_hole = retValue instanceof AST_Hole;
                var flatten = !is_hole;
                var values = [];
                for (var i = elements.length; --i > index;) {
                    var value = elements[i].drop_side_effect_free(compressor);
                    if (value) {
                        values.unshift(value);
                        if (flatten && value.has_side_effects(compressor)) flatten = false;
                    }
                }
                if (!flatten) values.unshift(retValue);
                while (--i >= 0) {
                    var value = elements[i].drop_side_effect_free(compressor);
                    if (value) {
                        values.unshift(value);
                    } else if (is_hole) {
                        values.unshift(make_node(AST_Hole, elements[i]));
                    } else {
                        index--;
                    }
                }
                if (flatten) {
                    values.push(retValue);
                    return make_sequence(self, values).optimize(compressor);
                }
                return make_node(AST_Sub, self, {
                    expression: make_node(AST_Array, expr, { elements: values }),
                    property: make_node(AST_Number, prop, { value: index }),
                });
            }
        }
        return try_evaluate(compressor, self);

        function find_lambda() {
            var i = 0, p;
            while (p = compressor.parent(i++)) {
                if (p instanceof AST_Lambda) {
                    if (p instanceof AST_Accessor) return;
                    if (is_arrow(p)) continue;
                    fn_parent = compressor.parent(i);
                    return p;
                }
            }
        }

        function has_reassigned() {
            return !compressor.option("reduce_vars") || def.reassigned;
        }
    });

    AST_LambdaExpression.DEFMETHOD("contains_super", function() {
        var result = false;
        var self = this;
        self.walk(new TreeWalker(function(node) {
            if (result) return true;
            if (node instanceof AST_Super) return result = true;
            if (node !== self && node instanceof AST_Scope && !is_arrow(node)) return true;
        }));
        return result;
    });

    // contains_this()
    // returns false only if context bound by the specified scope (or scope
    // containing the specified expression) is not referenced by `this`
    (function(def) {
        // scope of arrow function cannot bind to any context
        def(AST_Arrow, return_false);
        def(AST_AsyncArrow, return_false);
        def(AST_Node, function() {
            var result = false;
            var self = this;
            self.walk(new TreeWalker(function(node) {
                if (result) return true;
                if (node instanceof AST_This) return result = true;
                if (node !== self && node instanceof AST_Scope && !is_arrow(node)) return true;
            }));
            return result;
        });
    })(function(node, func) {
        node.DEFMETHOD("contains_this", func);
    });

    function can_hoist_property(prop) {
        return prop instanceof AST_ObjectKeyVal
            && typeof prop.key == "string"
            && !(prop instanceof AST_ObjectMethod && prop.value.contains_super());
    }

    AST_PropAccess.DEFMETHOD("flatten_object", function(key, compressor) {
        if (!compressor.option("properties")) return;
        if (key === "__proto__") return;
        var self = this;
        var expr = self.expression;
        if (!(expr instanceof AST_Object)) return;
        var props = expr.properties;
        for (var i = props.length; --i >= 0;) {
            var prop = props[i];
            if (prop.key !== key) continue;
            if (!all(props, can_hoist_property)) return;
            if (!safe_to_flatten(prop.value, compressor)) return;
            var call, scope, values = [];
            for (var j = 0; j < props.length; j++) {
                var value = props[j].value;
                if (props[j] instanceof AST_ObjectMethod) {
                    var arrow = !(value.uses_arguments || is_generator(value) || value.contains_this());
                    if (arrow) {
                        if (!scope) scope = compressor.find_parent(AST_Scope);
                        var avoid = avoid_await_yield(compressor, scope);
                        value.each_argname(function(argname) {
                            if (avoid[argname.name]) arrow = false;
                        });
                    }
                    var ctor;
                    if (arrow) {
                        ctor = is_async(value) ? AST_AsyncArrow : AST_Arrow;
                    } else if (i != j
                        || (call = compressor.parent()) instanceof AST_Call && call.expression === self) {
                        ctor = value.CTOR;
                    } else {
                        return;
                    }
                    value = make_node(ctor, value);
                }
                values.push(value);
            }
            return make_node(AST_Sub, self, {
                expression: make_node(AST_Array, expr, { elements: values }),
                property: make_node(AST_Number, self, { value: i }),
            });
        }
    });

    OPT(AST_Dot, function(self, compressor) {
        if (self.property == "arguments" || self.property == "caller") {
            AST_Node.warn("Function.prototype.{property} not supported [{start}]", self);
        }
        var parent = compressor.parent();
        if (is_lhs(compressor.self(), parent)) return self;
        var terminated = trim_optional_chain(self, compressor);
        if (terminated) return terminated;
        if (compressor.option("sequences")
            && parent.TYPE != "Call"
            && !(parent instanceof AST_ForEnumeration && parent.init === self)) {
            var seq = lift_sequence_in_expression(self, compressor);
            if (seq !== self) return seq.optimize(compressor);
        }
        if (compressor.option("unsafe_proto")
            && self.expression instanceof AST_Dot
            && self.expression.property == "prototype") {
            var exp = self.expression.expression;
            if (is_undeclared_ref(exp)) switch (exp.name) {
              case "Array":
                self.expression = make_node(AST_Array, self.expression, { elements: [] });
                break;
              case "Function":
                self.expression = make_node(AST_Function, self.expression, {
                    argnames: [],
                    body: [],
                }).init_vars(exp.scope);
                break;
              case "Number":
                self.expression = make_node(AST_Number, self.expression, { value: 0 });
                break;
              case "Object":
                self.expression = make_node(AST_Object, self.expression, { properties: [] });
                break;
              case "RegExp":
                self.expression = make_node(AST_RegExp, self.expression, { value: /t/ });
                break;
              case "String":
                self.expression = make_node(AST_String, self.expression, { value: "" });
                break;
            }
        }
        var sub = self.flatten_object(self.property, compressor);
        if (sub) return sub.optimize(compressor);
        return try_evaluate(compressor, self);
    });

    OPT(AST_DestructuredArray, function(self, compressor) {
        if (compressor.option("rests") && self.rest instanceof AST_DestructuredArray) {
            return make_node(AST_DestructuredArray, self, {
                elements: self.elements.concat(self.rest.elements),
                rest: self.rest.rest,
            });
        }
        return self;
    });

    OPT(AST_DestructuredKeyVal, function(self, compressor) {
        if (compressor.option("objects")) {
            var key = self.key;
            if (key instanceof AST_Node) {
                key = key.evaluate(compressor);
                if (key !== self.key) self.key = "" + key;
            }
        }
        return self;
    });

    OPT(AST_Object, function(self, compressor) {
        if (!compressor.option("objects")) return self;
        var changed = false;
        var found = false;
        var generated = false;
        var keep_duplicate = compressor.has_directive("use strict");
        var keys = [];
        var map = new Dictionary();
        var values = [];
        self.properties.forEach(function(prop) {
            if (!(prop instanceof AST_Spread)) return process(prop);
            found = true;
            var exp = prop.expression;
            if (compressor.option("spreads") && exp instanceof AST_Object && all(exp.properties, function(prop) {
                if (prop instanceof AST_ObjectGetter) return false;
                if (prop instanceof AST_Spread) return false;
                if (prop.key !== "__proto__") return true;
                if (prop instanceof AST_ObjectSetter) return true;
                return !prop.value.has_side_effects(compressor);
            })) {
                changed = true;
                exp.properties.forEach(function(prop) {
                    var key = prop.key;
                    var setter = prop instanceof AST_ObjectSetter;
                    if (key === "__proto__") {
                        if (!setter) return;
                        key = make_node_from_constant(key, prop);
                    }
                    process(setter ? make_node(AST_ObjectKeyVal, prop, {
                        key: key,
                        value: make_node(AST_Undefined, prop).optimize(compressor),
                    }) : prop);
                });
            } else {
                generated = true;
                flush();
                values.push(prop);
            }
        });
        flush();
        if (!changed) return self;
        if (found && generated && values.length == 1) {
            var value = values[0];
            if (value instanceof AST_ObjectProperty && value.key instanceof AST_Number) {
                value.key = "" + value.key.value;
            }
        }
        return make_node(AST_Object, self, { properties: values });

        function flush() {
            keys.forEach(function(key) {
                var props = map.get(key);
                switch (props.length) {
                  case 0:
                    return;
                  case 1:
                    return values.push(props[0]);
                }
                changed = true;
                var tail = keep_duplicate && !generated && props.pop();
                values.push(props.length == 1 ? props[0] : make_node(AST_ObjectKeyVal, self, {
                    key: props[0].key,
                    value: make_sequence(self, props.map(function(prop) {
                        return prop.value;
                    })),
                }));
                if (tail) values.push(tail);
                props.length = 0;
            });
            keys = [];
            map = new Dictionary();
        }

        function process(prop) {
            var key = prop.key;
            if (key instanceof AST_Node) {
                found = true;
                key = key.evaluate(compressor);
                if (key === prop.key || key === "__proto__") {
                    generated = true;
                } else {
                    key = prop.key = "" + key;
                }
            }
            if (can_hoist_property(prop)) {
                if (prop.value.has_side_effects(compressor)) flush();
                keys.push(key);
                map.add(key, prop);
            } else {
                flush();
                values.push(prop);
            }
            if (found && !generated && typeof key == "string" && RE_POSITIVE_INTEGER.test(key)) {
                generated = true;
                if (map.has(key)) prop = map.get(key)[0];
                prop.key = make_node(AST_Number, prop, { value: +key });
            }
        }
    });

    function flatten_var(name) {
        var redef = name.definition().redefined();
        if (redef) {
            name = name.clone();
            name.thedef = redef;
        }
        return name;
    }

    function has_arg_refs(fn, node) {
        var found = false;
        node.walk(new TreeWalker(function(node) {
            if (found) return true;
            if (node instanceof AST_SymbolRef && fn.variables.get(node.name) === node.definition()) {
                return found = true;
            }
        }));
        return found;
    }

    function insert_assign(def, assign) {
        var visited = [];
        def.references.forEach(function(ref) {
            var fixed = ref.fixed;
            if (!fixed || !push_uniq(visited, fixed)) return;
            if (fixed.assigns) {
                fixed.assigns.unshift(assign);
            } else {
                fixed.assigns = [ assign ];
            }
        });
    }

    function init_ref(compressor, name) {
        var sym = make_node(AST_SymbolRef, name);
        var assign = make_node(AST_Assign, name, {
            operator: "=",
            left: sym,
            right: make_node(AST_Undefined, name).transform(compressor),
        });
        var def = name.definition();
        if (def.fixed) {
            sym.fixed = function() {
                return assign.right;
            };
            sym.fixed.assigns = [ assign ];
            insert_assign(def, assign);
        }
        def.assignments++;
        def.references.push(sym);
        return assign;
    }

    (function(def) {
        def(AST_Node, noop);
        def(AST_Assign, noop);
        def(AST_Await, function(compressor, scope, no_return, in_loop) {
            if (!compressor.option("awaits")) return;
            var self = this;
            var inlined = self.expression.try_inline(compressor, scope, no_return, in_loop, true);
            if (!inlined) return;
            if (!no_return) scan_local_returns(inlined, function(node) {
                node.in_bool = false;
                var value = node.value;
                if (value instanceof AST_Await) return;
                node.value = make_node(AST_Await, self, {
                    expression: value || make_node(AST_Undefined, node).transform(compressor),
                });
            });
            return aborts(inlined) ? inlined : make_node(AST_BlockStatement, self, {
                body: [ inlined, make_node(AST_SimpleStatement, self, {
                    body: make_node(AST_Await, self, { expression: make_node(AST_Number, self, { value: 0 })}),
                }) ],
            });
        });
        def(AST_Binary, function(compressor, scope, no_return, in_loop, in_await) {
            if (no_return === undefined) return;
            var self = this;
            var op = self.operator;
            if (!lazy_op[op]) return;
            var inlined = self.right.try_inline(compressor, scope, no_return, in_loop, in_await);
            if (!inlined) return;
            return make_node(AST_If, self, {
                condition: make_condition(self.left),
                body: inlined,
                alternative: no_return ? null : make_node(AST_Return, self, {
                    value: make_node(AST_Undefined, self).transform(compressor),
                }),
            });

            function make_condition(cond) {
                switch (op) {
                  case "&&":
                    return cond;
                  case "||":
                    return cond.negate(compressor);
                  case "??":
                    return make_node(AST_Binary, self, {
                        operator: "==",
                        left: make_node(AST_Null, self),
                        right: cond,
                    });
                }
            }
        });
        def(AST_BlockStatement, function(compressor, scope, no_return, in_loop) {
            if (no_return) return;
            if (!this.variables) return;
            var body = this.body;
            var last = body.length - 1;
            if (last < 0) return;
            var inlined = body[last].try_inline(compressor, this, no_return, in_loop);
            if (!inlined) return;
            body[last] = inlined;
            return this;
        });
        def(AST_Call, function(compressor, scope, no_return, in_loop, in_await) {
            if (compressor.option("inline") < 4) return;
            var call = this;
            if (call.is_expr_pure(compressor)) return;
            var fn = call.expression;
            if (!(fn instanceof AST_LambdaExpression)) return;
            if (fn.name) return;
            if (fn.single_use) return;
            if (fn.uses_arguments) return;
            if (fn.pinned()) return;
            if (is_generator(fn)) return;
            var arrow = is_arrow(fn);
            var fn_body = arrow && fn.value ? [ fn.first_statement() ] : fn.body;
            if (fn_body[0] instanceof AST_Directive) return;
            if (fn.contains_this()) return;
            if (!scope) scope = find_scope(compressor);
            var defined = new Dictionary();
            defined.set("NaN", true);
            while (!(scope instanceof AST_Scope)) {
                scope.variables.each(function(def) {
                    defined.set(def.name, true);
                });
                scope = scope.parent_scope;
            }
            if (!member(scope, compressor.stack)) return;
            if (scope.pinned() && fn.variables.size() > (arrow ? 0 : 1)) return;
            if (scope instanceof AST_Toplevel) {
                if (fn.variables.size() > (arrow ? 0 : 1)) {
                    if (!compressor.toplevel.vars) return;
                    if (fn.functions.size() > 0 && !compressor.toplevel.funcs) return;
                }
                defined.set("arguments", true);
            }
            var async = !in_await && is_async(fn);
            if (async) {
                if (!compressor.option("awaits")) return;
                if (!is_async(scope)) return;
                if (call.may_throw(compressor)) return;
            }
            var names = scope.var_names();
            if (in_loop) in_loop = [];
            if (!fn.variables.all(function(def, name) {
                if (in_loop) in_loop.push(def);
                if (!defined.has(name) && !names.has(name)) return true;
                return !arrow && name == "arguments" && def.orig.length == 1;
            })) return;
            if (in_loop && in_loop.length > 0 && is_reachable(fn, in_loop)) return;
            var simple_argnames = true;
            if (!all(fn.argnames, function(argname) {
                var abort = false;
                var tw = new TreeWalker(function(node) {
                    if (abort) return true;
                    if (node instanceof AST_DefaultValue) {
                        if (has_arg_refs(fn, node.value)) return abort = true;
                        node.name.walk(tw);
                        return true;
                    }
                    if (node instanceof AST_DestructuredKeyVal) {
                        if (node.key instanceof AST_Node && has_arg_refs(fn, node.key)) return abort = true;
                        node.value.walk(tw);
                        return true;
                    }
                    if (node instanceof AST_SymbolFunarg && !all(node.definition().orig, function(sym) {
                        return !(sym instanceof AST_SymbolDefun);
                    })) return abort = true;
                });
                argname.walk(tw);
                if (abort) return false;
                if (!(argname instanceof AST_SymbolFunarg)) simple_argnames = false;
                return true;
            })) return;
            if (fn.rest) {
                if (has_arg_refs(fn, fn.rest)) return;
                simple_argnames = false;
            }
            var verify_body;
            if (no_return) {
                verify_body = function(stat) {
                    var abort = false;
                    stat.walk(new TreeWalker(function(node) {
                        if (abort) return true;
                        if (async && (node instanceof AST_Await || node instanceof AST_ForAwaitOf)
                            || node instanceof AST_Return) {
                            return abort = true;
                        }
                        if (node instanceof AST_Scope) return true;
                    }));
                    return !abort;
                };
            } else if (in_await || is_async(fn) || in_async_generator(scope)) {
                verify_body = function(stat) {
                    var abort = false;
                    var find_return = new TreeWalker(function(node) {
                        if (abort) return true;
                        if (node instanceof AST_Return) return abort = true;
                        if (node instanceof AST_Scope) return true;
                    });
                    stat.walk(new TreeWalker(function(node) {
                        if (abort) return true;
                        if (node instanceof AST_Try) {
                            if (!node.bfinally) return;
                            if (all(node.body, function(stat) {
                                stat.walk(find_return);
                                return !abort;
                            }) && node.bcatch) node.bcatch.walk(find_return);
                            return true;
                        }
                        if (node instanceof AST_Scope) return true;
                    }));
                    return !abort;
                };
            }
            if (verify_body && !all(fn_body, verify_body)) return;
            if (!safe_from_await_yield(fn, avoid_await_yield(compressor, scope))) return;
            fn.functions.each(function(def, name) {
                scope.functions.set(name, def);
            });
            var body = [];
            fn.variables.each(function(def, name) {
                if (!arrow && name == "arguments" && def.orig.length == 1) return;
                names.set(name, true);
                scope.enclosed.push(def);
                scope.variables.set(name, def);
                def.single_use = false;
                if (!in_loop) return;
                if (def.references.length == def.replaced) return;
                switch (def.orig.length - def.eliminated) {
                  case 0:
                    return;
                  case 1:
                    if (fn.functions.has(name)) return;
                }
                if (!all(def.orig, function(sym) {
                    if (sym instanceof AST_SymbolConst) return false;
                    if (sym instanceof AST_SymbolFunarg) return !sym.unused && def.scope.resolve() !== fn;
                    if (sym instanceof AST_SymbolLet) return false;
                    return true;
                })) return;
                var sym = def.orig[0];
                if (sym instanceof AST_SymbolCatch) return;
                body.push(make_node(AST_SimpleStatement, sym, { body: init_ref(compressor, flatten_var(sym)) }));
                def.first_decl = null;
            });
            var defs = Object.create(null), syms = new Dictionary();
            if (simple_argnames && all(call.args, function(arg) {
                return !(arg instanceof AST_Spread);
            })) {
                var values = call.args.slice();
                fn.argnames.forEach(function(argname) {
                    var value = values.shift();
                    if (argname.unused) {
                        if (value) body.push(make_node(AST_SimpleStatement, call, { body: value }));
                        return;
                    }
                    var defn = make_node(AST_VarDef, call, {
                        name: argname.convert_symbol(AST_SymbolVar, process),
                        value: value || make_node(AST_Undefined, call).transform(compressor),
                    });
                    if (argname instanceof AST_SymbolFunarg) insert_assign(argname.definition(), defn);
                    body.push(make_node(AST_Var, call, { definitions: [ defn ] }));
                });
                if (values.length) body.push(make_node(AST_SimpleStatement, call, {
                    body: make_sequence(call, values),
                }));
            } else {
                body.push(make_node(AST_Var, call, {
                    definitions: [ make_node(AST_VarDef, call, {
                        name: make_node(AST_DestructuredArray, call, {
                            elements: fn.argnames.map(function(argname) {
                                if (argname.unused) return make_node(AST_Hole, argname);
                                return argname.convert_symbol(AST_SymbolVar, process);
                            }),
                            rest: fn.rest && fn.rest.convert_symbol(AST_SymbolVar, process),
                        }),
                        value: make_node(AST_Array, call, { elements: call.args.slice() }),
                    }) ],
                }));
            }
            syms.each(function(orig, id) {
                var def = defs[id];
                [].unshift.apply(def.orig, orig);
                def.eliminated += orig.length;
            });
            [].push.apply(body, in_loop ? fn_body.filter(function(stat) {
                if (!(stat instanceof AST_LambdaDefinition)) return true;
                var name = make_node(AST_SymbolVar, flatten_var(stat.name));
                var def = name.definition();
                def.fixed = false;
                def.orig.push(name);
                def.eliminated++;
                body.push(make_node(AST_Var, stat, {
                    definitions: [ make_node(AST_VarDef, stat, {
                        name: name,
                        value: to_func_expr(stat, true),
                    }) ],
                }));
                return false;
            }) : fn_body);
            var inlined = make_node(AST_BlockStatement, call, { body: body });
            if (!no_return) {
                if (async) scan_local_returns(inlined, function(node) {
                    var value = node.value;
                    if (is_undefined(value)) return;
                    node.value = make_node(AST_Await, call, { expression: value });
                });
                body.push(make_node(AST_Return, call, {
                    value: in_async_generator(scope) ? make_node(AST_Undefined, call).transform(compressor) : null,
                }));
            }
            return inlined;

            function process(sym, argname) {
                var def = argname.definition();
                defs[def.id] = def;
                syms.add(def.id, sym);
            }
        });
        def(AST_Conditional, function(compressor, scope, no_return, in_loop, in_await) {
            var self = this;
            var body = self.consequent.try_inline(compressor, scope, no_return, in_loop, in_await);
            var alt = self.alternative.try_inline(compressor, scope, no_return, in_loop, in_await);
            if (!body && !alt) return;
            return make_node(AST_If, self, {
                condition: self.condition,
                body: body || make_body(self.consequent),
                alternative: alt || make_body(self.alternative),
            });

            function make_body(value) {
                if (no_return) return make_node(AST_SimpleStatement, value, { body: value });
                return make_node(AST_Return, value, { value: value });
            }
        });
        def(AST_For, function(compressor, scope, no_return, in_loop) {
            var body = this.body.try_inline(compressor, scope, true, true);
            if (body) this.body = body;
            var inlined = this.init;
            if (inlined) {
                inlined = inlined.try_inline(compressor, scope, true, in_loop);
                if (inlined) {
                    this.init = null;
                    if (inlined instanceof AST_BlockStatement) {
                        inlined.body.push(this);
                        return inlined;
                    }
                    return make_node(AST_BlockStatement, inlined, { body: [ inlined, this ] });
                }
            }
            return body && this;
        });
        def(AST_ForEnumeration, function(compressor, scope, no_return, in_loop) {
            var body = this.body.try_inline(compressor, scope, true, true);
            if (body) this.body = body;
            var obj = this.object;
            if (obj instanceof AST_Sequence) {
                var inlined = inline_sequence(compressor, scope, true, in_loop, false, obj, 1);
                if (inlined) {
                    this.object = obj.tail_node();
                    inlined.body.push(this);
                    return inlined;
                }
            }
            return body && this;
        });
        def(AST_If, function(compressor, scope, no_return, in_loop) {
            var body = this.body.try_inline(compressor, scope, no_return, in_loop);
            if (body) this.body = body;
            var alt = this.alternative;
            if (alt) {
                alt = alt.try_inline(compressor, scope, no_return, in_loop);
                if (alt) this.alternative = alt;
            }
            var cond = this.condition;
            if (cond instanceof AST_Sequence) {
                var inlined = inline_sequence(compressor, scope, true, in_loop, false, cond, 1);
                if (inlined) {
                    this.condition = cond.tail_node();
                    inlined.body.push(this);
                    return inlined;
                }
            }
            return (body || alt) && this;
        });
        def(AST_IterationStatement, function(compressor, scope, no_return, in_loop) {
            var body = this.body.try_inline(compressor, scope, true, true);
            if (!body) return;
            this.body = body;
            return this;
        });
        def(AST_LabeledStatement, function(compressor, scope, no_return, in_loop) {
            var body = this.body.try_inline(compressor, scope, no_return, in_loop);
            if (!body) return;
            if (this.body instanceof AST_IterationStatement && body instanceof AST_BlockStatement) {
                var loop = body.body.pop();
                this.body = loop;
                body.body.push(this);
                return body;
            }
            this.body = body;
            return this;
        });
        def(AST_New, noop);
        def(AST_Return, function(compressor, scope, no_return, in_loop) {
            var value = this.value;
            return value && value.try_inline(compressor, scope, undefined, in_loop === "try");
        });
        function inline_sequence(compressor, scope, no_return, in_loop, in_await, node, skip) {
            var body = [], exprs = node.expressions, no_ret = no_return;
            for (var i = exprs.length - (skip || 0), j = i; --i >= 0; no_ret = true, in_await = false) {
                var inlined = exprs[i].try_inline(compressor, scope, no_ret, in_loop, in_await);
                if (!inlined) continue;
                flush();
                body.push(inlined);
            }
            if (body.length == 0) return;
            flush();
            if (!no_return && body[0] instanceof AST_SimpleStatement) {
                body[0] = make_node(AST_Return, node, { value: body[0].body });
            }
            return make_node(AST_BlockStatement, node, { body: body.reverse() });

            function flush() {
                if (j > i + 1) body.push(make_node(AST_SimpleStatement, node, {
                    body: make_sequence(node, exprs.slice(i + 1, j)),
                }));
                j = i;
            }
        }
        def(AST_Sequence, function(compressor, scope, no_return, in_loop, in_await) {
            return inline_sequence(compressor, scope, no_return, in_loop, in_await, this);
        });
        def(AST_SimpleStatement, function(compressor, scope, no_return, in_loop) {
            var body = this.body;
            while (body instanceof AST_UnaryPrefix) {
                var op = body.operator;
                if (unary_side_effects[op]) break;
                if (op == "void") break;
                body = body.expression;
            }
            if (!no_return && !is_undefined(body)) body = make_node(AST_UnaryPrefix, this, {
                operator: "void",
                expression: body,
            });
            return body.try_inline(compressor, scope, no_return || false, in_loop);
        });
        def(AST_UnaryPrefix, function(compressor, scope, no_return, in_loop, in_await) {
            var self = this;
            var op = self.operator;
            if (unary_side_effects[op]) return;
            if (!no_return && op == "void") no_return = false;
            var inlined = self.expression.try_inline(compressor, scope, no_return, in_loop, in_await);
            if (!inlined) return;
            if (!no_return) scan_local_returns(inlined, function(node) {
                node.in_bool = false;
                var value = node.value;
                if (op == "void" && is_undefined(value)) return;
                node.value = make_node(AST_UnaryPrefix, self, {
                    operator: op,
                    expression: value || make_node(AST_Undefined, node).transform(compressor),
                });
            });
            return inlined;
        });
        def(AST_With, function(compressor, scope, no_return, in_loop) {
            var body = this.body.try_inline(compressor, scope, no_return, in_loop);
            if (body) this.body = body;
            var exp = this.expression;
            if (exp instanceof AST_Sequence) {
                var inlined = inline_sequence(compressor, scope, true, in_loop, false, exp, 1);
                if (inlined) {
                    this.expression = exp.tail_node();
                    inlined.body.push(this);
                    return inlined;
                }
            }
            return body && this;
        });
        def(AST_Yield, function(compressor, scope, no_return, in_loop) {
            if (!compressor.option("yields")) return;
            if (!this.nested) return;
            var call = this.expression;
            if (call.TYPE != "Call") return;
            var fn = call.expression;
            switch (fn.CTOR) {
              case AST_AsyncGeneratorFunction:
                fn = make_node(AST_AsyncFunction, fn);
                break;
              case AST_GeneratorFunction:
                fn = make_node(AST_Function, fn);
                break;
              default:
                return;
            }
            call = call.clone();
            call.expression = fn;
            return call.try_inline(compressor, scope, no_return, in_loop);
        });
    })(function(node, func) {
        node.DEFMETHOD("try_inline", func);
    });

    OPT(AST_Return, function(self, compressor) {
        var value = self.value;
        if (value && compressor.option("side_effects")
            && is_undefined(value, compressor)
            && !in_async_generator(compressor.find_parent(AST_Scope))) {
            self.value = null;
        }
        return self;
    });
})(function(node, optimizer) {
    node.DEFMETHOD("optimize", function(compressor) {
        var self = this;
        if (self._optimized) return self;
        if (compressor.has_directive("use asm")) return self;
        var opt = optimizer(self, compressor);
        opt._optimized = true;
        return opt;
    });
});
