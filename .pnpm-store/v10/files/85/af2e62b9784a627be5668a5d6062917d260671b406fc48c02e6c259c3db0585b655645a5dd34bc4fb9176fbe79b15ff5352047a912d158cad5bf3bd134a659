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

function SymbolDef(id, scope, orig, init) {
    this._bits = 0;
    this.defun = undefined;
    this.eliminated = 0;
    this.id = id;
    this.init = init;
    this.mangled_name = null;
    this.name = orig.name;
    this.orig = [ orig ];
    this.references = [];
    this.replaced = 0;
    this.safe_ids = undefined;
    this.scope = scope;
}

SymbolDef.prototype = {
    forEach: function(fn) {
        this.orig.forEach(fn);
        this.references.forEach(fn);
    },
    mangle: function(options) {
        if (this.mangled_name) return;
        var cache = this.global && options.cache && options.cache.props;
        if (cache && cache.has(this.name)) {
            this.mangled_name = cache.get(this.name);
        } else if (this.unmangleable(options)) {
            names_in_use(this.scope, options).set(this.name, true);
        } else {
            var def = this.redefined();
            if (def) {
                this.mangled_name = def.mangled_name || def.name;
            } else {
                this.mangled_name = next_mangled_name(this, options);
            }
            if (cache) cache.set(this.name, this.mangled_name);
        }
    },
    redefined: function() {
        var self = this;
        var scope = self.defun;
        if (!scope) return;
        var name = self.name;
        var def = scope.variables.get(name)
            || scope instanceof AST_Toplevel && scope.globals.get(name)
            || self.orig[0] instanceof AST_SymbolConst && find_if(function(def) {
                return def.name == name;
            }, scope.enclosed);
        if (def && def !== self) return def.redefined() || def;
    },
    unmangleable: function(options) {
        if (this.exported) return true;
        if (this.undeclared) return true;
        if (!options.eval && this.scope.pinned()) return true;
        if (options.keep_fargs && is_funarg(this)) return true;
        if (options.keep_fnames) {
            var sym = this.orig[0];
            if (sym instanceof AST_SymbolClass) return true;
            if (sym instanceof AST_SymbolDefClass) return true;
            if (sym instanceof AST_SymbolDefun) return true;
            if (sym instanceof AST_SymbolLambda) return true;
        }
        if (!options.toplevel && this.global) return true;
        return false;
    },
};

DEF_BITPROPS(SymbolDef, [
    "const_redefs",
    "cross_loop",
    "direct_access",
    "exported",
    "global",
    "undeclared",
]);

function is_funarg(def) {
    return def.orig[0] instanceof AST_SymbolFunarg || def.orig[1] instanceof AST_SymbolFunarg;
}

var unary_side_effects = makePredicate("delete ++ --");

function is_lhs(node, parent) {
    if (parent instanceof AST_Assign) return parent.left === node && node;
    if (parent instanceof AST_DefaultValue) return parent.name === node && node;
    if (parent instanceof AST_Destructured) return node;
    if (parent instanceof AST_DestructuredKeyVal) return node;
    if (parent instanceof AST_ForEnumeration) return parent.init === node && node;
    if (parent instanceof AST_Unary) return unary_side_effects[parent.operator] && parent.expression;
}

