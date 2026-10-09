# Workflow portal POC

This opt-in module serves a static workflow list through n8n's existing HTTP listener and controller registry.
It uses n8n OAuth sign-in and the existing workflow permission checks.
The public app hostname selects the portal routes.

## Build

Run the repository build after changing the module or its translations:

```sh
pnpm build > build.log 2>&1
```

The CLI build copies the static app and its English i18n messages into `dist/modules/workflow-portal/assets`.
During backend development, run `pnpm --filter n8n build:data` after changing the static files.

## Configure

Set these variables before starting n8n:

```dotenv
N8N_ENABLED_MODULES=workflow-portal
N8N_EDITOR_BASE_URL=https://n8n.example.com
N8N_WORKFLOW_PORTAL_BASE_URL=https://workflows.example.org
```

Keep `oauth-server` enabled. The app URL must use a different hostname from the n8n URL.

Route both hostnames to the same n8n upstream. Preserve the public `Host` header.
The following Nginx server blocks show the routing inside an existing TLS configuration:

```nginx
server {
    listen 443 ssl;
    server_name n8n.example.com;
    # Add the TLS certificate directives for this hostname.
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name workflows.example.org;
    # Add the TLS certificate directives for this hostname.
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For a direct local check, use `http://localhost:5678` as the n8n URL and
`http://app.localhost:5678` as the app URL. Set `N8N_SECURE_COOKIE=false` for local HTTP sign-in.
Map `app.localhost` to `127.0.0.1` if the local resolver does not resolve it.

## Try it

Open the app URL. The browser uses n8n sign-in and returns to the app automatically.
The portal's own first-party OAuth client skips the consent prompt, including on the first visit.
The app lists workflows that the user can read, including shared project workflows.

The app endpoint is:

```http
GET /workflow-portal/workflows?skip=0&take=50
```

The response contains `count` and `data`. Each item contains `id`, `name`, `published`, and `updatedAt`.
The page size defaults to 50. The endpoint accepts page sizes from 1 to 250.

HTML, static assets, and the workflow endpoint require an app session.
Only `/workflow-portal/login` and `/workflow-portal/callback` start without a session.
The app hostname returns 404 for n8n API, webhook, and other unknown paths.
The regular n8n hostname returns 404 for `/workflow-portal` paths.
An early path allowlist enforces this boundary before health checks, webhooks, and other n8n routes.
App-host WebSocket upgrades are rejected.

## Implementation

The module imports `WorkflowPortalController` at startup.
The controller serves HTML, the workflow endpoint, and the OAuth routes.
One `/workflow-portal/assets/:fileName` handler serves files from the module's asset directory.
Its middleware selects the app hostname and authenticates protected requests with the portal cookie.
`WorkflowPortalService` uses `OAuth2FlowProxy`, `OAuthTokenVerifierProxy`, and `WorkflowService`.
The route constants define the early allowlist, the asset prefix, and the controller paths.

This POC uses an app-only, host-only OAuth cookie. The session ends when its access token expires.
Open the app again to reuse n8n sign-in. The POC does not refresh tokens or synchronize n8n sign-out.
