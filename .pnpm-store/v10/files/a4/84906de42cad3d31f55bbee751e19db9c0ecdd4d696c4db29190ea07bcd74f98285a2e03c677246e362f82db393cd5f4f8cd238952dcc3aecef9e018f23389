// Compile patterns to recognisers and constructors

'use strict';

require('buffer-more-ints');
var $ = require('util').format;

var parse = require('./parse').parse;
var interp = require('./interp'),
  parse_int = interp.parse_int,
  parse_float = interp.parse_float;
var construct = require('./constructor'),
  write_int = construct.write_int,
  write_float = construct.write_float;

var Buffer = require('safe-buffer').Buffer;

var lines = [];
function $start() {
  lines = [];
}
function $line(/* format , args */) {
  lines.push($.apply(null, arguments));
}
function $result() {
  return lines.join('\n');
}

function bits_expr(segment) {
  if (typeof segment.size === 'string') {
    return $('%s * %d', var_name(segment.size), segment.unit);
  }
  else {
    return (segment.size * segment.unit).toString();
  }
}

function get_number(segment) {
  $line('bits = %s;\n', bits_expr(segment));
  var parser = (segment.type === 'integer') ?
    'parse_int' : 'parse_float';
  var be = segment.bigendian, sg = segment.signed;
  $line("byteoffset = offset / 8; offset += bits");
  $line("if (offset > binsize) { return false; }");
  $line("else { result = %s(bin, byteoffset, bits / 8, %s, %s); }",
        parser, be, sg);
}

function get_binary(segment) {
  $line("byteoffset = offset / 8;");
  if (segment.size === true) {
    $line("offset = binsize;");
    $line("result = bin.slice(byteoffset);");
  }
  else {
    $line("bits = %s;", bits_expr(segment));
    $line("offset += bits;");
    $line("if (offset > binsize) { return false; }");
    $line("else { result = bin.slice(byteoffset,",
          "byteoffset + bits / 8); }");
  }
}

function get_string(segment) {
  $line("byteoffset = offset / 8;");
  var strlen = segment.value.length;
  var strlenbits = strlen * 8;
  $line("offset += %d;", strlenbits);
  $line("if (offset > binsize) { return false; }");
  $line("else { result = bin.toString(byteoffset,",
        $("byteoffset + %d); }", strlen));
}

function skip_bits(segment) {
  if (typeof segment.size === 'string') {
    // Damn. Have to look up the size.
    $line("var skipbits = %s * %d;",
          var_name(segment.size), segment.unit);
    $line("if (offset + skipbits > binsize) { return false; }");
    $line("else { offset += skipbits; }");
  }
  else if (segment.size === true) {
    $line("if (offset % 8 === 0) { offset = binsize; }");
    $line("else { return false; }");
  }
  else {
    var bits = segment.unit * segment.size;
    $line("if (offset + %d > binsize) { return false; }", bits);
    $line("else { offset += %d; }", bits);
  }
}

function match_seg(segment) {
  if (segment.name === '_') {
    skip_bits(segment);
  }
  else {
    var assign_result;
    switch (segment.type) {
    case 'integer':
    case 'float':
      get_number(segment);
      break;
    case 'binary':
      get_binary(segment);
      break;
    case 'string':
      get_string(segment);
      break;
    }
    $line("if (result === false) return false;");
    if (segment.name) {
      // variable is given a value in the environment
      $line("else if (%s !== undefined) {", var_name(segment.name));
      // .. and it is not the same as that matched
      $line("if (%s != result) return false;",
            var_name(segment.name));
      $line("}");
      // variable is free
      $line('else %s = result;', var_name(segment.name));
    }
    else {
      var repr = JSON.stringify(segment.value);
      $line("else if (result != %s) return false;", repr);
    }
  }
}

function var_name(name) {
  return  'var_' + name;
}

function variables(segments) {
  var names = {};
  for (var i = 0; i < segments.length; i++) {
    var name = segments[i].name;
    if (name && name !== '_') {
      names[name] = true;
    }
    name = segments[i].size;
    if (typeof name === 'string') {
      names[name] = true;
    }
  }
  return Object.keys(names);
}

