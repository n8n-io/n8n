github-buttons
==============

![build](https://github.com/buttons/github-buttons/workflows/build/badge.svg)
[![npm](https://img.shields.io/npm/v/github-buttons)](https://www.npmjs.com/github-buttons)

Usage
-----

### Use as a Snippet

Get started quickly with **[github:button configurator](https://buttons.github.io)**.

### Use as a Component

- [vue-github-button](https://github.com/buttons/vue-github-button) for [Vue](https://vuejs.org)
- [react-github-btn](https://github.com/buttons/react-github-btn) for [React](https://reactjs.org)

### Use as a Module

``` javascript
import { render } from 'github-buttons'

// export function render(options: object, callback: (el: HTMLElement) => void): void;
render(options, function (el) {
  document.body.appendChild(el) 
})

// export function render(anchor: HTMLAnchorElement, callback: (el: HTMLElement) => void): void;
render(anchor, function (el) {
  anchor.parentNode.replaceChild(el, anchor)
})
```

### Options

- For snippet usage, an option is an attribute on `<a>` element.
- For component usage, an option is a prop on component.
- For module usage, an option is a property on `options` object.

##### `href`

- Type: `string` 
- Default: `'#'`

Assign `href` attribute (GitHub link) for button.

##### `title`

- Type: `string`
- Default: `undefined`

Assign `title` attribute for button.

##### `data-icon`

- Type: `string`
- Default: `'octicon-mark-github'`

Set icon on button. A [subset](rollup.config.mjs) of [Octicons](https://primer.style/octicons/) is bundled.

##### `data-color-scheme`

- Type: `string`
- Default: `undefined`

Define a mapping of system color scheme to widget color scheme in css-like syntax.

This is an _opt-in_ feature since version `>=2.3.0`. It means if `data-color-scheme` is `undefined`, it would still behave like version `<2.3.0`, where light color scheme is used under all conditions.

Once `data-color-scheme` is set to a string, it will inherit the default mapping: `no-preference: light; light: light; dark: dark;`.

- `no-preference: light;` means when system has no preference on color scheme, light color scheme will be used.
- `light: light;` means when system prefers light color scheme, light color scheme will be used.
- `dark: dark;` means when system prefers dark color scheme, dark color scheme will be used.

User declarations would override the default. For example:

- To enable color scheme using default, set `data-color-scheme=""`.
- To use dark color scheme when system has no preference, set `data-color-scheme="no-preference: dark;"`.
- To force light color scheme everywhere, set `data-color-scheme="dark: light;"`.
- To force dark color scheme everywhere, set `data-color-scheme="no-preference: dark; light: dark;"`.

A single word can be used to force the color scheme everywhere since version `>=2.11.0`. For example:

- To force light color scheme everywhere, set `data-color-scheme="light"`.
- To force dark color scheme everywhere, set `data-color-scheme="dark"`.

##### `data-size`

- Type: `string`
- Default: `undefined`

Set button size. Possible values are `undefined` and `'large'`.

##### `data-show-count`

- Type: `boolean`
- Default: `false`

Show a dynamic count based on button type (detected from `href`):

- `https://github.com/:user` (follow)
- `https://github.com/:user/:repo` (star)
- `https://github.com/:user/:repo/subscription` (watch)
- `https://github.com/:user/:repo/fork` (fork)
- `https://github.com/:user/:repo/issues` (issues)
- `https://github.com/:user/:repo/issues/new` (issues)

Tailing slash, query string, and hash in the `href` won't affect type detection:

- `https://github.com/:user/` (follow)
- `https://github.com/:user?tab=repositories` (follow)
- `https://github.com/:user/:repo#readme` (star)
- `https://github.com/:user/:repo/#readme` (star)

##### `data-text`

- Type: `string`
- Default: `undefined`

Set button text. When button is generated from `<a>` element and `data-text` is `undefined`, the button text will be anchor's `textContent`.

##### `aria-label`

- Type: `string`
- Default: `undefined`

Set `aira-label` for button.

---

See also
--------

- [mdo/github-buttons](https://ghbtns.com)

---

License
-------

See [LICENSE](LICENSE).
