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

function characters(str) {
    return str.split("");
}

function member(name, array) {
    return array.indexOf(name) >= 0;
}

function find_if(func, array) {
    for (var i = array.length; --i >= 0;) if (func(array[i])) return array[i];
}

function configure_error_stack(fn) {
    Object.defineProperty(fn.prototype, "stack", {
        get: function() {
            var err = new Error(this.message);
            err.name = this.name;
            try {
                throw err;
            } catch (e) {
                return e.stack;
            }
        }
    });
}

function DefaultsError(msg, defs) {
    this.message = msg;
    this.defs = defs;
}
DefaultsError.prototype = Object.create(Error.prototype);
DefaultsError.prototype.constructor = DefaultsError;
DefaultsError.prototype.name = "DefaultsError";
configure_error_stack(DefaultsError);

function defaults(args, defs, croak) {
    if (croak) for (var i in args) {
        if (HOP(args, i) && !HOP(defs, i)) throw new DefaultsError("`" + i + "` is not a supported option", defs);
    }
    for (var i in args) {
        if (HOP(args, i)) defs[i] = args[i];
    }
    return defs;
}

function noop() {}
function return_false() { return false; }
function return_true() { return true; }
function return_this() { return this; }
function return_null() { return null; }

var List = (function() {
    function List(a, f) {
        var ret = [];
        for (var i = 0; i < a.length; i++) {
            var val = f(a[i], i);
            if (val === skip) continue;
            if (val instanceof Splice) {
                ret.push.apply(ret, val.v);
            } else {
                ret.push(val);
            }
        }
        return ret;
    }
    List.is_op = function(val) {
        return val === skip || val instanceof Splice;
    };
    List.splice = function(val) {
        return new Splice(val);
    };
    var skip = List.skip = {};
    function Splice(val) {
        this.v = val;
    }
    return List;
})();

function push_uniq(array, el) {
    if (array.indexOf(el) < 0) return array.push(el);
}

function string_template(text, props) {
    return text.replace(/\{([^{}]+)\}/g, function(str, p) {
        var value = p == "this" ? props : props[p];
        if (value instanceof AST_Node) return value.print_to_string();
        if (value instanceof AST_Token) return value.file + ":" + value.line + "," + value.col;
        return value;
    });
}

function remove(array, el) {
    var index = array.indexOf(el);
    if (index >= 0) array.splice(index, 1);
}

function makePredicate(words) {
    if (!Array.isArray(words)) words = words.split(" ");
    var map = Object.create(null);
    words.forEach(function(word) {
        map[word] = true;
    });
    return map;
}

function all(array, predicate) {
    for (var i = array.length; --i >= 0;)
        if (!predicate(array[i], i))
            return false;
    return true;
}

function Dictionary() {
    this.values = Object.create(null);
}
Dictionary.prototype = {
    set: function(key, val) {
        if (key == "__proto__") {
            this.proto_value = val;
        } else {
            this.values[key] = val;
        }
        return this;
    },
    add: function(key, val) {
        var list = this.get(key);
        if (list) {
            list.push(val);
        } else {
            this.set(key, [ val ]);
        }
        return this;
    },
    get: function(key) {
        return key == "__proto__" ? this.proto_value : this.values[key];
    },
    del: function(key) {
        if (key == "__proto__") {
            delete this.proto_value;
        } else {
            delete this.values[key];
        }
        return this;
    },
    has: function(key) {
        return key == "__proto__" ? "proto_value" in this : key in this.values;
    },
    all: function(predicate) {
        for (var i in this.values)
            if (!predicate(this.values[i], i)) return false;
        if ("proto_value" in this && !predicate(this.proto_value, "__proto__")) return false;
        return true;
    },
    each: function(f) {
        for (var i in this.values)
            f(this.values[i], i);
        if ("proto_value" in this) f(this.proto_value, "__proto__");
    },
    size: function() {
        return Object.keys(this.values).length + ("proto_value" in this);
    },
    map: function(f) {
        var ret = [];
        for (var i in this.values)
            ret.push(f(this.values[i], i));
        if ("proto_value" in this) ret.push(f(this.proto_value, "__proto__"));
        return ret;
    },
    clone: function() {
        var ret = new Dictionary();
        this.each(function(value, i) {
            ret.set(i, value);
        });
        return ret;
    },
    toObject: function() {
        var obj = {};
        this.each(function(value, i) {
            obj["$" + i] = value;
        });
        return obj;
    },
};
Dictionary.fromObject = function(obj) {
    var dict = new Dictionary();
    for (var i in obj)
        if (HOP(obj, i)) dict.set(i.slice(1), obj[i]);
    return dict;
};

function HOP(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

// return true if the node at the top of the stack (that means the
// innermost node in the current output) is lexically the first in
// a statement.
function first_in_statement(stack, arrow, export_default) {
    var node = stack.parent(-1);
    for (var i = 0, p; p = stack.parent(i++); node = p) {
        if (is_arrow(p)) {
            return arrow && p.value === node;
        } else if (p instanceof AST_Binary) {
            if (p.left === node) continue;
        } else if (p.TYPE == "Call") {
            if (p.expression === node) continue;
        } else if (p instanceof AST_Conditional) {
            if (p.condition === node) continue;
        } else if (p instanceof AST_ExportDefault) {
            return export_default;
        } else if (p instanceof AST_PropAccess) {
            if (p.expression === node) continue;
        } else if (p instanceof AST_Sequence) {
            if (p.expressions[0] === node) continue;
        } else if (p instanceof AST_SimpleStatement) {
            return true;
        } else if (p instanceof AST_Template) {
            if (p.tag === node) continue;
        } else if (p instanceof AST_UnaryPostfix) {
            if (p.expression === node) continue;
        }
        return false;
    }
}

function DEF_BITPROPS(ctor, props) {
    if (props.length > 31) throw new Error("Too many properties: " + props.length + "\n" + props.join(", "));
    props.forEach(function(name, pos) {
        var mask = 1 << pos;
        Object.defineProperty(ctor.prototype, name, {
            get: function() {
                return !!(this._bits & mask);
            },
            set: function(val) {
                if (val)
                    this._bits |= mask;
                else
                    this._bits &= ~mask;
            },
        });
    });
}
