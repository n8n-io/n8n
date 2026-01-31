---
name: trigger-webhook-security
description: Implements webhook signature verification for trigger nodes. Use when adding security to trigger nodes like FigmaTrigger, LinearTrigger, or any webhook-based trigger node. Handles API research, implementation, testing, and Linear ticket updates.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(linear:*), Bash(pnpm:*), Bash(curl:*), Read, Grep, Glob, Write, StrReplace, WebSearch, WebFetch
---

# Trigger Webhook Security Implementation

Adds HMAC signature verification to webhook trigger nodes for secure request validation.

## Quick Reference

| Pattern | When to Use | Example Nodes |
|---------|-------------|---------------|
| Auto-generate secret | API accepts secret during webhook creation | GitHub, Figma |
| Fetch secret from API | API provides secret after webhook creation | Zendesk |
| User-provided secret | User configures secret in credentials/settings | Slack |

## Implementation Workflow

### Step 0: Set Up from Linear Ticket

Before starting implementation, get the Linear ticket details and create a properly named branch:

1. **Get Linear ticket details** using the Linear MCP:
   ```
   CallMcpTool: server="user-Linear", toolName="get_issue"
   arguments: { "id": "NODE-XXXX" }
   ```
   The response includes `branchName` - use this for your git branch.

2. **Create branch from fresh master** with the Linear-suggested branch name:
   ```bash
   git checkout master
   git pull origin master
   git checkout -b <branchName-from-linear>
   ```

3. **Note the trigger node** mentioned in the ticket (e.g., FigmaTrigger, LinearTrigger).

4. **To comment on ticket** (for unsupported APIs or blockers):
   ```
   CallMcpTool: server="user-Linear", toolName="create_comment"
   arguments: { "issueId": "NODE-XXXX", "body": "Your markdown comment" }
   ```

### Step 1: Research the API's Webhook Signature Support

Before implementing, research the service's webhook documentation:

1. **Search for webhook signature docs** using web search:
   ```
   "[ServiceName] webhook signature verification"
   "[ServiceName] webhook security HMAC"
   "[ServiceName] API webhook signing secret"
   ```

2. **Key information to find**:
   - Signature header name (e.g., `X-Hub-Signature-256`, `X-Slack-Signature`)
   - Signature algorithm (usually HMAC-SHA256)
   - Signature format (hex, base64, with prefix like `sha256=`)
   - What data is signed (body only, timestamp+body, etc.)
   - How to get/set the secret (API endpoint, user-provided, auto-generated)

3. **Document findings** before proceeding with implementation.

### Step 2: Determine Implementation Pattern

Based on API research, choose the appropriate pattern:

#### Pattern A: Auto-generate Secret (Preferred)
Use when the API accepts a secret during webhook creation.

```typescript
// In webhookMethods.default.create():
import { randomBytes } from 'crypto';

// Generate secure random secret
const webhookSecret = randomBytes(32).toString('hex');

// Pass to API when creating webhook
const body = {
  url: webhookUrl,
  secret: webhookSecret,  // API-specific field name
  // ... other fields
};

// Store for verification
webhookData.webhookSecret = webhookSecret;
```

#### Pattern B: Fetch Secret from API
Use when the API generates and provides the secret.

```typescript
// In webhookMethods.default.create(), after webhook creation:
const signingSecretResponse = await apiRequest.call(
  this,
  'GET',
  `/webhooks/${webhookId}/signing_secret`,
);
if (signingSecretResponse.signing_secret?.secret) {
  webhookData.webhookSecret = signingSecretResponse.signing_secret.secret;
}
```

#### Pattern C: User-provided Secret
Use when secret must be configured by user (e.g., in Slack App settings).

```typescript
// In verifySignature():
const credential = await this.getCredentials('serviceApi');
if (!credential?.signingSecret) {
  return true; // Skip if not configured
}
```

### Step 3: Create Helper File

Create `{NodeName}TriggerHelpers.ts` with the verification function:

