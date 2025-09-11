# n8n-advanced

Enhanced n8n with persistent Python packages, PostgreSQL database, and intelligent update system for professional workflow automation.

## Quick Start

```bash
git clone https://github.com/StardawnAI/n8n-advanced.git
cd n8n-advanced/.devcontainer
docker-compose up -d
```

Access at: http://localhost:5678

## Architecture Overview

This setup provides a production-ready n8n environment with:

- **Persistent Data Storage**: All workflows, credentials, and Python packages survive updates
- **Intelligent Update System**: Separate update paths for n8n, PostgreSQL, and Python packages
- **Cross-Platform Compatibility**: Works on Windows, macOS, and Linux
- **Professional Monitoring**: Python package installation status tracking

## What's Included

- **PostgreSQL Database**: Persistent data storage with automatic backups
- **Python Environment**: Pre-configured with scientific computing libraries
- **Update Scripts**: Granular control over component updates
- **Default Workflows**: Pre-imported automation templates
- **Monitoring System**: Real-time status tracking for all components

## Volume Persistence System

All data persists across container updates:

```yaml
volumes:
  n8n_data:           # Workflows, credentials, executions
  postgres_data:      # Database content
  python_packages:    # Installed Python libraries
```

**What survives updates:**
- All workflows and credentials
- Database content and user accounts
- Python packages (both pre-installed and manually added)
- Custom configurations and settings

## Update System

### Individual Component Updates

```bash
# Update only n8n (30 seconds)
bash updates/update-n8n.sh

# Update only Python packages (1-2 minutes)
bash updates/update-packages.sh

# Update only PostgreSQL (30 seconds)  
bash updates/update-postgres.sh

# Update everything (2-3 minutes)
bash updates/update-all.sh
```

### Automated Scheduling

Set up automatic updates with cron:

```bash
# Daily n8n updates
0 3 * * * /path/to/project/updates/update-n8n.sh >> /var/log/n8n-update.log 2>&1

# Weekly full updates
0 4 * * 0 /path/to/project/updates/update-all.sh >> /var/log/all-updates.log 2>&1
```

## Python Package Management

### Runtime Installation Process

Python packages install during container startup (not build time) for improved reliability:

1. **Container starts** with n8n running immediately
2. **Workflows import** within 30 seconds
3. **Python packages install** in background (5 minutes initial setup)
4. **Status monitoring** tracks installation progress

### Monitoring Python Installation

```bash
# Check installation status
docker-compose exec n8n-advanced cat /home/node/.n8n/python-status

# Possible values: installing, ready, failed, updating
```

### Adding New Packages

**Method 1 - Runtime Installation (Temporary):**
```bash
docker-compose exec n8n-advanced pip install new-package --break-system-packages
```

**Method 2 - Persistent Installation:**
1. Add package to `requirements.txt`
2. Run: `bash updates/update-packages.sh`
3. Package persists across all future updates

## ⚠️ CRITICAL: Windows Users

**Container won't start?** Fix line endings:

```powershell
cd "path/to/n8n-advanced/.devcontainer"
(Get-Content setup-defaults.sh -Raw) -replace "`r`n","`n" | Set-Content setup-defaults.sh -NoNewline -Encoding ASCII
```

**Prevention:** In VS Code, change "CRLF" to "LF" in bottom-right status bar when editing `.sh` files.

## Technical Considerations

**Build vs Runtime:** System packages install during build (30 seconds), Python packages install at container startup (5 minutes) for better reliability.

**Fault Isolation:** n8n starts immediately even if Python installation fails. Components degrade gracefully.

**Cross-Platform:** All scripts use `/bin/bash` for Windows/Linux compatibility.

## Troubleshooting

### Workflows Not Imported Automatically
```bash
# Manual import if needed
docker-compose exec n8n-advanced n8n import:workflow --input="/usr/src/app/default-workflows/" --separate
```

### Container Won't Start (Windows)
- **Most common cause:** CRLF line endings in `.sh` files
- **Fix:** Use the PowerShell command above

### Python Packages Not Available
```bash
# Check status
docker-compose exec n8n-advanced cat /home/node/.n8n/python-status
# Restart if failed
docker-compose restart n8n-advanced
```

## Deployment with Custom Domain

For production deployment with custom domain and SSL:

- **Google Cloud**: [GCP n8n Guide](https://github.com/StardawnAI/n8n-advanced/tree/main/googlecloud-n8n-selfhost)
- **Oracle Cloud**: [Oracle n8n Guide](https://github.com/StardawnAI/n8n-advanced/tree/main/oraclecloud-n8n-selfhost)

Replace the Docker commands in those guides with this repo URL.

## Updates

Updates happen automatically via GitHub Actions. Your custom files are protected by `.gitattributes` merge strategies.