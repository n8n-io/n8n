"use strict";

var to_ascii, to_base64;
if (typeof Buffer == "undefined") {
    to_ascii = atob;
    to_base64 = btoa;
} else if (typeof Buffer.alloc == "undefined") {
    to_ascii = function(b64) {
        return new Buffer(b64, "base64").toString();
    };
    to_base64 = function(str) {
        return new Buffer(str).toString("base64");
    };
} else {
    to_ascii = function(b64) {
        return Buffer.from(b64, "base64").toString();
    };
    to_base64 = function(str) {
        return Buffer.from(str).toString("base64");
    };
}

function read_source_map(name, toplevel) {
    var comments = toplevel.end.comments_after;
    for (var i = comments.length; --i >= 0;) {
        var comment = comments[i];
        if (comment.type != "comment1") break;
        var match = /^# ([^\s=]+)=(\S+)\s*$/.exec(comment.value);
        if (!match) break;
        if (match[1] == "sourceMappingURL") {
            match = /^data:application\/json(;.*?)?;base64,([^,]+)$/.exec(match[2]);
            if (!match) break;
            return to_ascii(match[2]);
        }
    }
    AST_Node.warn("inline source map not found: {name}", {
        name: name,
    });
}

function parse_source_map(content) {
    try {
        return JSON.parse(content);
    } catch (ex) {
        throw new Error("invalid input source map: " + content);
    }
}

function set_shorthand(name, options, keys) {
    keys.forEach(function(key) {
        if (options[key]) {
            var defs = {};
            defs[name] = options[name];
            options[key] = defaults(options[key], defs);
        }
    });
}

function init_cache(cache) {
    if (!cache) return;
    if (!("props" in cache)) {
        cache.props = new Dictionary();
    } else if (!(cache.props instanceof Dictionary)) {
        cache.props = Dictionary.fromObject(cache.props);
    }
}

function to_json(cache) {
    return {
        props: cache.props.toObject()
    };
}