AST_Toplevel.DEFMETHOD("figure_out_scope", function(options) {
    options = defaults(options, {
        cache: null,
        ie: false,
    });

    // pass 1: setup scope chaining and handle definitions
    var self = this;
    var defun = null;
    var exported = false;
    var next_def_id = 0;
    var scope = self.parent_scope = null;
    var tw = new TreeWalker(function(node, descend) {
        if (node instanceof AST_DefClass) {
            var save_exported = exported;
            exported = tw.parent() instanceof AST_ExportDeclaration;
            node.name.walk(tw);
            exported = save_exported;
            walk_scope(function() {
                if (node.extends) node.extends.walk(tw);
                node.properties.forEach(function(prop) {
                    prop.walk(tw);
                });
            });
            return true;
        }
        if (node instanceof AST_Definitions) {
            var save_exported = exported;
            exported = tw.parent() instanceof AST_ExportDeclaration;
            descend();
            exported = save_exported;
            return true;
        }
        if (node instanceof AST_LambdaDefinition) {
            var save_exported = exported;
            exported = tw.parent() instanceof AST_ExportDeclaration;
            node.name.walk(tw);
            exported = save_exported;
            walk_scope(function() {
                node.argnames.forEach(function(argname) {
                    argname.walk(tw);
                });
                if (node.rest) node.rest.walk(tw);
                walk_body(node, tw);
            });
            return true;
        }
        if (node instanceof AST_SwitchBranch) {
            node.init_vars(scope);
            descend();
            return true;
        }
        if (node instanceof AST_Try) {
            walk_scope(function() {
                walk_body(node, tw);
            });
            if (node.bcatch) node.bcatch.walk(tw);
            if (node.bfinally) node.bfinally.walk(tw);
            return true;
        }
        if (node instanceof AST_With) {
            var s = scope;
            do {
                s = s.resolve();
                if (s.uses_with) break;
                s.uses_with = true;
            } while (s = s.parent_scope);
            walk_scope(descend);
            return true;
        }
        if (node instanceof AST_BlockScope) {
            walk_scope(descend);
            return true;
        }
        if (node instanceof AST_Symbol) {
            node.scope = scope;
        }
        if (node instanceof AST_Label) {
            node.thedef = node;
            node.references = [];
        }
        if (node instanceof AST_SymbolCatch) {
            scope.def_variable(node).defun = defun;
        } else if (node instanceof AST_SymbolConst) {
            var def = scope.def_variable(node);
            def.defun = defun;
            if (exported) def.exported = true;
        } else if (node instanceof AST_SymbolDefun) {
            var def = defun.def_function(node, tw.parent());
            if (exported) def.exported = true;
        } else if (node instanceof AST_SymbolFunarg) {
            defun.def_variable(node);
        } else if (node instanceof AST_SymbolLambda) {
            var def = defun.def_function(node, node.name == "arguments" ? undefined : defun);
            if (options.ie && node.name != "arguments") def.defun = defun.parent_scope.resolve();
        } else if (node instanceof AST_SymbolLet) {
            var def = scope.def_variable(node);
            if (exported) def.exported = true;
        } else if (node instanceof AST_SymbolVar) {
            var def = defun.def_variable(node, node instanceof AST_SymbolImport ? undefined : null);
            if (exported) def.exported = true;
        }

        function walk_scope(descend) {
            node.init_vars(scope);
            var save_defun = defun;
            var save_scope = scope;
            if (node instanceof AST_Scope) defun = node;
            scope = node;
            descend();
            scope = save_scope;
            defun = save_defun;
        }
    });
    self.make_def = function(orig, init) {
        return new SymbolDef(++next_def_id, this, orig, init);
    };
    self.walk(tw);

    // pass 2: find back references and eval
    self.globals = new Dictionary();
    var in_arg = [];
    var tw = new TreeWalker(function(node) {
        if (node instanceof AST_Catch) {
            if (!(node.argname instanceof AST_Destructured)) return;
            in_arg.push(node);
            node.argname.walk(tw);
            in_arg.pop();
            walk_body(node, tw);
            return true;
        }
        if (node instanceof AST_Lambda) {
            in_arg.push(node);
            if (node.name) node.name.walk(tw);
            node.argnames.forEach(function(argname) {
                argname.walk(tw);
            });
            if (node.rest) node.rest.walk(tw);
            in_arg.pop();
            walk_lambda(node, tw);
            return true;
        }
        if (node instanceof AST_LoopControl) {
            if (node.label) node.label.thedef.references.push(node);
            return true;
        }
        if (node instanceof AST_SymbolDeclaration) {
            var def = node.definition();
            def.preinit = def.references.length;
            if (node instanceof AST_SymbolCatch) {
                // ensure mangling works if `catch` reuses a scope variable
                var redef = def.redefined();
                if (redef) for (var s = node.scope; s; s = s.parent_scope) {
                    if (!push_uniq(s.enclosed, redef)) break;
                    if (s === redef.scope) break;
                }
            } else if (node instanceof AST_SymbolConst) {
                // ensure compression works if `const` reuses a scope variable
                var redef = def.redefined();
                if (redef) redef.const_redefs = true;
            } else if (def.scope !== node.scope && (node instanceof AST_SymbolDefun
                || node instanceof AST_SymbolFunarg
                || node instanceof AST_SymbolVar)) {
                node.mark_enclosed(options);
                var redef = node.scope.find_variable(node.name);
                if (node.thedef !== redef) {
                    node.thedef = redef;
                    redef.orig.push(node);
                    node.mark_enclosed(options);
                }
            }
            if (node.name != "arguments") return true;
            var parent = node instanceof AST_SymbolVar && tw.parent();
            if (parent instanceof AST_VarDef && !parent.value) return true;
            var sym = node.scope.resolve().find_variable("arguments");
            if (sym && is_arguments(sym)) sym.scope.uses_arguments = 3;
            return true;
        }
        if (node instanceof AST_SymbolRef) {
            var name = node.name;
            var sym = node.scope.find_variable(name);
            for (var i = in_arg.length; i > 0 && sym;) {
                i = in_arg.lastIndexOf(sym.scope, i - 1);
                if (i < 0) break;
                var decl = sym.orig[0];
                if (decl instanceof AST_SymbolCatch
                    || decl instanceof AST_SymbolFunarg
                    || decl instanceof AST_SymbolLambda) {
                    node.in_arg = true;
                    break;
                }
                sym = sym.scope.parent_scope.find_variable(name);
            }
            if (!sym) {
                sym = self.def_global(node);
            } else if (name == "arguments" && is_arguments(sym)) {
                var parent = tw.parent();
                if (is_lhs(node, parent)) {
                    sym.scope.uses_arguments = 3;
                } else if (sym.scope.uses_arguments < 2
                    && !(parent instanceof AST_PropAccess && parent.expression === node)) {
                    sym.scope.uses_arguments = 2;
                } else if (!sym.scope.uses_arguments) {
                    sym.scope.uses_arguments = true;
                }
            }
            if (name == "eval") {
                var parent = tw.parent();
                if (parent.TYPE == "Call" && parent.expression === node) {
                    var s = node.scope;
                    do {
                        s = s.resolve();
                        if (s.uses_eval) break;
                        s.uses_eval = true;
                    } while (s = s.parent_scope);
                } else if (sym.undeclared) {
                    self.uses_eval = true;
                }
            }
            if (sym.init instanceof AST_LambdaDefinition && sym.scope !== sym.init.name.scope) {
                var scope = node.scope;
                do {
                    if (scope === sym.init.name.scope) break;
                } while (scope = scope.parent_scope);
                if (!scope) sym.init = undefined;
            }
            node.thedef = sym;
            node.reference(options);
            return true;
        }
    });
    self.walk(tw);

    // pass 3: fix up any scoping issue with IE8
    if (options.ie) self.walk(new TreeWalker(function(node) {
        if (node instanceof AST_SymbolCatch) {
            var def = node.thedef;
            var scope = def.defun;
            if (def.name != "arguments" && scope.name instanceof AST_SymbolLambda && scope.name.name == def.name) {
                scope = scope.parent_scope.resolve();
            }
            redefine(node, scope);
            return true;
        }
        if (node instanceof AST_SymbolLambda) {
            var def = node.thedef;
            if (!redefine(node, node.scope.parent_scope.resolve())) {
                def.defun = undefined;
            } else if (typeof node.thedef.init !== "undefined") {
                node.thedef.init = false;
            } else if (def.init) {
                node.thedef.init = def.init;
            }
            return true;
        }
    }));

    function is_arguments(sym) {
        return sym.orig[0] instanceof AST_SymbolFunarg
            && !(sym.orig[1] instanceof AST_SymbolFunarg || sym.orig[2] instanceof AST_SymbolFunarg)
            && !is_arrow(sym.scope);
    }

    function redefine(node, scope) {
        var name = node.name;
        var old_def = node.thedef;
        if (!all(old_def.orig, function(sym) {
            return !(sym instanceof AST_SymbolConst || sym instanceof AST_SymbolLet);
        })) return false;
        var new_def = scope.find_variable(name);
        if (new_def) {
            var redef = new_def.redefined();
            if (redef) new_def = redef;
        } else {
            new_def = self.globals.get(name);
        }
        if (new_def) {
            new_def.orig.push(node);
        } else {
            new_def = scope.def_variable(node);
        }
        if (new_def.undeclared) self.variables.set(name, new_def);
        if (name == "arguments" && is_arguments(old_def) && node instanceof AST_SymbolLambda) return true;
        old_def.defun = new_def.scope;
        old_def.forEach(function(node) {
            node.redef = old_def;
            node.thedef = new_def;
            node.reference(options);
        });
        return true;
    }
});

