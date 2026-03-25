/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Activity, ActivityTypes } from '@microsoft/agents-activity'
import { AdaptiveCardInvokeResponse, AgentApplication, CardFactory, INVOKE_RESPONSE_KEY, InvokeResponse, MessageFactory, RouteSelector, TurnContext, TurnState } from '../../'
import { AdaptiveCardActionExecuteResponseType } from './adaptiveCardActionExecuteResponseType'
import { parseAdaptiveCardInvokeAction, parseValueActionExecuteSelector, parseValueDataset, parseValueSearchQuery } from './activityValueParsers'
import { AdaptiveCardsSearchParams } from './adaptiveCardsSearchParams'
import { AdaptiveCard } from '../../cards/adaptiveCard'
import { Query } from './query'

export const ACTION_INVOKE_NAME = 'adaptiveCard/action'
const ACTION_EXECUTE_TYPE = 'Action.Execute'
const DEFAULT_ACTION_SUBMIT_FILTER = 'verb'
const SEARCH_INVOKE_NAME = 'application/search'

enum AdaptiveCardInvokeResponseType {
  /**
   * Indicates a response containing an Adaptive Card.
   */
  ADAPTIVE = 'application/vnd.microsoft.card.adaptive',

  /**
   * Indicates a response containing a message activity.
   */
  MESSAGE = 'application/vnd.microsoft.activity.message',

  /**
   * Indicates a response containing a search result.
   */
  SEARCH = 'application/vnd.microsoft.search.searchResponse'
}

/**
 * Represents a single search result item returned from an Adaptive Card search operation.
 *
 * @remarks
 * This interface defines the structure for search results that are displayed to users
 * when they perform searches within Adaptive Cards, such as typeahead or dropdown searches.
 *
 * @example
 * ```typescript
 * const searchResult: AdaptiveCardSearchResult = {
 *   title: "John Doe",
 *   value: "john.doe@company.com"
 * };
 * ```
 *
 */
export interface AdaptiveCardSearchResult {
  /**
   * The display text shown to the user in the search results.
   *
   * @remarks
   * This is typically the human-readable label that appears in dropdowns,
   * typeahead suggestions, or search result lists.
   *
   * @example "John Doe" or "Microsoft Teams - General Channel"
   */
  title: string;

  /**
   * The underlying value associated with this search result.
   *
   * @remarks
   * This is usually the actual data value that gets selected when the user
   * chooses this result, such as an ID, email address, or other identifier.
   *
   * @example "john.doe@company.com" or "channel-id-12345"
   */
  value: string;
}

/**
 * A class to handle Adaptive Card actions such as executing actions, submitting actions, and performing searches.
 *
 * @typeParam TState - The type of the TurnState used in the application.
 */
export class AdaptiveCardsActions<TState extends TurnState> {
  /**
   * The Teams application instance associated with this class.
   */
  private readonly _app: AgentApplication<TState>

  /**
   * Constructs an instance of AdaptiveCardsActions.
   * @param app - The Teams application instance.
   */
  public constructor (app: AgentApplication<TState>) {
    this._app = app
  }

