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

function is_some_comments(comment) {
    // multiline comment
    return comment.type == "comment2" && /@preserve|@license|@cc_on/i.test(comment.value);
}

function OutputStream(options) {
    options = defaults(options, {
        annotations      : false,
        ascii_only       : false,
        beautify         : false,
        braces           : false,
        comments         : false,
        extendscript     : false,
        galio            : false,
        ie               : false,
        indent_level     : 4,
        indent_start     : 0,
        inline_script    : true,
        keep_quoted_props: false,
        max_line_len     : false,
        module           : false,
        preamble         : null,
        preserve_line    : false,
        quote_keys       : false,
        quote_style      : 0,
        semicolons       : true,
        shebang          : true,
        source_map       : null,
        v8               : false,
        webkit           : false,
        width            : 80,
        wrap_iife        : false,
    }, true);

    // Convert comment option to RegExp if necessary and set up comments filter
    var comment_filter = return_false; // Default case, throw all comments away
    if (options.comments) {
        var comments = options.comments;
        if (typeof options.comments === "string" && /^\/.*\/[a-zA-Z]*$/.test(options.comments)) {
            var regex_pos = options.comments.lastIndexOf("/");
            comments = new RegExp(
                options.comments.substr(1, regex_pos - 1),
                options.comments.substr(regex_pos + 1)
            );
        }
        if (comments instanceof RegExp) {
            comment_filter = function(comment) {
                return comment.type != "comment5" && comments.test(comment.value);
            };
        } else if (typeof comments === "function") {
            comment_filter = function(comment) {
                return comment.type != "comment5" && comments(this, comment);
            };
        } else if (comments === "some") {
            comment_filter = is_some_comments;
        } else { // NOTE includes "all" option
            comment_filter = return_true;
        }
    }

    function make_indent(value) {
        if (typeof value == "number") return new Array(value + 1).join(" ");
        if (!value) return "";
        if (!/^\s*$/.test(value)) throw new Error("unsupported indentation: " + JSON.stringify("" + value));
        return value;
    }

    var current_col = 0;
    var current_line = 1;
    var current_indent = make_indent(options.indent_start);
    var full_indent = make_indent(options.indent_level);
    var half_indent = full_indent.length + 1 >> 1;
    var last;
    var line_end = 0;
    var line_fixed = true;
    var mappings = options.source_map && [];
    var mapping_name;
    var mapping_token;
    var might_need_space;
    var might_need_semicolon;
    var need_newline_indented = false;
    var need_space = false;
    var output;
    var stack;
    var stored = "";

    function reset() {
        last = "";
        might_need_space = false;
        might_need_semicolon = false;
        stack = [];
        var str = output;
        output = "";
        return str;
    }

    reset();
    var to_utf8 = options.ascii_only ? function(str, identifier) {
        if (identifier || options.module) str = str.replace(/[\ud800-\udbff][\udc00-\udfff]/g, function(ch) {
            return "\\u{" + (ch.charCodeAt(0) - 0xd7c0 << 10 | ch.charCodeAt(1) - 0xdc00).toString(16) + "}";
        });
        return str.replace(/[\u0000-\u001f\u007f-\uffff]/g, function(s, i) {
            var code = s.charCodeAt(0).toString(16);
            if (code.length <= 2 && !identifier) {
                switch (s) {
                  case "\n": return "\\n";
                  case "\r": return "\\r";
                  case "\t": return "\\t";
                  case "\b": return "\\b";
                  case "\f": return "\\f";
                  case "\x0B": return options.ie ? "\\x0B" : "\\v";
                  case "\0":
                    return /[0-9]/.test(str.charAt(i+1)) ? "\\x00" : "\\0";
                }
                while (code.length < 2) code = "0" + code;
                return "\\x" + code;
            } else {
                while (code.length < 4) code = "0" + code;
                return "\\u" + code;
            }
        });
    } : function(str) {
        var s = "";
        for (var i = 0, j = 0; i < str.length; i++) {
            var code = str.charCodeAt(i);
            if (is_surrogate_pair_head(code)) {
                if (is_surrogate_pair_tail(str.charCodeAt(i + 1))) {
                    i++;
                    continue;
                }
            } else if (!is_surrogate_pair_tail(code)) {
                continue;
            }
            s += str.slice(j, i) + "\\u" + code.toString(16);
            j = i + 1;
        }
        return j == 0 ? str : s + str.slice(j);
    };

    function quote_single(str) {
        return "'" + str.replace(/\x27/g, "\\'") + "'";
    }

    function quote_double(str) {
        return '"' + str.replace(/\x22/g, '\\"') + '"';
    }

    var quote_string = [
        null,
        quote_single,
        quote_double,
        function(str, quote) {
            return quote == "'" ? quote_single(str) : quote_double(str);
        },
    ][options.quote_style] || function(str, quote, dq, sq) {
        return dq > sq ? quote_single(str) : quote_double(str);
    };

    function make_string(str, quote) {
        var dq = 0, sq = 0;
        str = str.replace(/[\\\b\f\n\r\v\t\x22\x27\u2028\u2029\0\ufeff]/g, function(s, i) {
            switch (s) {
              case '"': ++dq; return '"';
              case "'": ++sq; return "'";
              case "\\": return "\\\\";
              case "\n": return "\\n";
              case "\r": return "\\r";
              case "\t": return "\\t";
              case "\b": return "\\b";
              case "\f": return "\\f";
              case "\x0B": return options.ie ? "\\x0B" : "\\v";
              case "\u2028": return "\\u2028";
              case "\u2029": return "\\u2029";
              case "\ufeff": return "\\ufeff";
              case "\0":
                  return /[0-9]/.test(str.charAt(i+1)) ? "\\x00" : "\\0";
            }
            return s;
        });
        return quote_string(to_utf8(str), quote, dq, sq);
    }

    /* -----[ beautification/minification ]----- */

    var adjust_mappings = mappings ? function(line, col) {
        mappings.forEach(function(mapping) {
            mapping.line += line;
            mapping.col += col;
        });
    } : noop;

    var flush_mappings = mappings ? function() {
        mappings.forEach(function(mapping) {
            options.source_map.add(
                mapping.token.file,
                mapping.line, mapping.col,
                mapping.token.line, mapping.token.col,
                !mapping.name && mapping.token.type == "name" ? mapping.token.value : mapping.name
            );
        });
        mappings = [];
    } : noop;

    function insert_newlines(count) {
        stored += output.slice(0, line_end);
        output = output.slice(line_end);
        var new_col = output.length;
        adjust_mappings(count, new_col - current_col);
        current_line += count;
        current_col = new_col;
        while (count--) stored += "\n";
    }

    var fix_line = options.max_line_len ? function(flush) {
        if (line_fixed) {
            if (current_col > options.max_line_len) {
                AST_Node.warn("Output exceeds {max_line_len} characters", options);
            }
            return;
        }
        if (current_col > options.max_line_len) {
            insert_newlines(1);
            line_fixed = true;
        }
        if (line_fixed || flush) flush_mappings();
    } : noop;

    var stat_end_chars = makePredicate("; }");
    var asi_skip_chars = makePredicate("( [ + * / - , . `");
    var asi_skip_words = makePredicate("in instanceof");

    function require_space(prev, ch, str) {
        return is_identifier_char(prev) && (is_identifier_char(ch) || ch == "\\")
            || (ch == "/" && ch == prev)
            || ((ch == "+" || ch == "-") && ch == last)
            || last == "--" && ch == ">"
            || last == "!" && str == "--"
            || prev == "/" && (str == "in" || str == "instanceof");
    }

    var print = options.beautify
        || options.comments
        || options.max_line_len
        || options.preserve_line
        || options.shebang
        || !options.semicolons
        || options.source_map
        || options.width ? function(str) {
        var ch = str.charAt(0);
        if (need_newline_indented && ch) {
            need_newline_indented = false;
            if (ch != "\n") {
                print("\n");
                indent();
            }
        }
        if (need_space && ch) {
            need_space = false;
            if (!/[\s;})]/.test(ch)) {
                space();
            }
        }
        var prev = last.slice(-1);
        if (might_need_semicolon) {
            might_need_semicolon = false;
            if (prev != ";" && !stat_end_chars[ch]) {
                var need_semicolon = asi_skip_chars[ch] || asi_skip_words[str];
                if (need_semicolon || options.semicolons) {
                    output += ";";
                    current_col++;
                    if (!line_fixed) {
                        fix_line();
                        if (line_fixed && !need_semicolon && output == ";") {
                            output = "";
                            current_col = 0;
                        }
                    }
                    if (line_end == output.length - 1) line_end++;
                } else {
                    fix_line();
                    output += "\n";
                    current_line++;
                    current_col = 0;
                    // reset the semicolon flag, since we didn't print one
                    // now and might still have to later
                    if (/^\s+$/.test(str)) might_need_semicolon = true;
                }
                if (!options.beautify) might_need_space = false;
            }
        }

        if (might_need_space) {
            if (require_space(prev, ch, str)) {
                output += " ";
                current_col++;
            }
            if (prev != "<" || str != "!") might_need_space = false;
        }

        if (mapping_token) {
            mappings.push({
                token: mapping_token,
                name: mapping_name,
                line: current_line,
                col: current_col,
            });
            mapping_token = false;
            if (line_fixed) flush_mappings();
        }

        output += str;
        var a = str.split(/\r?\n/), n = a.length - 1;
        current_line += n;
        current_col += a[0].length;
        if (n > 0) {
            fix_line();
            current_col = a[n].length;
        }
        last = str;
    } : function(str) {
        var ch = str.charAt(0);
        var prev = last.slice(-1);
        if (might_need_semicolon) {
            might_need_semicolon = false;
            if (prev == ":" && ch == "}" || (!ch || ";}".indexOf(ch) < 0) && prev != ";") {
                output += ";";
                might_need_space = false;
            }
        }
        if (might_need_space) {
            if (require_space(prev, ch, str)) output += " ";
            if (prev != "<" || str != "!") might_need_space = false;
        }
        output += str;
        last = str;
    };

    var space = options.beautify ? function() {
        print(" ");
    } : function() {
        might_need_space = true;
    };

    var indent = options.beautify ? function(half) {
        if (need_newline_indented) print("\n");
        print(half ? current_indent.slice(0, -half_indent) : current_indent);
    } : noop;

    var with_indent = options.beautify ? function(cont) {
        var save_indentation = current_indent;
        current_indent += full_indent;
        cont();
        current_indent = save_indentation;
    } : function(cont) { cont() };

    var may_add_newline = options.max_line_len || options.preserve_line ? function() {
        fix_line();
        line_end = output.length;
        line_fixed = false;
    } : noop;

    var newline = options.beautify ? function() {
        print("\n");
        line_end = output.length;
    } : may_add_newline;

    var semicolon = options.beautify ? function() {
        print(";");
    } : function() {
        might_need_semicolon = true;
    };

    function force_semicolon() {
        if (might_need_semicolon) print(";");
        print(";");
    }

    function with_block(cont, end) {
        print("{");
        newline();
        with_indent(cont);
        add_mapping(end);
        indent();
        print("}");
    }

    function with_parens(cont) {
        print("(");
        may_add_newline();
        cont();
        may_add_newline();
        print(")");
    }

    function with_square(cont) {
        print("[");
        may_add_newline();
        cont();
        may_add_newline();
        print("]");
    }

    function comma() {
        may_add_newline();
        print(",");
        may_add_newline();
        space();
    }

    function colon() {
        print(":");
        space();
    }

    var add_mapping = mappings ? function(token, name) {
        mapping_token = token;
        mapping_name = name;
    } : noop;

    function get() {
        if (!line_fixed) fix_line(true);
        return stored + output;
    }

    function has_nlb() {
        return /(^|\n) *$/.test(output);
    }

    function pad_comment(token, force) {
        if (need_newline_indented) return;
        if (token.nlb && (force || !has_nlb())) {
            need_newline_indented = true;
        } else if (force) {
            need_space = true;
        }
    }

    function print_comment(comment) {
        var value = comment.value.replace(/[@#]__PURE__/g, " ");
        if (/^\s*$/.test(value) && !/^\s*$/.test(comment.value)) return false;
        if (/comment[134]/.test(comment.type)) {
            print("//" + value);
            need_newline_indented = true;
        } else if (comment.type == "comment2") {
            print("/*" + value + "*/");
        }
        return true;
    }

    function should_merge_comments(node, parent) {
        if (parent instanceof AST_Binary) return parent.left === node;
        if (parent.TYPE == "Call") return parent.expression === node;
        if (parent instanceof AST_Conditional) return parent.condition === node;
        if (parent instanceof AST_Dot) return parent.expression === node;
        if (parent instanceof AST_Exit) return true;
        if (parent instanceof AST_Sequence) return parent.expressions[0] === node;
        if (parent instanceof AST_Sub) return parent.expression === node;
        if (parent instanceof AST_UnaryPostfix) return true;
        if (parent instanceof AST_Yield) return true;
    }

    function prepend_comments(node) {
        var self = this;
        var scan;
        if (node instanceof AST_Exit) {
            scan = node.value;
        } else if (node instanceof AST_Yield) {
            scan = node.expression;
        }
        var comments = dump(node);
        if (!comments) comments = [];

        if (scan) {
            var tw = new TreeWalker(function(node) {
                if (!should_merge_comments(node, tw.parent())) return true;
                var before = dump(node);
                if (before) comments = comments.concat(before);
            });
            tw.push(node);
            scan.walk(tw);
        }

        if (current_line == 1 && current_col == 0) {
            if (comments.length > 0 && options.shebang && comments[0].type == "comment5") {
                print("#!" + comments.shift().value + "\n");
                indent();
            }
            var preamble = options.preamble;
            if (preamble) print(preamble.replace(/\r\n?|\u2028|\u2029|(^|\S)\s*$/g, "$1\n"));
        }

        comments = comments.filter(comment_filter, node);
        var printed = false;
        comments.forEach(function(comment, index) {
            pad_comment(comment, index);
            if (print_comment(comment)) printed = true;
        });
        if (printed) pad_comment(node.start, true);

        function dump(node) {
            var token = node.start;
            if (!token) {
                if (!scan) return;
                node.start = token = new AST_Token();
            }
            var comments = token.comments_before;
            if (!comments) {
                if (!scan) return;
                token.comments_before = comments = [];
            }
            if (comments._dumped === self) return;
            comments._dumped = self;
            return comments;
        }
    }

    function append_comments(node, tail) {
        var self = this;
        var token = node.end;
        if (!token) return;
        var comments = token[tail ? "comments_before" : "comments_after"];
        if (!comments || comments._dumped === self) return;
        if (!(node instanceof AST_Statement || all(comments, function(c) {
            return !/comment[134]/.test(c.type);
        }))) return;
        comments._dumped = self;
        comments.filter(comment_filter, node).forEach(function(comment, index) {
            pad_comment(comment, index || !tail);
            print_comment(comment);
        });
    }

    return {
        get             : get,
        reset           : reset,
        indent          : indent,
        should_break    : options.beautify && options.width ? function() {
            return current_col >= options.width;
        } : return_false,
        has_parens      : function() { return last.slice(-1) == "(" },
        newline         : newline,
        print           : print,
        space           : space,
        comma           : comma,
        colon           : colon,
        last            : function() { return last },
        semicolon       : semicolon,
        force_semicolon : force_semicolon,
        to_utf8         : to_utf8,
        print_name      : function(name) { print(to_utf8(name.toString(), true)) },
        print_string    : options.inline_script ? function(str, quote) {
            str = make_string(str, quote).replace(/<\x2f(script)([>\/\t\n\f\r ])/gi, "<\\/$1$2");
            print(str.replace(/\x3c!--/g, "\\x3c!--").replace(/--\x3e/g, "--\\x3e"));
        } : function(str, quote) {
            print(make_string(str, quote));
        },
        with_indent     : with_indent,
        with_block      : with_block,
        with_parens     : with_parens,
        with_square     : with_square,
        add_mapping     : add_mapping,
        option          : function(opt) { return options[opt] },
        prepend_comments: options.comments || options.shebang ? prepend_comments : noop,
        append_comments : options.comments ? append_comments : noop,
        push_node       : function(node) { stack.push(node) },
        pop_node        : options.preserve_line ? function() {
            var node = stack.pop();
            if (node.start && node.start.line > current_line) {
                insert_newlines(node.start.line - current_line);
            }
        } : function() {
            stack.pop();
        },
        parent          : function(n) {
            return stack[stack.length - 2 - (n || 0)];
        },
    };
}

/* -----[ code generators ]----- */

(function() {

    /* -----[ utils ]----- */

    function DEFPRINT(nodetype, generator) {
        nodetype.DEFMETHOD("_codegen", generator);
    }

    var use_asm = false;

    AST_Node.DEFMETHOD("print", function(stream, force_parens) {
        var self = this;
        stream.push_node(self);
        if (force_parens || self.needs_parens(stream)) {
            stream.with_parens(doit);
        } else {
            doit();
        }
        stream.pop_node();

        function doit() {
            stream.prepend_comments(self);
            self.add_source_map(stream);
            self._codegen(stream);
            stream.append_comments(self);
        }
    });
    var readonly = OutputStream({
        inline_script: false,
        shebang: false,
        width: false,
    });
    AST_Node.DEFMETHOD("print_to_string", function(options) {
        if (options) {
            var stream = OutputStream(options);
            this.print(stream);
            return stream.get();
        }
        this.print(readonly);
        return readonly.reset();
    });

    /* -----[ PARENTHESES ]----- */

    function PARENS(nodetype, func) {
        nodetype.DEFMETHOD("needs_parens", func);
    }

    PARENS(AST_Node, return_false);

    // a function expression needs parens around it when it's provably
    // the first token to appear in a statement.
    function needs_parens_function(output) {
        var p = output.parent();
        if (!output.has_parens() && first_in_statement(output, false, true)) {
            // export default function() {}
            // export default (function foo() {});
            // export default (function() {})(foo);
            // export default (function() {})`foo`;
            // export default (function() {}) ? foo : bar;
            return this.name || !(p instanceof AST_ExportDefault);
        }
        if (output.option("webkit") && p instanceof AST_PropAccess && p.expression === this) return true;
        if (output.option("wrap_iife") && p instanceof AST_Call && p.expression === this) return true;
    }
    PARENS(AST_AsyncFunction, needs_parens_function);
    PARENS(AST_AsyncGeneratorFunction, needs_parens_function);
    PARENS(AST_ClassExpression, needs_parens_function);
    PARENS(AST_Function, needs_parens_function);
    PARENS(AST_GeneratorFunction, needs_parens_function);

    // same goes for an object literal, because otherwise it would be
    // interpreted as a block of code.
    function needs_parens_obj(output) {
        return !output.has_parens() && first_in_statement(output, true);
    }
    PARENS(AST_Object, needs_parens_obj);

    function needs_parens_unary(output) {
        var p = output.parent();
        // (-x) ** y
        if (p instanceof AST_Binary) return p.operator == "**" && p.left === this;
        // (await x)(y)
        // new (await x)
        if (p instanceof AST_Call) return p.expression === this;
        // class extends (x++) {}
        // class x extends (typeof y) {}
        if (p instanceof AST_Class) return true;
        // (x++)[y]
        // (typeof x).y
        // https://github.com/mishoo/UglifyJS/issues/115
        if (p instanceof AST_PropAccess) return p.expression === this;
        // (~x)`foo`
        if (p instanceof AST_Template) return p.tag === this;
    }
    PARENS(AST_Await, needs_parens_unary);
    PARENS(AST_Unary, needs_parens_unary);

    PARENS(AST_Sequence, function(output) {
        var p = output.parent();
            // [ 1, (2, 3), 4 ] ---> [ 1, 3, 4 ]
        return p instanceof AST_Array
            // () ---> (foo, bar)
            || is_arrow(p) && p.value === this
            // await (foo, bar)
            || p instanceof AST_Await
            // 1 + (2, 3) + 4 ---> 8
            || p instanceof AST_Binary
            // new (foo, bar) or foo(1, (2, 3), 4)
            || p instanceof AST_Call
            // class extends (foo, bar) {}
            // class foo extends (bar, baz) {}
            || p instanceof AST_Class
            // class { foo = (bar, baz) }
            // class { [(foo, bar)]() {} }
            || p instanceof AST_ClassProperty
            // (false, true) ? (a = 10, b = 20) : (c = 30)
            // ---> 20 (side effect, set a := 10 and b := 20)
            || p instanceof AST_Conditional
            // [ a = (1, 2) ] = [] ---> a == 2
            || p instanceof AST_DefaultValue
            // { [(1, 2)]: foo } = bar
            // { 1: (2, foo) } = bar
            || p instanceof AST_DestructuredKeyVal
            // export default (foo, bar)
            || p instanceof AST_ExportDefault
            // for (foo of (bar, baz));
            || p instanceof AST_ForOf
            // { [(1, 2)]: 3 }[2] ---> 3
            // { foo: (1, 2) }.foo ---> 2
            || p instanceof AST_ObjectProperty
            // (1, {foo:2}).foo or (1, {foo:2})["foo"] ---> 2
            || p instanceof AST_PropAccess && p.expression === this
            // ...(foo, bar, baz)
            || p instanceof AST_Spread
            // (foo, bar)`baz`
            || p instanceof AST_Template && p.tag === this
            // !(foo, bar, baz)
            || p instanceof AST_Unary
            // var a = (1, 2), b = a + a; ---> b == 4
            || p instanceof AST_VarDef
            // yield (foo, bar)
            || p instanceof AST_Yield;
    });

    PARENS(AST_Binary, function(output) {
        var p = output.parent();
        // await (foo && bar)
        if (p instanceof AST_Await) return true;
        // this deals with precedence:
        //   3 * (2 + 1)
        //   3 - (2 - 1)
        //   (1 ** 2) ** 3
        if (p instanceof AST_Binary) {
            var po = p.operator, pp = PRECEDENCE[po];
            var so = this.operator, sp = PRECEDENCE[so];
            return pp > sp
                || po == "??" && (so == "&&" || so == "||")
                || (pp == sp && this === p[po == "**" ? "left" : "right"]);
        }
        // (foo && bar)()
        if (p instanceof AST_Call) return p.expression === this;
        // class extends (foo && bar) {}
        // class foo extends (bar || null) {}
        if (p instanceof AST_Class) return true;
        // (foo && bar)["prop"], (foo && bar).prop
        if (p instanceof AST_PropAccess) return p.expression === this;
        // (foo && bar)``
        if (p instanceof AST_Template) return p.tag === this;
        // typeof (foo && bar)
        if (p instanceof AST_Unary) return true;
    });

    function need_chain_parens(node, parent) {
        if (!node.terminal) return false;
        if (!(parent instanceof AST_Call || parent instanceof AST_PropAccess)) return false;
        return parent.expression === node;
    }

    PARENS(AST_PropAccess, function(output) {
        var node = this;
        var p = output.parent();
        // i.e. new (foo().bar)
        //
        // if there's one call into this subtree, then we need
        // parens around it too, otherwise the call will be
        // interpreted as passing the arguments to the upper New
        // expression.
        if (p instanceof AST_New && p.expression === node && root_expr(node).TYPE == "Call") return true;
        // (foo?.bar)()
        // (foo?.bar).baz
        // new (foo?.bar)()
        return need_chain_parens(node, p);
    });

    PARENS(AST_Call, function(output) {
        var node = this;
        var p = output.parent();
        if (p instanceof AST_New) return p.expression === node;
        // https://bugs.webkit.org/show_bug.cgi?id=123506
        if (output.option("webkit")
            && node.expression instanceof AST_Function
            && p instanceof AST_PropAccess
            && p.expression === node) {
            var g = output.parent(1);
            if (g instanceof AST_Assign && g.left === p) return true;
        }
        // (foo?.())()
        // (foo?.()).bar
        // new (foo?.())()
        return need_chain_parens(node, p);
    });

    PARENS(AST_New, function(output) {
        if (need_constructor_parens(this, output)) return false;
        var p = output.parent();
        // (new foo)(bar)
        if (p instanceof AST_Call) return p.expression === this;
        // (new Date).getTime(), (new Date)["getTime"]()
        if (p instanceof AST_PropAccess) return true;
        // (new foo)`bar`
        if (p instanceof AST_Template) return p.tag === this;
    });

    PARENS(AST_Number, function(output) {
        if (!output.option("galio")) return false;
        // https://github.com/mishoo/UglifyJS/pull/1009
        var p = output.parent();
        return p instanceof AST_PropAccess && p.expression === this && /^0/.test(make_num(this.value));
    });

    function needs_parens_assign_cond(self, output) {
        var p = output.parent();
        // await (a = foo)
        if (p instanceof AST_Await) return true;
        // 1 + (a = 2) + 3 → 6, side effect setting a = 2
        if (p instanceof AST_Binary) return !(p instanceof AST_Assign);
        // (a = func)() —or— new (a = Object)()
        if (p instanceof AST_Call) return p.expression === self;
        // class extends (a = foo) {}
        // class foo extends (bar ? baz : moo) {}
        if (p instanceof AST_Class) return true;
        // (a = foo) ? bar : baz
        if (p instanceof AST_Conditional) return p.condition === self;
        // (a = foo)["prop"] —or— (a = foo).prop
        if (p instanceof AST_PropAccess) return p.expression === self;
        // (a = foo)`bar`
        if (p instanceof AST_Template) return p.tag === self;
        // !(a = false) → true
        if (p instanceof AST_Unary) return true;
    }
    PARENS(AST_Arrow, function(output) {
        return needs_parens_assign_cond(this, output);
    });
    PARENS(AST_Assign, function(output) {
        if (needs_parens_assign_cond(this, output)) return true;
        //  v8 parser bug   --->     workaround
        // f([1], [a] = []) ---> f([1], ([a] = []))
        if (output.option("v8")) return this.left instanceof AST_Destructured;
        // ({ p: a } = o);
        if (this.left instanceof AST_DestructuredObject) return needs_parens_obj(output);
    });
    PARENS(AST_AsyncArrow, function(output) {
        return needs_parens_assign_cond(this, output);
    });
    PARENS(AST_Conditional, function(output) {
        return needs_parens_assign_cond(this, output)
            // https://github.com/mishoo/UglifyJS/issues/1144
            || output.option("extendscript") && output.parent() instanceof AST_Conditional;
    });
    PARENS(AST_Yield, function(output) {
        return needs_parens_assign_cond(this, output);
    });

    /* -----[ PRINTERS ]----- */

    DEFPRINT(AST_Directive, function(output) {
        var quote = this.quote;
        var value = this.value;
        switch (output.option("quote_style")) {
          case 0:
          case 2:
            if (value.indexOf('"') == -1) quote = '"';
            break;
          case 1:
            if (value.indexOf("'") == -1) quote = "'";
            break;
        }
        output.print(quote + value + quote);
        output.semicolon();
    });
    DEFPRINT(AST_Debugger, function(output) {
        output.print("debugger");
        output.semicolon();
    });

    /* -----[ statements ]----- */

    function display_body(body, is_toplevel, output, allow_directives) {
        var last = body.length - 1;
        var in_directive = allow_directives;
        var was_asm = use_asm;
        body.forEach(function(stmt, i) {
            if (in_directive) {
                if (stmt instanceof AST_Directive) {
                    if (stmt.value == "use asm") use_asm = true;
                } else if (!(stmt instanceof AST_EmptyStatement)) {
                    if (stmt instanceof AST_SimpleStatement && stmt.body instanceof AST_String) {
                        output.force_semicolon();
                    }
                    in_directive = false;
                }
            }
            if (stmt instanceof AST_EmptyStatement) return;
            output.indent();
            stmt.print(output);
            if (i == last && is_toplevel) return;
            output.newline();
            if (is_toplevel) output.newline();
        });
        use_asm = was_asm;
    }

    DEFPRINT(AST_Toplevel, function(output) {
        display_body(this.body, true, output, true);
        output.print("");
    });
    DEFPRINT(AST_LabeledStatement, function(output) {
        this.label.print(output);
        output.colon();
        var body = this.body;
        if (body instanceof AST_EmptyStatement) {
            output.force_semicolon();
        } else {
            body.print(output);
        }
    });
    DEFPRINT(AST_SimpleStatement, function(output) {
        this.body.print(output);
        output.semicolon();
    });
    function print_braced_empty(self, output) {
        output.print("{");
        output.with_indent(function() {
            output.append_comments(self, true);
        });
        output.print("}");
    }
    function print_braced(self, output, allow_directives) {
        if (self.body.length > 0) {
            output.with_block(function() {
                display_body(self.body, false, output, allow_directives);
            }, self.end);
        } else print_braced_empty(self, output);
    }
    DEFPRINT(AST_BlockStatement, function(output) {
        print_braced(this, output);
    });
    DEFPRINT(AST_EmptyStatement, function(output) {
        output.semicolon();
    });
    DEFPRINT(AST_Do, function(output) {
        var self = this;
        output.print("do");
        make_block(self.body, output);
        output.space();
        output.print("while");
        output.space();
        output.with_parens(function() {
            self.condition.print(output);
        });
        output.semicolon();
    });
    DEFPRINT(AST_While, function(output) {
        var self = this;
        output.print("while");
        output.space();
        output.with_parens(function() {
            self.condition.print(output);
        });
        force_statement(self.body, output);
    });
    DEFPRINT(AST_For, function(output) {
        var self = this;
        output.print("for");
        output.space();
        output.with_parens(function() {
            if (self.init) {
                if (self.init instanceof AST_Definitions) {
                    self.init.print(output);
                } else {
                    parenthesize_for_no_in(self.init, output, true);
                }
                output.print(";");
                output.space();
            } else {
                output.print(";");
            }
            if (self.condition) {
                self.condition.print(output);
                output.print(";");
                output.space();
            } else {
                output.print(";");
            }
            if (self.step) {
                self.step.print(output);
            }
        });
        force_statement(self.body, output);
    });
    function print_for_enum(prefix, infix) {
        return function(output) {
            var self = this;
            output.print(prefix);
            output.space();
            output.with_parens(function() {
                self.init.print(output);
                output.space();
                output.print(infix);
                output.space();
                self.object.print(output);
            });
            force_statement(self.body, output);
        };
    }
    DEFPRINT(AST_ForAwaitOf, print_for_enum("for await", "of"));
    DEFPRINT(AST_ForIn, print_for_enum("for", "in"));
    DEFPRINT(AST_ForOf, print_for_enum("for", "of"));
    DEFPRINT(AST_With, function(output) {
        var self = this;
        output.print("with");
        output.space();
        output.with_parens(function() {
            self.expression.print(output);
        });
        force_statement(self.body, output);
    });
    DEFPRINT(AST_ExportDeclaration, function(output) {
        output.print("export");
        output.space();
        this.body.print(output);
    });
    DEFPRINT(AST_ExportDefault, function(output) {
        output.print("export");
        output.space();
        output.print("default");
        output.space();
        var body = this.body;
        body.print(output);
        if (body instanceof AST_ClassExpression) {
            if (!body.name) return;
        }
        if (body instanceof AST_DefClass) return;
        if (body instanceof AST_LambdaDefinition) return;
        if (body instanceof AST_LambdaExpression) {
            if (!body.name && !is_arrow(body)) return;
        }
        output.semicolon();
    });
    function print_alias(alias, output) {
        var value = alias.value;
        if (value == "*" || is_identifier_string(value)) {
            output.print_name(value);
        } else {
            output.print_string(value, alias.quote);
        }
    }
    DEFPRINT(AST_ExportForeign, function(output) {
        var self = this;
        output.print("export");
        output.space();
        var len = self.keys.length;
        if (len == 0) {
            print_braced_empty(self, output);
        } else if (self.keys[0].value == "*") {
            print_entry(0);
        } else output.with_block(function() {
            output.indent();
            print_entry(0);
            for (var i = 1; i < len; i++) {
                output.print(",");
                output.newline();
                output.indent();
                print_entry(i);
            }
            output.newline();
        }, self.end);
        output.space();
        output.print("from");
        output.space();
        self.path.print(output);
        output.semicolon();

        function print_entry(index) {
            var alias = self.aliases[index];
            var key = self.keys[index];
            print_alias(key, output);
            if (alias.value != key.value) {
                output.space();
                output.print("as");
                output.space();
                print_alias(alias, output);
            }
        }
    });
    DEFPRINT(AST_ExportReferences, function(output) {
        var self = this;
        output.print("export");
        output.space();
        print_properties(self, output);
        output.semicolon();
    });
    DEFPRINT(AST_Import, function(output) {
        var self = this;
        output.print("import");
        output.space();
        if (self.default) self.default.print(output);
        if (self.all) {
            if (self.default) output.comma();
            self.all.print(output);
        }
        if (self.properties) {
            if (self.default) output.comma();
            print_properties(self, output);
        }
        if (self.all || self.default || self.properties) {
            output.space();
            output.print("from");
            output.space();
        }
        self.path.print(output);
        output.semicolon();
    });

    /* -----[ functions ]----- */
    function print_funargs(self, output) {
        output.with_parens(function() {
            self.argnames.forEach(function(arg, i) {
                if (i) output.comma();
                arg.print(output);
            });
            if (self.rest) {
                if (self.argnames.length) output.comma();
                output.print("...");
                self.rest.print(output);
            }
        });
    }
    function print_arrow(self, output) {
        var argname = self.argnames.length == 1 && !self.rest && self.argnames[0];
        if (argname instanceof AST_SymbolFunarg && argname.name != "yield") {
            argname.print(output);
        } else {
            print_funargs(self, output);
        }
        output.space();
        output.print("=>");
        output.space();
        if (self.value) {
            self.value.print(output);
        } else {
            print_braced(self, output, true);
        }
    }
    DEFPRINT(AST_Arrow, function(output) {
        print_arrow(this, output);
    });
    DEFPRINT(AST_AsyncArrow, function(output) {
        output.print("async");
        output.space();
        print_arrow(this, output);
    });
    function print_lambda(self, output) {
        if (self.name) {
            output.space();
            self.name.print(output);
        }
        print_funargs(self, output);
        output.space();
        print_braced(self, output, true);
    }
    DEFPRINT(AST_Lambda, function(output) {
        output.print("function");
        print_lambda(this, output);
    });
    function print_async(output) {
        output.print("async");
        output.space();
        output.print("function");
        print_lambda(this, output);
    }
    DEFPRINT(AST_AsyncDefun, print_async);
    DEFPRINT(AST_AsyncFunction, print_async);
    function print_async_generator(output) {
        output.print("async");
        output.space();
        output.print("function*");
        print_lambda(this, output);
    }
    DEFPRINT(AST_AsyncGeneratorDefun, print_async_generator);
    DEFPRINT(AST_AsyncGeneratorFunction, print_async_generator);
    function print_generator(output) {
        output.print("function*");
        print_lambda(this, output);
    }
    DEFPRINT(AST_GeneratorDefun, print_generator);
    DEFPRINT(AST_GeneratorFunction, print_generator);

    /* -----[ classes ]----- */
    DEFPRINT(AST_Class, function(output) {
        var self = this;
        output.print("class");
        if (self.name) {
            output.space();
            self.name.print(output);
        }
        if (self.extends) {
            output.space();
            output.print("extends");
            output.space();
            self.extends.print(output);
        }
        output.space();
        print_properties(self, output, true);
    });
    DEFPRINT(AST_ClassField, function(output) {
        var self = this;
        if (self.static) {
            output.print("static");
            output.space();
        }
        print_property_key(self, output);
        if (self.value) {
            output.space();
            output.print("=");
            output.space();
            self.value.print(output);
        } else switch (self.key) {
          case "get":
          case "set":
          case "static":
            output.force_semicolon();
            return;
        }
        output.semicolon();
    });
    DEFPRINT(AST_ClassGetter, print_accessor("get"));
    DEFPRINT(AST_ClassSetter, print_accessor("set"));
    function print_method(self, output) {
        var fn = self.value;
        if (is_async(fn)) {
            output.print("async");
            output.space();
        }
        if (is_generator(fn)) output.print("*");
        print_property_key(self, output);
        print_lambda(self.value, output);
    }
    DEFPRINT(AST_ClassMethod, function(output) {
        var self = this;
        if (self.static) {
            output.print("static");
            output.space();
        }
        print_method(self, output);
    });
    DEFPRINT(AST_ClassInit, function(output) {
        output.print("static");
        output.space();
        print_braced(this.value, output);
    });

    /* -----[ jumps ]----- */
    function print_jump(kind, prop) {
        return function(output) {
            output.print(kind);
            var target = this[prop];
            if (target) {
                output.space();
                target.print(output);
            }
            output.semicolon();
        };
    }
    DEFPRINT(AST_Return, print_jump("return", "value"));
    DEFPRINT(AST_Throw, print_jump("throw", "value"));
    DEFPRINT(AST_Break, print_jump("break", "label"));
    DEFPRINT(AST_Continue, print_jump("continue", "label"));

    /* -----[ if ]----- */
    function make_then(self, output) {
        var b = self.body;
        if (output.option("braces") && !(b instanceof AST_Const || b instanceof AST_Let)
            || output.option("ie") && b instanceof AST_Do)
            return make_block(b, output);
        // The squeezer replaces "block"-s that contain only a single
        // statement with the statement itself; technically, the AST
        // is correct, but this can create problems when we output an
        // IF having an ELSE clause where the THEN clause ends in an
        // IF *without* an ELSE block (then the outer ELSE would refer
        // to the inner IF).  This function checks for this case and
        // adds the block braces if needed.
        if (!b) return output.force_semicolon();
        while (true) {
            if (b instanceof AST_If) {
                if (!b.alternative) {
                    make_block(self.body, output);
                    return;
                }
                b = b.alternative;
            } else if (b instanceof AST_StatementWithBody) {
                b = b.body;
            } else break;
        }
        force_statement(self.body, output);
    }
    DEFPRINT(AST_If, function(output) {
        var self = this;
        output.print("if");
        output.space();
        output.with_parens(function() {
            self.condition.print(output);
        });
        if (self.alternative) {
            make_then(self, output);
            output.space();
            output.print("else");
            if (self.alternative instanceof AST_If) {
                output.space();
                self.alternative.print(output);
            } else {
                force_statement(self.alternative, output);
            }
        } else {
            force_statement(self.body, output);
        }
    });

    /* -----[ switch ]----- */
    DEFPRINT(AST_Switch, function(output) {
        var self = this;
        output.print("switch");
        output.space();
        output.with_parens(function() {
            self.expression.print(output);
        });
        output.space();
        var last = self.body.length - 1;
        if (last < 0) print_braced_empty(self, output);
        else output.with_block(function() {
            self.body.forEach(function(branch, i) {
                output.indent(true);
                branch.print(output);
                if (i < last && branch.body.length > 0)
                    output.newline();
            });
        }, self.end);
    });
    function print_branch_body(self, output) {
        output.newline();
        self.body.forEach(function(stmt) {
            output.indent();
            stmt.print(output);
            output.newline();
        });
    }
    DEFPRINT(AST_Default, function(output) {
        output.print("default:");
        print_branch_body(this, output);
    });
    DEFPRINT(AST_Case, function(output) {
        var self = this;
        output.print("case");
        output.space();
        self.expression.print(output);
        output.print(":");
        print_branch_body(self, output);
    });

    /* -----[ exceptions ]----- */
    DEFPRINT(AST_Try, function(output) {
        var self = this;
        output.print("try");
        output.space();
        print_braced(self, output);
        if (self.bcatch) {
            output.space();
            self.bcatch.print(output);
        }
        if (self.bfinally) {
            output.space();
            self.bfinally.print(output);
        }
    });
    DEFPRINT(AST_Catch, function(output) {
        var self = this;
        output.print("catch");
        if (self.argname) {
            output.space();
            output.with_parens(function() {
                self.argname.print(output);
            });
        }
        output.space();
        print_braced(self, output);
    });
    DEFPRINT(AST_Finally, function(output) {
        output.print("finally");
        output.space();
        print_braced(this, output);
    });

    function print_definitions(type) {
        return function(output) {
            var self = this;
            output.print(type);
            output.space();
            self.definitions.forEach(function(def, i) {
                if (i) output.comma();
                def.print(output);
            });
            var p = output.parent();
            if (!(p instanceof AST_IterationStatement && p.init === self)) output.semicolon();
        };
    }
    DEFPRINT(AST_Const, print_definitions("const"));
    DEFPRINT(AST_Let, print_definitions("let"));
    DEFPRINT(AST_Var, print_definitions("var"));

    function parenthesize_for_no_in(node, output, no_in) {
        var parens = false;
        // need to take some precautions here:
        //    https://github.com/mishoo/UglifyJS/issues/60
        if (no_in) node.walk(new TreeWalker(function(node) {
            if (parens) return true;
            if (node instanceof AST_Binary && node.operator == "in") return parens = true;
            if (node instanceof AST_Scope && !(is_arrow(node) && node.value)) return true;
        }));
        node.print(output, parens);
    }

    DEFPRINT(AST_VarDef, function(output) {
        var self = this;
        self.name.print(output);
        if (self.value) {
            output.space();
            output.print("=");
            output.space();
            var p = output.parent(1);
            var no_in = p instanceof AST_For || p instanceof AST_ForEnumeration;
            parenthesize_for_no_in(self.value, output, no_in);
        }
    });

    DEFPRINT(AST_DefaultValue, function(output) {
        var self = this;
        self.name.print(output);
        output.space();
        output.print("=");
        output.space();
        self.value.print(output);
    });

    /* -----[ other expressions ]----- */
    function print_annotation(self, output) {
        if (!output.option("annotations")) return;
        if (!self.pure) return;
        var level = 0, parent = self, node;
        do {
            node = parent;
            parent = output.parent(level++);
            if (parent instanceof AST_Call && parent.expression === node) return;
        } while (parent instanceof AST_PropAccess && parent.expression === node);
        output.print("/*@__PURE__*/");
    }
    function print_call_args(self, output) {
        output.with_parens(function() {
            self.args.forEach(function(expr, i) {
                if (i) output.comma();
                expr.print(output);
            });
            output.add_mapping(self.end);
        });
    }
    DEFPRINT(AST_Call, function(output) {
        var self = this;
        print_annotation(self, output);
        self.expression.print(output);
        if (self.optional) output.print("?.");
        print_call_args(self, output);
    });
    DEFPRINT(AST_New, function(output) {
        var self = this;
        print_annotation(self, output);
        output.print("new");
        output.space();
        self.expression.print(output);
        if (need_constructor_parens(self, output)) print_call_args(self, output);
    });
    DEFPRINT(AST_Sequence, function(output) {
        this.expressions.forEach(function(node, index) {
            if (index > 0) {
                output.comma();
                if (output.should_break()) {
                    output.newline();
                    output.indent();
                }
            }
            node.print(output);
        });
    });
    DEFPRINT(AST_Dot, function(output) {
        var self = this;
        var expr = self.expression;
        expr.print(output);
        var prop = self.property;
        if (output.option("ie") && RESERVED_WORDS[prop] || self.quoted && output.option("keep_quoted_props")) {
            if (self.optional) output.print("?.");
            output.with_square(function() {
                output.add_mapping(self.end);
                output.print_string(prop);
            });
        } else {
            if (expr instanceof AST_Number && !/[ex.)]/i.test(output.last())) output.print(".");
            output.print(self.optional ? "?." : ".");
            // the name after dot would be mapped about here.
            output.add_mapping(self.end);
            output.print_name(prop);
        }
    });
    DEFPRINT(AST_Sub, function(output) {
        var self = this;
        self.expression.print(output);
        if (self.optional) output.print("?.");
        output.with_square(function() {
            self.property.print(output);
        });
    });
    DEFPRINT(AST_Spread, function(output) {
        output.print("...");
        this.expression.print(output);
    });
    DEFPRINT(AST_UnaryPrefix, function(output) {
        var op = this.operator;
        var exp = this.expression;
        output.print(op);
        if (/^[a-z]/i.test(op)
            || (/[+-]$/.test(op)
                && exp instanceof AST_UnaryPrefix
                && /^[+-]/.test(exp.operator))) {
            output.space();
        }
        exp.print(output);
    });
    DEFPRINT(AST_UnaryPostfix, function(output) {
        var self = this;
        self.expression.print(output);
        output.add_mapping(self.end);
        output.print(self.operator);
    });
    DEFPRINT(AST_Binary, function(output) {
        var self = this;
        self.left.print(output);
        output.space();
        output.print(self.operator);
        output.space();
        self.right.print(output);
    });
    DEFPRINT(AST_Conditional, function(output) {
        var self = this;
        self.condition.print(output);
        output.space();
        output.print("?");
        output.space();
        self.consequent.print(output);
        output.space();
        output.colon();
        self.alternative.print(output);
    });
    DEFPRINT(AST_Await, function(output) {
        output.print("await");
        output.space();
        this.expression.print(output);
    });
    DEFPRINT(AST_Yield, function(output) {
        output.print(this.nested ? "yield*" : "yield");
        if (this.expression) {
            output.space();
            this.expression.print(output);
        }
    });

    /* -----[ literals ]----- */
    DEFPRINT(AST_Array, function(output) {
        var a = this.elements, len = a.length;
        output.with_square(len > 0 ? function() {
            output.space();
            a.forEach(function(exp, i) {
                if (i) output.comma();
                exp.print(output);
                // If the final element is a hole, we need to make sure it
                // doesn't look like a trailing comma, by inserting an actual
                // trailing comma.
                if (i === len - 1 && exp instanceof AST_Hole)
                  output.comma();
            });
            output.space();
        } : noop);
    });
    DEFPRINT(AST_DestructuredArray, function(output) {
        var a = this.elements, len = a.length, rest = this.rest;
        output.with_square(len || rest ? function() {
            output.space();
            a.forEach(function(exp, i) {
                if (i) output.comma();
                exp.print(output);
            });
            if (rest) {
                if (len) output.comma();
                output.print("...");
                rest.print(output);
            } else if (a[len - 1] instanceof AST_Hole) {
                // If the final element is a hole, we need to make sure it
                // doesn't look like a trailing comma, by inserting an actual
                // trailing comma.
                output.comma();
            }
            output.space();
        } : noop);
    });
    DEFPRINT(AST_DestructuredKeyVal, function(output) {
        var self = this;
        var key = print_property_key(self, output);
        var value = self.value;
        if (key) {
            if (value instanceof AST_DefaultValue) {
                if (value.name instanceof AST_Symbol && key == get_symbol_name(value.name)) {
                    output.space();
                    output.print("=");
                    output.space();
                    value.value.print(output);
                    return;
                }
            } else if (value instanceof AST_Symbol) {
                if (key == get_symbol_name(value)) return;
            }
        }
        output.colon();
        value.print(output);
    });
    DEFPRINT(AST_DestructuredObject, function(output) {
        var self = this;
        var props = self.properties, len = props.length, rest = self.rest;
        if (len || rest) output.with_block(function() {
            props.forEach(function(prop, i) {
                if (i) {
                    output.print(",");
                    output.newline();
                }
                output.indent();
                prop.print(output);
            });
            if (rest) {
                if (len) {
                    output.print(",");
                    output.newline();
                }
                output.indent();
                output.print("...");
                rest.print(output);
            }
            output.newline();
        }, self.end);
        else print_braced_empty(self, output);
    });
    function print_properties(self, output, no_comma) {
        var props = self.properties;
        if (props.length > 0) output.with_block(function() {
            props.forEach(function(prop, i) {
                if (i) {
                    if (!no_comma) output.print(",");
                    output.newline();
                }
                output.indent();
                prop.print(output);
            });
            output.newline();
        }, self.end);
        else print_braced_empty(self, output);
    }
    DEFPRINT(AST_Object, function(output) {
        print_properties(this, output);
    });

    function print_property_key(self, output) {
        var key = self.key;
        if (key instanceof AST_Node) return output.with_square(function() {
            key.print(output);
        });
        var quote = self.start && self.start.quote;
        if (output.option("quote_keys") || quote && output.option("keep_quoted_props")) {
            output.print_string(key, quote);
        } else if ("" + +key == key && key >= 0) {
            output.print(make_num(key));
        } else if (self.private) {
            output.print_name(key);
        } else if (RESERVED_WORDS[key] ? !output.option("ie") : is_identifier_string(key)) {
            output.print_name(key);
            return key;
        } else {
            output.print_string(key, quote);
        }
    }
    DEFPRINT(AST_ObjectKeyVal, function(output) {
        var self = this;
        print_property_key(self, output);
        output.colon();
        self.value.print(output);
    });
    DEFPRINT(AST_ObjectMethod, function(output) {
        print_method(this, output);
    });
    function print_accessor(type) {
        return function(output) {
            var self = this;
            if (self.static) {
                output.print("static");
                output.space();
            }
            output.print(type);
            output.space();
            print_property_key(self, output);
            print_lambda(self.value, output);
        };
    }
    DEFPRINT(AST_ObjectGetter, print_accessor("get"));
    DEFPRINT(AST_ObjectSetter, print_accessor("set"));
    function get_symbol_name(sym) {
        var def = sym.definition();
        return def && def.mangled_name || sym.name;
    }
    DEFPRINT(AST_Symbol, function(output) {
        output.print_name(get_symbol_name(this));
    });
    DEFPRINT(AST_SymbolExport, function(output) {
        var self = this;
        var name = get_symbol_name(self);
        output.print_name(name);
        var alias = self.alias;
        if (alias.value != name) {
            output.space();
            output.print("as");
            output.space();
            print_alias(alias, output);
        }
    });
    DEFPRINT(AST_SymbolImport, function(output) {
        var self = this;
        var name = get_symbol_name(self);
        var key = self.key;
        if (key.value && key.value != name) {
            print_alias(key, output);
            output.space();
            output.print("as");
            output.space();
        }
        output.print_name(name);
    });
    DEFPRINT(AST_Hole, noop);
    DEFPRINT(AST_Template, function(output) {
        var self = this;
        if (self.tag) self.tag.print(output);
        output.print("`");
        for (var i = 0; i < self.expressions.length; i++) {
            output.print(output.to_utf8(self.strings[i]));
            output.print("${");
            self.expressions[i].print(output);
            output.print("}");
        }
        output.print(output.to_utf8(self.strings[i]));
        output.print("`");
    });
    DEFPRINT(AST_BigInt, function(output) {
        output.print(this.value + "n");
    });
    DEFPRINT(AST_Constant, function(output) {
        output.print("" + this.value);
    });
    DEFPRINT(AST_String, function(output) {
        output.print_string(this.value, this.quote);
    });
    DEFPRINT(AST_Number, function(output) {
        var start = this.start;
        if (use_asm && start && start.raw != null) {
            output.print(start.raw);
        } else {
            output.print(make_num(this.value));
        }
    });

    DEFPRINT(AST_RegExp, function(output) {
        var regexp = this.value;
        var str = regexp.toString();
        var end = str.lastIndexOf("/");
        if (regexp.raw_source) {
            str = "/" + regexp.raw_source + str.slice(end);
        } else if (end == 1) {
            str = "/(?:)" + str.slice(end);
        } else if (str.indexOf("/", 1) < end) {
            str = "/" + str.slice(1, end).replace(/\\\\|[^/]?\//g, function(match) {
                return match[0] == "\\" ? match : match.slice(0, -1) + "\\/";
            }) + str.slice(end);
        }
        output.print(output.to_utf8(str).replace(/\\(?:\0(?![0-9])|[^\0])/g, function(match) {
            switch (match[1]) {
              case "\n": return "\\n";
              case "\r": return "\\r";
              case "\t": return "\t";
              case "\b": return "\b";
              case "\f": return "\f";
              case "\0": return "\0";
              case "\x0B": return "\v";
              case "\u2028": return "\\u2028";
              case "\u2029": return "\\u2029";
              default: return match;
            }
        }).replace(/[\n\r\u2028\u2029]/g, function(c) {
            switch (c) {
              case "\n": return "\\n";
              case "\r": return "\\r";
              case "\u2028": return "\\u2028";
              case "\u2029": return "\\u2029";
            }
        }));
    });

    function force_statement(stat, output) {
        if (output.option("braces") && !(stat instanceof AST_Const || stat instanceof AST_Let)) {
            make_block(stat, output);
        } else if (stat instanceof AST_EmptyStatement) {
            output.force_semicolon();
        } else {
            output.space();
            stat.print(output);
        }
    }

    // self should be AST_New.  decide if we want to show parens or not.
    function need_constructor_parens(self, output) {
        // Always print parentheses with arguments
        if (self.args.length > 0) return true;

        return output.option("beautify");
    }

    function best_of(a) {
        var best = a[0], len = best.length;
        for (var i = 1; i < a.length; ++i) {
            if (a[i].length < len) {
                best = a[i];
                len = best.length;
            }
        }
        return best;
    }

    function make_num(num) {
        var str = num.toString(10).replace(/^0\./, ".").replace("e+", "e");
        var candidates = [ str ];
        if (Math.floor(num) === num) {
            if (num < 0) {
                candidates.push("-0x" + (-num).toString(16).toLowerCase());
            } else {
                candidates.push("0x" + num.toString(16).toLowerCase());
            }
        }
        var match, len, digits;
        if (match = /^\.0+/.exec(str)) {
            len = match[0].length;
            digits = str.slice(len);
            candidates.push(digits + "e-" + (digits.length + len - 1));
        } else if (match = /[^0]0+$/.exec(str)) {
            len = match[0].length - 1;
            candidates.push(str.slice(0, -len) + "e" + len);
        } else if (match = /^(\d)\.(\d+)e(-?\d+)$/.exec(str)) {
            candidates.push(match[1] + match[2] + "e" + (match[3] - match[2].length));
        }
        return best_of(candidates);
    }

    function make_block(stmt, output) {
        output.space();
        if (stmt instanceof AST_EmptyStatement) {
            print_braced_empty(stmt, output);
        } else if (stmt instanceof AST_BlockStatement) {
            stmt.print(output);
        } else output.with_block(function() {
            output.indent();
            stmt.print(output);
            output.newline();
        }, stmt.end);
    }

    /* -----[ source map generators ]----- */

    function DEFMAP(nodetype, generator) {
        nodetype.forEach(function(nodetype) {
            nodetype.DEFMETHOD("add_source_map", generator);
        });
    }

    DEFMAP([
        // We could easily add info for ALL nodes, but it seems to me that
        // would be quite wasteful, hence this noop in the base class.
        AST_Node,
        // since the label symbol will mark it
        AST_LabeledStatement,
    ], noop);

    // XXX: I'm not exactly sure if we need it for all of these nodes,
    // or if we should add even more.
    DEFMAP([
        AST_Array,
        AST_Await,
        AST_BlockStatement,
        AST_Catch,
        AST_Constant,
        AST_Debugger,
        AST_Definitions,
        AST_Destructured,
        AST_Directive,
        AST_Finally,
        AST_Jump,
        AST_Lambda,
        AST_New,
        AST_Object,
        AST_Spread,
        AST_StatementWithBody,
        AST_Symbol,
        AST_Switch,
        AST_SwitchBranch,
        AST_Try,
        AST_UnaryPrefix,
        AST_Yield,
    ], function(output) {
        output.add_mapping(this.start);
    });

    DEFMAP([
        AST_ClassProperty,
        AST_DestructuredKeyVal,
        AST_ObjectProperty,
    ], function(output) {
        if (typeof this.key == "string") output.add_mapping(this.start, this.key);
    });
})();