AST_Toplevel.DEFMETHOD("def_global", function(node) {
    var globals = this.globals, name = node.name;
    if (globals.has(name)) {
        return globals.get(name);
    } else {
        var g = this.make_def(node);
        g.undeclared = true;
        g.global = true;
        globals.set(name, g);
        return g;
    }
});

function init_block_vars(scope, parent) {
    scope.enclosed = [];                            // variables from this or outer scope(s) that are referenced from this or inner scopes
    scope.parent_scope = parent;                    // the parent scope (null if this is the top level)
    scope.functions = new Dictionary();             // map name to AST_SymbolDefun (functions defined in this scope)
    scope.variables = new Dictionary();             // map name to AST_SymbolVar (variables defined in this scope; includes functions)
    if (parent) scope.make_def = parent.make_def;   // top-level tracking of SymbolDef instances
}

function init_scope_vars(scope, parent) {
    init_block_vars(scope, parent);
    scope.uses_eval = false;                        // will be set to true if this or nested scope uses the global `eval`
    scope.uses_with = false;                        // will be set to true if this or some nested scope uses the `with` statement
}

AST_BlockScope.DEFMETHOD("init_vars", function(parent_scope) {
    init_block_vars(this, parent_scope);
});
AST_Scope.DEFMETHOD("init_vars", function(parent_scope) {
    init_scope_vars(this, parent_scope);
});
AST_Arrow.DEFMETHOD("init_vars", function(parent_scope) {
    init_scope_vars(this, parent_scope);
    return this;
});
AST_AsyncArrow.DEFMETHOD("init_vars", function(parent_scope) {
    init_scope_vars(this, parent_scope);
});
AST_Lambda.DEFMETHOD("init_vars", function(parent_scope) {
    init_scope_vars(this, parent_scope);
    this.uses_arguments = false;
    this.def_variable(new AST_SymbolFunarg({
        name: "arguments",
        scope: this,
        start: this.start,
        end: this.end,
    }));
    return this;
});

