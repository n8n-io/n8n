# @n8n/frontend-constants

Shared, framework-agnostic constants for n8n's front-end packages. The
package-reachable home for values (such as router view identifiers) that
multiple front-end packages need without depending on the `editor-ui` app.

## Table of Contents

- [Features](#features)
- [Design notes](#design-notes)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Cross-package constants**: A single home for constants shared across the
  front end (e.g. `VIEWS`).
- **No runtime coupling**: Plain values with no component, store, or framework
  dependency.
- **`dist`-safe**: Consumable from built `dist` by downstream packages, including
  those compiled with `isolatedModules`.

## Design notes

Enum-like constants are declared as a plain `enum` — never as a `const enum`. A
`const enum` becomes an *ambient* const enum in this package's emitted
declarations, which downstream packages compiled with `isolatedModules: true`
cannot read (TypeScript error TS2748). A plain `enum` emits a regular
`declare enum` backed by a real runtime object, so it is safe to consume from
`dist` across the package boundary, and it preserves the nominal enum-member
types the rest of the front end relies on (so relocating a value such as `VIEWS`
here is behavior-preserving). The repo lint default prefers `const enum`, so the
`no-restricted-syntax` rule is relaxed for these files in `eslint.config.mjs`.

## Contributing

For more details, please read our [CONTRIBUTING.md](CONTRIBUTING.md).

## License

For more details, please read our [LICENSE.md](LICENSE.md).
