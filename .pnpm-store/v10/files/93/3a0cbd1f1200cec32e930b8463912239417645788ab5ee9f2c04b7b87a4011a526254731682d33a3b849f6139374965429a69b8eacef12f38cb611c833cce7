[![NPM version](https://img.shields.io/npm/v/esprima-next.svg)](https://www.npmjs.com/package/esprima-next)
[![npm download](https://img.shields.io/npm/dm/esprima-next.svg)](https://www.npmjs.com/package/esprima-next)
[![Tests](https://github.com/node-projects/esprima-next/workflows/Tests/badge.svg)](https://github.com/node-projects/esprima-next/actions)

Todo: Coverage does not work atm.
[![Coverage Status](https://img.shields.io/codecov/c/github/node-projects/esprima-next/master.svg)](https://codecov.io/github/node-projects/esprima-next)

**Esprima** ([esprima.org](http://esprima.org), BSD license) is a high performance,
standard-compliant [ECMAScript](http://www.ecma-international.org/publications/standards/Ecma-262.htm)
parser written in ECMAScript (also popularly known as
[JavaScript](https://en.wikipedia.org/wiki/JavaScript)).
Esprima is created and maintained by [Ariya Hidayat](https://twitter.com/ariyahidayat),
with the help of [many contributors](https://github.com/node-projects/esprima-next/contributors).

### esprima-next

A fork of esprima (https://github.com/jquery/esprima), cause esprima has no new releases and many not merged pull req.
if development/maintenance at jquery will start again, we maybe remove this fork.

### Changes to original Esprima:

- Rename to esprima-next
- generate a ESM build
- update npm packages
- disable npm run static-analysis && npm run dynamic-analysis, seem not to work after package update
- we don't need to support node <= 12
- ES2022 Class Properties & Privates
- Support numeric seperator and BigInt
- import assertions

following Pull reqs are merged from @esprima github:

- Export Esrpima Nodes type #2045
- Fix super() in non derived class #2047
- Support for ES2020 import.meta #2052
- Support for ES2020 export ns from #2055
- Fix parsing error in exponent expressions with unary left-hand sides. #2070
- bugfix import() #2076
- Support ES2021 Logical Assignment #2082
- ESM release support #2081

### Features

- Full support for ECMAScript 2019 ([ECMA-262 10th Edition](http://www.ecma-international.org/publications/standards/Ecma-262.htm))
- Sensible [syntax tree format](https://github.com/estree/estree/blob/master/es5.md) as standardized by [ESTree project](https://github.com/estree/estree)
- Experimental support for [JSX](https://facebook.github.io/jsx/), a syntax extension for [React](https://facebook.github.io/react/)
- Optional tracking of syntax node location (index-based and line-column)
- [Heavily tested](http://esprima.org/test/ci.html) (~1600 [unit tests](https://github.com/jquery/esprima/tree/master/test/fixtures) with [full code coverage](https://codecov.io/github/jquery/esprima))

### API

Esprima can be used to perform [lexical analysis](https://en.wikipedia.org/wiki/Lexical_analysis) (tokenization) or [syntactic analysis](https://en.wikipedia.org/wiki/Parsing) (parsing) of a JavaScript program.

A simple example on Node.js REPL:

```javascript
> var esprima = require('esprima-next');
> var program = 'const answer = 42';

> esprima.tokenize(program);
[ { type: 'Keyword', value: 'const' },
  { type: 'Identifier', value: 'answer' },
  { type: 'Punctuator', value: '=' },
  { type: 'Numeric', value: '42' } ]

> esprima.parseScript(program);
{ type: 'Program',
  body:
   [ { type: 'VariableDeclaration',
       declarations: [Object],
       kind: 'const' } ],
  sourceType: 'script' }
```

For more information, please read the [complete documentation](http://esprima.org/doc).