function compile_pattern(segments) {
  $start();
  $line("return function(binary, env) {");
  $line("'use strict';");
  $line("var bin = binary, env = env || {};");
  $line("var offset = 0, binsize = bin.length * 8;");
  $line("var bits, result, byteoffset;");
  var varnames = variables(segments);
  for (var v = 0; v < varnames.length; v++) {
    var name = varnames[v];
    $line("var %s = env['%s'];", var_name(name), name);
  }

  var len = segments.length;
  for (var i = 0; i < len; i++) {
    var segment = segments[i];
    $line("// " + JSON.stringify(segment));
    match_seg(segment);
  }

  $line("if (offset == binsize) {");
  $line("return {");
  for (var v = 0; v < varnames.length; v++) {
    var name = varnames[v];
    $line("%s: %s,", name, var_name(name));
  }
  $line('};');
  $line('}'); // if offset == binsize
  $line("else return false;");
  $line("}"); // end function

  var fn = new Function('parse_int', 'parse_float', $result());
  return fn(parse_int, parse_float);
}


function write_seg(segment) {
  switch (segment.type) {
  case 'string':
    $line("offset += buf.write(%s, offset, 'utf8');",
          JSON.stringify(segment.value));
    break;
  case 'binary':
    $line("val = bindings['%s'];", segment.name);
    if (segment.size === true) {
      $line('size = val.length;');
    }
    else if (typeof segment.size === 'string') {
      $line("size = (bindings['%s'] * %d) / 8;",
            segment.size, segment.unit);
    }
    else {
      $line("size = %d;", (segment.size * segment.unit) / 8);
    }
    $line('val.copy(buf, offset, 0, size);');
    $line('offset += size;');
    break;
  case 'integer':
  case 'float':
    write_number(segment);
    break;
  }
}

function write_number(segment) {
  if (segment.name) {
    $line("val = bindings['%s'];", segment.name);
  }
  else {
    $line("val = %d", segment.value);
  }
  var writer = (segment.type === 'integer') ?
    'write_int' : 'write_float';
  if (typeof segment.size === 'string') {
    $line("size = (bindings['%s'] * %d) / 8;",
          segment.size, segment.unit);
  }
  else {
    $line('size = %d;', (segment.size * segment.unit) / 8);
  }
  $line('%s(buf, val, offset, size, %s);',
        writer, segment.bigendian);
  $line('offset += size;');
}

function size_of(segments) {
  var variable = [];
  var fixed = 0;

  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    if (typeof segment.size === 'string' ||
        segment.size === true) {
      variable.push(segment);
    }
    else if (segment.type === 'string') {
      fixed += Buffer.byteLength(segment.value);
    }
    else {
      fixed += (segment.size * segment.unit) / 8;
    }
  }

  $line('var buffersize = %d;', fixed);

  if (variable.length > 0) {
    for (var j = 0; j < variable.length; j++) {
      var segment = variable[j];
      if (segment.size === true) {
        $line("buffersize += bindings['%s'].length;", segment.name);
      }
      else {
        $line("buffersize += (bindings['%s'] * %d) / 8;",
              segment.size, segment.unit);
      }
    }
  }
}

function emit_write(segments) {
  $line('var val, size;');

  var len = segments.length;
  for (var i = 0; i < len; i++) {
    var segment = segments[i];
    $line('// %s', JSON.stringify(segment));
    write_seg(segment);
  }
}

function compile_ctor(segments) {
  $start();
  $line('return function(bindings) {');
  $line("'use strict';");
  size_of(segments);
  $line('var buf = Buffer.alloc(buffersize);');
  $line('var offset = 0;');
  emit_write(segments);
  $line('return buf;');
  $line('}'); // end function

  return new Function('write_int', 'write_float', 'Buffer',
                      $result())(write_int, write_float, Buffer);
}

module.exports.compile_pattern = compile_pattern;
module.exports.compile = function() {
  var str = [].join.call(arguments, ',');
  var p = parse(str);
  return compile_pattern(p);
};
module.exports.compile_builder = function() {
  var str = [].join.call(arguments, ',');
  var p = parse(str);
  return compile_ctor(p);
};
