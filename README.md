![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - Unlicensed Version with Auto-Configuration

This is a modified version of n8n that bypasses all license checks and includes automatic setup with pre-configured authentication and API access.

## 🚀 Quick Start with Docker

```bash
# Build the unlicensed image
docker build -f Dockerfile.n8n-unlicensed -t n8n-unlicensed:latest .

# Run with docker-compose
docker-compose -f docker-compose.n8n-unlicensed.yml up -d
```

## 🔐 Access Credentials

### Web Interface
- **URL**: http://localhost:7001
- **Email**: `admin@n8n.local`
- **Password**: `N8nPassword123`

### API Access
- **API Key**: `n8n_api_test_key_123456789`
- **Example**:
  ```bash
  curl -H "X-N8N-API-KEY: n8n_api_test_key_123456789" \
    http://localhost:7001/api/v1/workflows
  ```

## ✨ Features

- ✅ **All Enterprise Features Unlocked** - No license required
- ✅ **Automatic Setup** - No manual configuration needed
- ✅ **Pre-configured Admin Account** - Ready to use immediately
- ✅ **Pre-created API Key** - For programmatic access
- ✅ **Persistent Storage** - Data saved in Docker volume

## 📋 What's Modified

1. **License Bypass**: All license checks return true
2. **Auto-Configuration**: Owner account and API key created automatically
3. **Variables Feature**: Enabled by default in `packages/cli/src/license.ts`
4. **Security Settings**: `N8N_SECURE_COOKIE=false` for easy local access

## 🛠️ Technical Details

- Based on official `n8nio/n8n:latest` image
- License bypass via Node.js require() interception
- Automatic initialization script runs after n8n starts
- SQLite database with pre-configured credentials

## 📚 Documentation

See [README-n8n-unlicensed.md](README-n8n-unlicensed.md) for detailed setup and configuration options.

---

## Original n8n Information

n8n is a workflow automation platform that gives technical teams the flexibility of code with the speed of no-code. With 400+ integrations, native AI capabilities, and a fair-code license, n8n lets you build powerful automations while maintaining full control over your data and deployments.

![n8n.io - Screenshot](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

### Resources

- 📚 [Documentation](https://docs.n8n.io)
- 🔧 [400+ Integrations](https://n8n.io/integrations)
- 💡 [Example Workflows](https://n8n.io/workflows)
- 🤖 [AI & LangChain Guide](https://docs.n8n.io/langchain/)
- 👥 [Community Forum](https://community.n8n.io)

### License

Original n8n is [fair-code](https://faircode.io) distributed under the [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) and [n8n Enterprise License](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md).

**Note**: This modified version is for development/testing purposes only.