```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * Verifies the webhook signature using HMAC-SHA256.
 *
 * [Service] sends a signature in the `X-Service-Signature` header.
 * [Describe the signature format and algorithm]
 *
 * @returns true if signature is valid or no secret is configured, false otherwise
 */
export function verifySignature(this: IWebhookFunctions): boolean {
  // Get the secret from workflow static data
  const webhookData = this.getWorkflowStaticData('node');
  const webhookSecret = webhookData.webhookSecret as string | undefined;

  // Backwards compatibility: skip if no secret configured
  if (!webhookSecret) {
    return true;
  }

  const req = this.getRequestObject();
  const headerData = this.getHeaderData() as Record<string, string | undefined>;

  // Get signature from header (adjust header name per service)
  const signature = headerData['x-service-signature'];
  if (!signature) {
    return false;
  }

  try {
    if (!req.rawBody) {
      return false;
    }

    // Compute HMAC (adjust algorithm and format per service)
    const hmac = createHmac('sha256', webhookSecret);

    let rawBodyString: string;
    if (Buffer.isBuffer(req.rawBody)) {
      rawBodyString = req.rawBody.toString('utf8');
    } else {
      rawBodyString = typeof req.rawBody === 'string' 
        ? req.rawBody 
        : JSON.stringify(req.rawBody);
    }

    // Adjust signing payload per service (some include timestamp)
    hmac.update(rawBodyString);
    
    // Adjust digest format: 'hex' or 'base64'
    const computedSignature = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    const computedBuffer = Buffer.from(computedSignature, 'utf8');
    const providedBuffer = Buffer.from(signature, 'utf8');

    if (computedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, providedBuffer);
  } catch {
    return false;
  }
}
```

### Step 4: Update Trigger Node

Modify the trigger node file:

```typescript
// Add import
import { verifySignature } from './{NodeName}TriggerHelpers';

// In webhookMethods.default.create() - store secret
webhookData.webhookSecret = webhookSecret;

// In webhookMethods.default.delete() - clean up
delete webhookData.webhookSecret;

// In webhook() method - verify before processing
async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
  // Verify signature first
  if (!verifySignature.call(this)) {
    const res = this.getResponseObject();
    res.status(401).send('Unauthorized').end();
    return {
      noWebhookResponse: true,
    };
  }

  // Existing webhook logic...
}
```

### Step 5: Write Tests

Create two test files:

#### `__tests__/{NodeName}TriggerHelpers.test.ts`

```typescript
import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';
import { verifySignature } from '../{NodeName}TriggerHelpers';

describe('{NodeName}TriggerHelpers', () => {
  describe('verifySignature', () => {
    let mockWebhookFunctions: IWebhookFunctions;
    const testSecret = 'test-webhook-secret';
    const testBody = '{"event":"test"}';

    function generateValidSignature(body: string, secret: string): string {
      return createHmac('sha256', secret).update(body).digest('hex');
    }

    beforeEach(() => {
      mockWebhookFunctions = {
        getWorkflowStaticData: jest.fn().mockReturnValue({
          webhookSecret: testSecret,
        }),
        getRequestObject: jest.fn().mockReturnValue({
          rawBody: Buffer.from(testBody),
        }),
        getHeaderData: jest.fn().mockReturnValue({
          'x-service-signature': generateValidSignature(testBody, testSecret),
        }),
      } as unknown as IWebhookFunctions;
    });

    it('should return true when no secret is stored (backwards compatibility)', () => {
      (mockWebhookFunctions.getWorkflowStaticData as jest.Mock)
        .mockReturnValue({});
      expect(verifySignature.call(mockWebhookFunctions)).toBe(true);
    });

    it('should return false when signature header is missing', () => {
      (mockWebhookFunctions.getHeaderData as jest.Mock)
        .mockReturnValue({});
      expect(verifySignature.call(mockWebhookFunctions)).toBe(false);
    });

    it('should return false when rawBody is missing', () => {
      (mockWebhookFunctions.getRequestObject as jest.Mock)
        .mockReturnValue({ rawBody: undefined });
      expect(verifySignature.call(mockWebhookFunctions)).toBe(false);
    });

    it('should return true when signature is valid', () => {
      expect(verifySignature.call(mockWebhookFunctions)).toBe(true);
    });

    it('should return false when signature is invalid', () => {
      (mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
        'x-service-signature': 'invalid-signature',
      });
      expect(verifySignature.call(mockWebhookFunctions)).toBe(false);
    });

    it('should handle Buffer rawBody correctly', () => {
      expect(verifySignature.call(mockWebhookFunctions)).toBe(true);
    });

    it('should handle string rawBody correctly', () => {
      (mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
        rawBody: testBody,
      });
      expect(verifySignature.call(mockWebhookFunctions)).toBe(true);
    });
  });
});
```

