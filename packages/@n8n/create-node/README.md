# @n8n/create-node

A powerful scaffolding tool to quickly create custom n8n community nodes with best practices built-in.

## 🚀 Quick Start

Create a new n8n node in seconds:

```bash
npm create @n8n/node@latest # or pnpm/yarn/...
```

Follow the interactive prompts to configure your node, or specify options directly:

```bash
npm create @n8n/node my-awesome-node --template declarative/custom
```

## 📋 Command Line Options

```bash
npm create @n8n/node [NAME] [OPTIONS]
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
$ npm create @n8n/node
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
│  cd ./my-awesome-api-node && npm run dev                                       │
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
npm run dev
```

This command needs Docker or Podman — the same container engine you install n8n
itself with. It:
- Starts n8n in a container on `http://localhost:5678`
- Mounts your project into the container's custom nodes directory
- Recompiles on change and reloads your node without a restart, including icons
  and JSON assets
- Persists workflows and credentials in the `n8n-node-cli-data` volume

Use `--external-n8n` if you would rather run n8n yourself.

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

The CLI expects your project to follow this structure for proper building and development.

## ⚙️ Configuration

The CLI reads configuration from your `package.json`:

```json
{
  "name": "n8n-nodes-my-awesome-node",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": [
      "dist/nodes/MyAwesomeApi/MyAwesomeApi.node.js"
    ],
    "credentials": [
      "dist/credentials/MyAwesomeApiAuth.credentials.js"
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
# Reset the dev instance's data volume and restart
docker volume rm n8n-node-cli-data
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
# `n8n-node dev` needs Docker or Podman. Check the engine is running:
docker info

# Override engine detection if you use Podman, Colima, etc.
CONTAINER_ENGINE=podman npm run dev
```

## 🔧 Advanced Usage

### Pinning the n8n Version

```bash
npm run dev -- --n8n-version 2.20.7
```

### Using External n8n Instance

If you prefer to run n8n yourself. That instance must run with
`N8N_DEV_RELOAD=true` and `N8N_USER_FOLDER` set to the folder below:

```bash
npm run dev -- --external-n8n
npm run dev -- --external-n8n --custom-user-folder /path/to/n8n/user/folder
npm run dev -- --external-n8n --n8n-url https://dev.example.com
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