AST_Symbol.DEFMETHOD("mark_enclosed", function(options) {
    var def = this.definition();
    for (var s = this.scope; s; s = s.parent_scope) {
        if (!push_uniq(s.enclosed, def)) break;
        if (!options) {
            s._var_names = undefined;
        } else {
            if (options.keep_fargs && s instanceof AST_Lambda) s.each_argname(function(arg) {
                push_uniq(def.scope.enclosed, arg.definition());
            });
            if (options.keep_fnames) s.functions.each(function(d) {
                push_uniq(def.scope.enclosed, d);
            });
        }
        if (s === def.scope) break;
    }
});

AST_Symbol.DEFMETHOD("reference", function(options) {
    this.definition().references.push(this);
    this.mark_enclosed(options);
});

AST_BlockScope.DEFMETHOD("find_variable", function(name) {
    return this.variables.get(name)
        || this.parent_scope && this.parent_scope.find_variable(name);
});

AST_BlockScope.DEFMETHOD("def_function", function(symbol, init) {
    var def = this.def_variable(symbol, init);
    if (!def.init || def.init instanceof AST_LambdaDefinition) def.init = init;
    this.functions.set(symbol.name, def);
    return def;
});

AST_BlockScope.DEFMETHOD("def_variable", function(symbol, init) {
    var def = this.variables.get(symbol.name);
    if (def) {
        def.orig.push(symbol);
        if (def.init instanceof AST_LambdaExpression) def.init = init;
    } else {
        def = this.make_def(symbol, init);
        this.variables.set(symbol.name, def);
        def.global = !this.parent_scope;
    }
    return symbol.thedef = def;
});

function names_in_use(scope, options) {
    var names = scope.names_in_use;
    if (!names) {
        scope.cname = -1;
        scope.cname_holes = [];
        scope.names_in_use = names = new Dictionary();
        var cache = options.cache && options.cache.props;
        scope.enclosed.forEach(function(def) {
            if (def.unmangleable(options)) names.set(def.name, true);
            if (def.global && cache && cache.has(def.name)) {
                names.set(cache.get(def.name), true);
            }
        });
    }
    return names;
}

function next_mangled_name(def, options) {
    var scope = def.scope;
    var in_use = names_in_use(scope, options);
    var holes = scope.cname_holes;
    var names = new Dictionary();
    var scopes = [ scope ];
    def.forEach(function(sym) {
        var scope = sym.scope;
        do {
            if (member(scope, scopes)) break;
            names_in_use(scope, options).each(function(marker, name) {
                names.set(name, marker);
            });
            scopes.push(scope);
        } while (scope = scope.parent_scope);
    });
    var name;
    for (var i = 0; i < holes.length; i++) {
        name = base54(holes[i]);
        if (names.has(name)) continue;
        holes.splice(i, 1);
        in_use.set(name, true);
        return name;
    }
    while (true) {
        name = base54(++scope.cname);
        if (in_use.has(name) || RESERVED_WORDS[name] || options.reserved.has[name]) continue;
        if (!names.has(name)) break;
        holes.push(scope.cname);
    }
    in_use.set(name, true);
    return name;
}

