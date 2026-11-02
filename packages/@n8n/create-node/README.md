# @n8n/create-node

A powerful scaffolding tool to quickly create custom n8n community nodes with best practices built-in.

## 🚀 Quick Start

Create a new n8n node in seconds with the `create` command of your package manager ([npm](https://docs.npmjs.com/cli/commands/npm-init), [pnpm](https://pnpm.io/cli/create), or [yarn](https://classic.yarnpkg.com/en/docs/cli/create)):

```bash
npm create @n8n/node@latest
pnpm create @n8n/node@latest
yarn create @n8n/node
```

Follow the interactive prompts to configure your node, or specify options directly:

```bash
npm create @n8n/node n8n-nodes-my-app -- --template declarative/custom
```

> **Note:** This package is a small wrapper around the `n8n-node new` command from [`@n8n/node-cli`](https://www.npmjs.com/package/@n8n/node-cli). The `create` command of each package manager resolves `@n8n/node` to this package.

## 📋 Command Line Options

```bash
npm create @n8n/node [NAME] -- [OPTIONS]
```

With npm, put `--` before the options. Without it, npm reads the options as its own settings and does not pass them to this tool.

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
$ npm create @n8n/node
┌ @n8n/create-node
│
◇ Package name (must start with 'n8n-nodes-' or '@org/n8n-nodes-')
│ n8n-nodes-my-app
│
◇ What kind of node are you building?
│ Declarative
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
│  cd ./n8n-nodes-my-app && npm run dev                                          │
│                                                                                  │
│  📚 Documentation: https://docs.n8n.io/integrations/creating-nodes/            │
│  💬 Community: https://community.n8n.io                                        │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────╯
│
└ Created ./n8n-nodes-my-app ✨
```

## 🛠️ Development Workflow

### 1. Navigate to your project

```bash
cd ./n8n-nodes-my-app
```

### 2. Start development server

```bash
npm run dev
```

This command:
- Starts n8n in development mode on `http://localhost:5678`
- Enables hot reload for your node changes
- Automatically includes your node in the n8n instance
- Links your node to `~/.n8n-node-cli/.n8n/custom` for development
- Watches for file changes and rebuilds automatically

### 3. Test your node

- Open n8n at `http://localhost:5678`
- Create a new workflow
- Find your node in the node panel
- Test parameters and functionality in real-time

## 📦 Generated Project Commands

Your generated project comes with these convenient npm scripts:

### Development
```bash
npm run dev
# Runs: n8n-node dev
```

### Building
```bash
npm run build
# Runs: n8n-node build
```

### Linting
```bash
npm run lint
# Runs: n8n-node lint

npm run lint:fix
# Runs: n8n-node lint --fix
```

### Publishing
```bash
npm run release
# Runs: n8n-node release
```

## 📦 Build & Deploy

### Build for production

```bash
npm run build
```

Generates:
- Compiled TypeScript code
- Bundled node package
- Optimized assets and icons
- Ready-to-publish package

### Quality checks

```bash
npm run lint
```

Validates:
- Code style and formatting
- n8n node conventions
- Common integration issues
- Cloud publication readiness

### Cloud support

```bash
npx n8n-node cloud-support
```

Manage n8n Cloud publication eligibility. In strict mode, your node must use the default ESLint config and pass all community node rules to be eligible for n8n Cloud publication.

Fix issues automatically:

```bash
npm run lint:fix
```

### Publish your node

```bash
npm run release
```

Runs [release-it](https://github.com/release-it/release-it) to handle the complete release process:
- Ensures working directory is clean
- Verifies you're on the main git branch
- Increments your package version
- Runs build and lint checks
- Updates changelog
- Creates git tag with version bump
- Creates GitHub release with changelog
- Publishes to npm

## 📁 Project Structure

Your generated project includes:

```
n8n-nodes-my-app/
├── nodes/
│   └── MyApp/
│       ├── MyApp.node.ts    # Main node logic
│       └── MyApp.node.json  # Node metadata
├── credentials/
│   └── MyAppApi.credentials.ts
├── package.json
├── tsconfig.json
└── README.md
```

The CLI expects your project to follow this structure for proper building and development.

## ⚙️ Configuration

The CLI reads configuration from your `package.json`:

```json
{
  "name": "n8n-nodes-my-app",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": [
      "dist/nodes/MyApp/MyApp.node.js"
    ],
    "credentials": [
      "dist/credentials/MyAppApi.credentials.js"
    ]
  }
}
```

## 🎨 Node Types

Choose the right template for your use case:

| Template | Best For | Features |
|----------|----------|----------|
| **Declarative** | REST APIs, simple integrations | JSON-based configuration, automatic UI generation |
| **Programmatic** | Complex logic, custom operations | Full TypeScript control, advanced error handling |

## 🐛 Troubleshooting

### Common Issues

**Node not appearing in n8n:**
```bash
# Clear n8n node cli cache and restart
rm -rf ~/.n8n-node-cli/.n8n/custom
npm run dev
```

**TypeScript errors:**
```bash
# Reinstall dependencies
rm -rf node_modules npm-lock.yaml
npm install
```

**Build failures:**
```bash
# Check for linting issues first
npm run lint --fix
npm run build
```

**Development server issues:**
```bash
# Clear cache and restart development server
rm -rf ~/.n8n-node-cli/.n8n/custom
npm run dev
```

## 🔧 Advanced Usage

### Using External n8n Instance

If you prefer to use your own n8n installation:

```bash
npm run dev --external-n8n
```

### Custom User Folder

Specify a custom location for n8n user data:

```bash
npm run dev --custom-user-folder /path/to/custom/folder
```

## 📚 Resources

- **[Node Development Guide](https://docs.n8n.io/integrations/creating-nodes/)** - Complete documentation
- **[API Reference](https://docs.n8n.io/integrations/creating-nodes/build/reference/)** - Technical specifications
- **[Community Forum](https://community.n8n.io)** - Get help and share your nodes
- **[Node Examples](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes)** - Official node implementations
- **[@n8n/node-cli](https://www.npmjs.com/package/@n8n/node-cli)** - The underlying CLI tool

## 🤝 Contributing

Found a bug or want to contribute? Check out the [n8n repository](https://github.com/n8n-io/n8n) and join our community!

---

**Happy node building! 🎉**
