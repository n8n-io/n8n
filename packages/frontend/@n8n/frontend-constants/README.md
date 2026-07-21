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

Constants are declared as `as const` objects with a derived string-literal union
type — never as `const enum`. A `const enum` becomes an *ambient* const enum in
this package's emitted declarations, which downstream packages compiled with
`isolatedModules: true` cannot read (TypeScript error TS2748). The `as const`
form emits a real runtime value plus a portable union type, so it is safe to
consume across the package boundary.

## Contributing

For more details, please read our [CONTRIBUTING.md](CONTRIBUTING.md).

## License

For more details, please read our [LICENSE.md](LICENSE.md).