AST_Symbol.DEFMETHOD("unmangleable", function(options) {
    var def = this.definition();
    return !def || def.unmangleable(options);
});

// labels are always mangleable
AST_Label.DEFMETHOD("unmangleable", return_false);

AST_Symbol.DEFMETHOD("definition", function() {
    return this.thedef;
});

function _default_mangler_options(options) {
    options = defaults(options, {
        eval        : false,
        ie          : false,
        keep_fargs  : false,
        keep_fnames : false,
        reserved    : [],
        toplevel    : false,
        v8          : false,
        webkit      : false,
    });
    if (!Array.isArray(options.reserved)) options.reserved = [];
    // Never mangle `arguments`
    push_uniq(options.reserved, "arguments");
    options.reserved.has = makePredicate(options.reserved);
    return options;
}

// We only need to mangle declaration nodes. Special logic wired into the code
// generator will display the mangled name if it is present (and for
// `AST_SymbolRef`s it will use the mangled name of the `AST_SymbolDeclaration`
// that it points to).
AST_Toplevel.DEFMETHOD("mangle_names", function(options) {
    options = _default_mangler_options(options);
    if (options.cache && options.cache.props) {
        var mangled_names = names_in_use(this, options);
        options.cache.props.each(function(mangled_name) {
            mangled_names.set(mangled_name, true);
        });
    }
    var cutoff = 36;
    var lname = -1;
    var redefined = [];
    var tw = new TreeWalker(function(node, descend) {
        var save_nesting;
        if (node instanceof AST_BlockScope) {
            // `lname` is incremented when we get to the `AST_Label`
            if (node instanceof AST_LabeledStatement) save_nesting = lname;
            if (options.webkit && node instanceof AST_IterationStatement && node.init instanceof AST_Let) {
                node.init.definitions.forEach(function(defn) {
                    defn.name.match_symbol(function(sym) {
                        if (!(sym instanceof AST_SymbolLet)) return;
                        var def = sym.definition();
                        var scope = sym.scope.parent_scope;
                        var redef = scope.def_variable(sym);
                        sym.thedef = def;
                        scope.to_mangle.push(redef);
                        def.redefined = function() {
                            return redef;
                        };
                    });
                }, true);
            }
            var to_mangle = node.to_mangle = [];
            node.variables.each(function(def) {
                if (!defer_redef(def)) to_mangle.push(def);
            });
            descend();
            if (options.cache && node instanceof AST_Toplevel) {
                node.globals.each(mangle);
            }
            if (node instanceof AST_Defun && tw.has_directive("use asm")) {
                var sym = new AST_SymbolRef(node.name);
                sym.scope = node;
                sym.reference(options);
            }
            if (to_mangle.length > cutoff) {
                var indices = to_mangle.map(function(def, index) {
                    return index;
                }).sort(function(i, j) {
                    return to_mangle[j].references.length - to_mangle[i].references.length || i - j;
                });
                to_mangle = indices.slice(0, cutoff).sort(function(i, j) {
                    return i - j;
                }).map(function(index) {
                    return to_mangle[index];
                }).concat(indices.slice(cutoff).sort(function(i, j) {
                    return i - j;
                }).map(function(index) {
                    return to_mangle[index];
                }));
            }
            to_mangle.forEach(mangle);
            if (node instanceof AST_LabeledStatement && !(options.v8 && in_label(tw))) lname = save_nesting;
            return true;
        }
        if (node instanceof AST_Label) {
            var name;
            do {
                name = base54(++lname);
            } while (RESERVED_WORDS[name]);
            node.mangled_name = name;
            return true;
        }
    });
    this.walk(tw);
    redefined.forEach(mangle);

    function mangle(def) {
        if (options.reserved.has[def.name]) return;
        def.mangle(options);
    }

    function defer_redef(def) {
        var sym = def.orig[0];
        var redef = def.redefined();
        if (!redef) {
            if (!(sym instanceof AST_SymbolConst)) return false;
            var scope = def.scope.resolve();
            if (def.scope === scope) return false;
            if (def.scope.parent_scope.find_variable(sym.name)) return false;
            redef = scope.def_variable(sym);
            scope.to_mangle.push(redef);
        }
        redefined.push(def);
        def.references.forEach(reference);
        if (sym instanceof AST_SymbolCatch || sym instanceof AST_SymbolConst) {
            reference(sym);
            def.redefined = function() {
                return redef;
            };
        }
        return true;

        function reference(sym) {
            sym.thedef = redef;
            sym.reference(options);
            sym.thedef = def;
        }
    }

    function in_label(tw) {
        var level = 0, parent;
        while (parent = tw.parent(level++)) {
            if (parent instanceof AST_Block) return parent instanceof AST_Toplevel && !options.toplevel;
            if (parent instanceof AST_LabeledStatement) return true;
        }
    }
});

