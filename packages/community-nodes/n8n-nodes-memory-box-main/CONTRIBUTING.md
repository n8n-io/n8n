# Contributing to n8n-nodes-memory-box

Thank you for your interest in contributing to the Memory Box n8n node!

## Development Setup

To set up your development environment:

```bash
# Clone the repository
git clone https://github.com/amotivv/n8n-nodes-memory-box.git
cd n8n-nodes-memory-box

# Install dependencies
npm install

# Build the node
npm run build
```

## Local Testing

To test your node locally with n8n:

1. Build the node: `npm run build`
2. Create a symbolic link: `npm link`
3. Go to your n8n installation directory: `cd ~/.n8n`
4. Link the package: `npm link n8n-nodes-memory-box`
5. Start n8n: `n8n start`

## Creating a Release

To publish a new version:

1. Update the version in package.json
2. Build the package: `npm run build`
3. Publish to npm: `npm publish`

## Node Development Guidelines

When developing this node, please follow these guidelines:

1. **Maintain Backward Compatibility**: Avoid breaking changes where possible
2. **Error Handling**: Implement proper error handling for API calls
3. **Documentation**: Keep the README and code comments up to date
4. **Testing**: Test all operations before submitting changes

## Code Style

This project uses ESLint and Prettier for code formatting. Before submitting code:

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lintfix

# Format code
npm run format
