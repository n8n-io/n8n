# @n8n/ai-utilities

Core utilities and abstractions for AI functionality in n8n. This package provides the foundational building blocks used internally by the n8n platform.

This package is reexported from @n8n/ai-node-sdk, that exposes methods and types for public usage.

When changing logic in this package, make sure your changes are backwards compatible. What that means:
- don't remove existing interfaces or properties in them
- make new properties optional or create new versions of interfaces
- publicly exposed methods should handle both old and new interfaces

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Run in watch mode
pnpm dev
```


## Running Examples

The package includes example nodes demonstrating both simple and advanced patterns:

```bash
# Build examples
pnpm build:examples

# Add to your .env file
N8N_CUSTOM_EXTENSIONS="<PATH_TO_N8N>/packages/@n8n/ai-utilities/dist_examples/examples/nodes"

# Start n8n
pnpm start
```

You can then add "OpenAI Simple" or "OpenAI Custom" nodes to your workflows.


## Usage

For public SDK documentation see `@n8n/ai-node-sdk`.
