# Component specification

A readonly input with an attached copy button, rendered as one continuous bordered field. Shows a value the user needs to take somewhere else — an API key, a webhook or redirect URL, a public key — and copies the complete value on click or Cmd/Ctrl+C, even when the visible text is truncated.

- **Component Name:** N8nCopyInput
- **Figma Component:** N/A (composed from Input and Button)
- **Element+ Component:** N/A
- **Reka UI Component:** N/A
- **Nuxt UI Component:** N/A

## Why?

Copy-to-clipboard fields exist in several places in the app (OAuth redirect URLs, webhook test URLs, SSH public keys, SAML metadata, MCP access tokens, API keys), each with its own markup, copy handling and feedback. This primitive gives them one field: a single-line readonly `N8nInput` whose value is monospaced and truncates with an ellipsis, a copy button that morphs into a check mark, clipboard handling that reports failure instead of a false success, and the pop-out-window awareness the app's `useClipboard` already has. Multi-line snippets are out of scope; use `N8nCodeBlock` for those.

## Public API Definition

**Props**

- `value: string` - Full value written to the clipboard.
- `label: string` - Accessible name of the field, rendered as `aria-label`. Pair it with a visible `N8nInputLabel` at the call site (see examples).
- `displayValue?: string` - Optional display override, e.g. a middle-truncated secret. The button and Cmd/Ctrl+C both copy the complete `value`.
- `size?: InputSize` - Size of the field, shared by the input and the copy button. Values: `'xlarge' | 'large' | 'medium' | 'small' | 'mini'`. Default: `'large'`
- `disabled?: boolean` - Disables the input and the copy button, suppresses the tooltip and fades the whole field once. Default: `false`
- `loading?: boolean` - Shows a skeleton in place of the value, marks the input `aria-busy` and disables copying. `#actions` stay visible. Default: `false`
- `allowCopy?: boolean` - When `false`, hides the copy button; the field stays enabled and Cmd/Ctrl+C copies the visible text only. Default: `true`
- `redact?: boolean` - Adds `ph-no-capture` to the root so the value is excluded from session recordings. Default: `false`
- `copyLabel?: string` - Tooltip and accessible label of the copy button in its resting state. Default: `generic.copy` from the design-system locale.
- `copiedLabel?: string` - Tooltip and accessible label while the copied feedback shows. Default: `generic.copiedToClipboard` from the design-system locale.
- `feedbackDurationMs?: number` - How long the check-mark feedback lingers. Default: `2000`

**Events**

- `copy` - Emitted after the value has been written to the clipboard (button or Cmd/Ctrl+C). Payload: `[value: string]`
- `error` - Emitted when the clipboard rejected the write; no copied feedback is shown. Payload: `[error: Error]`

**Slots**

- `actions` - Extra controls rendered inside the field, before the copy button (e.g. a rotate-key button). Pass `N8nButton` with `icon-only` and the same `size`.

**Behaviour**

- Clicking or focusing the field selects the whole value.
- Hovering anywhere on the field, button included, uses the input hover border; focusing the input draws the standard focus ring around the whole field.
- Copying targets the window the field is rendered in: `PopOutWindowKey` (from `@n8n/composables/injectionKeys`) is injected so a field inside the popped-out NDV writes to that window's clipboard.
- Clipboard writes fall back to `document.execCommand('copy')` on insecure origins; if both are refused, `error` is emitted instead of showing the check mark.

### Template usage examples

**Truncated secret that copies in full:**
```vue
<script setup lang="ts">
import { N8nCopyInput } from '@n8n/design-system'

const apiKey = 'n8n_api_3f9d2c1b8a7e6f5d4c3b2a1908f7e6d5c4b3a291'
const apiKeyDisplay = `${apiKey.slice(0, 16)}...${apiKey.slice(-12)}`
</script>

<template>
  <N8nCopyInput
    label="API key"
    :value="apiKey"
    :display-value="apiKeyDisplay"
    redact
    @copy="onCopied"
  />
</template>
```

**With a visible label and hint (compose at the call site):**
```vue
<script setup lang="ts">
import { N8nCopyInput, N8nInputLabel, N8nText } from '@n8n/design-system'
</script>

<template>
  <N8nInputLabel label="OAuth Redirect URL" input-name="oauth-redirect-url" :bold="false" size="small">
    <N8nCopyInput
      id="oauth-redirect-url"
      label="OAuth Redirect URL"
      value="https://example.n8n.cloud/rest/oauth2-credential/callback"
      size="medium"
      redact
    />
  </N8nInputLabel>
  <N8nText size="small" color="text-light">
    Add this URL to the list of authorised redirect URIs.
  </N8nText>
</template>
```

**Loading value with an extra action:**
```vue
<script setup lang="ts">
import { N8nButton, N8nCopyInput, N8nIcon } from '@n8n/design-system'
</script>

<template>
  <N8nCopyInput label="Access token" :value="token" :display-value="tokenDisplay" :loading="isLoading">
    <template #actions>
      <N8nButton variant="ghost" icon-only size="large" aria-label="Rotate token" @click="rotate">
        <template #icon>
          <N8nIcon icon="refresh-cw" size="medium" />
        </template>
      </N8nButton>
    </template>
  </N8nCopyInput>
</template>
```

**Read-only display without the copy affordance:**
```vue
<template>
  <N8nCopyInput label="Entity ID" :value="entityId" :allow-copy="false" />
</template>
```