  /**
   * Registers a handler for the `Action.Execute` event.
   *
   * @typeParam TData - The type of the data passed to the handler.
   * @param verb - A string, RegExp, RouteSelector, or an array of these to match the action verb.
   * @param handler - A function to handle the action execution.
   * @returns The Teams application instance.
   */
  public actionExecute<TData = Record<string, any>>(
    verb: string | RegExp | RouteSelector | (string | RegExp | RouteSelector)[],
    handler: (context: TurnContext, state: TState, data: TData) => Promise<AdaptiveCard | string>
  ): AgentApplication<TState> {
    let actionExecuteResponseType = this._app.options.adaptiveCardsOptions?.actionExecuteResponseType ?? AdaptiveCardActionExecuteResponseType.REPLACE_FOR_INTERACTOR;
    (Array.isArray(verb) ? verb : [verb]).forEach((v) => {
      const selector = createActionExecuteSelector(v)
      this._app.addRoute(
        selector,
        async (context, state) => {
          const a = context?.activity
          const invokeAction = parseValueActionExecuteSelector(a.value)
          if (
            a?.type !== ActivityTypes.Invoke ||
                        a?.name !== ACTION_INVOKE_NAME ||
                        (invokeAction?.action.type !== ACTION_EXECUTE_TYPE)
          ) {
            throw new Error(`Unexpected AdaptiveCards.actionExecute() triggered for activity type: ${invokeAction?.action.type}`
            )
          }

          if (invokeAction.action.verb !== v) {
            // TODO: add logger to this class
            console.log(`AdaptiveCards.actionExecute() triggered for verb: ${invokeAction.action.verb} does not match expected verb: ${v}`)
          }

          // TODO: review any, and check verb
          const result = await handler(context, state, ((a.value as any).action as TData) ?? {} as TData)
          if (!context.turnState.get(INVOKE_RESPONSE_KEY)) {
            let response: AdaptiveCardInvokeResponse
            if (typeof result === 'string') {
              response = {
                statusCode: 200,
                type: AdaptiveCardInvokeResponseType.MESSAGE,
                value: result as any
              }
              await sendInvokeResponse(context, response)
            } else {
              if (
                result.refresh &&
                                actionExecuteResponseType !== AdaptiveCardActionExecuteResponseType.NEW_MESSAGE_FOR_ALL
              ) {
                actionExecuteResponseType = AdaptiveCardActionExecuteResponseType.REPLACE_FOR_ALL
              }

              const activity = MessageFactory.attachment(CardFactory.adaptiveCard(result))
              response = {
                statusCode: 200,
                type: AdaptiveCardInvokeResponseType.ADAPTIVE,
                value: result
              }
              if (
                actionExecuteResponseType === AdaptiveCardActionExecuteResponseType.NEW_MESSAGE_FOR_ALL
              ) {
                await sendInvokeResponse(context, {
                  statusCode: 200,
                  type: AdaptiveCardInvokeResponseType.MESSAGE,
                  value: 'Your response was sent to the app' as any
                })
                await context.sendActivity(activity)
              } else if (
                actionExecuteResponseType === AdaptiveCardActionExecuteResponseType.REPLACE_FOR_ALL
              ) {
                activity.id = context.activity.replyToId
                await context.updateActivity(activity)
                await sendInvokeResponse(context, response)
              } else {
                await sendInvokeResponse(context, response)
              }
            }
          }
        },
        true
      )
    })
    return this._app
  }

  /**
   * Registers a handler for the Action.Submit event.
   *
   * @typeParam TData - The type of the data passed to the handler.
   * @param verb - A string, RegExp, RouteSelector, or an array of these to match the action verb.
   * @param handler - A function to handle the action submission.
   * @returns The Teams application instance.
   */
  public actionSubmit<TData = Record<string, any>>(
    verb: string | RegExp | RouteSelector | (string | RegExp | RouteSelector)[],
    handler: (context: TurnContext, state: TState, data: TData) => Promise<void>
  ): AgentApplication<TState> {
    const filter = this._app.options.adaptiveCardsOptions?.actionSubmitFilter ?? DEFAULT_ACTION_SUBMIT_FILTER;
    (Array.isArray(verb) ? verb : [verb]).forEach((v) => {
      const selector = createActionSubmitSelector(v, filter)
      this._app.addRoute(selector, async (context, state) => {
        const a = context?.activity
        if (a?.type !== ActivityTypes.Message || a?.text || typeof a?.value !== 'object') {
          throw new Error(`Unexpected AdaptiveCards.actionSubmit() triggered for activity type: ${a?.type}`)
        }

        await handler(context, state as TState, (parseAdaptiveCardInvokeAction(a.value)) as TData ?? {} as TData)
      })
    })
    return this._app
  }

