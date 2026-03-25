<!-- NOTE: README.md is generated from src/README.md -->

# @codemirror/lang-python [![NPM version](https://img.shields.io/npm/v/@codemirror/lang-python.svg)](https://www.npmjs.org/package/@codemirror/lang-python)

[ [**WEBSITE**](https://codemirror.net/) | [**ISSUES**](https://github.com/codemirror/dev/issues) | [**FORUM**](https://discuss.codemirror.net/c/next/) | [**CHANGELOG**](https://github.com/codemirror/lang-python/blob/main/CHANGELOG.md) ]

This package implements Python language support for the
[CodeMirror](https://codemirror.net/) code editor.

The [project page](https://codemirror.net/) has more information, a
number of [examples](https://codemirror.net/examples/) and the
[documentation](https://codemirror.net/docs/).

This code is released under an
[MIT license](https://github.com/codemirror/lang-python/tree/main/LICENSE).

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## Usage

```javascript
import {EditorView, basicSetup} from "codemirror"
import {python} from "@codemirror/lang-python"

const view = new EditorView({
  parent: document.body,
  doc: `print("Hello world")`,
  extensions: [basicSetup, python()]
})
```

# API Reference

<dl>
<dt id="user-content-python">
  <code><strong><a href="#user-content-python">python</a></strong>() → <a href="https://codemirror.net/docs/ref#language.LanguageSupport">LanguageSupport</a></code></dt>

<dd><p>Python language support.</p>
</dd>
<dt id="user-content-pythonlanguage">
  <code><strong><a href="#user-content-pythonlanguage">pythonLanguage</a></strong>: <a href="https://codemirror.net/docs/ref#language.LRLanguage">LRLanguage</a></code></dt>

<dd><p>A language provider based on the <a href="https://github.com/lezer-parser/python">Lezer Python
parser</a>, extended with
highlighting and indentation information.</p>
</dd>
<dt id="user-content-globalcompletion">
  <code><strong><a href="#user-content-globalcompletion">globalCompletion</a></strong>: <a href="https://codemirror.net/docs/ref#autocomplete.CompletionSource">CompletionSource</a></code></dt>

<dd><p>Autocompletion for built-in Python globals and keywords.</p>
</dd>
<dt id="user-content-localcompletionsource">
  <code><strong><a href="#user-content-localcompletionsource">localCompletionSource</a></strong>(<a id="user-content-localcompletionsource^context" href="#user-content-localcompletionsource^context">context</a>: <a href="https://codemirror.net/docs/ref#autocomplete.CompletionContext">CompletionContext</a>) → <a href="https://codemirror.net/docs/ref#autocomplete.CompletionResult">CompletionResult</a> | <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null">null</a></code></dt>

<dd><p>Completion source that looks up locally defined names in
Python code.</p>
</dd>
</dl>
