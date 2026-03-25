/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AgentApplication, RouteSelector, TurnContext, TurnState } from '../../';
import { AdaptiveCardsSearchParams } from './adaptiveCardsSearchParams';
import { AdaptiveCard } from '../../cards/adaptiveCard';
import { Query } from './query';
export declare const ACTION_INVOKE_NAME = "adaptiveCard/action";
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
export declare class AdaptiveCardsActions<TState extends TurnState> {
    /**
     * The Teams application instance associated with this class.
     */
    private readonly _app;
    /**
     * Constructs an instance of AdaptiveCardsActions.
     * @param app - The Teams application instance.
     */
    constructor(app: AgentApplication<TState>);
    /**
     * Registers a handler for the `Action.Execute` event.
     *
     * @typeParam TData - The type of the data passed to the handler.
     * @param verb - A string, RegExp, RouteSelector, or an array of these to match the action verb.
     * @param handler - A function to handle the action execution.
     * @returns The Teams application instance.
     */
    actionExecute<TData = Record<string, any>>(verb: string | RegExp | RouteSelector | (string | RegExp | RouteSelector)[], handler: (context: TurnContext, state: TState, data: TData) => Promise<AdaptiveCard | string>): AgentApplication<TState>;
    /**
     * Registers a handler for the Action.Submit event.
     *
     * @typeParam TData - The type of the data passed to the handler.
     * @param verb - A string, RegExp, RouteSelector, or an array of these to match the action verb.
     * @param handler - A function to handle the action submission.
     * @returns The Teams application instance.
     */
    actionSubmit<TData = Record<string, any>>(verb: string | RegExp | RouteSelector | (string | RegExp | RouteSelector)[], handler: (context: TurnContext, state: TState, data: TData) => Promise<void>): AgentApplication<TState>;
    /**
     * Registers a handler for the search event.
     *
     * @param dataset - A string, RegExp, RouteSelector, or an array of these to match the dataset.
     * @param handler - A function to handle the search query.
     * @returns The Teams application instance.
     */
    search(dataset: string | RegExp | RouteSelector | (string | RegExp | RouteSelector)[], handler: (context: TurnContext, state: TState, query: Query<AdaptiveCardsSearchParams>) => Promise<AdaptiveCardSearchResult[]>): AgentApplication<TState>;
}
