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
n8n-node dev [--n8n-version <value>] [--n8n-image <value>] [--n8n-url <value>] [--external-n8n] [--custom-user-folder <value>]
```

Requires Docker or Podman — the same container engine n8n itself is installed
with (`curl -fsSL https://get.n8n.io | sh`). Use `--external-n8n` if you would
rather run n8n yourself.

**Flags:**
| Flag | Description |
|------|-------------|
| `--n8n-version <tag>` | Version tag of the n8n image to run (default: `latest`) |
| `--n8n-image <image>` | Full image reference, overriding `--n8n-version`. Also settable via `N8N_NODE_DEV_IMAGE` |
| `--n8n-url <url>` | URL n8n is reachable at (default: `http://localhost:5678`) |
| `--external-n8n` | Do not start a container; use an n8n you run yourself |
| `--custom-user-folder <path>` | Only with `--external-n8n`: the `N8N_USER_FOLDER` of that instance (default: `~/.n8n-node-cli`) |

This command:
- Starts n8n in a container on `http://localhost:5678` (unless using `--external-n8n`)
- Mounts your project into the container's custom nodes directory
- Persists workflows and credentials in the `n8n-node-cli-data` volume
- Recompiles on change and pushes a reload to n8n, including for icons and JSON assets

`CONTAINER_ENGINE=docker|podman` overrides engine detection. Colima, Rancher
Desktop, OrbStack and a remote `DOCKER_HOST` all work.

**Examples:**
```bash
# Standard development, latest n8n
n8n-node dev

# Pin the n8n version
n8n-node dev --n8n-version 2.20.7

# Test against a locally built image
n8n-node dev --n8n-image n8nio/n8n:local

# Use an n8n instance you started yourself. It must run with
# N8N_DEV_RELOAD=true and N8N_USER_FOLDER=~/.n8n-node-cli
n8n-node dev --external-n8n

# ...including a remote one
n8n-node dev --external-n8n --n8n-url https://dev.example.com
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

#### `n8n-node cloud-support`

Manage n8n Cloud eligibility.

```bash
n8n-node cloud-support [enable|disable]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| _(none)_ | Show current cloud support status |
| `enable` | Enable strict mode + default ESLint config |
| `disable` | Allow custom ESLint config (disables cloud eligibility) |

Strict mode enforces the default ESLint configuration and community node rules required for n8n Cloud verification. When disabled, you can customize your ESLint config but your node won't be eligible for n8n Cloud verification.

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
