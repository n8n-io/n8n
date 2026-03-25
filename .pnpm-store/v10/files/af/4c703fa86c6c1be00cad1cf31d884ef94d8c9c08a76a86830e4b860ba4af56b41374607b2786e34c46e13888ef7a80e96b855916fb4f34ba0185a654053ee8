# Markdown-it Katex

Markdown It plugin that adds [KaTeX](https://github.com/Khan/KaTeX) rendering. This is used by VS Code to render math in Markdown.

Originally forked from [@iktakahiro/markdown-it-katex](https://github.com/iktakahiro/markdown-it-katex)

## Usage

Install markdown-it

```bash
npm install markdown-it
```

Install the plugin

```bash
npm install @vscode/markdown-it-katex
```

Use it in your javascript

```javascript
const md = require("markdown-it")();
const mk = require("@vscode/markdown-it-katex").default;

md.use(mk);

// double backslash is required for javascript strings, but not html input
const result = md.render("# Math Rulez! \n  $\\sqrt{3x-1}+(1+x)^2$");
```

Include the KaTeX stylesheet in your html:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css"
/>
```

If you're using the default markdown-it parser, I also recommend the [github stylesheet](https://github.com/sindresorhus/github-markdown-css):

```html
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"
/>
```

`KaTeX` options can be supplied with the second argument to use.

```javascript
md.use(mk, { throwOnError: false, errorColor: " #cc0000" });
```

## Examples

### Inline

Surround your LaTeX with a single `$` on each side for inline rendering.

```latex
$\sqrt{3x-1}+(1+x)^2$
```

### Block

Use two (`$$`) for block rendering. This mode uses bigger symbols and centers
the result.

```latex
$$\begin{array}{c}

\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &
= \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} & = 4 \pi \rho \\

\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} & = \vec{\mathbf{0}} \\

\nabla \cdot \vec{\mathbf{B}} & = 0

\end{array}$$
```

### Using your own version of KaTeX

```js
import MarkdownIt from "markdown-it";
import mk from "@vscode/markdown-it-katex";
import katex from "katex";

// Load some katex extensions
import "katex/contrib/mhchem";
import "katex/contrib/copy-tex";

const md = new MarkdownIt();
md.use(mk.default, { katex });

const result = md.render("# Math Rulez! \n  $\\sqrt{3x-1}+(1+x)^2$");
const chemResult = md.render("$\\ce{Hg^2+ ->[I-] HgI2 ->[I-] [Hg^{II}I4]^2-}$");
console.log(result);
console.log(chemResult);
```

## Syntax

Math parsing in markdown is designed to agree with the conventions set by pandoc:

    Anything between two $ characters will be treated as TeX math. The opening $ must
    have a non-space character immediately to its right, while the closing $ must
    have a non-space character immediately to its left, and must not be followed
    immediately by a digit. Thus, $20,000 and $30,000 won’t parse as math. If for some
    reason you need to enclose text in literal $ characters, backslash-escape them and
    they won’t be treated as math delimiters.

## Math Syntax Support

KaTeX is based on TeX and LaTeX. Support for both is growing. Here's a list of
currently supported functions:

[Things that KaTeX does not (yet) support](https://github.com/KaTeX/KaTeX/wiki/Things-that-KaTeX-does-not-%28yet%29-support)