#### `__tests__/{NodeName}Trigger.node.test.ts`

```typescript
import { {NodeName}Trigger } from '../{NodeName}Trigger.node';
import * as GenericFunctions from '../GenericFunctions';
import * as {NodeName}TriggerHelpers from '../{NodeName}TriggerHelpers';

describe('{NodeName}Trigger Node', () => {
  describe('webhook creation', () => {
    it('should store webhook secret after creation', async () => {
      // Test that webhookData.webhookSecret is set
    });
  });

  describe('webhook deletion', () => {
    it('should delete webhook secret on cleanup', async () => {
      // Test that webhookData.webhookSecret is deleted
    });
  });

  describe('webhook method', () => {
    it('should reject with 401 when signature verification fails', async () => {
      jest.spyOn({NodeName}TriggerHelpers, 'verifySignature')
        .mockReturnValueOnce(false);
      // Assert 401 response
    });

    it('should process webhook when signature is valid', async () => {
      jest.spyOn({NodeName}TriggerHelpers, 'verifySignature')
        .mockReturnValueOnce(true);
      // Assert normal processing
    });
  });
});
```

### Step 6: Run Tests and Validation

```bash
# Navigate to nodes-base package
pushd packages/nodes-base

# Run tests for the specific node
pnpm test {NodeName}Trigger

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

popd
```

### Step 7: Handle Unsupported APIs

If the API does not support webhook signatures:

1. **Comment on Linear ticket** using the Linear MCP:
   ```
   CallMcpTool: server="user-Linear", toolName="create_comment"
   arguments: {
     "issueId": "NODE-XXXX",
     "body": "## Webhook Signature Research\n\n**Docs reviewed:** [URL]\n\n**Finding:** The API does not support webhook signature verification.\n\n**Reason:** [No signing secret endpoint / No signature headers / etc.]\n\n**Recommendation:** [Alternative security measures if any]"
   }
   ```

2. **Do not implement** partial or insecure solutions.

## Common Signature Formats

| Service | Header | Format | Algorithm | Payload |
|---------|--------|--------|-----------|---------|
| GitHub | `X-Hub-Signature-256` | `sha256={hex}` | HMAC-SHA256 | body |
| Zendesk | `X-Zendesk-Webhook-Signature` | base64 | HMAC-SHA256 | timestamp+body |
| Slack | `X-Slack-Signature` | `v0={hex}` | HMAC-SHA256 | `v0:timestamp:body` |
| Stripe | `Stripe-Signature` | `t=timestamp,v1={hex}` | HMAC-SHA256 | `timestamp.body` |

## Checklist

Before creating PR:

- [ ] Researched official webhook security documentation
- [ ] Implemented `verifySignature()` in `{NodeName}TriggerHelpers.ts`
- [ ] Updated `webhookMethods.default.create()` to store secret
- [ ] Updated `webhookMethods.default.delete()` to clean up secret
- [ ] Added signature verification in `webhook()` method
- [ ] Backwards compatible (skips verification if no secret)
- [ ] Tests for helper functions (valid/invalid signatures, edge cases)
- [ ] Tests for node (401 rejection, successful processing)
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] All tests pass
- [ ] If API unsupported: commented on Linear ticket

## Reference Implementations

Study these existing implementations in the codebase:

| Pattern | Node | Files |
|---------|------|-------|
| Auto-generate secret | GitHub | `nodes/Github/GithubTrigger.node.ts`, `nodes/Github/GithubTriggerHelpers.ts` |
| Fetch from API | Zendesk | `nodes/Zendesk/ZendeskTrigger.node.ts`, `nodes/Zendesk/ZendeskTriggerHelpers.ts` |
| User-provided | Slack | `nodes/Slack/SlackTrigger.node.ts`, `nodes/Slack/SlackTriggerHelpers.ts` |

Test examples:
- `nodes/Github/__tests__/GithubTriggerHelpers.test.ts`
- `nodes/Zendesk/__tests__/ZendeskTriggerHelpers.test.ts`

All paths relative to `packages/nodes-base/`.

## Creating the PR

Use the `create-pr` skill with:
- Type: `feat`
- Scope: `{NodeName} Trigger Node`
- Summary: `Add webhook signature verification`

Example: `feat(Linear Trigger Node): Add webhook signature verification`
