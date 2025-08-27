# @n8n/create-node

A powerful scaffolding tool to quickly create custom n8n community nodes with best practices built-in.

## 🚀 Quick Start

Create a new n8n node in seconds:

```bash
pnpm create @n8n/node
```

Follow the interactive prompts to configure your node, or specify options directly:

```bash
pnpm create @n8n/node my-awesome-node --template declarative/custom
```

## 📋 Command Line Options

```bash
pnpm create @n8n/node [NAME] [OPTIONS]
```

### Options

| Flag | Description |
|------|-------------|
| `-f, --force` | Overwrite destination folder if it already exists |
| `--skip-install` | Skip automatic dependency installation |
| `--template <template>` | Specify which template to use |

### Available Templates

- **`declarative/custom`** - Start with a minimal declarative node structure
- **`declarative/github-issues`** - GitHub Issues integration example
- **`programmatic/example`** - Full programmatic node with advanced features

## 🎯 Interactive Setup

The CLI will guide you through setting up your node:

```
$ pnpm create @n8n/node
┌ @n8n/create-node
│
◇ What is your node called?
│ my-awesome-api-node
│
◇ What kind of node are you building?
│ HTTP API
│
◇ What template do you want to use?
│ Start from scratch
│
◇ What's the base URL of the API?
│ https://api.example.com/v1
│
◇ What type of authentication does your API use?
│ API Key
│
◇ Files copied ✓
│
◇ Dependencies installed ✓
│
◇ Next Steps ─────────────────────────────────────────────────────────────────────╮
│                                                                                  │
│  cd ./my-awesome-api-node && pnpm run dev                                       │
│                                                                                  │
│  📚 Documentation: https://docs.n8n.io/integrations/creating-nodes/            │
│  💬 Community: https://community.n8n.io                                        │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────╯
│
└ Created ./my-awesome-api-node ✨
```

## 🛠️ Development Workflow

### 1. Navigate to your project

```bash
cd ./my-awesome-api-node
```

### 2. Start development server

```bash
pnpm dev
```

This command:
- Starts n8n in development mode on `http://localhost:5678`
- Enables hot reload for your node changes
- Automatically includes your node in the n8n instance
- Watches for file changes and rebuilds automatically

### 3. Test your node

- Open n8n at `http://localhost:5678`
- Create a new workflow
- Find your node in the node panel
- Test parameters and functionality in real-time

## 📦 Build & Deploy

### Build for production

```bash
pnpm build
```

Generates:
- Compiled TypeScript code
- Bundled node package
- Optimized assets and icons
- Ready-to-publish package

### Quality checks

```bash
pnpm lint
```

Validates:
- Code style and formatting
- n8n node conventions
- Common integration issues
- Cloud publication readiness

### Publish your node

```bash
pnpm run release
```

Runs `release-it` to handle the complete release process:
- Ensures working directory is clean
- Verifies you're on the main git branch
- Increments your package version
- Runs build and lint checks
- Creates git tag with version bump
- Creates GitHub release with changelog
- Updates changelog

## 📁 Project Structure

Your generated project includes:

```
my-awesome-api-node/
├── src/
│   ├── nodes/
│   │   └── MyAwesomeApi/
│   │       ├── MyAwesomeApi.node.ts    # Main node logic
│   │       └── MyAwesomeApi.node.json  # Node metadata
│   └── credentials/
│       └── MyAwesomeApiAuth.credentials.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 🎨 Node Types

Choose the right template for your use case:

| Template | Best For | Features |
|----------|----------|----------|
| **Declarative** | REST APIs, simple integrations | JSON-based configuration, automatic UI generation |
| **Programmatic** | Complex logic, custom operations | Full TypeScript control, advanced error handling |

## 📚 Resources

- **[Node Development Guide](https://docs.n8n.io/integrations/creating-nodes/)** - Complete documentation
- **[API Reference](https://docs.n8n.io/integrations/creating-nodes/build/reference/)** - Technical specifications
- **[Community Forum](https://community.n8n.io)** - Get help and share your nodes
- **[Node Examples](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes)** - Official node implementations

## 🐛 Troubleshooting

### Common Issues

**Node not appearing in n8n:**
```bash
# Clear n8n cache and restart
rm -rf ~/.n8n
pnpm dev
```

**TypeScript errors:**
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Build failures:**
```bash
# Check for linting issues first
pnpm lint --fix
pnpm build
```

## 🤝 Contributing

Found a bug or want to contribute? Check out the [n8n repository](https://github.com/n8n-io/n8n) and join our community!

---

**Happy node building! 🎉**
