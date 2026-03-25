/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { TurnContext } from '../turnContext';
/**
 * A function that determines whether a specific condition is met in the given turn context.
 *
 * @param context - The turn context for the current operation.
 * @returns A promise that resolves to a boolean indicating whether the condition is met.
 */
export type Selector = (context: TurnContext) => Promise<boolean>;
/**
 * A specialized selector for routing operations.
 */
export type RouteSelector = Selector;