AST_Toplevel.DEFMETHOD("find_colliding_names", function(options) {
    var cache = options.cache && options.cache.props;
    var avoid = Object.create(RESERVED_WORDS);
    options.reserved.forEach(to_avoid);
    this.globals.each(add_def);
    this.walk(new TreeWalker(function(node) {
        if (node instanceof AST_BlockScope) node.variables.each(add_def);
    }));
    return avoid;

    function to_avoid(name) {
        avoid[name] = true;
    }

    function add_def(def) {
        var name = def.name;
        if (def.global && cache && cache.has(name)) name = cache.get(name);
        else if (!def.unmangleable(options)) return;
        to_avoid(name);
    }
});

AST_Toplevel.DEFMETHOD("expand_names", function(options) {
    base54.reset();
    base54.sort();
    options = _default_mangler_options(options);
    var avoid = this.find_colliding_names(options);
    var cname = 0;
    this.globals.each(rename);
    this.walk(new TreeWalker(function(node) {
        if (node instanceof AST_BlockScope) node.variables.each(rename);
    }));

    function next_name() {
        var name;
        do {
            name = base54(cname++);
        } while (avoid[name]);
        return name;
    }

    function rename(def) {
        if (def.global && options.cache) return;
        if (def.unmangleable(options)) return;
        if (options.reserved.has[def.name]) return;
        var redef = def.redefined();
        var name = redef ? redef.rename || redef.name : next_name();
        def.rename = name;
        def.forEach(function(sym) {
            if (sym.definition() === def) sym.name = name;
        });
    }
});

AST_Node.DEFMETHOD("tail_node", return_this);
AST_Sequence.DEFMETHOD("tail_node", function() {
    return this.expressions[this.expressions.length - 1];
});

AST_Toplevel.DEFMETHOD("compute_char_frequency", function(options) {
    options = _default_mangler_options(options);
    base54.reset();
    var fn = AST_Symbol.prototype.add_source_map;
    try {
        AST_Symbol.prototype.add_source_map = function() {
            if (!this.unmangleable(options)) base54.consider(this.name, -1);
        };
        if (options.properties) {
            AST_Dot.prototype.add_source_map = function() {
                base54.consider(this.property, -1);
            };
            AST_Sub.prototype.add_source_map = function() {
                skip_string(this.property);
            };
        }
        base54.consider(this.print_to_string(), 1);
    } finally {
        AST_Symbol.prototype.add_source_map = fn;
        delete AST_Dot.prototype.add_source_map;
        delete AST_Sub.prototype.add_source_map;
    }
    base54.sort();

    function skip_string(node) {
        if (node instanceof AST_String) {
            base54.consider(node.value, -1);
        } else if (node instanceof AST_Conditional) {
            skip_string(node.consequent);
            skip_string(node.alternative);
        } else if (node instanceof AST_Sequence) {
            skip_string(node.tail_node());
        }
    }
});

var base54 = (function() {
    var freq = Object.create(null);
    function init(chars) {
        var array = [];
        for (var i = 0; i < chars.length; i++) {
            var ch = chars[i];
            array.push(ch);
            freq[ch] = -1e-2 * i;
        }
        return array;
    }
    var digits = init("0123456789");
    var leading = init("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_");
    var chars, frequency;
    function reset() {
        chars = null;
        frequency = Object.create(freq);
    }
    base54.consider = function(str, delta) {
        for (var i = str.length; --i >= 0;) {
            frequency[str[i]] += delta;
        }
    };
    function compare(a, b) {
        return frequency[b] - frequency[a];
    }
    base54.sort = function() {
        chars = leading.sort(compare).concat(digits).sort(compare);
    };
    base54.reset = reset;
    reset();
    function base54(num) {
        var ret = leading[num % 54];
        for (num = Math.floor(num / 54); --num >= 0; num >>= 6) {
            ret += chars[num & 0x3F];
        }
        return ret;
    }
    return base54;
})();
