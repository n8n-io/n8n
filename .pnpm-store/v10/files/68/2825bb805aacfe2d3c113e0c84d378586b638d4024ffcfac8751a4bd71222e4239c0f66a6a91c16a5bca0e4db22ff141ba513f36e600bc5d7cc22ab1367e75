# @lezer/generator

[ [**WEBSITE**](http://lezer.codemirror.net) | [**ISSUES**](https://github.com/lezer-parser/lezer/issues) | [**FORUM**](https://discuss.codemirror.net/c/lezer) | [**CHANGELOG**](https://github.com/lezer-parser/generator/blob/master/CHANGELOG.md) ]

This is an [LR(1)](https://en.wikipedia.org/wiki/LR_parser) (more precisely pseudo-[LALR](https://en.wikipedia.org/wiki/LALR_parser),with opt-in [GLR](https://en.wikipedia.org/wiki/GLR_parser)) parser generator which outputs grammars that can be used by the [Lezer](https://github.com/lezer-parser/lezer/) parser.

This package exports both a command-line parser generator tool called [`lezer-generator`](https://lezer.codemirror.net/docs/guide/#building-a-grammar) and a [programming interface](https://lezer.codemirror.net/docs/ref/#generator).

The grammar format that the tool accepts is documented in the [system guide](https://lezer.codemirror.net/docs/guide/#writing-a-grammar).

See `test/cases/` for some simple example grammars, or [lezer-javascript](https://github.com/lezer-parser/javascript) for a real grammar.

You can import `"@lezer/generator/rollup"` to get a [Rollup](https://rollupjs.org/guide/en/) plugin that will transform files ending in `.grammar` or `.grammar.terms` (a pseudo-source referring to the terms produced by the `.grammar` file) as part of the rollup build process.

```javascript
import {lezer} from "@lezer/generator/rollup"

export default {
  input: "./in.js",
  output: {file: "out.js", format: "cjs"},
  plugins: [lezer()]
}
```

The plugin can be passed `lezer({exportName})` option to configure the name of the parser export.

The code is licensed under an MIT license.