function minify(files, options) {
    try {
        options = defaults(options, {
            annotations: undefined,
            compress: {},
            enclose: false,
            expression: false,
            ie: false,
            ie8: false,
            keep_fargs: false,
            keep_fnames: false,
            mangle: {},
            module: undefined,
            nameCache: null,
            output: {},
            parse: {},
            rename: undefined,
            sourceMap: false,
            timings: false,
            toplevel: options && !options["expression"] && options["module"] ? true : undefined,
            v8: false,
            validate: false,
            warnings: false,
            webkit: false,
            wrap: false,
        }, true);
        if (options.validate) AST_Node.enable_validation();
        var timings = options.timings && { start: Date.now() };
        if (options.annotations !== undefined) set_shorthand("annotations", options, [ "compress", "output" ]);
        if (options.expression) set_shorthand("expression", options, [ "compress", "parse" ]);
        if (options.ie8) options.ie = options.ie || options.ie8;
        if (options.ie) set_shorthand("ie", options, [ "compress", "mangle", "output", "rename" ]);
        if (options.keep_fargs) set_shorthand("keep_fargs", options, [ "compress", "mangle", "rename" ]);
        if (options.keep_fnames) set_shorthand("keep_fnames", options, [ "compress", "mangle", "rename" ]);
        if (options.module === undefined && !options.ie) options.module = true;
        if (options.module) set_shorthand("module", options, [ "compress", "output", "parse" ]);
        if (options.toplevel !== undefined) set_shorthand("toplevel", options, [ "compress", "mangle", "rename" ]);
        if (options.v8) set_shorthand("v8", options, [ "mangle", "output", "rename" ]);
        if (options.webkit) set_shorthand("webkit", options, [ "compress", "mangle", "output", "rename" ]);
        var quoted_props;
        if (options.mangle) {
            options.mangle = defaults(options.mangle, {
                cache: options.nameCache && (options.nameCache.vars || {}),
                eval: false,
                ie: false,
                keep_fargs: false,
                keep_fnames: false,
                properties: false,
                reserved: [],
                toplevel: false,
                v8: false,
                webkit: false,
            }, true);
            if (options.mangle.properties) {
                if (typeof options.mangle.properties != "object") {
                    options.mangle.properties = {};
                }
                if (options.mangle.properties.keep_quoted) {
                    quoted_props = options.mangle.properties.reserved;
                    if (!Array.isArray(quoted_props)) quoted_props = [];
                    options.mangle.properties.reserved = quoted_props;
                }
                if (options.nameCache && !("cache" in options.mangle.properties)) {
                    options.mangle.properties.cache = options.nameCache.props || {};
                }
            }
            init_cache(options.mangle.cache);
            init_cache(options.mangle.properties.cache);
        }
        if (options.rename === undefined) options.rename = options.compress && options.mangle;
        if (options.sourceMap) {
            options.sourceMap = defaults(options.sourceMap, {
                content: null,
                filename: null,
                includeSources: false,
                names: true,
                root: null,
                url: null,
            }, true);
        }
        var warnings = [];
        if (options.warnings) AST_Node.log_function(function(warning) {
            warnings.push(warning);
        }, options.warnings == "verbose");
        if (timings) timings.parse = Date.now();
        var toplevel;
        options.parse = options.parse || {};
        if (files instanceof AST_Node) {
            toplevel = files;
        } else {
            if (typeof files == "string") files = [ files ];
            options.parse.toplevel = null;
            var source_map_content = options.sourceMap && options.sourceMap.content;
            if (typeof source_map_content == "string" && source_map_content != "inline") {
                source_map_content = parse_source_map(source_map_content);
            }
            if (source_map_content) options.sourceMap.orig = Object.create(null);
            for (var name in files) if (HOP(files, name)) {
                options.parse.filename = name;
                options.parse.toplevel = toplevel = parse(files[name], options.parse);
                if (source_map_content == "inline") {
                    var inlined_content = read_source_map(name, toplevel);
                    if (inlined_content) options.sourceMap.orig[name] = parse_source_map(inlined_content);
                } else if (source_map_content) {
                    options.sourceMap.orig[name] = source_map_content;
                }
            }
        }
        if (options.parse.expression) toplevel = toplevel.wrap_expression();
        if (quoted_props) reserve_quoted_keys(toplevel, quoted_props);
        [ "enclose", "wrap" ].forEach(function(action) {
            var option = options[action];
            if (!option) return;
            var orig = toplevel.print_to_string().slice(0, -1);
            toplevel = toplevel[action](option);
            files[toplevel.start.file] = toplevel.print_to_string().replace(orig, "");
        });
        if (options.validate) toplevel.validate_ast();
        if (timings) timings.rename = Date.now();
        if (options.rename) {
            toplevel.figure_out_scope(options.rename);
            toplevel.expand_names(options.rename);
        }
        if (timings) timings.compress = Date.now();
        if (options.compress) {
            toplevel = new Compressor(options.compress).compress(toplevel);
            if (options.validate) toplevel.validate_ast();
        }
        if (timings) timings.scope = Date.now();
        if (options.mangle) toplevel.figure_out_scope(options.mangle);
        if (timings) timings.mangle = Date.now();
        if (options.mangle) {
            toplevel.compute_char_frequency(options.mangle);
            toplevel.mangle_names(options.mangle);
        }
        if (timings) timings.properties = Date.now();
        if (quoted_props) reserve_quoted_keys(toplevel, quoted_props);
        if (options.mangle && options.mangle.properties) mangle_properties(toplevel, options.mangle.properties);
        if (options.parse.expression) toplevel = toplevel.unwrap_expression();
        if (timings) timings.output = Date.now();
        var result = {};
        var output = defaults(options.output, {
            ast: false,
            code: true,
        });
        if (output.ast) result.ast = toplevel;
        if (output.code) {
            if (options.sourceMap) {
                output.source_map = SourceMap(options.sourceMap);
                if (options.sourceMap.includeSources) {
                    if (files instanceof AST_Toplevel) {
                        throw new Error("original source content unavailable");
                    } else for (var name in files) if (HOP(files, name)) {
                        output.source_map.setSourceContent(name, files[name]);
                    }
                }
            }
            delete output.ast;
            delete output.code;
            var stream = OutputStream(output);
            toplevel.print(stream);
            result.code = stream.get();
            if (options.sourceMap) {
                result.map = output.source_map.toString();
                var url = options.sourceMap.url;
                if (url) {
                    result.code = result.code.replace(/\n\/\/# sourceMappingURL=\S+\s*$/, "");
                    if (url == "inline") {
                        result.code += "\n//# sourceMappingURL=data:application/json;charset=utf-8;base64," + to_base64(result.map);
                    } else {
                        result.code += "\n//# sourceMappingURL=" + url;
                    }
                }
            }
        }
        if (options.nameCache && options.mangle) {
            if (options.mangle.cache) options.nameCache.vars = to_json(options.mangle.cache);
            if (options.mangle.properties && options.mangle.properties.cache) {
                options.nameCache.props = to_json(options.mangle.properties.cache);
            }
        }
        if (timings) {
            timings.end = Date.now();
            result.timings = {
                parse: 1e-3 * (timings.rename - timings.parse),
                rename: 1e-3 * (timings.compress - timings.rename),
                compress: 1e-3 * (timings.scope - timings.compress),
                scope: 1e-3 * (timings.mangle - timings.scope),
                mangle: 1e-3 * (timings.properties - timings.mangle),
                properties: 1e-3 * (timings.output - timings.properties),
                output: 1e-3 * (timings.end - timings.output),
                total: 1e-3 * (timings.end - timings.start)
            };
        }
        if (warnings.length) {
            result.warnings = warnings;
        }
        return result;
    } catch (ex) {
        return { error: ex };
    } finally {
        AST_Node.log_function();
        AST_Node.disable_validation();
    }
}
