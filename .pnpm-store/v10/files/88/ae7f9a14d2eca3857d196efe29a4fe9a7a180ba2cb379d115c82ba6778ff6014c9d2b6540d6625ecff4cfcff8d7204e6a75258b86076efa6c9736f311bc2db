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

var vlq_char = characters("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
var vlq_bits = vlq_char.reduce(function(map, ch, bits) {
    map[ch] = bits;
    return map;
}, Object.create(null));

function vlq_decode(indices, str) {
    var value = 0;
    var shift = 0;
    for (var i = 0, j = 0; i < str.length; i++) {
        var bits = vlq_bits[str[i]];
        value += (bits & 31) << shift;
        if (bits & 32) {
            shift += 5;
        } else {
            indices[j++] += value & 1 ? 0x80000000 | -(value >> 1) : value >> 1;
            value = shift = 0;
        }
    }
    return j;
}

function vlq_encode(num) {
    var result = "";
    num = Math.abs(num) << 1 | num >>> 31;
    do {
        var bits = num & 31;
        if (num >>>= 5) bits |= 32;
        result += vlq_char[bits];
    } while (num);
    return result;
}

function create_array_map() {
    var map = new Dictionary();
    var array = [];
    array.index = function(name) {
        var index = map.get(name);
        if (!(index >= 0)) {
            index = array.length;
            array.push(name);
            map.set(name, index);
        }
        return index;
    };
    return array;
}

function SourceMap(options) {
    var sources = create_array_map();
    var sources_content = options.includeSources && new Dictionary();
    var names = create_array_map();
    var mappings = "";
    if (options.orig) Object.keys(options.orig).forEach(function(name) {
        var map = options.orig[name];
        var indices = [ 0, 0, 1, 0, 0 ];
        options.orig[name] = {
            names: map.names,
            mappings: map.mappings.split(/;/).map(function(line) {
                indices[0] = 0;
                return line.split(/,/).map(function(segment) {
                    return indices.slice(0, vlq_decode(indices, segment));
                });
            }),
            sources: map.sources,
        };
        if (!sources_content || !map.sourcesContent) return;
        for (var i = 0; i < map.sources.length; i++) {
            var content = map.sourcesContent[i];
            if (content) sources_content.set(map.sources[i], content);
        }
    });
    var prev_source;
    var generated_line = 1;
    var generated_column = 0;
    var source_index = 0;
    var original_line = 1;
    var original_column = 0;
    var name_index = 0;
    return {
        add: options.orig ? function(source, gen_line, gen_col, orig_line, orig_col, name) {
            var map = options.orig[source];
            if (map) {
                var segments = map.mappings[orig_line - 1];
                if (!segments) return;
                var indices;
                for (var i = 0; i < segments.length; i++) {
                    var col = segments[i][0];
                    if (orig_col >= col) indices = segments[i];
                    if (orig_col <= col) break;
                }
                if (!indices || indices.length < 4) {
                    source = null;
                } else {
                    source = map.sources[indices[1]];
                    orig_line = indices[2];
                    orig_col = indices[3];
                    if (indices.length > 4) name = map.names[indices[4]];
                }
            }
            add(source, gen_line, gen_col, orig_line, orig_col, name);
        } : add,
        setSourceContent: sources_content ? function(source, content) {
            if (!sources_content.has(source)) {
                sources_content.set(source, content);
            }
        } : noop,
        toString: function() {
            return JSON.stringify({
                version: 3,
                file: options.filename || undefined,
                sourceRoot: options.root || undefined,
                sources: sources,
                sourcesContent: sources_content ? sources.map(function(source) {
                    return sources_content.get(source) || null;
                }) : undefined,
                names: names,
                mappings: mappings,
            });
        }
    };

    function add(source, gen_line, gen_col, orig_line, orig_col, name) {
        if (prev_source == null && source == null) return;
        prev_source = source;
        if (generated_line < gen_line) {
            generated_column = 0;
            do {
                mappings += ";";
            } while (++generated_line < gen_line);
        } else if (mappings) {
            mappings += ",";
        }
        mappings += vlq_encode(gen_col - generated_column);
        generated_column = gen_col;
        if (source == null) return;
        var src_idx = sources.index(source);
        mappings += vlq_encode(src_idx - source_index);
        source_index = src_idx;
        mappings += vlq_encode(orig_line - original_line);
        original_line = orig_line;
        mappings += vlq_encode(orig_col - original_column);
        original_column = orig_col;
        if (options.names && name != null) {
            var name_idx = names.index(name);
            mappings += vlq_encode(name_idx - name_index);
            name_index = name_idx;
        }
    }
}
