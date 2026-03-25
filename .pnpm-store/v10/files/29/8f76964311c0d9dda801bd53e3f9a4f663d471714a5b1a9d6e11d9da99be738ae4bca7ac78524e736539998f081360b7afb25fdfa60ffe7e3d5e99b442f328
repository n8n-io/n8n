# leac

![lint status badge](https://github.com/mxxii/leac/workflows/lint/badge.svg)
![test status badge](https://github.com/mxxii/leac/workflows/test/badge.svg)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/leac/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/leac?logo=npm)](https://www.npmjs.com/package/leac)
[![deno](https://img.shields.io/badge/deno.land%2Fx%2F-leac-informational?logo=deno)](https://deno.land/x/leac)

Lexer / tokenizer.


## Features

- **Lightweight**. Zero dependencies. Not a lot of code.

- **Well tested** - comes will tests for everything including examples.

- **Compact syntax** - less boilerplate. Rule name is enough when it is the same as the lookup string.

- **No failures** - it just stops when there are no matching rules and returns the information about whether it completed and where it stopped in addition to tokens array.

- **Composable lexers** - instead of states within a lexer.

- **Stateless lexers** - all inputs are passed as arguments, all outputs are returned in a result object.

- **No streaming** - accepts a string at a time.

- **Only text tokens, no arbitrary values**. It seems to be a good habit to have tokens that are *trivially* serializable back into a valid input string. Don't do the parser's job. There are a couple of convenience features such as the ability to discard matches or string replacements for regular expression rules but that has to be used mindfully (more on this below).


## Install

### Node

```shell
> npm i leac
> yarn add leac
```

```ts
import { createLexer, Token } from 'leac';
```

### Deno

```ts
import { createLexer, Token } from 'https://deno.land/x/leac@.../leac.ts';
```


## Examples

- [JSON](https://github.com/mxxii/leac/blob/main/examples/json.ts) ([output snapshot](https://github.com/mxxii/leac/blob/main/test/snapshots/examples.ts.md#json));
- [Calc](https://github.com/mxxii/leac/blob/main/examples/calc.ts) ([output snapshot](https://github.com/mxxii/leac/blob/main/test/snapshots/examples.ts.md#calc)).

```typescript
const lex = createLexer([
  { name: '-', str: '-' },
  { name: '+' },
  { name: 'ws', regex: /\s+/, discard: true },
  { name: 'number', regex: /[0-9]|[1-9][0-9]+/ },
]);

const { tokens, offset, complete } = lex('2 + 2');
```


## API

- [docs/index.md](https://github.com/mxxii/leac/blob/main/docs/index.md)


## A word of caution

It is often really tempting to rewrite token on the go. But it can be dangerous unless you are absolutely mindful of all edge cases.

For example, who needs to carry string quotes around, right? Parser will only need the string content...

We'll have to consider following things:

- Regular expressions. Sometimes we want to match strings that can have a length *from zero* and up.

- Tokens are not produced without changing the offset. If something is missing - there is no token.

  If we allow a token with zero length - it will cause an infinite loop, as the same rule will be matched at the same offset, again and again.

- Discardable tokens - a convenience feature that may seem harmless at a first glance.

When put together, these things plus some intuition traps can lead to a broken array of tokens.

Strings can be empty, which means the token can be absent. With no content and no quotes the tokens array will most likely make no sense for a parser.

How to avoid potential issues:

- Don't discard anything that you may need to insert back if you try to immediately serialize the tokens array to string. This means whitespace are usually safe to discard while string quotes are not (what can be considered safe will heavily depend on the grammar - you may have a language with significant spaces and insignificant quotes...);

- You can introduce a higher priority rule to capture an empty string (opening quote immediately followed by closing quote) and emit a special token for that. This way empty string between quotes can't occur down the line;

- Match the whole string (content and quotes) with a single regular expression, let the parser deal with it. This can actually lead to a cleaner design than trying to be clever and removing "unnecessary" parts early;

- Match the whole string (content and quotes) with a single regular expression, use capture groups and [replace](https://github.com/mxxii/leac/blob/main/docs/interfaces/RegexRule.md#replace) property. This can produce a non-zero length token with empty text.

Another note about quotes: If the grammar allows for different quotes and you're still willing to get rid of them early - think how you're going to unescape the string later. Make sure you carry the information about the exact string kind in the token name at least - you will need it later.


## What about ...?

- performance - The code is very simple but I won't put any unverified assumptions here. I'd be grateful to anyone who can provide a good benchmark project to compare different lexers.

- stable release - Current release is well thought out and tested. I leave a chance that some changes might be needed based on feedback. Before version 1.0.0 this will be done without a deprecation cycle.


## Some other lexer / tokenizer packages

- [moo](https://github.com/no-context/moo);
- [doken](https://github.com/yishn/doken);
- [tokenizr](https://github.com/rse/tokenizr);
- [flex-js](https://github.com/sormy/flex-js);
- *and more, with varied level of maintenance.*
