# Upgrading to Highlight.js v11.0

- [Overview of Breaking Changes](#overview-of-breaking-changes)
  - [Built-in set of "Common" Languages](#built-in-set-of-common-languages)
  - [Language Files](#language-files)
  - [Language Aliases](#language-aliases)
  - [Styles and CSS](#styles-and-css)
    - [Grammar Scopes](#grammar-scopes)
  - [Behavioral changes](#behavioral-changes)
    - [API changes](#api-changes)
      - [Changes to Result Data](#changes-to-result-data)
    - [Feature Removal](#feature-removal)
  - [Small Things](#small-things)
  - [Upgrading from Version 9.x](#upgrading-from-version-9x)


## Overview of Breaking Changes

Welcome to version 11.0.  This a major release and therefore contains breaking changes.  Below is a complete list of those such changes.


### Built-in set of "Common" Languages

The default `highlight.min.js` build **removes** a few less popular grammars:

- apache
- http
- nginx
- properties
- coffeescript

If you need any of these, you can always create a custom build.

Ref: https://github.com/highlightjs/highlight.js/issues/2848


### Language Files

This would matter if you are requiring any of these files directly (via Node.js or CDN).

- `htmlbars` has been removed. Use `handlebars` instead.
- `c-like` has been removed. Use `c`, `cpp`, or `arduino`.
- `sql_more` has been removed. Use `sql` instead or a more specific 3rd party grammar.


### Language Aliases

This would matter if you are using these aliases.

- `php3`,`php4`,`php5`, `php6`, `php7`, and `php8` have been removed. Use `php` instead.
- `zsh` has been removed. Use `sh` or `bash` instead.
- `freepascal`, `lazarus`, `lpr`, and `lpm` removed. Use `delphi` instead.

You can of course re-register any of these aliases easily if necessary. For example to restore the PHP aliases:

```js
hljs.registerAliases(["php3","php4","php5","php6","php7","php8"],{ languageName: "php" })
```

### Styles and CSS

- The default padding on `.hljs` element has been increased and is now `1em` (it was `0.5em` previously). If your design depends on the smaller spacing you may need to update your CSS to override.
- `schoolbook` no longer has a custom lined background, it is solid color now.  The old image and CSS can be found in the [10-stable branch](https://github.com/highlightjs/highlight.js/tree/10-stable/src/styles) if you wish to manually copy it into your project.
- `github` includes significant changes to more properly match modern GitHub syntax highlighting. If you desire the old theme you can manually copy it into your project from the [10-stable branch](https://github.com/highlightjs/highlight.js/tree/10-stable/src/styles).
- `github-gist` has been removed in favor of `github` as GitHub and GitHub Gist have converged. If you desire the theme you can manually copy it into your project from the [10-stable branch](https://github.com/highlightjs/highlight.js/tree/10-stable/src/styles).
- The `.hljs` CSS selector is now further scoped.  It now targets `code.hljs` (inline code) and `pre code.hljs` (code blocks). If you are using a different element you may need to update your CSS to reapply some styling.
- All [Base16 themes](https://github.com/highlightjs/base16-highlightjs) now live in the `styles/base16` directory - this means some CSS files have moved.  Please confirm themes you use reference the new locations.


#### Grammar Scopes

- `.meta-string` removed/deprecated.  Use `.meta .string` (a nested scope) instead. See [meta-keyword][].
- `.meta-keyword` removed/deprecated.  Use `.meta .keyword` (a nested scope) instead. See [meta-keyword][].

### Behavioral changes

- `after:highlightElement` plugin callback is now fired *after* the DOM has been updated, not before.

#### API changes

- The option `ignoreIllegals` is now `true` by default (for `highlight()`). Previously it was `false`.
- The `highlight(language,code, ...args)` API no longer accepts `continuation` as a 4th argument.
- The `highlight(language,code, ...args)` API is deprecated (to be removed in 12.0).

The new call signature is `highlight(code, {options})`. ([see docs](https://highlightjs.readthedocs.io/en/latest/api.html#highlight))

Code using the old API:

```js
// highlight(language, code, ignoreIllegals, continuation)
highlight("javascript", "var a = 5;", true)
```
...would be upgraded to the newer API as follows:

```js
// highlight(code, {language, ignoreIllegals})
highlight("var a = 5;", {language: "javascript", ignoreIllegals: true})
```

The new API purposely does not support `continuation` as this is only intended for internal library usage.

- `initHighlighting()` is deprecated (to be removed in 12.0).
- `initHighlightingOnLoad()` is deprecated (to be removed in 12.0).

**Use `highlightAll()` instead.** ([see docs](https://highlightjs.readthedocs.io/en/latest/api.html#highlight-all)) The old functions are now simply aliases of `highlightAll()`. The new function may be called before or after the DOM is loaded and should do the correct thing in all cases, replacing the need for the previous individual functions.

Note: `highlightAll()` does not guard against calling itself repeatedly as the previous functions did. Your code should be careful to avoid doing this.

- `highlightBlock()` is deprecated (to be removed in 12.0).

**Use `highlightElement()` instead.** ([see docs](https://highlightjs.readthedocs.io/en/latest/api.html#highlight-element)) This is merely a naming change.

Note: The object literal passed to the `before:highlightElement` callback now passes the element in the `el` key vs the `block` key.

##### Changes to Result Data

- `highlightAuto()`'s `second_best` key has been renamed to `secondBest`
- `highlightElement()`'s result now no longer includes a `re` key. Use the `relevance` key now.
- `highlight()` renames some result keys to more clearly mark them as private: `_top`, `_emitter`, and `_illegalBy`. You should not depend on these keys as they are subject to change at any time.
- The `relevance` key returned by `highlight()` is no longer guaranteed to be an even integer.
- `highlightElement` now always tags blocks with a consistent `language-[name]` class

This behavior was inconsistent before.  Sometimes `[name]` class would be added, sometimes the alias name would be added, something no class would be added.  now `language-[name]` is always added. This also affects sublanguage `span` tags which now also include the `language-` prefix.

#### Feature Removal

- HTML auto-passthru is now no longer included in core.  Use a plugin instead. For a possible plugin please see [#2889](https://github.com/highlightjs/highlight.js/issues/2889).

An example:

```html
<pre><code class="lang-js">
var a = 4;
<span class="yellow">var a = 4;</span>
</code></pre>
```

Unescaped HTML like this will now be ignored (stripped before highlighting) and a warning will be logged to the console.  All HTML to be highlighted should be properly escaped to avoid potential HTML/JS injection attacks.

- `fixMarkup` has been removed.

This function was deprecated in v10.2.  It is not our goal to provide random string utilities. You may need to provide your own replacement [Ref: #2534](https://github.com/highlightjs/highlight.js/issues/2634)

- `CSS_NUMBER_MODE` has been removed.

This rule was too broad for bring inclusion in core and has been removed.

- `lexemes` mode attribute has been removed.

Use the new `keywords.$pattern` instead.

Before:

```js
{
  keywords: "do.it start.now begin.later end.immediately"
  lexemes: /[a-z.]+/
}
```

After:

```js
{
  keywords: {
    $pattern: /[a-z.]+/
    keyword: "do.it start.now begin.later end.immediately",
  }
}
```

This may required converting your `keywords` key into an object if it's not already (as shown above).

- `endSameAsBegin` mode attribute has been removed.

Use the new `END_SAME_AS_BEGIN` mode rule/function instead.

- `useBR` configuration has been removed.

This configuration option was deprecated in v10.1. Use a plugin or preferably simply CSS `white-space: pre`. [Ref: #2559](https://github.com/highlightjs/highlight.js/issues/2559)


- `tabReplace` configuration has been removed.

This configuration option was deprecated in v10.5. Use a plugin or pre-render content instead with desired spacing. [Ref: #2874](https://github.com/highlightjs/highlight.js/issues/2874)





### Small Things

- The `regex` utility `join` has been renamed to `_eitherRewriteBackreferences` (this has always been intended for internal use only)

### Upgrading from Version 9.x

If you're upgrading all the way from version 9 it may still be helpful to review all the breaking changes in version 10 as well:

- [VERSION_10_UPGRADE.md](https://github.com/highlightjs/highlight.js/blob/main/VERSION_10_UPGRADE.md)
- [VERSION_10_BREAKING_CHANGES.md](https://github.com/highlightjs/highlight.js/blob/main/VERSION_10_BREAKING_CHANGES.md)


[meta-keyword]: https://github.com/highlightjs/highlight.js/pull/3167
