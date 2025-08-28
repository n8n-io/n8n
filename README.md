# n8n - Shopify automation

This folder contains n8n workflows, fixtures and helpers to automate Shopify orders.

Quick start (local, using n8n CLI)
1. Copy `n8n/env.example` to `.env` and fill required variables.
2. Start n8n (Docker recommended):
   - Using Docker Compose (example):
     ```bash
     docker run --rm -it \
       -p 5678:5678 \
       --env-file .env \
       -v $PWD:/data \
       n8nio/n8n
     ```
3. Import workflow:
   ```bash
   n8n import:workflow --input=n8n/workflows/shopify-new-order.json
   n8n import:workflow --input=n8n/workflows/shopify-billing.json
   ```
4. To simulate a Shopify webhook using fixtures:
   ```bash
   bash n8n/test/simulate_webhook.sh n8n/fixtures/order-normal.json
   bash n8n/test/simulate_webhook.sh n8n/fixtures/order-highvalue.json
   ```

Testing and demo checklist
- Import workflows into n8n.
- Create credentials in n8n UI: Google Sheets (service account), SMTP, Slack webhook.
- Ensure `GOOGLE_SHEET_ID` is set and the service account has write access.
- Run `simulate_webhook.sh` to POST the fixture to the webhook endpoint.

Notes
- Do NOT commit secrets. Use n8n credential store for sensitive keys.
- For QuickBooks integration follow QuickBooks OAuth steps and add credentials in n8n GUI. The billing workflow provides CSV export as an alternative.

# n8n Shopify Automation — Demo & Import

This folder contains n8n workflows, fixtures and documentation to demo a Shopify new-order automation.

Quick start (local, using n8n):

1. Copy environment example:
   - `cp n8n/.env.example .env` and fill values (do NOT commit `.env`).
2. Start n8n (docker-compose or n8n CLI):
   - Docker Compose example (assumes `n8n` image configured):
     `docker run -it --rm -p 5678:5678 -e N8N_BASIC_AUTH_ACTIVE=false --env-file .env -v ~/.n8n:/home/node/.n8n n8nio/n8n:latest`
   - Or with n8n CLI: `n8n start --tunnel` (for public webhook during testing).
3. Import the workflow:
   `n8n import:workflow --input=n8n/workflows/shopify-new-order.json`

Simulate a Shopify webhook with curl (local webhook path: `/webhook/shopify-new-order` — check the Webhook node path after import):

`curl -H "Content-Type: application/json" --data @n8n/fixtures/order-normal.json http://localhost:5678/webhook/shopify-new-order`

Or for high-value test:

`curl -H "Content-Type: application/json" --data @n8n/fixtures/order-highvalue.json http://localhost:5678/webhook/shopify-new-order`

Testing checklist:
- Import workflow and connect credentials for Google Sheets, SMTP and Slack.
- Send `order-normal.json` and verify a new row in the configured Google Sheet and an email to the customer (or SMTP test sink).
- Send `order-highvalue.json` and verify Slack notification is posted.
- If billing is enabled, verify CSV export or QuickBooks request is attempted. If billing fails, confirm fallback email to `SUPPORT_EMAIL`.

Notes:
- Do NOT commit real credentials. Use `n8n` credentials UI or environment variables.
- See `n8n/design.md` for architecture and variables.

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
- 🤖 [AI & LangChain Guide](https://docs.n8n.io/langchain/)
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

Additional information about the license model can be found in the [docs](https://docs.n8n.io/reference/license/).

## Contributing

Found a bug 🐛 or have a feature idea ✨? Check our [Contributing Guide](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md) to get started.

## Join the Team

Want to shape the future of automation? Check out our [job posts](https://n8n.io/careers) and join our team!

## What does n8n mean?

**Short answer:** It means "nodemation" and is pronounced as n-eight-n.

**Long answer:** "I get that question quite often (more often than I expected) so I decided it is probably best to answer it here. While looking for a good name for the project with a free domain I realized very quickly that all the good ones I could think of were already taken. So, in the end, I chose nodemation. 'node-' in the sense that it uses a Node-View and that it uses Node.js and '-mation' for 'automation' which is what the project is supposed to help with. However, I did not like how long the name was and I could not imagine writing something that long every time in the CLI. That is when I then ended up on 'n8n'." - **Jan Oberhauser, Founder and CEO, n8n.io**
