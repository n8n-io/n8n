# Contributing to n8n-nodes-pdf-page-extract

Thank you for considering contributing to this n8n community node! Here are some guidelines to help you get started.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the package:
   ```bash
   pnpm build
   ```

## Testing Your Changes

1. Link the package to your local n8n installation:
   ```bash
   pnpm link
   cd /path/to/n8n
   npm link n8n-nodes-pdf-page-extract
   ```

2. Or use Docker:
   ```bash
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     -v /path/to/n8n-nodes-pdf-page-extract:/home/node/.n8n/custom/n8n-nodes-pdf-page-extract \
     n8nio/n8n
   ```

## Code Style

This project uses ESLint and Prettier for code formatting. Before submitting a pull request, please make sure your code follows the style guidelines:

```bash
pnpm lint
pnpm format
```

## Pull Request Process

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Make your changes
4. Run tests and ensure code style compliance
5. Submit a pull request

## Release Process

Releases are managed by the maintainers. If you'd like to suggest a release, please open an issue.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE.md).
