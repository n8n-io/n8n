[![npm version](https://badge.fury.io/js/node-html-markdown.svg)](https://badge.fury.io/js/ts-patch)
[![NPM Downloads](https://img.shields.io/npm/dm/node-html-markdown.svg?style=flat)](https://npmjs.org/package/node-html-markdown)
![Build Status](https://github.com/crosstype/node-html-markdown/workflows/Build%20(CI)/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/crosstype/node-html-markdown/badge.svg?branch=master)](https://coveralls.io/github/crosstype/node-html-markdown?branch=master)

# node-html-markdown

NHM is a _fast_ HTML to markdown converter, compatible with both node and the browser.

It was built with the following two goals in mind:

### 1. Speed

We had a need to convert gigabytes of HTML daily very quickly. All libraries we found were too slow with node. 
We considered using a low-level language but decided to attempt to write something that would squeeze every bit
of performance out of the JIT that we could. The end result was fast enough to make the cut!

### 2. Human Readability

The other libraries we tested produced output that would break in numerous conditions and produced output with many
repeating linefeeds, etc. Generally speaking, outside of a markdown viewer, the result was not easy to read.

We took the approach of producing a _clean, concise_ result with consistent spacing rules.

## Install

```sh
<yarn|npm|pnpm> add node-html-markdown
```

## Benchmarks
```
-----------------------------------------------------------------------------

Estimated processing times (fastest to slowest):

  [node-html-markdown (reused instance)]
    100 kB:  17ms
    1 MB:    176ms
    50 MB:   8.82sec
    1 GB:    3min, 1sec
    50 GB:   2hr, 30min, 32sec

  [turndown (reused instance)]
    100 kB:  35ms
    1 MB:    356ms
    50 MB:   17.80sec
    1 GB:    6min, 5sec
    50 GB:   5hr, 3min, 48sec

-----------------------------------------------------------------------------

Speed comparison - node-html-markdown (reused instance) is:

  1.02 times as fast as node-html-markdown
  1.99 times as fast as turndown
  2.02 times as fast as turndown (reused instance)

-----------------------------------------------------------------------------
```

## Usage

```ts
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown'


/* ********************************************************* *
 * Single use
 * If using it once, you can use the static method
 * ********************************************************* */

// Single file
NodeHtmlMarkdown.translate(
  /* html */ `<b>hello</b>`, 
  /* options (optional) */ {}, 
  /* customTranslators (optional) */ undefined,
  /* customCodeBlockTranslators (optional) */ undefined
);

// Multiple files
NodeHtmlMarkdown.translate(
  /* FileCollection */ { 
    'file1.html': `<b>hello</b>`, 
    'file2.html': `<b>goodbye</b>` 
  }, 
  /* options (optional) */ {}, 
  /* customTranslators (optional) */ undefined,
  /* customCodeBlockTranslators (optional) */ undefined
);


/* ********************************************************* *
 * Re-use
 * If using it several times, creating an instance saves time
 * ********************************************************* */

const nhm = new NodeHtmlMarkdown(
  /* options (optional) */ {}, 
  /* customTransformers (optional) */ undefined,
  /* customCodeBlockTranslators (optional) */ undefined
);

// Single file
nhm.translate(/* html */ `<b>hello</b>`);

// Multiple Files
nhm.translate(
  /* FileCollection */ { 
    'file1.html': `<b>hello</b>`, 
    'file2.html': `<b>goodbye</b>` 
  }, 
);
```

## Options

```ts

export interface NodeHtmlMarkdownOptions {
  /**
   * Use native window DOMParser when available
   * @default false
   */
  preferNativeParser: boolean,

  /**
   * Code block fence
   * @default ```
   */
  codeFence: string,

  /**
   * Bullet marker
   * @default *
   */
  bulletMarker: string,

  /**
   * Style for code block
   * @default fence
   */
  codeBlockStyle: 'indented' | 'fenced',

  /**
   * Emphasis delimiter
   * @default _
   */
  emDelimiter: string,

  /**
   * Strong delimiter
   * @default **
   */
  strongDelimiter: string,

  /**
   * Supplied elements will be ignored (ignores inner text does not parse children)
   */
  ignore?: string[],

  /**
   * Supplied elements will be treated as blocks (surrounded with blank lines)
   */
  blockElements?: string[],

  /**
   * Max consecutive new lines allowed
   * @default 3
   */
  maxConsecutiveNewlines: number,

  /**
   * Line Start Escape pattern
   * (Note: Setting this will override the default escape settings, you might want to use textReplace option instead)
   */
  lineStartEscape: [ pattern: RegExp, replacement: string ]

  /**
   * Global escape pattern
   * (Note: Setting this will override the default escape settings, you might want to use textReplace option instead)
   */
  globalEscape: [ pattern: RegExp, replacement: string ]

  /**
   * User-defined text replacement pattern (Replaces matching text retrieved from nodes)
   */
  textReplace?: [ pattern: RegExp, replacement: string ][]

  /**
   * Keep images with data: URI (Note: These can be up to 1MB each)
   * @example
   * <img src="data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSK......0o/">
   * @default false
   */
  keepDataImages?: boolean

  /**
   * Place URLS at the bottom and format links using link reference definitions
   *
   * @example
   * Click <a href="/url1">here</a>. Or <a href="/url2">here</a>. Or <a href="/url1">this link</a>.
   *
   * Becomes:
   * Click [here][1]. Or [here][2]. Or [this link][1].
   *
   * [1]: /url
   * [2]: /url2
   */
  useLinkReferenceDefinitions?: boolean
}
```

## Custom Translators

Custom translators are an advanced option to allow handling certain elements a specific way.

These can be modified via the `NodeHtmlMarkdown#translators` property, or added during creation.

__For detail on how to use them see__:

- [translator.ts](https://github.com/crosstype/node-html-markdown/blob/master/src/translator.ts) - Documentation for `TranslatorConfig`
- [config.ts](https://github.com/crosstype/node-html-markdown/blob/master/src/config.ts) - Translators in `defaultTranslators`

The `NodeHtmlMarkdown#codeBlockTranslators` property is a collection of translators which handles elements within a `<pre><code>` block.

## Further improvements

Being a performance-centric library, we're always interested in further improvements. 
There are several probable routes by which we could gain substantial performance increases over the current model. 

Such methods include:

- Writing a custom parser
- Integrating an async worker-thread based model for multi-threading
- Fully replacing any remaining regex
  
These would be fun to implement; however, for the time being, the present library is fast enough for my purposes. That
said, I welcome discussion and any PR toward the effort of further improving performance, and I may ultimately do more
work in that capacity in the future!

## Help Wanted!

Looking to contribute? Check out our [help wanted] list for a good place to start!


[help wanted]: https://github.com/crosstype/node-html-markdown/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22
