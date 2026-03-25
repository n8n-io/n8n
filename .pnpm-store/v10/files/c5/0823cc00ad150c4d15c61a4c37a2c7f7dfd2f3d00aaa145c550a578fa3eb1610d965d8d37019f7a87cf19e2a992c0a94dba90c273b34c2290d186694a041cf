# Turndown

Convert HTML into Markdown with JavaScript.

## Project Updates
* `to-markdown` has been renamed to Turndown. See the [migration guide](https://github.com/domchristie/to-markdown/wiki/Migrating-from-to-markdown-to-Turndown) for details.
* Turndown repository has changed its URL to https://github.com/mixmark-io/turndown.

## Installation

npm:

```
npm install turndown
```

Browser:

```html
<script src="https://unpkg.com/turndown/dist/turndown.js"></script>
```

For usage with RequireJS, UMD versions are located in `lib/turndown.umd.js` (for Node.js) and `lib/turndown.browser.umd.js` for browser usage. These files are generated when the npm package is published. To generate them manually, clone this repo and run `npm run build`.

## Usage

```js
// For Node.js
var TurndownService = require('turndown')

var turndownService = new TurndownService()
var markdown = turndownService.turndown('<h1>Hello world!</h1>')
```

Turndown also accepts DOM nodes as input (either element nodes, document nodes,  or document fragment nodes):

```js
var markdown = turndownService.turndown(document.getElementById('content'))
```

## Options

Options can be passed in to the constructor on instantiation. For example:

```js
var turndownService = new TurndownService({ option: 'value' })
```

| Option                | Valid values  | Default |
| :-------------------- | :------------ | :------ |
| `headingStyle`        | `setext` or `atx` | `setext`  |
| `hr`                  | Any [Thematic break](http://spec.commonmark.org/0.27/#thematic-breaks) | `* * *` |
| `bulletListMarker`    | `-`, `+`, or `*` | `*` |
| `codeBlockStyle`      | `indented` or `fenced` | `indented` |
| `fence`               | ` ``` ` or `~~~` | ` ``` ` |
| `emDelimiter`         | `_` or `*` | `_` |
| `strongDelimiter`     | `**` or `__` | `**` |
| `linkStyle`           | `inlined` or `referenced` | `inlined` |
| `linkReferenceStyle`  | `full`, `collapsed`, or `shortcut` | `full` |
| `preformattedCode`    | `false` or [`true`](https://github.com/lucthev/collapse-whitespace/issues/16) | `false` |

### Advanced Options

| Option                | Valid values  | Default |
| :-------------------- | :------------ | :------ |
| `blankReplacement`    | rule replacement function | See **Special Rules** below |
| `keepReplacement`     | rule replacement function | See **Special Rules** below |
| `defaultReplacement`  | rule replacement function | See **Special Rules** below |

## Methods

### `addRule(key, rule)`

The `key` parameter is a unique name for the rule for easy reference. Example:

```js
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: function (content) {
    return '~' + content + '~'
  }
})
```

`addRule` returns the `TurndownService` instance for chaining.

See **Extending with Rules** below.

### `keep(filter)`

Determines which elements are to be kept and rendered as HTML. By default, Turndown does not keep any elements. The filter parameter works like a rule filter (see section on filters belows). Example:

```js
turndownService.keep(['del', 'ins'])
turndownService.turndown('<p>Hello <del>world</del><ins>World</ins></p>') // 'Hello <del>world</del><ins>World</ins>'
```

This will render `<del>` and `<ins>` elements as HTML when converted.

`keep` can be called multiple times, with the newly added keep filters taking precedence over older ones. Keep filters will be overridden by the standard CommonMark rules and any added rules. To keep elements that are normally handled by those rules, add a rule with the desired behaviour.

`keep` returns the `TurndownService` instance for chaining.

### `remove(filter)`

Determines which elements are to be removed altogether i.e. converted to an empty string. By default, Turndown does not remove any elements. The filter parameter works like a rule filter (see section on filters belows). Example:

```js
turndownService.remove('del')
turndownService.turndown('<p>Hello <del>world</del><ins>World</ins></p>') // 'Hello World'
```

This will remove `<del>` elements (and contents).

`remove` can be called multiple times, with the newly added remove filters taking precedence over older ones. Remove filters will be overridden by the keep filters,  standard CommonMark rules, and any added rules. To remove elements that are normally handled by those rules, add a rule with the desired behaviour.

`remove` returns the `TurndownService` instance for chaining.

### `use(plugin|array)`

Use a plugin, or an array of plugins. Example:

```js
// Import plugins from turndown-plugin-gfm
var turndownPluginGfm = require('turndown-plugin-gfm')
var gfm = turndownPluginGfm.gfm
var tables = turndownPluginGfm.tables
var strikethrough = turndownPluginGfm.strikethrough

// Use the gfm plugin
turndownService.use(gfm)

// Use the table and strikethrough plugins only
turndownService.use([tables, strikethrough])
```

`use` returns the `TurndownService` instance for chaining.

See **Plugins** below.

## Extending with Rules

Turndown can be extended by adding **rules**. A rule is a plain JavaScript object with `filter` and `replacement` properties. For example, the rule for converting `<p>` elements is as follows:

```js
{
  filter: 'p',
  replacement: function (content) {
    return '\n\n' + content + '\n\n'
  }
}
```

The filter selects `<p>` elements, and the replacement function returns the `<p>` contents separated by two new lines.

### `filter` String|Array|Function

The filter property determines whether or not an element should be replaced with the rule's `replacement`. DOM nodes can be selected simply using a tag name or an array of tag names:

 * `filter: 'p'` will select `<p>` elements
 * `filter: ['em', 'i']` will select `<em>` or `<i>` elements

The tag names in the `filter` property are expected in lowercase, regardless of their form in the document.

Alternatively, the filter can be a function that returns a boolean depending on whether a given node should be replaced. The function is passed a DOM node as well as the `TurndownService` options. For example, the following rule selects `<a>` elements (with an `href`) when the `linkStyle` option is `inlined`:

```js
filter: function (node, options) {
  return (
    options.linkStyle === 'inlined' &&
    node.nodeName === 'A' &&
    node.getAttribute('href')
  )
}
```

### `replacement` Function

The replacement function determines how an element should be converted. It should return the Markdown string for a given node. The function is passed the node's content, the node itself, and the `TurndownService` options.

The following rule shows how `<em>` elements are converted:

```js
rules.emphasis = {
  filter: ['em', 'i'],

  replacement: function (content, node, options) {
    return options.emDelimiter + content + options.emDelimiter
  }
}
```

### Special Rules

**Blank rule** determines how to handle blank elements. It overrides every rule (even those added via `addRule`). A node is blank if it only contains whitespace, and it's not an `<a>`, `<td>`,`<th>` or a void element. Its behaviour can be customised using the `blankReplacement` option.

**Keep rules** determine how to handle the elements that should not be converted, i.e. rendered as HTML in the Markdown output. By default, no elements are kept. Block-level elements will be separated from surrounding content by blank lines. Its behaviour can be customised using the `keepReplacement` option.

**Remove rules** determine which elements to remove altogether. By default, no elements are removed.

**Default rule** handles nodes which are not recognised by any other rule. By default, it outputs the node's text content (separated  by blank lines if it is a block-level element). Its behaviour can be customised with the `defaultReplacement` option.

### Rule Precedence

Turndown iterates over the set of rules, and picks the first one that matches the `filter`. The following list describes the order of precedence:

1. Blank rule
2. Added rules (optional)
3. Commonmark rules
4. Keep rules
5. Remove rules
6. Default rule

## Plugins

The plugin API provides a convenient way for developers to apply multiple extensions. A plugin is just a function that is called with the `TurndownService` instance.

## Escaping Markdown Characters

Turndown uses backslashes (`\`) to escape Markdown characters in the HTML input. This ensures that these characters are not interpreted as Markdown when the output is compiled back to HTML. For example, the contents of `<h1>1. Hello world</h1>` needs to be escaped to `1\. Hello world`, otherwise it will be interpreted as a list item rather than a heading.

To avoid the complexity and the performance implications of parsing the content of every HTML element as Markdown, Turndown uses a group of regular expressions to escape potential Markdown syntax. As a result, the escaping rules can be quite aggressive.

### Overriding `TurndownService.prototype.escape`

If you are confident in doing so, you may want to customise the escaping behaviour to suit your needs. This can be done by overriding `TurndownService.prototype.escape`. `escape` takes the text of each HTML element and should return a version with the Markdown characters escaped.

Note: text in code elements is never passed to`escape`.

## License

turndown is copyright © 2017+ Dom Christie and released under the MIT license.
