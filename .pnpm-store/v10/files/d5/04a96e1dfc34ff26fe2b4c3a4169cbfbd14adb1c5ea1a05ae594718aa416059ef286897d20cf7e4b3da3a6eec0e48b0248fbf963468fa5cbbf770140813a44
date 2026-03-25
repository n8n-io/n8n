/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AdaptiveCardInvokeAction } from '@microsoft/agents-activity';
/**
 * Parses the given value as a value action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value action.
 */
export declare function parseValueAction(value: unknown): string;
/**
 * Parses the given value as a value action name.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value action name.
 */
export declare function parseValueActionName(value: unknown): string;
/**
 * Parses the given value as a value continuation.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value continuation.
 */
export declare function parseValueContinuation(value: unknown): string;
export interface ValueAction {
    action: {
        type: string;
        verb: string;
    };
}
/**
 * Parses the given value as a value action execute selector.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed value action execute selector.
 */
export declare function parseValueActionExecuteSelector(value: unknown): ValueAction | undefined;
/**
 * Parses the given value as a dataset.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed dataset.
 */
export declare function parseValueDataset(value: unknown): {
    dataset: string;
} | undefined;
/**
 * Parses the given value as action feedback loop data.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed action feedback loop data.
 */
export declare function parseValueActionFeedbackLoopData(value: unknown): {
    actionValue: {
        reaction: 'like' | 'dislike';
        feedback: string | Record<string, any>;
    };
};
/**
 * Parses the given value as an adaptive card invoke action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {AdaptiveCardInvokeAction} - The parsed adaptive card invoke action.
 */
export declare function parseAdaptiveCardInvokeAction(value: unknown): AdaptiveCardInvokeAction;
/**
 * Parses the given value as a search query.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed search query.
 */
export declare function parseValueSearchQuery(value: unknown): {
    queryOptions: {
        top: number;
        skip: number;
    };
    queryText: string;
    dataset: string;
};
/**
 * Parses the given value as a query.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed query.
 */
export declare function parseValueQuery(value: unknown): {
    url: string;
};
/**
 * Parses the given value as an activity message preview action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed message preview action.
 */
export declare function parseValueAgentMessagePreviewAction(value: unknown): {
    botMessagePreviewAction: string;
};
/**
 * Parses the given value as an activity preview.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed activity preview.
 */
export declare function parseValueAgentActivityPreview(value: unknown): object;
/**
 * Parses the given value as a command ID.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed command ID.
 */
export declare function parseValueCommandId(value: unknown): {
    commandId: string;
};