  /**
   * Registers a handler for the search event.
   *
   * @param dataset - A string, RegExp, RouteSelector, or an array of these to match the dataset.
   * @param handler - A function to handle the search query.
   * @returns The Teams application instance.
   */
  public search (
    dataset: string | RegExp | RouteSelector | (string | RegExp | RouteSelector)[],
    handler: (
      context: TurnContext,
      state: TState,
      query: Query<AdaptiveCardsSearchParams>
    ) => Promise<AdaptiveCardSearchResult[]>
  ): AgentApplication<TState> {
    (Array.isArray(dataset) ? dataset : [dataset]).forEach((ds) => {
      const selector = createSearchSelector(ds)
      this._app.addRoute(
        selector,
        async (context, state) => {
          const a = context?.activity
          if (a?.type !== 'invoke' || a?.name !== SEARCH_INVOKE_NAME) {
            throw new Error(`Unexpected AdaptiveCards.search() triggered for activity type: ${a?.type}`)
          }

          const parsedQuery = parseValueSearchQuery(a.value)
          const query: Query<AdaptiveCardsSearchParams> = {
            count: parsedQuery.queryOptions?.top ?? 25,
            skip: parsedQuery.queryOptions?.skip ?? 0,

            parameters: {
              queryText: parsedQuery.queryText ?? '',
              dataset: parsedQuery.dataset ?? ''

            }
          }

          const results = await handler(context, state, query)
          if (!context.turnState.get(INVOKE_RESPONSE_KEY)) {
            const response = {
              type: AdaptiveCardInvokeResponseType.SEARCH,
              value: {
                results
              }
            }

            await context.sendActivity(Activity.fromObject({
              value: { body: response, status: 200 } as InvokeResponse,
              type: ActivityTypes.InvokeResponse
            }))
          }
        },
        true
      )
    })
    return this._app
  }
}

function createActionExecuteSelector (verb: string | RegExp | RouteSelector): RouteSelector {
  if (typeof verb === 'function') {
    return verb
  } else if (verb instanceof RegExp) {
    return (context: TurnContext) => {
      const a = context?.activity
      const valueAction = parseValueActionExecuteSelector(a.value)
      const isInvoke =
                a?.type === ActivityTypes.Invoke &&
                a?.name === ACTION_INVOKE_NAME &&
                valueAction?.action?.type === ACTION_EXECUTE_TYPE
      if (isInvoke && typeof valueAction.action.verb === 'string') {
        return Promise.resolve(verb.test(valueAction.action.verb))
      } else {
        return Promise.resolve(false)
      }
    }
  } else {
    return (context: TurnContext) => {
      const a = context?.activity
      const valueAction = parseValueActionExecuteSelector(a.value)
      const isInvoke =
                a?.type === ActivityTypes.Invoke &&
                a?.name === ACTION_INVOKE_NAME &&
                valueAction?.action?.type === ACTION_EXECUTE_TYPE
      if (isInvoke && valueAction.action?.verb === verb) {
        return Promise.resolve(true)
      } else {
        return Promise.resolve(false)
      }
    }
  }
}

function createActionSubmitSelector (verb: string | RegExp | RouteSelector, filter: string): RouteSelector {
  if (typeof verb === 'function') {
    return verb
  } else if (verb instanceof RegExp) {
    return (context: TurnContext) => {
      const a = context?.activity
      const isSubmit = a?.type === ActivityTypes.Message && !a?.text && typeof a?.value === 'object'
      if (isSubmit && typeof (a?.value as any)[filter] === 'string') {
        return Promise.resolve(verb.test((a.value as any)[filter]))
      } else {
        return Promise.resolve(false)
      }
    }
  } else {
    return (context: TurnContext) => {
      const a = context?.activity
      const isSubmit = a?.type === ActivityTypes.Message && !a?.text && typeof a?.value === 'object'
      return Promise.resolve(isSubmit && (a?.value as any)[filter] === verb)
    }
  }
}

function createSearchSelector (dataset: string | RegExp | RouteSelector): RouteSelector {
  if (typeof dataset === 'function') {
    return dataset
  } else if (dataset instanceof RegExp) {
    return (context: TurnContext) => {
      const a = context?.activity
      const valueDataset = parseValueDataset(a.value)
      const isSearch = a?.type === ActivityTypes.Invoke && a?.name === SEARCH_INVOKE_NAME
      if (isSearch && typeof valueDataset?.dataset === 'string') {
        return Promise.resolve(dataset.test(valueDataset?.dataset))
      } else {
        return Promise.resolve(false)
      }
    }
  } else {
    return (context: TurnContext) => {
      const a = context?.activity
      // const valueDataset = parseAdaptiveCardInvokeAction(a.value)
      const isSearch = a?.type === ActivityTypes.Invoke && a?.name === SEARCH_INVOKE_NAME
      return Promise.resolve(isSearch)
    }
  }
}

async function sendInvokeResponse (context: TurnContext, response: AdaptiveCardInvokeResponse) {
  await context.sendActivity(Activity.fromObject({
    value: { body: response, status: 200 } as InvokeResponse,
    type: ActivityTypes.InvokeResponse
  }))
}
