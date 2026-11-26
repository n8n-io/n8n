# Issue an API key without a UI session

A deployment client can exchange the instance owner's credentials for a native n8n public API key. Do this once per key, not on each Terraform run. Only the deployment client needs the owner password. Give Terraform or the CLI the issued key from your secret manager.

1. Configure the owner before startup with `N8N_INSTANCE_OWNER_MANAGED_BY_ENV=true`, `N8N_INSTANCE_OWNER_EMAIL`, and `N8N_INSTANCE_OWNER_PASSWORD_HASH`. Set the bcrypt hash through the `_FILE` variant of the hash variable to read it from a secret file. Do not send the hash to the API.
2. Before enabling the endpoint, restrict the exchange path to your provisioning network and require HTTPS. Do not log request or response bodies. Keep database query logging off. Each main limits attempts to 20 per IP and 5 per email per minute. For a cluster, configure a shared ingress rate limit before enabling the exchange. Process-local counters do not protect the cluster as a whole.
3. Set `N8N_PUBLIC_API_OWNER_KEY_EXCHANGE_ENABLED=true` on each main. The exchange is off by default. The public API must permit API key authentication. In queue mode, use the same database and signing configuration on all mains. Workers do not issue keys. Wait for main readiness before sending the request.
4. If MFA enrollment is mandatory, complete enrollment first.

## Issue the key once

Mount the request as a private secret file at `/run/secrets/key-request.json`. Use this shape. Replace the example values. Add `mfaCode` as a six-digit string if the owner uses MFA. Do not commit the file.

```json
{
  "email": "owner@example.com",
  "password": "<owner password>",
  "label": "deployment-1",
  "scopes": ["workflow:list"],
  "expiresInDays": 30
}
```

Set `N8N_URL` to the instance's HTTPS base URL. Send the file with curl. Save the response in a new private directory so the key does not appear in the terminal or command arguments.

```bash
key_dir=$(mktemp -d)
curl --proto '=https' --fail --silent --show-error \
  --json @/run/secrets/key-request.json \
  --output "$key_dir/issued.json" \
  "$N8N_URL/api/v1/auth/api-key"
```

On success, store the `apiKey` field from `issued.json` in your secret manager. Give the consumer that key, not the request file. The response also contains `id` and `expiresAt` (Unix seconds). Select only the scopes your consumer needs. Expiry is required, from 1 to 90 days.

## Check the key (optional)

For the example scope, this should print `HTTP 200`. It sends the key through a pipe and discards the workflow list.

```bash
jq -er '"X-N8N-API-KEY: " + .apiKey' "$key_dir/issued.json" |
  curl --proto '=https' --fail --silent --show-error --header @- \
    --output /dev/null --write-out 'HTTP %{http_code}\n' "$N8N_URL/api/v1/workflows?limit=1"
```

Remove the private response file after storing the key. If the response is lost, check the owner's API keys, revoke the unused key, and issue a replacement. A retry with the same label returns a conflict, not the existing secret. Do not generate new labels on automatic retries.

Disable the exchange on every main after provisioning. This does not revoke issued keys. Before expiry, issue a replacement with a new label, update the consumer, and revoke the old key in n8n. The same exchange works from a Compose client, a Helm deployment job, or another HTTPS client. Keep the owner password and key out of Terraform state.
