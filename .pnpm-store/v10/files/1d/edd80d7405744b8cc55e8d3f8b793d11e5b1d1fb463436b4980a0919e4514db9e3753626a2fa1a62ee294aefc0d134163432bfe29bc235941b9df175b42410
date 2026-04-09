---
title: defaultSettingsMiddleware
description: Middleware that applies default settings for language models
---

# `defaultSettingsMiddleware()`

`defaultSettingsMiddleware` is a middleware function that applies default settings to language model calls. This is useful when you want to establish consistent default parameters across multiple model invocations.

```ts
import { defaultSettingsMiddleware } from 'ai';

const middleware = defaultSettingsMiddleware({
  settings: {
    temperature: 0.7,
    maxOutputTokens: 1000,
    // other settings...
  },
});
```

## Import

<Snippet
  text={`import { defaultSettingsMiddleware } from "ai"`}
  prompt={false}
/>

## API Signature

### Parameters

The middleware accepts a configuration object with the following properties:

- `settings`: An object containing default parameter values to apply to language model calls. These can include any valid `LanguageModelV3CallOptions` properties and optional provider metadata.

### Returns

Returns a middleware object that:

- Merges the default settings with the parameters provided in each model call
- Ensures that explicitly provided parameters take precedence over defaults
- Merges provider metadata objects

### Usage Example

```ts
import { streamText, wrapLanguageModel, defaultSettingsMiddleware } from 'ai';

// Create a model with default settings
const modelWithDefaults = wrapLanguageModel({
  model: gateway('anthropic/claude-sonnet-4.5'),
  middleware: defaultSettingsMiddleware({
    settings: {
      providerOptions: {
        openai: {
          reasoningEffort: 'high',
        },
      },
    },
  }),
});

// Use the model - default settings will be applied
const result = await streamText({
  model: modelWithDefaults,
  prompt: 'Your prompt here',
  // These parameters will override the defaults
  temperature: 0.8,
});
```

## How It Works

The middleware:

1. Takes a set of default settings as configuration
2. Merges these defaults with the parameters provided in each model call
3. Ensures that explicitly provided parameters take precedence over defaults
4. Merges provider metadata objects from both sources
