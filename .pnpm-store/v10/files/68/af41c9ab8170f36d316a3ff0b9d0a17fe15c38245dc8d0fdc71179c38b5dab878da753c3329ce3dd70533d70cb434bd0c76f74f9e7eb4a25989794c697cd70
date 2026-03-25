# Copy-tex extension

This extension modifies the copy/paste behavior in any browser supporting the
[Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent)
so that, when selecting and copying KaTeX-rendered elements, the text
content of the resulting clipboard renders KaTeX elements as their LaTeX source
surrounded by specified delimiters.  (The HTML content of the resulting
clipboard remains the selected HTML content, as it normally would.)
The default delimiters are `$...$` for inline math and `$$...$$` for display
math, but you can easy switch them to e.g. `\(...\)` and `\[...\]` by
modifying `copyDelimiters` in [the source code](copy-tex.js).
Note that a selection containing part of a KaTeX formula gets extended to
include the entire KaTeX formula.

## Usage

This extension isn't part of KaTeX proper, so the script should be separately
included in the page.

```html
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/contrib/copy-tex.min.js" integrity="sha384-HORx6nWi8j5/mYA+y57/9/CZc5z8HnEw4WUZWy5yOn9ToKBv1l58vJaufFAn9Zzi" crossorigin="anonymous"></script>
```

(Note that, as of KaTeX 0.16.0, there is no longer a corresponding CSS file.)

See [index.html](index.html) for an example.
(To run this example from a clone of the repository, run `yarn start`
in the root KaTeX directory, and then visit
http://localhost:7936/contrib/copy-tex/index.html
with your web browser.)

If you want to build your own custom copy handler based on this one,
copy the `copy-tex.js` into your codebase and replace the `require`
statement with `require('katex/contrib/copy-tex/katex2tex.js')`.

ECMAScript module is also available:
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/contrib/copy-tex.mjs" integrity="sha384-bVEnwt0PtX+1EuJoOEcm4rgTUWvb2ILTdjHfI1gUe/r5fdqrTcQaUuRdHG2DciuQ" crossorigin="anonymous"></script>
```
