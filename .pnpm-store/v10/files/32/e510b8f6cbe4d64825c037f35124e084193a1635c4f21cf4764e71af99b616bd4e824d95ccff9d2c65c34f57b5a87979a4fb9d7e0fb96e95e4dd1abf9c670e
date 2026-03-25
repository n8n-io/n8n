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

function get_builtins() {
    var names = new Dictionary();
    // constants
    [
        "NaN",
        "null",
        "true",
        "false",
        "Infinity",
        "-Infinity",
        "undefined",
    ].forEach(add);
    // global functions
    [
        "encodeURI",
        "encodeURIComponent",
        "escape",
        "eval",
        "decodeURI",
        "decodeURIComponent",
        "isFinite",
        "isNaN",
        "parseFloat",
        "parseInt",
        "unescape",
    ].forEach(add);
    // global constructors & objects
    var global = Function("return this")();
    [
        "Array",
        "ArrayBuffer",
        "Atomics",
        "BigInt",
        "Boolean",
        "console",
        "DataView",
        "Date",
        "Error",
        "Function",
        "Int8Array",
        "Intl",
        "JSON",
        "Map",
        "Math",
        "Number",
        "Object",
        "Promise",
        "Proxy",
        "Reflect",
        "RegExp",
        "Set",
        "String",
        "Symbol",
        "WebAssembly",
    ].forEach(function(name) {
        add(name);
        var ctor = global[name];
        if (!ctor) return;
        Object.getOwnPropertyNames(ctor).map(add);
        if (typeof ctor != "function") return;
        if (ctor.__proto__) Object.getOwnPropertyNames(ctor.__proto__).map(add);
        if (ctor.prototype) Object.getOwnPropertyNames(ctor.prototype).map(add);
        try {
            Object.getOwnPropertyNames(new ctor()).map(add);
        } catch (e) {
            try {
                Object.getOwnPropertyNames(ctor()).map(add);
            } catch (e) {}
        }
    });
    return (get_builtins = function() {
        return names.clone();
    })();

    function add(name) {
        names.set(name, true);
    }
}

function reserve_quoted_keys(ast, reserved) {
    ast.walk(new TreeWalker(function(node) {
        if (node instanceof AST_ClassProperty
            || node instanceof AST_DestructuredKeyVal
            || node instanceof AST_ObjectProperty) {
            if (node.key instanceof AST_Node) {
                addStrings(node.key, add);
            } else if (node.start && node.start.quote) {
                add(node.key);
            }
        } else if (node instanceof AST_Dot) {
            if (node.quoted) add(node.property);
        } else if (node instanceof AST_Sub) {
            addStrings(node.property, add);
        }
    }));

    function add(name) {
        push_uniq(reserved, name);
    }
}

function addStrings(node, add) {
    if (node instanceof AST_Conditional) {
        addStrings(node.consequent, add);
        addStrings(node.alternative, add);
    } else if (node instanceof AST_Sequence) {
        addStrings(node.tail_node(), add);
    } else if (node instanceof AST_String) {
        add(node.value);
    }
}

