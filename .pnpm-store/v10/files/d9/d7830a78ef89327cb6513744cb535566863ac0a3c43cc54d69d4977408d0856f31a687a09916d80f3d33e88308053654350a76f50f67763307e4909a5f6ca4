/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { z } from 'zod'
import { activityZodSchema, AdaptiveCardInvokeAction, adaptiveCardInvokeActionZodSchema } from '@microsoft/agents-activity'
// import { MessagingExtensionQuery, messagingExtensionQueryZodSchema } from '../messageExtension/messagingExtensionQuery'
import { adaptiveCardsSearchParamsZodSchema } from './adaptiveCardsSearchParams'

/**
 * Parses the given value as a value action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value action.
 */
export function parseValueAction (value: unknown): string {
  const valueActionZodSchema = z.object({
    action: z.string().min(1)
  })
  valueActionZodSchema.passthrough().parse(value)
  return value as string
}

/**
 * Parses the given value as a value action name.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value action name.
 */
export function parseValueActionName (value: unknown): string {
  const valueActionNameZodSchema = z.object({
    actionName: z.string().min(1),
  })
  valueActionNameZodSchema.passthrough().parse(value)
  return value as string
}

/**
 * Parses the given value as a value continuation.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value continuation.
 */
export function parseValueContinuation (value: unknown): string {
  const valueContinuationZodSchema = z.object({
    continuation: z.string().min(1)
  })
  valueContinuationZodSchema.passthrough().parse(value)
  return value as string
}

export interface ValueAction {
  action: {
    type: string;
    verb: string;
  }
}

/**
 * Parses the given value as a value action execute selector.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed value action execute selector.
 */
export function parseValueActionExecuteSelector (value: unknown): ValueAction | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  const actionZodSchema = z.object({
    type: z.string().min(1),
    verb: z.string().min(1)
  })
  const actionValueExecuteSelector = z.object({
    action: actionZodSchema
  })
  const safeParsedValue = actionValueExecuteSelector.passthrough().safeParse(value)
  if (!safeParsedValue.success) {
    throw new Error(`Invalid action value: ${safeParsedValue.error}`)
  }
  const parsedValue = safeParsedValue.data
  return {
    action: {
      type: parsedValue.action.type,
      verb: parsedValue.action.verb
    }
  }
}

/**
 * Parses the given value as a dataset.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed dataset.
 */
export function parseValueDataset (value: unknown): {
  dataset: string;
} | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  const datasetZodSchema = z.object({
    dataset: z.string().min(1)
  })
  const parsedValue = datasetZodSchema.passthrough().parse(value)
  return {
    dataset: parsedValue.dataset
  }
}

/**
 * Parses the given value as action feedback loop data.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed action feedback loop data.
 */
export function parseValueActionFeedbackLoopData (value: unknown): {
  actionValue: {
    reaction: 'like' | 'dislike';
    feedback: string | Record<string, any>;
  }
} {
  const feedbackLoopDataActionValueZodSchema = z.object({
    actionValue: z.object({
      reaction: z.union([z.literal('like'), z.literal('dislike')]),
      feedback: z.union([z.string().min(1), z.record(z.string(), z.any())])
    })
  })
  const parsedValue = feedbackLoopDataActionValueZodSchema.passthrough().parse(value)
  return {
    actionValue: {
      reaction: parsedValue.actionValue.reaction,
      feedback: parsedValue.actionValue.feedback
    }
  }
}

/**
 * Parses the given value as an adaptive card invoke action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {AdaptiveCardInvokeAction} - The parsed adaptive card invoke action.
 */
export function parseAdaptiveCardInvokeAction (value: unknown): AdaptiveCardInvokeAction {
  adaptiveCardInvokeActionZodSchema.passthrough().parse(value)
  return value as AdaptiveCardInvokeAction
}

/**
 * Parses the given value as a search query.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed search query.
 */
export function parseValueSearchQuery (value: unknown): {
  queryOptions: {
    top: number;
    skip: number;
  };
  queryText: string;
  dataset: string;
} {
  const queryOptionsZodSchema = z.object({
    top: z.number(),
    skip: z.number(),
  })
  const searchValueZodSchema = adaptiveCardsSearchParamsZodSchema.extend({
    queryOptions: queryOptionsZodSchema
  })
  const validSearchValue = searchValueZodSchema.passthrough().parse(value)
  return {
    queryOptions: {
      top: validSearchValue.queryOptions.top,
      skip: validSearchValue.queryOptions.skip
    },
    queryText: validSearchValue.queryText,
    dataset: validSearchValue.dataset
  }
}

/**
 * Parses the given value as a query.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed query.
 */
export function parseValueQuery (value: unknown): {
  url: string;
} {
  const urlZodSchema = z.object({
    url: z.string().min(1)
  })
  const parsedValue = urlZodSchema.passthrough().parse(value)
  return {
    url: parsedValue.url
  }
}

/**
 * Parses the given value as an activity message preview action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed message preview action.
 */
export function parseValueAgentMessagePreviewAction (value: unknown): {
  botMessagePreviewAction: string;
} {
  const botMessagePreviewActionZodSchema = z.object({
    botMessagePreviewAction: z.string().min(1)
  })
  const parsedValue = botMessagePreviewActionZodSchema.passthrough().parse(value)
  return {
    botMessagePreviewAction: parsedValue.botMessagePreviewAction
  }
}

/**
 * Parses the given value as an activity preview.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed activity preview.
 */
export function parseValueAgentActivityPreview (value: unknown): object {
  const botActivityPreviewZodSchema = z.object({
    botActivityPreview: z.array(activityZodSchema.partial())
  })
  const parsedValue = botActivityPreviewZodSchema.passthrough().parse(value)
  return {
    botActivityPreview: parsedValue.botActivityPreview
  }
}

/**
 * Parses the given value as a command ID.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed command ID.
 */
export function parseValueCommandId (value: unknown): {
  commandId: string;
} {
  const commandIdZodSchema = z.object({
    commandId: z.string().min(1)
  })
  const parsedValue = commandIdZodSchema.passthrough().parse(value)
  return {
    commandId: parsedValue.commandId
  }
}
