# Deployment Guide (Coolify on NAS)

This project has been customized with the OneOrigin Blue theme and Supabase integrations. Follow these steps to deploy it on your NAS using Coolify.

## 1. Prepare the Code
First, ensure all the latest changes (including the visual fixes) are pushed to GitHub.
Run this in your terminal:
```bash
git add .
git commit -m "chore: add deployment files"
git push origin branding/oneorigin-blue-supabase
```

## 2. Coolify Setup
1.  Go to your **Coolify Dashboard**.
2.  Click **+ New Resource** -> **Git Repository** (Public or Private).
3.  Select Request:
    *   **Repository url**: `https://github.com/abhinandc/oneo-autom8` (or connect via App).
    *   **Branch**: `branding/oneorigin-blue-supabase`  <-- **IMPORTANT**
4.  Configuration:
    *   **Build Pack**: Select **Docker Deployment**.
    *   **Dockerfile Path**: `/Dockerfile.coolify`  <-- **IMPORTANT** (Use the custom file we created).
    *   **Port**: `5678`.

## 3. Environment Variables (Required)
Add these variables in Coolify under the **Environment Variables** tab for your n8n service.

### General Config
| Variable | Value | Description |
| :--- | :--- | :--- |
| `N8N_PORT` | `5678` | Internal port |
| `NODE_ENV` | `production` | Optimization |
| `N8N_ENCRYPTION_KEY` | *(Generate a random string)* | **CRITICAL**: Keeps credentials safe. Don't lose this! |
| `N8N_HOST` | `n8n.your-domain.com` | Your Cloudflare domain |
| `WEBHOOK_URL` | `https://n8n.your-domain.com/` | Must include https:// |

### Supabase Database (Postgres)
If you want to create a new database on your Supabase instance for n8n to store its **internal execution data** (replacing SQLite):
*Note: This is separate from the User Sync/Sharing which is already hardcoded in the frontend.*

| Variable | Value | Description |
| :--- | :--- | :--- |
| `DB_TYPE` | `postgresdb` | Switch to Postgres |
| `DB_POSTGRESDB_HOST` | `db.ilxfzatarzsusrhwmjlu.supabase.co` | Supabase Pooler Host |
| `DB_POSTGRESDB_PORT` | `5432` | Standard Port (or 6543 for Pooler transaction mode) |
| `DB_POSTGRESDB_DATABASE`| `postgres` | Default DB name |
| `DB_POSTGRESDB_USER` | `postgres` | Default User |
| `DB_POSTGRESDB_PASSWORD`| *(Your Supabase DB Password)* | You must provide this. |

## 4. Domain & SSL (Cloudflare)
1.  In Coolify settings for the service, set the **URL** (FQDN) to `https://n8n.your-domain.com`.
2.  In **Cloudflare**, create an `A` record (or CNAME) for `n8n` pointing to your NAS/Coolify IP.
3.  Enable **Proxy (Orange Cloud)** in Cloudflare for SSL.
