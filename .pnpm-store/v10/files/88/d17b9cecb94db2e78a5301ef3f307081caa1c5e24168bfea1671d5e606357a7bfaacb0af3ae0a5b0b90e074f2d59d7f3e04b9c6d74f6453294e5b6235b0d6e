# markdown-it-footnote

[![CI](https://github.com/markdown-it/markdown-it-footnote/actions/workflows/ci.yml/badge.svg)](https://github.com/markdown-it/markdown-it-footnote/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/markdown-it-footnote.svg?style=flat)](https://www.npmjs.org/package/markdown-it-footnote)
[![Coverage Status](https://img.shields.io/coveralls/markdown-it/markdown-it-footnote/master.svg?style=flat)](https://coveralls.io/r/markdown-it/markdown-it-footnote?branch=master)

> Footnotes plugin for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser.

__v2.+ requires `markdown-it` v5.+, see changelog.__

Markup is based on [pandoc](http://johnmacfarlane.net/pandoc/README.html#footnotes) definition.

__Normal footnote__:

```
Here is a footnote reference,[^1] and another.[^longnote]

[^1]: Here is the footnote.

[^longnote]: Here's one with multiple blocks.

    Subsequent paragraphs are indented to show that they
belong to the previous footnote.
```

html:

```html
<p>Here is a footnote reference,<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup> and another.<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup></p>
<p>This paragraph won’t be part of the note, because it
isn’t indented.</p>
<hr class="footnotes-sep">
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn1"  class="footnote-item"><p>Here is the footnote. <a href="#fnref1" class="footnote-backref">↩</a></p>
</li>
<li id="fn2"  class="footnote-item"><p>Here’s one with multiple blocks.</p>
<p>Subsequent paragraphs are indented to show that they
belong to the previous footnote. <a href="#fnref2" class="footnote-backref">↩</a></p>
</li>
</ol>
</section>
```

__Inline footnote__:

```
Here is an inline note.^[Inlines notes are easier to write, since
you don't have to pick an identifier and move down to type the
note.]
```

html:

```html
<p>Here is an inline note.<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup></p>
<hr class="footnotes-sep">
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn1"  class="footnote-item"><p>Inlines notes are easier to write, since
you don’t have to pick an identifier and move down to type the
note. <a href="#fnref1" class="footnote-backref">↩</a></p>
</li>
</ol>
</section>
```


## Install

node.js, browser:

```bash
npm install markdown-it-footnote --save
bower install markdown-it-footnote --save
```

## Use

```js
var md = require('markdown-it')()
            .use(require('markdown-it-footnote'));

md.render(/*...*/) // See examples above
```

_Differences in browser._ If you load script directly into the page, without
package system, module will add itself globally as `window.markdownitFootnote`.


### Customize

If you want to customize the output, you'll need to replace the template
functions. To see which templates exist and their default implementations,
look in [`index.js`](index.js). The API of these template functions is out of
scope for this plugin's documentation; you can read more about it [in the
markdown-it
documentation](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer).

To demonstrate with an example, here is how you might replace the `<hr>` that
this plugin emits by default with an `<h4>` emitted by your own template
function override:

```js
const md = require('markdown-it')().use(require('markdown-it-footnote'));

md.renderer.rules.footnote_block_open = () => (
  '<h4 class="mt-3">Footnotes</h4>\n' +
  '<section class="footnotes">\n' +
  '<ol class="footnotes-list">\n'
);
```

Here's another example that customizes footnotes for epub books:

```js
const backrefLabel = 'back to text';

const epubRules = {
  footnote_ref: ['<a', '<a epub:type="noteref"'],
  footnote_open: ['<li', '<li epub:type="footnote"'],
  footnote_anchor: ['<a', `<a aria-label="${backrefLabel}"`],
}

Object.keys(epubRules).map(rule => {
  let defaultRender = md.renderer.rules[rule];
  md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
    return defaultRender(tokens, idx, options, env, self).replace(...epubRules[rule]);
  }
})
```

## License

[MIT](https://github.com/markdown-it/markdown-it-footnote/blob/master/LICENSE)
