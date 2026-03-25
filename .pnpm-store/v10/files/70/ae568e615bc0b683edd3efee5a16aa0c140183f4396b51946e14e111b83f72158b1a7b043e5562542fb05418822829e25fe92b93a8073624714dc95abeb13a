# Byte-wise matching for Node.JS

[![Node.js CI](https://github.com/acuminous/bitsyntax-js/workflows/Node.js%20CI/badge.svg)](https://github.com/acuminous/bitsyntax-js/actions?query=workflow%3A%22Node.js+CI%22)
[![NPM version](https://img.shields.io/npm/v/bitsyntax.svg?style=flat-square)](https://www.npmjs.com/package/@acuminous/bitsyntax)
[![NPM downloads](https://img.shields.io/npm/dm/bitsyntax.svg?style=flat-square)](https://www.npmjs.com/package/@acuminous/bitsyntax)

Gives a compact syntax for parsing and constructing byte buffers,
derived from [Erlang's bit
syntax](http://www.erlang.org/doc/programming_examples/bit_syntax.html#id64858).

```js
var bitsyntax = require('bitsyntax');
var pattern = bitsyntax.matcher('len:8/integer, str:len/binary');
var bound = pattern(new Buffer([4, 0x41, 0x42, 0x43, 0x44]));
bound.str
// => <Buffer 41 42 43 44>
```

A typical use of this is parsing byte streams from sockets. For
example, size-prefixed frames:

```js
var framePattern = bitsyntax.matcher('len:32/integer, frame:len/binary, rest/binary');
socket.on('data', function process(data) {
  var m;
  if (m = framePattern(data)) {
    emit('frame', m.frame);
    process(m.rest);
  }
  else {
    stashForNextData(data);
  }
});
```

Patterns can also be used to construct byte buffers from supplied
values:

```js
var spdyDataFrame = require('bitsyntax')
  .builder('streamId:32, flags:8, length:24, data/binary');

spdyDataFrame({streamId:5, flags:0, length:bin.length, data:bin});
```

One or more segments of a pattern may also be supplied in multiple
arguments, if that is more convenient; this makes it easier to split a
long pattern over lines:

```js
var p = bitsyntax.matcher('size:8, payload:size/binary',
                          'rest/binary');
```

## API

### `matcher`

Compiles a pattern as a string (or strings), to a function that will
return either a map of bindings, or `false`, given a buffer and
optionally an environment. The environment contains values for bound
variables in the pattern (if there are any).

```js
var p = bitsyntax.matcher('header:headerSize/binary, rest/binary');
var b = p(new Buffer([1, 2, 3, 4, 5]), {headerSize: 3});
b.header
// => <Buffer 01 02 03>
```

A matcher will return `false` if the supplied buffer does not match
the pattern; for example, if it has too few bytes, or a literal is not
present.

```js
var p = bitsyntax.matcher('"foo=", str/binary');
p(new Buffer("bar=humbug"));
// => false
```

### `parse` and `match`

When composed, equivalent to `matcher`; may be useful if you want to
examine the internal structure of patterns.

`parse` takes strings as for `matcher`, and returns the internal
representation of the pattern. `match` takes this representation, a
buffer, and optionally an environment, and returns the bindings or
`false` (as with `matcher`).

```js
var p = bitsyntax.parse('header:headerSize/binary',
                        'rest/binary');
var b = bitsyntax.match(p, new Buffer([1, 2, 3, 4, 5]),
                          {headerSize: 3});
b.header
// => <Buffer 01 02 03>
```

### `builder`

Takes a pattern and returns a function that will construct a byte
buffer, given values for the variables mentioned in the pattern.

```js
var cons = bitsyntax.builder('size:8, bin/binary');
cons({size:6, bin:new Buffer('foobar')});
// => <Buffer 06 66 6f 6f 62 61 72>
```

Patterns supplied to builders are slightly different to patterns
supplied for matching, as noted below.

### `build`

Takes a parsed pattern and a map of variable values, and returns a
buffer. As with `match`, may be useful to debug patterns.

```js
var pattern = bitsyntax.parse('size:8, bin:size/binary');
bitsyntax.build(pattern, {size:6, bin: new Buffer('foobar')});
// => <Buffer 06 66 6f 6f 62 61 72>
```

### `write`

Writes variable values into a buffer, at an offset, according to the
parsed pattern given. Returns the finishing offset, i.e., the supplied
offset plus the number of bytes written.

```js
var pattern = bitsyntax.parse('size:8, bin/binary');
var buf = new Buffer(7);
bitsyntax.write(buf, 0, pattern,
                {size:6, bin: new Buffer('foobar')});
// => 7
buf
// => <Buffer 06 66 6f 6f 62 61 72>
```

## Patterns

Patterns are sequences of segments, each matching a value. Segments
have the general form

     value:size/type_specifier_list

The size and type specifier list may be omitted, giving three extra
variations:

    value
    value:size
    value/type_specifier_list

The type specifier list is a list of keywords separated by
hyphens. Type specifiers are described below.

Patterns are generally supplied as strings, with a comma-separated
series of segments.

### Variable or value

The first part of a segment gives a variable name or a literal
value. If a variable name is given, the value matched by the segment
will be bound to that variable name for the rest of the pattern. If a
literal value is given, the matched value must equal that value. If a
variable's value is given in the environment, the matched value must
equal the provided value.

When used in a builder, the literal value will be copied into the
buffer according to the type it is given. A variable name indicates a
slot into which a value supplied to the builder will be copied.

The special variable name `_` discards the value matched; i.e., it
simply skips over the appropriate number of bits in the input. '_' is
not allowed in builder patterns.

### Size and unit

The size of a segment is given following the value or variable,
separated with a colon:

    foo:32

The unit is given in the list of specifiers as `'unit' and
an integer from 0..256, separated by a colon:

    foo:4/integer-unit:8

The size is the number of units in the value; the unit is given as a
number of bits. Unit can be of use, for example, when you want to
match integers of a number of bytes rather than a number of bits.

For integers and floats, the default unit is 1 bit; to keep things
aligned on byte boundaries, `unit * size` must currently be a multiple
of 8. For binaries the default unit is 8, and the unit must be a
multiple of 8.

If the size is omitted and the type is integer, the size defaults to
8. If the size is omitted and the type is binary, the segment will
match all remaining bytes in the input; such a segment may only be
used at the end of a pattern, when matching.

The size may also be given as an integer variable matched earlier in
the pattern, as in the example given at the top. When constructing, a
size may be a variable referring to the supplied environment.

In builders, numbers will be rounded, masked or padded to fit the size
and units given; for example, `'256:8'` gives the binary `Buffer<00>`
because the lowest eight bits are 0; `'255:16` gives the binary
`Buffer<00 ff>`.

### Type name specifier

One of `integer`, `binary`, `string`, `float`. If not given, the
default is `integer`.

An integer is a big- or little-endian, signed or unsigned
integer. Integers up to 32 bits are supported. Signed integers are
two's complement format. In JavaScript, only integers between -(2^53)
and 2^53 can be represented, and bitwise operators are only defined on
32-bit signed integers.

A binary is simply a byte buffer; usually this will result in a slice
of the input buffer being returned, so beware mutation.

A string is a UTF8 string consisting of the given number of bytes.

A float is a 32- or 64-bit IEEE754 floating-point value (this is the
standard JavaScript uses, as do Java and Erlang).

### Endianness specifier

Integers may be big- or little-endian; this refers to which 'end' of
the bytes making up the integer are most significant. In network
protocols integers are usually big-endian, meaning the first
(left-most) byte is the most significant, but this is not always the
case.

A specifier of `big` means the integer will be parsed (or written into
the result) as big-endian, and `little` means the integer will be
parsed or written as little-endian. The default is big-endian.

### Signedness specifier

Integer segments may include a specifier of `signed` or `unsigned`. A
signed integer is parsed as two's complement format. The default is
unsigned.

Signedness is ignored in builders.

### Literal strings

A quoted string appearing in a pattern is a shorthand for the bytes in
its UTF8 encoding. For example,

    "foobar", _/binary

matches any buffer that starts with the bytes `0x66, 0x6f, 0x6f, 0x62,
0x61, 0x72`.

When used in a builder, a quoted string is copied into the result as
the bytes of its UTF8 encoding.

## Examples

In the following the matched bytes are given in array notation for
convenience. Bear in mind that `match()` actually takes a buffer for
the bytes to match against. The phrase "returns X as Y" or "binds X as
Y" means the return value is an object with value X mapped to the key
Y.

    54

Matches the single byte `54`.

    54:32

Matches the bytes [0,0,0,54].

    54:32/little

Matches the bytes [54,0,0,0].

    54:4/unit:8

Matches the bytes [0,0,0,54].

    int:32/signed

Matches a binary of four bytes, and returns a signed 32-bit integer as
`int`.

    len:16, str:len/binary

Matches a binary of `2 + len` bytes, and returns an unsigned 16-bit
integer as `len` and a buffer of length `len` as `str`.

    len:16, _:len/binary, rest/binary

Matches a binary of at least `2 + len` bytes, binds an unsigned 16-bit
integer as `len`, ignores the next `len` bytes, and binds the
remaining (possibly zero-length) binary as `rest`.

    s:8, key:s/binary, value/binary

When given the environment `{s:6, key: "foobar"}`, will match a binary
starting with [6, 0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72, ...].
