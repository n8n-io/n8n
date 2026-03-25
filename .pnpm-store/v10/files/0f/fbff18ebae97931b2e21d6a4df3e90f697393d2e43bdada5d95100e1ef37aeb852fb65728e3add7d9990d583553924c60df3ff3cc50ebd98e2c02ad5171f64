"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseValueAction = parseValueAction;
exports.parseValueActionName = parseValueActionName;
exports.parseValueContinuation = parseValueContinuation;
exports.parseValueActionExecuteSelector = parseValueActionExecuteSelector;
exports.parseValueDataset = parseValueDataset;
exports.parseValueActionFeedbackLoopData = parseValueActionFeedbackLoopData;
exports.parseAdaptiveCardInvokeAction = parseAdaptiveCardInvokeAction;
exports.parseValueSearchQuery = parseValueSearchQuery;
exports.parseValueQuery = parseValueQuery;
exports.parseValueAgentMessagePreviewAction = parseValueAgentMessagePreviewAction;
exports.parseValueAgentActivityPreview = parseValueAgentActivityPreview;
exports.parseValueCommandId = parseValueCommandId;
const zod_1 = require("zod");
const agents_activity_1 = require("@microsoft/agents-activity");
// import { MessagingExtensionQuery, messagingExtensionQueryZodSchema } from '../messageExtension/messagingExtensionQuery'
const adaptiveCardsSearchParams_1 = require("./adaptiveCardsSearchParams");
/**
 * Parses the given value as a value action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value action.
 */
function parseValueAction(value) {
    const valueActionZodSchema = zod_1.z.object({
        action: zod_1.z.string().min(1)
    });
    valueActionZodSchema.passthrough().parse(value);
    return value;
}
/**
 * Parses the given value as a value action name.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value action name.
 */
function parseValueActionName(value) {
    const valueActionNameZodSchema = zod_1.z.object({
        actionName: zod_1.z.string().min(1),
    });
    valueActionNameZodSchema.passthrough().parse(value);
    return value;
}
/**
 * Parses the given value as a value continuation.
 *
 * @param {unknown} value - The value to parse.
 * @returns {string} - The parsed value continuation.
 */
function parseValueContinuation(value) {
    const valueContinuationZodSchema = zod_1.z.object({
        continuation: zod_1.z.string().min(1)
    });
    valueContinuationZodSchema.passthrough().parse(value);
    return value;
}
/**
 * Parses the given value as a value action execute selector.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed value action execute selector.
 */
function parseValueActionExecuteSelector(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    const actionZodSchema = zod_1.z.object({
        type: zod_1.z.string().min(1),
        verb: zod_1.z.string().min(1)
    });
    const actionValueExecuteSelector = zod_1.z.object({
        action: actionZodSchema
    });
    const safeParsedValue = actionValueExecuteSelector.passthrough().safeParse(value);
    if (!safeParsedValue.success) {
        throw new Error(`Invalid action value: ${safeParsedValue.error}`);
    }
    const parsedValue = safeParsedValue.data;
    return {
        action: {
            type: parsedValue.action.type,
            verb: parsedValue.action.verb
        }
    };
}
/**
 * Parses the given value as a dataset.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed dataset.
 */
function parseValueDataset(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    const datasetZodSchema = zod_1.z.object({
        dataset: zod_1.z.string().min(1)
    });
    const parsedValue = datasetZodSchema.passthrough().parse(value);
    return {
        dataset: parsedValue.dataset
    };
}
/**
 * Parses the given value as action feedback loop data.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed action feedback loop data.
 */
function parseValueActionFeedbackLoopData(value) {
    const feedbackLoopDataActionValueZodSchema = zod_1.z.object({
        actionValue: zod_1.z.object({
            reaction: zod_1.z.union([zod_1.z.literal('like'), zod_1.z.literal('dislike')]),
            feedback: zod_1.z.union([zod_1.z.string().min(1), zod_1.z.record(zod_1.z.string(), zod_1.z.any())])
        })
    });
    const parsedValue = feedbackLoopDataActionValueZodSchema.passthrough().parse(value);
    return {
        actionValue: {
            reaction: parsedValue.actionValue.reaction,
            feedback: parsedValue.actionValue.feedback
        }
    };
}
/**
 * Parses the given value as an adaptive card invoke action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {AdaptiveCardInvokeAction} - The parsed adaptive card invoke action.
 */
function parseAdaptiveCardInvokeAction(value) {
    agents_activity_1.adaptiveCardInvokeActionZodSchema.passthrough().parse(value);
    return value;
}
/**
 * Parses the given value as a search query.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed search query.
 */
function parseValueSearchQuery(value) {
    const queryOptionsZodSchema = zod_1.z.object({
        top: zod_1.z.number(),
        skip: zod_1.z.number(),
    });
    const searchValueZodSchema = adaptiveCardsSearchParams_1.adaptiveCardsSearchParamsZodSchema.extend({
        queryOptions: queryOptionsZodSchema
    });
    const validSearchValue = searchValueZodSchema.passthrough().parse(value);
    return {
        queryOptions: {
            top: validSearchValue.queryOptions.top,
            skip: validSearchValue.queryOptions.skip
        },
        queryText: validSearchValue.queryText,
        dataset: validSearchValue.dataset
    };
}
/**
 * Parses the given value as a query.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed query.
 */
function parseValueQuery(value) {
    const urlZodSchema = zod_1.z.object({
        url: zod_1.z.string().min(1)
    });
    const parsedValue = urlZodSchema.passthrough().parse(value);
    return {
        url: parsedValue.url
    };
}
/**
 * Parses the given value as an activity message preview action.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed message preview action.
 */
function parseValueAgentMessagePreviewAction(value) {
    const botMessagePreviewActionZodSchema = zod_1.z.object({
        botMessagePreviewAction: zod_1.z.string().min(1)
    });
    const parsedValue = botMessagePreviewActionZodSchema.passthrough().parse(value);
    return {
        botMessagePreviewAction: parsedValue.botMessagePreviewAction
    };
}
/**
 * Parses the given value as an activity preview.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed activity preview.
 */
function parseValueAgentActivityPreview(value) {
    const botActivityPreviewZodSchema = zod_1.z.object({
        botActivityPreview: zod_1.z.array(agents_activity_1.activityZodSchema.partial())
    });
    const parsedValue = botActivityPreviewZodSchema.passthrough().parse(value);
    return {
        botActivityPreview: parsedValue.botActivityPreview
    };
}
/**
 * Parses the given value as a command ID.
 *
 * @param {unknown} value - The value to parse.
 * @returns {object} - The parsed command ID.
 */
function parseValueCommandId(value) {
    const commandIdZodSchema = zod_1.z.object({
        commandId: zod_1.z.string().min(1)
    });
    const parsedValue = commandIdZodSchema.passthrough().parse(value);
    return {
        commandId: parsedValue.commandId
    };
}
//# sourceMappingURL=activityValueParsers.js.map