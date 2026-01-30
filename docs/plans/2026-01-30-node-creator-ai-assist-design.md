# Node Creator AI Assist Experiment

## Overview

Replace the "We didn't build that yet" empty state in the node selector sidebar with an AI-powered prompt that helps users create HTTP Request nodes for integrations that don't exist natively.

## User Flow

1. User searches for an integration (e.g., "Notion") in the node selector
2. No results found → New AI prompt UI appears (for variant users)
3. User sees prefilled prompt: `Create an HTTP request to integrate with Notion API that ...`
4. User completes the prompt describing their intent (e.g., `...fetches a database`)
5. User clicks "Build with AI"
6. Node selector closes, AI assistant panel opens with the prompt sent
7. AI assistant guides them through building the HTTP request

## Experiment Setup

### Feature Flag

- **Name:** `node_creator_ai_assist`
- **Variants:** `control` (existing behavior), `variant` (AI prompt)
- **Platform:** PostHog

### Definition

```typescript
// src/app/constants/experiments.ts
export const NODE_CREATOR_AI_ASSIST_EXPERIMENT = createExperiment('node_creator_ai_assist', {
  control: 'control',
  variant: 'variant',
});
```

## File Structure

### New Files

```
src/experiments/nodeCreatorAiAssist/
├── stores/
│   └── nodeCreatorAiAssist.store.ts
├── components/
│   └── NoResultsAiPrompt.vue
└── index.ts
```

### Modified Files

| File | Change |
|------|--------|
| `src/app/constants/experiments.ts` | Add experiment definition |
| `src/features/shared/nodeCreator/components/Modes/NodesMode.vue` | Conditional render |
| `packages/@n8n/i18n/src/locales/en.json` | Add i18n keys |

## Component Design

### NoResultsAiPrompt.vue

```
┌─────────────────────────────────────┐
│                                     │
│     Let AI build it for you         │  ← Headline
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Create an HTTP request to     │  │  ← Textarea (auto-focused)
│  │ integrate with Notion API     │  │     Prefilled with search term
│  │ that ...                      │  │     Cursor at end
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│         [ Build with AI ]           │  ← Primary button
│                                     │
│                                     │
│     Prefer an official node?        │  ← Muted footer text
│        Request it here ↗            │  ← Link to request form
│                                     │
└─────────────────────────────────────┘
```

**Props:**
- `searchTerm?: string` - The user's search query to prefill the prompt

**Emits:**
- `submitToAi: [prompt: string]` - When user clicks "Build with AI"

**Keyboard shortcuts:**
- `Cmd/Ctrl + Enter` - Submit prompt

### Prompt Template

```
Create an HTTP request to integrate with {searchTerm} API that ...
```

If no search term:
```
Create an HTTP request that ...
```

## Implementation Details

### Experiment Store

```typescript
// src/experiments/nodeCreatorAiAssist/stores/nodeCreatorAiAssist.store.ts
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { usePostHog } from '@/app/stores/posthog.store';
import { NODE_CREATOR_AI_ASSIST_EXPERIMENT } from '@/app/constants/experiments';

export const useNodeCreatorAiAssistStore = defineStore('nodeCreatorAiAssist', () => {
  const posthogStore = usePostHog();

  const isEnabled = computed(() => {
    return posthogStore.getVariant(NODE_CREATOR_AI_ASSIST_EXPERIMENT.name) ===
      NODE_CREATOR_AI_ASSIST_EXPERIMENT.variant;
  });

  return { isEnabled };
});
```

### NodesMode.vue Integration

```vue
<template #empty>
  <NoResultsAiPrompt
    v-if="nodeCreatorAiAssistStore.isEnabled"
    :search-term="activeViewStack.search"
    @submit-to-ai="onSubmitToAi"
  />
  <NoResults
    v-else
    :root-view="activeViewStack.rootView"
    show-icon
    show-request
    @add-webhook-node="emit('nodeTypeSelected', [{ type: WEBHOOK_NODE_TYPE }])"
    @add-http-node="emit('nodeTypeSelected', [{ type: HTTP_REQUEST_NODE_TYPE }])"
  />
</template>
```

### AI Assistant Integration

```typescript
async function onSubmitToAi(prompt: string) {
  const chatPanelStore = useChatPanelStore();
  const assistantStore = useAssistantStore();

  // Close the node creator
  emit('closeNodeCreator');

  // Open AI assistant and send the prompt
  await chatPanelStore.open({ mode: 'assistant' });
  await assistantStore.initSupportChat(prompt);
}
```

## i18n Keys

Add to `packages/@n8n/i18n/src/locales/en.json`:

```json
{
  "nodeCreator.noResults.aiAssist.headline": "Let AI build it for you",
  "nodeCreator.noResults.aiAssist.buildWithAi": "Build with AI",
  "nodeCreator.noResults.aiAssist.preferOfficialNode": "Prefer an official node?",
  "nodeCreator.noResults.aiAssist.requestItHere": "Request it here"
}
```

## Revert Strategy

To disable/remove the experiment:

1. Remove `src/experiments/nodeCreatorAiAssist/` folder
2. Remove `NODE_CREATOR_AI_ASSIST_EXPERIMENT` from `experiments.ts`
3. Remove conditional in `NodesMode.vue` (keep only `<NoResults>`)
4. Remove i18n keys (optional, harmless to leave)

## Metrics to Track

- Experiment participation (automatic via PostHog)
- "Build with AI" button clicks
- AI assistant conversation completion rate
- HTTP Request node creation success rate
- Time to first successful API call

## Open Questions

None - design is complete.
