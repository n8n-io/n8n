---
title: render (Removed)
description: Reference for the render function from the AI SDK RSC
---

# `render` (Removed)

<Note type="warning">"render" has been removed in AI SDK 4.0.</Note>

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

A helper function to create a streamable UI from LLM providers. This function is similar to AI SDK Core APIs and supports the same model interfaces.

> **Note**: `render` has been deprecated in favor of [`streamUI`](/docs/reference/ai-sdk-rsc/stream-ui). During migration, please ensure that the `messages` parameter follows the updated [specification](/docs/reference/ai-sdk-rsc/stream-ui#messages).

## Import (No longer available)

The following import will no longer work since `render` has been removed:

<Snippet text={`import { render } from "@ai-sdk/rsc"`} prompt={false} />

Use [`streamUI`](/docs/reference/ai-sdk-rsc/stream-ui) instead.

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'model',
      type: 'string',
      description: 'Model identifier, must be OpenAI SDK compatible.',
    },
    {
      name: 'provider',
      type: 'provider client',
      description:
        'Currently the only provider available is OpenAI. This needs to match the model name.',
    },
    {
      name: 'initial',
      isOptional: true,
      type: 'ReactNode',
      description: 'The initial UI to render.',
    },
    {
      name: 'messages',
      type: 'Array<SystemMessage | UserMessage | AssistantMessage | ToolMessage>',
      description: 'A list of messages that represent a conversation.',
      properties: [
        {
          type: 'SystemMessage',
          parameters: [
            {
              name: 'role',
              type: "'system'",
              description: 'The role for the system message.',
            },
            {
              name: 'content',
              type: 'string',
              description: 'The content of the message.',
            },
          ],
        },
        {
          type: 'UserMessage',
          parameters: [
            {
              name: 'role',
              type: "'user'",
              description: 'The role for the user message.',
            },
            {
              name: 'content',
              type: 'string',
              description: 'The content of the message.',
            },
          ],
        },
        {
          type: 'AssistantMessage',
          parameters: [
            {
              name: 'role',
              type: "'assistant'",
              description: 'The role for the assistant message.',
            },
            {
              name: 'content',
              type: 'string',
              description: 'The content of the message.',
            },
            {
              name: 'tool_calls',
              type: 'ToolCall[]',
              description: 'A list of tool calls made by the model.',
              properties: [
                {
                  type: 'ToolCall',
                  parameters: [
                    {
                      name: 'id',
                      type: 'string',
                      description: 'The id of the tool call.',
                    },
                    {
                      name: 'type',
                      type: "'function'",
                      description: 'The type of the tool call.',
                    },
                    {
                      name: 'function',
                      type: 'Function',
                      description: 'The function to call.',
                      properties: [
                        {
                          type: 'Function',
                          parameters: [
                            {
                              name: 'name',
                              type: 'string',
                              description: 'The name of the function.',
                            },
                            {
                              name: 'arguments',
                              type: 'string',
                              description: 'The arguments of the function.',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'ToolMessage',
          parameters: [
            {
              name: 'role',
              type: "'tool'",
              description: 'The role for the tool message.',
            },
            {
              name: 'content',
              type: 'string',
              description: 'The content of the message.',
            },
            {
              name: 'toolCallId',
              type: 'string',
              description: 'The id of the tool call.',
            },
          ],
        },
      ],
    },
    {
      name: 'functions',
      type: 'ToolSet',
      isOptional: true,
      description:
        'Tools that are accessible to and can be called by the model.',
      properties: [
        {
          type: 'Tool',
          parameters: [
            {
              name: 'description',
              isOptional: true,
              type: 'string',
              description:
                'Information about the purpose of the tool including details on how and when it can be used by the model.',
            },
            {
              name: 'parameters',
              type: 'zod schema',
              description:
                'The typed schema that describes the parameters of the tool that can also be used to validation and error handling.',
            },
            {
              name: 'render',
              isOptional: true,
              type: 'async (parameters) => any',
              description:
                'An async function that is called with the arguments from the tool call and produces a result.',
            },
          ],
        },
      ],
    },
    {
      name: 'tools',
      type: 'ToolSet',
      isOptional: true,
      description:
        'Tools that are accessible to and can be called by the model.',
      properties: [
        {
          type: 'Tool',
          parameters: [
            {
              name: 'description',
              isOptional: true,
              type: 'string',
              description:
                'Information about the purpose of the tool including details on how and when it can be used by the model.',
            },
            {
              name: 'parameters',
              type: 'zod schema',
              description:
                'The typed schema that describes the parameters of the tool that can also be used to validation and error handling.',
            },
            {
              name: 'render',
              isOptional: true,
              type: 'async (parameters) => any',
              description:
                'An async function that is called with the arguments from the tool call and produces a result.',
            },
          ],
        },
      ],
    },
    {
      name: 'text',
      isOptional: true,
      type: '(Text) => ReactNode',
      description: 'Callback to handle the generated tokens from the model.',
      properties: [
        {
          type: 'Text',
          parameters: [
            {
              name: 'content',
              type: 'string',
              description: 'The full content of the completion.',
            },
            { name: 'delta', type: 'string', description: 'The delta.' },
            { name: 'done', type: 'boolean', description: 'Is it done?' },
          ],
        },
      ],
    },
    {
      name: 'temperature',
      isOptional: true,
      type: 'number',
      description: 'The temperature to use for the model.',
    },
  ]}
/>

### Returns

It can return any valid ReactNode.
