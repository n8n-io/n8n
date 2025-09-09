# @n8n/node-cli

Official CLI for developing community nodes for n8n.

## 🚀 Getting Started

**To create a new node**, run:

```bash
npm create @n8n/node@latest # or pnpm/yarn/...
```

This will generate a project with `npm` scripts that use this CLI under the hood.

## 📦 Generated Project Commands

After creating your node with `npm create @n8n/node`, you'll use these commands in your project:

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

## 🛠️ CLI Reference

> **Note:** These commands are typically wrapped by `npm` scripts in generated projects.

```bash
n8n-node [COMMAND] [OPTIONS]
```

### Commands

#### `n8n-node new`

Create a new node project.

```bash
n8n-node new [NAME] [OPTIONS]
```

**Flags:**
| Flag | Description |
|------|-------------|
| `-f, --force` | Overwrite destination folder if it already exists |
| `--skip-install` | Skip installing dependencies |
| `--template <template>` | Choose template: `declarative/custom`, `declarative/github-issues`, `programmatic/example` |

**Examples:**
```bash
n8n-node new
n8n-node new n8n-nodes-my-app --skip-install
n8n-node new n8n-nodes-my-app --force
n8n-node new n8n-nodes-my-app --template declarative/custom
```

> **Note:** This command is used internally by `npm create @n8n/node` to provide the interactive scaffolding experience.

#### `n8n-node dev`

Run n8n with your node in development mode with hot reload.

```bash
n8n-node dev [--external-n8n] [--custom-user-folder <value>]
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--external-n8n` | Run n8n externally instead of in a subprocess |
| `--custom-user-folder <path>` | Folder to use to store user-specific n8n data (default: `~/.n8n-node-cli`) |

This command:
- Starts n8n on `http://localhost:5678` (unless using `--external-n8n`)
- Links your node to n8n's custom nodes directory (`~/.n8n-node-cli/.n8n/custom`)
- Rebuilds on file changes for live preview
- Watches for changes in your `src/` directory

**Examples:**
```bash
# Standard development with built-in n8n
n8n-node dev

# Use external n8n instance
n8n-node dev --external-n8n

# Custom n8n extensions directory
n8n-node dev --custom-user-folder /home/user
```

#### `n8n-node build`

Compile your node and prepare it for distribution.

```bash
n8n-node build
```

**Flags:** None

Generates:
- Compiled TypeScript code
- Bundled node package
- Optimized assets and icons
- Ready-to-publish package in `dist/`

#### `n8n-node lint`

Lint the node in the current directory.

```bash
n8n-node lint [--fix]
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--fix` | Automatically fix problems |

**Examples:**
```bash
# Check for linting issues
n8n-node lint

# Automatically fix fixable issues
n8n-node lint --fix
```

#### `n8n-node release`

Publish your community node package to npm.

```bash
n8n-node release
```

**Flags:** None

This command handles the complete release process using [release-it](https://github.com/release-it/release-it):
- Builds the node
- Runs linting checks
- Updates changelog
- Creates git tags
- Creates GitHub releases
- Publishes to npm

## 🔄 Development Workflow

The recommended workflow using the scaffolding tool:

1. **Create your node**:
   ```bash
   npm create @n8n/node my-awesome-node
   cd my-awesome-node
   ```

2. **Start development**:
   ```bash
   npm run dev
   ```
   - Starts n8n on `http://localhost:5678`
   - Links your node automatically
   - Rebuilds on file changes

3. **Test your node** at `http://localhost:5678`

4. **Lint your code**:
   ```bash
   npm run lint
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Publish**:
   ```bash
   npm run release
   ```

## 📁 Project Structure

The CLI expects your project to follow this structure:

```
my-node/
├── src/
│   ├── nodes/
│   │   └── MyNode/
│   │       ├── MyNode.node.ts
│   │       └── MyNode.node.json
│   └── credentials/
├── package.json
└── tsconfig.json
```

## ⚙️ Configuration

The CLI reads configuration from your `package.json`:

```json
{
  "name": "n8n-nodes-my-awesome-node",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": [
      "dist/nodes/MyNode/MyNode.node.js"
    ],
    "credentials": [
      "dist/credentials/MyNodeAuth.credentials.js"
    ]
  }
}
```

## 🐛 Troubleshooting

### Development server issues
```bash
# Clear n8n custom nodes cache
rm -rf ~/.n8n-node-cli/.n8n/custom

# Restart development server
npm run dev
```

### Build failures
```bash
# Run linting first
npm run lint

# Clean build
npm run build
```

## 📚 Resources

- **[Creating Nodes Guide](https://docs.n8n.io/integrations/creating-nodes/)** - Complete documentation
- **[Node Development Reference](https://docs.n8n.io/integrations/creating-nodes/build/reference/)** - API specifications
- **[Community Forum](https://community.n8n.io)** - Get help and showcase your nodes
- **[@n8n/create-node](https://www.npmjs.com/package/@n8n/create-node)** - Recommended scaffolding tool

## 🤝 Contributing

Found an issue? Contribute to the [n8n repository](https://github.com/n8n-io/n8n) on GitHub.

---

**Happy node development! 🎉**
