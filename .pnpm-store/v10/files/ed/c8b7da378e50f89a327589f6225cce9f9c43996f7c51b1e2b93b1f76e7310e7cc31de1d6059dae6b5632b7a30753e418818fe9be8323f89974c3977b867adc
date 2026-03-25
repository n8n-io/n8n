# ⚡️ Lightning CSS

An extremely fast CSS parser, transformer, and minifier written in Rust. Use it with [Parcel](https://parceljs.org), as a standalone library or CLI, or via a plugin with any other tool.

<img width="680" alt="performance and build size charts" src="https://user-images.githubusercontent.com/19409/189022599-28246659-f94a-46a4-9de0-b6d17adb0e22.png#gh-light-mode-only">
<img width="680" alt="performance and build size charts" src="https://user-images.githubusercontent.com/19409/189022693-6956b044-422b-4f56-9628-d59c6f791095.png#gh-dark-mode-only">

## Features

- **Extremely fast** – Parsing and minifying large files is completed in milliseconds, often with significantly smaller output than other tools. See [benchmarks](#benchmarks) below.
- **Typed property values** – many other CSS parsers treat property values as an untyped series of tokens. This means that each transformer that wants to do something with these values must interpret them itself, leading to duplicate work and inconsistencies. Lightning CSS parses all values using the grammar from the CSS specification, and exposes a specific value type for each property.
- **Browser-grade parser** – Lightning CSS is built on the [cssparser](https://github.com/servo/rust-cssparser) and [selectors](https://github.com/servo/stylo/tree/main/selectors) crates created by Mozilla and used by Firefox and Servo. These provide a solid general purpose CSS-parsing foundation on top of which Lightning CSS implements support for all specific CSS rules and properties.
- **Minification** – One of the main purposes of Lightning CSS is to minify CSS to make it smaller. This includes many optimizations including:
  - Combining longhand properties into shorthands where possible.
  - Merging adjacent rules with the same selectors or declarations when it is safe to do so.
  - Combining CSS transforms into a single matrix or vice versa when smaller.
  - Removing vendor prefixes that are not needed, based on the provided browser targets.
  - Reducing `calc()` expressions where possible.
  - Converting colors to shorter hex notation where possible.
  - Minifying gradients.
  - Minifying CSS grid templates.
  - Normalizing property value order.
  - Removing default property sub-values which will be inferred by browsers.
  - Many micro-optimizations, e.g. converting to shorter units, removing unnecessary quotation marks, etc.
- **Vendor prefixing** – Lightning CSS accepts a list of browser targets, and automatically adds (and removes) vendor prefixes.
- **Browserslist configuration** – Lightning CSS supports opt-in browserslist configuration discovery to resolve browser targets and integrate with your existing tools and config setup.
- **Syntax lowering** – Lightning CSS parses modern CSS syntax, and generates more compatible output where needed, based on browser targets.
  - CSS Nesting
  - Custom media queries (draft spec)
  - Logical properties
  * [Color Level 5](https://drafts.csswg.org/css-color-5/)
    - `color-mix()` function
    - Relative color syntax, e.g. `lab(from purple calc(l * .8) a b)`
  - [Color Level 4](https://drafts.csswg.org/css-color-4/)
    - `lab()`, `lch()`, `oklab()`, and `oklch()` colors
    - `color()` function supporting predefined color spaces such as `display-p3` and `xyz`
    - Space separated components in `rgb` and `hsl` functions
    - Hex with alpha syntax
    - `hwb()` color syntax
    - Percent syntax for opacity
    - `#rgba` and `#rrggbbaa` hex colors
  - Selectors
    - `:not` with multiple arguments
    - `:lang` with multiple arguments
    - `:dir`
    - `:is`
  - Double position gradient stops (e.g. `red 40% 80%`)
  - `clamp()`, `round()`, `rem()`, and `mod()` math functions
  - Alignment shorthands (e.g. `place-items`)
  - Two-value `overflow` shorthand
  - Media query range syntax (e.g. `@media (width <= 100px)` or `@media (100px < width < 500px)`)
  - Multi-value `display` property (e.g. `inline flex`)
  - `system-ui` font family fallbacks
- **CSS modules** – Lightning CSS supports compiling a subset of [CSS modules](https://github.com/css-modules/css-modules) features.
  - Locally scoped class and id selectors
  - Locally scoped custom identifiers, e.g. `@keyframes` names, grid lines/areas, `@counter-style` names, etc.
  - Opt-in support for locally scoped CSS variables and other dashed identifiers.
  - `:local()` and `:global()` selectors
  - The `composes` property
- **Custom transforms** – The Lightning CSS visitor API can be used to implement custom transform plugins.

## Documentation

Lightning CSS can be used from [Parcel](https://parceljs.org), as a standalone library from JavaScript or Rust, using a standalone CLI, or wrapped as a plugin within any other tool. See the [Lightning CSS website](https://lightningcss.dev/docs.html) for documentation.

## Benchmarks

<img width="680" alt="performance and build size charts" src="https://user-images.githubusercontent.com/19409/189022599-28246659-f94a-46a4-9de0-b6d17adb0e22.png#gh-light-mode-only">
<img width="680" alt="performance and build size charts" src="https://user-images.githubusercontent.com/19409/189022693-6956b044-422b-4f56-9628-d59c6f791095.png#gh-dark-mode-only">

```
$ node bench.js bootstrap-4.css
cssnano: 544.809ms
159636 bytes

esbuild: 17.199ms
160332 bytes

lightningcss: 4.16ms
143091 bytes


$ node bench.js animate.css
cssnano: 283.105ms
71723 bytes

esbuild: 11.858ms
72183 bytes

lightningcss: 1.973ms
23666 bytes


$ node bench.js tailwind.css
cssnano: 2.198s
1925626 bytes

esbuild: 107.668ms
1961642 bytes

lightningcss: 43.368ms
1824130 bytes
```

For more benchmarks comparing more tools and input, see [here](http://goalsmashers.github.io/css-minification-benchmark/). Note that some of the tools shown perform unsafe optimizations that may change the behavior of the original CSS in favor of smaller file size. Lightning CSS does not do this – the output CSS should always behave identically to the input. Keep this in mind when comparing file sizes between tools.