function mangle_properties(ast, options) {
    options = defaults(options, {
        builtins: false,
        cache: null,
        debug: false,
        domprops: false,
        keep_quoted: false,
        regex: null,
        reserved: null,
    }, true);

    var reserved = options.builtins ? new Dictionary() : get_builtins();
    if (!options.domprops && typeof domprops !== "undefined") domprops.forEach(function(name) {
        reserved.set(name, true);
    });
    if (Array.isArray(options.reserved)) options.reserved.forEach(function(name) {
        reserved.set(name, true);
    });

    var cname = -1;
    var cache;
    if (options.cache) {
        cache = options.cache.props;
        cache.each(function(name) {
            reserved.set(name, true);
        });
    } else {
        cache = new Dictionary();
    }

    var regex = options.regex;

    // note debug is either false (disabled), or a string of the debug suffix to use (enabled).
    // note debug may be enabled as an empty string, which is falsy. Also treat passing 'true'
    // the same as passing an empty string.
    var debug = options.debug !== false;
    var debug_suffix;
    if (debug) debug_suffix = options.debug === true ? "" : options.debug;

    var names_to_mangle = new Dictionary();
    var unmangleable = reserved.clone();

    // step 1: find candidates to mangle
    ast.walk(new TreeWalker(function(node) {
        if (node.TYPE == "Call") {
            var exp = node.expression;
            if (exp instanceof AST_Dot) switch (exp.property) {
              case "defineProperty":
              case "getOwnPropertyDescriptor":
                if (node.args.length < 2) break;
                exp = exp.expression;
                if (!(exp instanceof AST_SymbolRef)) break;
                if (exp.name != "Object") break;
                if (!exp.definition().undeclared) break;
                addStrings(node.args[1], add);
                break;
              case "hasOwnProperty":
                if (node.args.length < 1) break;
                addStrings(node.args[0], add);
                break;
            }
        } else if (node instanceof AST_ClassProperty
            || node instanceof AST_DestructuredKeyVal
            || node instanceof AST_ObjectProperty) {
            if (node.key instanceof AST_Node) {
                addStrings(node.key, add);
            } else {
                add(node.key);
            }
        } else if (node instanceof AST_Dot) {
            if (is_lhs(node, this.parent())) add(node.property);
        } else if (node instanceof AST_Sub) {
            if (is_lhs(node, this.parent())) addStrings(node.property, add);
        }
    }));

    // step 2: renaming properties
    ast.walk(new TreeWalker(function(node) {
        if (node instanceof AST_Binary) {
            if (node.operator == "in") mangleStrings(node.left);
        } else if (node.TYPE == "Call") {
            var exp = node.expression;
            if (exp instanceof AST_Dot) switch (exp.property) {
              case "defineProperty":
              case "getOwnPropertyDescriptor":
                if (node.args.length < 2) break;
                exp = exp.expression;
                if (!(exp instanceof AST_SymbolRef)) break;
                if (exp.name != "Object") break;
                if (!exp.definition().undeclared) break;
                mangleStrings(node.args[1]);
                break;
              case "hasOwnProperty":
                if (node.args.length < 1) break;
                mangleStrings(node.args[0]);
                break;
            }
        } else if (node instanceof AST_ClassProperty
            || node instanceof AST_DestructuredKeyVal
            || node instanceof AST_ObjectProperty) {
            if (node.key instanceof AST_Node) {
                mangleStrings(node.key);
            } else {
                node.key = mangle(node.key);
            }
        } else if (node instanceof AST_Dot) {
            node.property = mangle(node.property);
        } else if (node instanceof AST_Sub) {
            if (!options.keep_quoted) mangleStrings(node.property);
        }
    }));

    // only function declarations after this line

    function can_mangle(name) {
        if (unmangleable.has(name)) return false;
        if (/^-?[0-9]+(\.[0-9]+)?(e[+-][0-9]+)?$/.test(name)) return false;
        return true;
    }

    function should_mangle(name) {
        if (reserved.has(name)) {
            AST_Node.info("Preserving reserved property {this}", name);
            return false;
        }
        if (regex && !regex.test(name)) {
            AST_Node.info("Preserving excluded property {this}", name);
            return false;
        }
        return cache.has(name) || names_to_mangle.has(name);
    }

    function add(name) {
        if (can_mangle(name)) names_to_mangle.set(name, true);
        if (!should_mangle(name)) unmangleable.set(name, true);
    }

    function mangle(name) {
        if (!should_mangle(name)) return name;
        var mangled = cache.get(name);
        if (!mangled) {
            if (debug) {
                // debug mode: use a prefix and suffix to preserve readability, e.g. o.foo ---> o._$foo$NNN_.
                var debug_mangled = "_$" + name + "$" + debug_suffix + "_";
                if (can_mangle(debug_mangled)) mangled = debug_mangled;
            }
            // either debug mode is off, or it is on and we could not use the mangled name
            if (!mangled) do {
                mangled = base54(++cname);
            } while (!can_mangle(mangled));
            if (/^#/.test(name)) mangled = "#" + mangled;
            cache.set(name, mangled);
        }
        AST_Node.info("Mapping property {name} to {mangled}", {
            mangled: mangled,
            name: name,
        });
        return mangled;
    }

    function mangleStrings(node) {
        if (node instanceof AST_Sequence) {
            mangleStrings(node.tail_node());
        } else if (node instanceof AST_String) {
            node.value = mangle(node.value);
        } else if (node instanceof AST_Conditional) {
            mangleStrings(node.consequent);
            mangleStrings(node.alternative);
        }
    }
}
