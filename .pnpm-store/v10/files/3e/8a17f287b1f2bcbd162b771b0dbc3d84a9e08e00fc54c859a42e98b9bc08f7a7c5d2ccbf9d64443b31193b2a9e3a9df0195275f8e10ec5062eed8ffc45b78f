# character-parser

Parse JavaScript one character at a time to look for snippets in Templates.  This is not a validator, it's just designed to allow you to have sections of JavaScript delimited by brackets robustly.

[![Build Status](https://img.shields.io/travis/ForbesLindesay/character-parser/master.svg)](https://travis-ci.org/ForbesLindesay/character-parser)

## Installation

    npm install character-parser

## Usage

### Parsing

Work out how much depth changes:

```js
var state = parse('foo(arg1, arg2, {\n  foo: [a, b\n');
assert.deepEqual(state.stack, [')', '}', ']']);

parse('    c, d]\n  })', state);
assert.deepEqual(state.stack, []);
```

### Custom Delimited Expressions

Find code up to a custom delimiter:

```js
// EJS-style
var section = parser.parseUntil('foo.bar("%>").baz%> bing bong', '%>');
assert(section.start === 0);
assert(section.end === 17); // exclusive end of string
assert(section.src = 'foo.bar("%>").baz');

var section = parser.parseUntil('<%foo.bar("%>").baz%> bing bong', '%>', {start: 2});
assert(section.start === 2);
assert(section.end === 19); // exclusive end of string
assert(section.src = 'foo.bar("%>").baz');

// Jade-style
var section = parser.parseUntil('#[p= [1, 2][i]]', ']', {start: 2})
assert(section.start === 2);
assert(section.end === 14); // exclusive end of string
assert(section.src === 'p= [1, 2][i]')

// Dumb parsing
// Stop at first delimiter encountered, doesn't matter if it's nested or not
// This is the character-parser@1 default behavior.
var section = parser.parseUntil('#[p= [1, 2][i]]', '}', {start: 2, ignoreNesting: true})
assert(section.start === 2);
assert(section.end === 10); // exclusive end of string
assert(section.src === 'p= [1, 2')
''
```

Delimiters are ignored if they are inside strings or comments.

## API

All methods may throw an exception in the case of syntax errors. The exception contains an additional `code` property that always starts with `CHARACTER_PARSER:` that is unique for the error.

### parse(str, state = defaultState(), options = {start: 0, end: src.length})

Parse a string starting at the index start, and return the state after parsing that string.

If you want to parse one string in multiple sections you should keep passing the resulting state to the next parse operation.

Returns a `State` object.

### parseUntil(src, delimiter, options = {start: 0, ignoreLineComment: false, ignoreNesting: false})

Parses the source until the first occurence of `delimiter` which is not in a string or a comment.

If `ignoreLineComment` is `true`, it will still count if the delimiter occurs in a line comment.

If `ignoreNesting` is `true`, it will stop at the first bracket, not taking into account if the bracket part of nesting or not. See example above.

It returns an object with the structure:

```js
{
  start: 0,//index of first character of string
  end: 13,//index of first character after the end of string
  src: 'source string'
}
```

### parseChar(character, state = defaultState())

Parses the single character and returns the state.  See `parse` for the structure of the returned state object.  N.B. character must be a single character not a multi character string.

### defaultState()

Get a default starting state.

### isPunctuator(character)

Returns `true` if `character` represents punctuation in JavaScript.

### isKeyword(name)

Returns `true` if `name` is a keyword in JavaScript.

### TOKEN_TYPES & BRACKETS

Objects whose values can be a frame in the `stack` property of a State (documented below).

## State

A state is an object with the following structure

```js
{
  stack: [],          // stack of detected brackets; the outermost is [0]
  regexpStart: false, // true if a slash is just encountered and a REGEXP state has just been added to the stack

  escaped: false,     // true if in a string and the last character was an escape character
  hasDollar: false,   // true if in a template string and the last character was a dollar sign

  src: '',            // the concatenated source string
  history: '',        // reversed `src`
  lastChar: ''        // last parsed character
}
```

`stack` property can contain any of the following:

- Any of the property values of `characterParser.TOKEN_TYPES`
- Any of the property values of `characterParser.BRACKETS` (the end bracket, not the starting bracket)

It also has the following useful methods:

- `.current()` returns the innermost bracket (i.e. the last stack frame).
- `.isString()` returns `true` if the current location is inside a string.
- `.isComment()` returns `true` if the current location is inside a comment.
- `.isNesting([opts])` returns `true` if the current location is not at the top level, i.e. if the stack is not empty. If `opts.ignoreLineComment` is `true`, line comments are not counted as a level, so for `// a` it will still return false.

### Errors

All errors thrown by character-parser has a `code` property attached to it that allows one to identify what sort of error is thrown. For errors thrown from `parse` and `parseUntil`, an additional `index` property is available.

## Transition from v1

In character-parser@2, we have changed the APIs quite a bit. These are some notes that will help you transition to the new version.

### State Object Changes

Instead of keeping depths of different brackets, we are now keeping a stack. We also removed some properties:

```js
state.lineComment  → state.current() === parser.TOKEN_TYPES.LINE_COMMENT
state.blockComment → state.current() === parser.TOKEN_TYPES.BLOCK_COMMENT
state.singleQuote  → state.current() === parser.TOKEN_TYPES.SINGLE_QUOTE
state.doubleQuote  → state.current() === parser.TOKEN_TYPES.DOUBLE_QUOTE
state.regexp       → state.current() === parser.TOKEN_TYPES.REGEXP
```

### `parseMax`

This function has been removed since the usefulness of this function has been questioned. You should find that `parseUntil` is a better choice for your task.

### `parseUntil`

The default behavior when the delimiter is a bracket has been changed so that nesting is taken into account to determine if the end is reached.

To preserve the original behavior, pass `ignoreNesting: true` as an option.

To see the difference between the new and old behaviors, see the "Usage" section earlier.

### `parseMaxBracket`

This function has been merged into `parseUntil`. You can directly rename the function call without any repercussions.

## License

MIT
