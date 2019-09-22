# Server Setup

!> ***Important***: Make sure that you secure your n8n instance like described under [Security](security.md)!

To run n8n on your webserver with own domain some environment variables
should be set to the appropriate values.

A possible configuration to run n8n on `https://n8n.example.com/` would look
like this:

```bash
export N8N_HOST="n8n.example.com"
export N8N_PROTOCOL=https
export N8N_PORT=443
export VUE_APP_URL_BASE_API="https://n8n.example.com/"
```
