# @n8n/data-transport

Simple CLI tool for n8n data export and import operations with dummy responses for demonstration.

## Features

- **CLI Interface**: Command-line interface for data operations
- **Export Commands**: Export data with various options
- **Import Commands**: Import data with different strategies
- **Dummy Responses**: Simulated responses for testing and demonstration
- **Progress Simulation**: Realistic progress indicators
- **Status Command**: Check tool status and capabilities

## Installation

This package is part of the n8n monorepo and should be installed as a workspace dependency.

```bash
pnpm install
```

## Usage

### CLI Commands

#### Export Data

```bash
# Export specific entities
n8n-data-transport export --entities=user,workflow --output=backup.json --encrypt

# Export all data
n8n-data-transport export --all --output=full-backup.json --compress --encrypt

# Export with custom encryption key
n8n-data-transport export --all --output=backup.json --encrypt --key-file=encryption.key

# Export with filtering
n8n-data-transport export --entities=user --filter='{"createdAt": {"$gte": "2024-01-01"}}' --output=users.json
```

#### Import Data

```bash
# Basic import
n8n-data-transport import backup.json --decrypt

# Import with validation
n8n-data-transport import backup.json --strategy=validate --decrypt

# Import with merge strategy
n8n-data-transport import backup.json --strategy=merge --decrypt --key-file=encryption.key

# Import with conflict resolution
n8n-data-transport import backup.json --strategy=replace --decrypt --force

# Preview import without executing
n8n-data-transport import backup.json --preview
```

### Status Command

```bash
# Check tool status
n8n-data-transport status
```

## Demo Mode

This CLI tool runs in demo mode with dummy responses. All operations are simulated and no actual database operations are performed.

### What's Simulated

- ✅ Export data generation with realistic structure
- ✅ Import processing with progress indicators
- ✅ File I/O operations (reading/writing JSON files)
- ✅ Command-line argument parsing
- ✅ Error handling and validation
- ❌ Actual database connections
- ❌ Real encryption/decryption
- ❌ Database constraint validation

## Architecture

The package is organized into a simple CLI structure:

```
src/
├── cli/
│   ├── export.command.ts    # Export command implementation
│   ├── import.command.ts    # Import command implementation
│   └── index.ts            # Main CLI entry point
└── index.ts                # Package exports
```

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Linting

```bash
pnpm lint
pnpm lint:fix
```

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all linting and type checking passes

## License

See LICENSE.md file in the root of the repository.
