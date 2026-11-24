# Claude Platform on AWS

**Anthropic-operated** access to the Claude Developer Platform through AWS infrastructure - SigV4 authentication, AWS IAM access control, and AWS Marketplace billing. Because Anthropic operates it, **the API surface matches first-party with same-day parity** - for per-feature exceptions, see `shared/platform-availability.md` (the single source of truth; do not rely on an inline exception list here). Model IDs are the bare first-party strings (`claude-opus-5-5`, `claude-sonnet-5-5`) - **no provider prefix**.

> **Not the same as Amazon Bedrock.** Bedrock is partner-operated (AWS runs the service; release schedules vary, feature subset, `anthropic.`-prefixed model IDs). Claude Platform on AWS and Bedrock coexist; pick by whether you need AWS-native IAM/billing with full Anthropic API parity (this page) vs. Bedrock's own ecosystem.

---

## Client & install

| Language | Install | Client |
|---|---|---|
| Python | `pip install -U "anthropic[aws]"` | `from anthropic import AnthropicAWS` -> `AnthropicAWS()` |
| TypeScript | `npm install @anthropic-ai/aws-sdk` | `import AnthropicAws from "@anthropic-ai/aws-sdk"` -> `new AnthropicAws()` |
| Go | `go get github.com/anthropics/anthropic-sdk-go` | `import anthropicaws "github.com/anthropics/anthropic-sdk-go/aws"` -> `anthropicaws.NewClient(ctx, anthropicaws.ClientConfig{})` |
| C# | `dotnet add package Anthropic.Aws` | `new AnthropicAwsClient()` |
| Java | See SDK repo in `shared/live-sources.md` | See SDK repo in `shared/live-sources.md` |
| Ruby | `gem install anthropic aws-sdk-core` | See SDK repo in `shared/live-sources.md` |
| PHP | `composer require anthropic-ai/sdk aws/aws-sdk-php` | See SDK repo in `shared/live-sources.md` |

After construction, **use the client exactly as you would `Anthropic()`** - `client.messages.create(...)`, `client.beta.sessions.*`, etc., with bare model IDs.

```python
from anthropic import AnthropicAWS

client = AnthropicAWS()  # region + workspace_id from env; see below
client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
```

---

## Required configuration

Two values must be available (constructor args or environment) - **there is no default fallback** for either:

| Value | Env var | Notes |
|---|---|---|
| AWS region | `AWS_REGION` | Required. Unlike `AnthropicBedrock`, there is no `us-east-1` fallback. |
| Workspace ID | `ANTHROPIC_AWS_WORKSPACE_ID` | Required. Routes requests to your Claude workspace. |

Endpoint pattern: `https://aws-external-anthropic.{region}.api.aws/v1/...`. Requests are SigV4-signed with service name `aws-external-anthropic`.

## Authentication

The client resolves AWS credentials via the standard precedence chain: explicit constructor args -> environment (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN`) -> shared profile -> assumed role / instance metadata.

**Short-term API keys** are also supported for cases where SigV4 isn't practical (e.g., browser, simple scripts). Mint one with the per-language token-generator package; pass it as `api_key` on the client. Lifetime is the **lesser of** the requested duration, the underlying credential's expiry, and **12 hours**. For package names and IAM details, WebFetch the Claude Platform on AWS page in `shared/live-sources.md`.

---

## What to tell users

- Treat it as first-party: every section of this skill applies unchanged. Do **not** apply Bedrock's feature-availability mask. Three Managed Agents differences only: (1) a session can run autonomously (no user events) for at most **6 hours** before it needs reauthentication - send any user-role event to continue; (2) sessions on **self-hosted** environments **cannot attach memory stores** (rejected at session create) - cloud environments attach them as usual; (3) self-hosted workers authenticate with IAM/SigV4 or an AWS-Console API key plus the `AnthropicSelfHostedEnvironmentAccess` managed policy - Console-generated environment keys don't work against the AWS endpoint.
- Model IDs are bare (`claude-opus-5-5`). Do **not** add an `anthropic.` prefix.
- A missing region or `workspace_id` throws at client-construction time (no request is sent). A **403** means the request reached the server - check for a **wrong** `workspace_id` or a missing IAM action on the principal. See the IAM actions reference in `shared/live-sources.md`.
