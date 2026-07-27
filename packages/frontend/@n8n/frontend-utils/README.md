# @n8n/frontend-utils

A collection of framework-light helpers shared across n8n's front-end packages —
HTML sanitization, DOM helpers, and the small composables that carry no
component, store, or app coupling.

## Table of Contents

- [Features](#features)
- [Contributing](#contributing)
- [License](#license)

## Features

- **No upward coupling**: nothing here imports a component, a store, or the app.
  This is the package's real boundary — it is what lets every other front-end
  package, `@n8n/stores` included, depend on it.
- **Leaf position**: depends only on framework libraries and shared type
  packages (`@n8n/api-types`, `n8n-workflow`) — never on another
  `packages/frontend` package, so importing it can never close a cycle.
- **Consistency**: A single home for cross-package front-end utilities.
- **Extensible**: A foundation for utilities as the front end grows.

## Contributing

For more details, please read our [CONTRIBUTING.md](CONTRIBUTING.md).

## License

For more details, please read our [LICENSE.md](LICENSE.md).
