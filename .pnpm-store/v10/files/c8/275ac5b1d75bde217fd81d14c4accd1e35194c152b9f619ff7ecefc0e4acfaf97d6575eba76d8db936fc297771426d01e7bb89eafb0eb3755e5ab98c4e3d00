# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.1](https://github.com/medikoo/esniff/compare/v2.0.0...v2.0.1) (2024-02-21)

### Bug Fixes

- Fix release of operator char trigger event ([1309a18](https://github.com/medikoo/esniff/commit/1309a187ed9dd82aea9f3b9fc3bd4b986c005fcb))

## [2.0.0](https://github.com/medikoo/esniff/compare/v1.1.3...v2.0.0) (2024-02-19)

### ⚠ BREAKING CHANGES

- Main `esniff` interface changed from `code, trigger, callback` to `code, executor` where executor function is provided with emitter that provides access to internal parsing process
- Property and variable names resolution now respects ES2015+ language rules instead of ES5
- Utilties were moved:
  - `ensure-string-literal.js` -> `utils/ensure-string-literal.js`
  - `is-string-literal.js` -> `utils/is-string-literal.js`
  - `is-var-name-valid.js` -> `utils/is-variable-name.js`

### Features

- Replace parser with state machine based event driven variant ([0d9bf17](https://github.com/medikoo/esniff/commit/0d9bf1736c795a06d563ce550b50c8a3d90bf1a7))
- Support ES2015 template strings syntax ([4016496](https://github.com/medikoo/esniff/commit/401649625c35174380fc5eabf5e77f479f09a46f))
- Upgrade variable and property name patterns to ES2015+ ([7f2f4ab](https://github.com/medikoo/esniff/commit/7f2f4ab68b04d323a8fe305badac403629992656))

### Maintenance Improvements

- Move basic utils into `utils` directory ([afc6ddf](https://github.com/medikoo/esniff/commit/afc6ddf3e3b0bb3b7c8708370d94dd47dc1bdf03))
- Refactor `stripComments` to rely on main parser ([6d2dd7f](https://github.com/medikoo/esniff/commit/6d2dd7f916c0d54444df061ff0997481dc253f21))
- Rely on `type` package instead of `es5-ext` ([2a79744](https://github.com/medikoo/esniff/commit/2a79744dff8c04e8dcccb63f0493c2d1e2e7f414))

### [1.1.3](https://github.com/medikoo/esniff/compare/v1.1.2...v1.1.3) (2024-01-04)

### Maintenance Improvements

- Improve `isVarNameValid` internals ([82138c2](https://github.com/medikoo/esniff/commit/82138c2b932debcfe6c5ab6db139889b5ff3d16c))

### [1.1.2](https://github.com/medikoo/esniff/compare/v1.1.1...v1.1.2) (2024-01-04)

### Maintenance Improvements

- Configure `.npmignore` ([1a67292](https://github.com/medikoo/esniff/commit/1a672927bf1367e335080e1dae312bb1fb6b79b1))

### [1.1.1](https://github.com/medikoo/esniff/compare/v1.1.0...v1.1.1) (2024-01-04)

### Bug Fixes

- Ensure to detect Windows EOL (`\r\n`) as single EOL ([72a17fe](https://github.com/medikoo/esniff/commit/72a17feed836432ef55864500b52853adf0ab9c3))
- Fix column indexing in move function ([3c0a6cb](https://github.com/medikoo/esniff/commit/3c0a6cbd5f0955b2728595e55fdb7f4fc3703a95))

### Maintenance Improvements

- Declare support for Node.js v0.10+ ([1eba1d6](https://github.com/medikoo/esniff/commit/1eba1d633b4850b4356aa56d17e80ce6d6e4fae4))
- ESLint suggested improvements ([d7c65ef](https://github.com/medikoo/esniff/commit/d7c65ef71089cbc2cc83c8e7ae768252c5adb839))
- Extract regular expression patterns into modules ([1b12cbe](https://github.com/medikoo/esniff/commit/1b12cbe08561fac17774ca77e8c05669774c6e1f))
- Fix reference links in source code comments ([4787424](https://github.com/medikoo/esniff/commit/47874241eea6740edb0419e4372aa1aed1128a2c))
- Replace `xlint` configuration with `eslint` ([f434553](https://github.com/medikoo/esniff/commit/f434553f5b997c3e01b72f7692d030df8bbf92c1))
- Switch LICENSE from MIT to ISC ([cc33510](https://github.com/medikoo/esniff/commit/cc3351055c7b0ca34adc92922ca3321a5ebc85e5))

## Changelog for previous versions

See `CHANGES` file
