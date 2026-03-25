### 2.2.0

- Fix #229 data issue
- Add an option `fixChineseSpacing` option for improving performance for none-Chinese languages
- Fix #202 replace related issues.
- Update dependencies

### 2.1.0

- Add `transliterate` as a global variable for browser builds. Keep `transl` for backward compatibility.

### 2.0.0

- **CDN file structure changed**: [https://www.jsdelivr.com/package/npm/transliteration](https://www.jsdelivr.com/package/npm/transliteration)
- The entire module had been refactored in Typescript, with big performance improvements as well as a reduced package size.
- Better code quality. 100% unit tested.
- `bower` support was dropped. Please use CDN or `webpack`/`rollup`.
- As according to RFC 3986, more characters(`/a-zA-Z0-9-_.~/`) are kept as allowed characters in the result for `slugify`, and it is configurable.
- Added `uppercase` as an option for `slugify`, if is set to `true` then the generated slug will be converted to uppercase letters.
- Unknown characters will be transliterated as empty string by default, instead of a meaningless `[?]`.

### 1.6.6

- Added support for `TypeScript`. #77

### 1.5.0

- Minimum node requirement: 6.0+

### 1.0.0

- Code had been entirely refactored since version 1.0.0. Be careful when you plan to upgrade from v0.1.x or v0.2.x to v1.0.x
- The `options` parameter of `transliterate` now is an `Object` (In 0.1.x it's a string `unknown`).
- Added `transliterate.config` and `slugify.config`.
- Unknown string will be transliterated as `[?]` instead of `?`.
- In the browser, global variables have been changed to `window.transl` and `windnow.slugify`. Other global variables are removed.
