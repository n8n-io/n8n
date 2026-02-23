![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - Secure Workflow Automation for Technical Teams

n8n is a workflow automation platform that gives technical teams the flexibility of code with the speed of no-code. With 400+ integrations, native AI capabilities, and a fair-code license, n8n lets you build powerful automations while maintaining full control over your data and deployments.

![n8n.io - Screenshot](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## Key Capabilities

- **Code When You Need It**: Write JavaScript/Python, add npm packages, or use the visual interface
- **AI-Native Platform**: Build AI agent workflows based on LangChain with your own data and models
- **Full Control**: Self-host with our fair-code license or use our [cloud offering](https://app.n8n.cloud/login)
- **Enterprise-Ready**: Advanced permissions, SSO, and air-gapped deployments
- **Active Community**: 400+ integrations and 900+ ready-to-use [templates](https://n8n.io/workflows)

## Quick Start

Try n8n instantly with [npx](https://docs.n8n.io/hosting/installation/npm/) (requires [Node.js](https://nodejs.org/en/)):

```
npx n8n
```

Or deploy with [Docker](https://docs.n8n.io/hosting/installation/docker/):

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Access the editor at http://localhost:5678

## Resources

- 📚 [Documentation](https://docs.n8n.io)
- 🔧 [400+ Integrations](https://n8n.io/integrations)
- 💡 [Example Workflows](https://n8n.io/workflows)
- 🤖 [AI & LangChain Guide](https://docs.n8n.io/advanced-ai/)
- 👥 [Community Forum](https://community.n8n.io)
- 📖 [Community Tutorials](https://community.n8n.io/c/tutorials/28)

## Support

Need help? Our community forum is the place to get support and connect with other users:
[community.n8n.io](https://community.n8n.io)

## License

n8n is [fair-code](https://faircode.io) distributed under the [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) and [n8n Enterprise License](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md).

- **Source Available**: Always visible source code
- **Self-Hostable**: Deploy anywhere
- **Extensible**: Add your own nodes and functionality

[Enterprise licenses](mailto:license@n8n.io) available for additional features and support.

Additional information about the license model can be found in the [docs](https://docs.n8n.io/sustainable-use-license/).

## Contributing

Found a bug 🐛 or have a feature idea ✨? Check our [Contributing Guide](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md) for a setup guide & best practices.

## Join the Team

Want to shape the future of automation? Check out our [job posts](https://n8n.io/careers) and join our team!

## What does n8n mean?

**Short answer:** It means "nodemation" and is pronounced as n-eight-n.

**Long answer:** "I get that question quite often (more often than I expected) so I decided it is probably best to answer it here. While looking for a good name for the project with a free domain I realized very quickly that all the good ones I could think of were already taken. So, in the end, I chose nodemation. 'node-' in the sense that it uses a Node-View and that it uses Node.js and '-mation' for 'automation' which is what the project is supposed to help with. However, I did not like how long the name was and I could not imagine writing something that long every time in the CLI. That is when I then ended up on 'n8n'." - **Jan Oberhauser, Founder and CEO, n8n.io**

---

## Environment Setup (Self-Hosted)

This project supports multiple environments. Each environment has its own `.env` file, data directory, and port.

### Environments

| Environment | Env File | Port | URL | Data Directory |
|---|---|---|---|---|
| **Development** | `.env.dev` | 5678 | `http://localhost:5678` | `C:\n8n-data\dev` |
| **Staging** | `.env.staging` | 8075 | `http://rigdocaisearch.nov.com:8075` | `C:\n8n-data\staging` |
| **Production** | `.env.prod` | 8073 | `http://rigdocaisearch.nov.com:8073` | `C:\n8n-data\prod` |

### Prerequisites

- Node.js v22+
- pnpm (`npm install -g pnpm`)
- Build the project first: `pnpm build > build.log 2>&1`

### Troubleshooting Playwright Browser Install

If you see errors like `self-signed certificate in certificate chain` or `Failed to install browsers` when running Playwright or installing community packages:

**Run this command before installing Playwright browsers:**

For PowerShell:
```
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
pnpm exec playwright install --with-deps
```

For CMD:
```
set NODE_TLS_REJECT_UNAUTHORIZED=0
pnpm exec playwright install --with-deps
```

This disables strict SSL validation for Node.js downloads (safe for development, not recommended for production).

### Running Environments

#### Development (localhost)

```bash
npx n8n start --envFile=.env.dev
```

Or with hot-reload (for n8n development):

```bash
pnpm turbo run dev --parallel --env-mode=loose --filter=!@n8n/design-system --filter=!@n8n/chat --filter=!@n8n/task-runner --filter=!n8n-playwright
```

#### Staging

```bash
npx n8n start --envFile=.env.staging
```

#### Production

```bash
npx n8n start --envFile=.env.prod
```

#### Production (manual env vars, Windows CMD)

```cmd
set N8N_USER_FOLDER=C:\n8n-data\prod&& set N8N_HOST=rigdocaisearch.nov.com&& set N8N_PORT=8073&& set N8N_PROTOCOL=http&& set WEBHOOK_URL=http://rigdocaisearch.nov.com:8073/&& set N8N_LISTEN_ADDRESS=0.0.0.0&& set N8N_SECURE_COOKIE=false&& node packages/cli/bin/n8n start
```

### User Management

Multi-user access is enabled (`N8N_USER_MANAGEMENT_DISABLED=false`). After starting n8n:

1. First user to visit the UI becomes the **owner**
2. Go to **Settings → Users → Invite** to add teammates
3. Since `N8N_EMAIL_MODE` is empty, copy invite links manually (no SMTP needed)
4. Set `N8N_INVITE_LINKS_EMAIL_ONLY=false` to expose invite links in the UI

### Key Environment Variables

| Variable | Description |
|---|---|
| `N8N_HOST` | Hostname for n8n |
| `N8N_PORT` | Port to listen on |
| `WEBHOOK_URL` | Base URL for webhooks (must match host:port) |
| `N8N_USER_FOLDER` | Data directory (DB, credentials, workflows) |
| `N8N_ENCRYPTION_KEY` | Encryption key for credentials (unique per env!) |
| `N8N_SECURE_COOKIE` | Set to `false` for HTTP (no HTTPS) |
| `N8N_USER_MANAGEMENT_DISABLED` | `false` to enable multi-user |
| `DB_TYPE` | Database type (`sqlite` or `postgres`) |

### Important Notes

- Each environment **must** have a unique `N8N_ENCRYPTION_KEY`
- Each environment **must** have a separate `N8N_USER_FOLDER` to avoid data conflicts
- `WEBHOOK_URL` must match the actual host and port
- The `.env.*` files are in `.gitignore` — never commit them



pnpm start --envFile=.env.dev


$env:DOTENV_CONFIG_PATH=".env.dev"; pnpm dev