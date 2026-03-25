"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveCardsActions = exports.ACTION_INVOKE_NAME = void 0;
const agents_activity_1 = require("@microsoft/agents-activity");
const __1 = require("../../");
const adaptiveCardActionExecuteResponseType_1 = require("./adaptiveCardActionExecuteResponseType");
const activityValueParsers_1 = require("./activityValueParsers");
exports.ACTION_INVOKE_NAME = 'adaptiveCard/action';
const ACTION_EXECUTE_TYPE = 'Action.Execute';
const DEFAULT_ACTION_SUBMIT_FILTER = 'verb';
const SEARCH_INVOKE_NAME = 'application/search';
var AdaptiveCardInvokeResponseType;
(function (AdaptiveCardInvokeResponseType) {
    /**
     * Indicates a response containing an Adaptive Card.
     */
    AdaptiveCardInvokeResponseType["ADAPTIVE"] = "application/vnd.microsoft.card.adaptive";
    /**
     * Indicates a response containing a message activity.
     */
    AdaptiveCardInvokeResponseType["MESSAGE"] = "application/vnd.microsoft.activity.message";
    /**
     * Indicates a response containing a search result.
     */
    AdaptiveCardInvokeResponseType["SEARCH"] = "application/vnd.microsoft.search.searchResponse";
})(AdaptiveCardInvokeResponseType || (AdaptiveCardInvokeResponseType = {}));
/**
 * A class to handle Adaptive Card actions such as executing actions, submitting actions, and performing searches.
 *
 * @typeParam TState - The type of the TurnState used in the application.
 */
class AdaptiveCardsActions {
    /**
     * Constructs an instance of AdaptiveCardsActions.
     * @param app - The Teams application instance.
     */
    constructor(app) {
        this._app = app;
    }
    /**
     * Registers a handler for the `Action.Execute` event.
     *
     * @typeParam TData - The type of the data passed to the handler.
     * @param verb - A string, RegExp, RouteSelector, or an array of these to match the action verb.
     * @param handler - A function to handle the action execution.
     * @returns The Teams application instance.
     */
    actionExecute(verb, handler) {
        var _a, _b;
        let actionExecuteResponseType = (_b = (_a = this._app.options.adaptiveCardsOptions) === null || _a === void 0 ? void 0 : _a.actionExecuteResponseType) !== null && _b !== void 0 ? _b : adaptiveCardActionExecuteResponseType_1.AdaptiveCardActionExecuteResponseType.REPLACE_FOR_INTERACTOR;
        (Array.isArray(verb) ? verb : [verb]).forEach((v) => {
            const selector = createActionExecuteSelector(v);
            this._app.addRoute(selector, async (context, state) => {
                var _a;
                const a = context === null || context === void 0 ? void 0 : context.activity;
                const invokeAction = (0, activityValueParsers_1.parseValueActionExecuteSelector)(a.value);
                if ((a === null || a === void 0 ? void 0 : a.type) !== agents_activity_1.ActivityTypes.Invoke ||
                    (a === null || a === void 0 ? void 0 : a.name) !== exports.ACTION_INVOKE_NAME ||
                    ((invokeAction === null || invokeAction === void 0 ? void 0 : invokeAction.action.type) !== ACTION_EXECUTE_TYPE)) {
                    throw new Error(`Unexpected AdaptiveCards.actionExecute() triggered for activity type: ${invokeAction === null || invokeAction === void 0 ? void 0 : invokeAction.action.type}`);
                }
                if (invokeAction.action.verb !== v) {
                    // TODO: add logger to this class
                    console.log(`AdaptiveCards.actionExecute() triggered for verb: ${invokeAction.action.verb} does not match expected verb: ${v}`);
                }
                // TODO: review any, and check verb
                const result = await handler(context, state, (_a = a.value.action) !== null && _a !== void 0 ? _a : {});
                if (!context.turnState.get(__1.INVOKE_RESPONSE_KEY)) {
                    let response;
                    if (typeof result === 'string') {
                        response = {
                            statusCode: 200,
                            type: AdaptiveCardInvokeResponseType.MESSAGE,
                            value: result
                        };
                        await sendInvokeResponse(context, response);
                    }
                    else {
                        if (result.refresh &&
                            actionExecuteResponseType !== adaptiveCardActionExecuteResponseType_1.AdaptiveCardActionExecuteResponseType.NEW_MESSAGE_FOR_ALL) {
                            actionExecuteResponseType = adaptiveCardActionExecuteResponseType_1.AdaptiveCardActionExecuteResponseType.REPLACE_FOR_ALL;
                        }
                        const activity = __1.MessageFactory.attachment(__1.CardFactory.adaptiveCard(result));
                        response = {
                            statusCode: 200,
                            type: AdaptiveCardInvokeResponseType.ADAPTIVE,
                            value: result
                        };
                        if (actionExecuteResponseType === adaptiveCardActionExecuteResponseType_1.AdaptiveCardActionExecuteResponseType.NEW_MESSAGE_FOR_ALL) {
                            await sendInvokeResponse(context, {
                                statusCode: 200,
                                type: AdaptiveCardInvokeResponseType.MESSAGE,
                                value: 'Your response was sent to the app'
                            });
                            await context.sendActivity(activity);
                        }
                        else if (actionExecuteResponseType === adaptiveCardActionExecuteResponseType_1.AdaptiveCardActionExecuteResponseType.REPLACE_FOR_ALL) {
                            activity.id = context.activity.replyToId;
                            await context.updateActivity(activity);
                            await sendInvokeResponse(context, response);
                        }
                        else {
                            await sendInvokeResponse(context, response);
                        }
                    }
                }
            }, true);
        });
        return this._app;
    }
    /**
     * Registers a handler for the Action.Submit event.
     *
     * @typeParam TData - The type of the data passed to the handler.
     * @param verb - A string, RegExp, RouteSelector, or an array of these to match the action verb.
     * @param handler - A function to handle the action submission.
     * @returns The Teams application instance.
     */
    actionSubmit(verb, handler) {
        var _a, _b;
        const filter = (_b = (_a = this._app.options.adaptiveCardsOptions) === null || _a === void 0 ? void 0 : _a.actionSubmitFilter) !== null && _b !== void 0 ? _b : DEFAULT_ACTION_SUBMIT_FILTER;
        (Array.isArray(verb) ? verb : [verb]).forEach((v) => {
            const selector = createActionSubmitSelector(v, filter);
            this._app.addRoute(selector, async (context, state) => {
                var _a;
                const a = context === null || context === void 0 ? void 0 : context.activity;
                if ((a === null || a === void 0 ? void 0 : a.type) !== agents_activity_1.ActivityTypes.Message || (a === null || a === void 0 ? void 0 : a.text) || typeof (a === null || a === void 0 ? void 0 : a.value) !== 'object') {
                    throw new Error(`Unexpected AdaptiveCards.actionSubmit() triggered for activity type: ${a === null || a === void 0 ? void 0 : a.type}`);
                }
                await handler(context, state, (_a = ((0, activityValueParsers_1.parseAdaptiveCardInvokeAction)(a.value))) !== null && _a !== void 0 ? _a : {});
            });
        });
        return this._app;
    }
    /**
     * Registers a handler for the search event.
     *
     * @param dataset - A string, RegExp, RouteSelector, or an array of these to match the dataset.
     * @param handler - A function to handle the search query.
     * @returns The Teams application instance.
     */
    search(dataset, handler) {
        (Array.isArray(dataset) ? dataset : [dataset]).forEach((ds) => {
            const selector = createSearchSelector(ds);
            this._app.addRoute(selector, async (context, state) => {
                var _a, _b, _c, _d, _e, _f;
                const a = context === null || context === void 0 ? void 0 : context.activity;
                if ((a === null || a === void 0 ? void 0 : a.type) !== 'invoke' || (a === null || a === void 0 ? void 0 : a.name) !== SEARCH_INVOKE_NAME) {
                    throw new Error(`Unexpected AdaptiveCards.search() triggered for activity type: ${a === null || a === void 0 ? void 0 : a.type}`);
                }
                const parsedQuery = (0, activityValueParsers_1.parseValueSearchQuery)(a.value);
                const query = {
                    count: (_b = (_a = parsedQuery.queryOptions) === null || _a === void 0 ? void 0 : _a.top) !== null && _b !== void 0 ? _b : 25,
                    skip: (_d = (_c = parsedQuery.queryOptions) === null || _c === void 0 ? void 0 : _c.skip) !== null && _d !== void 0 ? _d : 0,
                    parameters: {
                        queryText: (_e = parsedQuery.queryText) !== null && _e !== void 0 ? _e : '',
                        dataset: (_f = parsedQuery.dataset) !== null && _f !== void 0 ? _f : ''
                    }
                };
                const results = await handler(context, state, query);
                if (!context.turnState.get(__1.INVOKE_RESPONSE_KEY)) {
                    const response = {
                        type: AdaptiveCardInvokeResponseType.SEARCH,
                        value: {
                            results
                        }
                    };
                    await context.sendActivity(agents_activity_1.Activity.fromObject({
                        value: { body: response, status: 200 },
                        type: agents_activity_1.ActivityTypes.InvokeResponse
                    }));
                }
            }, true);
        });
        return this._app;
    }
}
exports.AdaptiveCardsActions = AdaptiveCardsActions;
function createActionExecuteSelector(verb) {
    if (typeof verb === 'function') {
        return verb;
    }
    else if (verb instanceof RegExp) {
        return (context) => {
            var _a;
            const a = context === null || context === void 0 ? void 0 : context.activity;
            const valueAction = (0, activityValueParsers_1.parseValueActionExecuteSelector)(a.value);
            const isInvoke = (a === null || a === void 0 ? void 0 : a.type) === agents_activity_1.ActivityTypes.Invoke &&
                (a === null || a === void 0 ? void 0 : a.name) === exports.ACTION_INVOKE_NAME &&
                ((_a = valueAction === null || valueAction === void 0 ? void 0 : valueAction.action) === null || _a === void 0 ? void 0 : _a.type) === ACTION_EXECUTE_TYPE;
            if (isInvoke && typeof valueAction.action.verb === 'string') {
                return Promise.resolve(verb.test(valueAction.action.verb));
            }
            else {
                return Promise.resolve(false);
            }
        };
    }
    else {
        return (context) => {
            var _a, _b;
            const a = context === null || context === void 0 ? void 0 : context.activity;
            const valueAction = (0, activityValueParsers_1.parseValueActionExecuteSelector)(a.value);
            const isInvoke = (a === null || a === void 0 ? void 0 : a.type) === agents_activity_1.ActivityTypes.Invoke &&
                (a === null || a === void 0 ? void 0 : a.name) === exports.ACTION_INVOKE_NAME &&
                ((_a = valueAction === null || valueAction === void 0 ? void 0 : valueAction.action) === null || _a === void 0 ? void 0 : _a.type) === ACTION_EXECUTE_TYPE;
            if (isInvoke && ((_b = valueAction.action) === null || _b === void 0 ? void 0 : _b.verb) === verb) {
                return Promise.resolve(true);
            }
            else {
                return Promise.resolve(false);
            }
        };
    }
}
function createActionSubmitSelector(verb, filter) {
    if (typeof verb === 'function') {
        return verb;
    }
    else if (verb instanceof RegExp) {
        return (context) => {
            const a = context === null || context === void 0 ? void 0 : context.activity;
            const isSubmit = (a === null || a === void 0 ? void 0 : a.type) === agents_activity_1.ActivityTypes.Message && !(a === null || a === void 0 ? void 0 : a.text) && typeof (a === null || a === void 0 ? void 0 : a.value) === 'object';
            if (isSubmit && typeof (a === null || a === void 0 ? void 0 : a.value)[filter] === 'string') {
                return Promise.resolve(verb.test(a.value[filter]));
            }
            else {
                return Promise.resolve(false);
            }
        };
    }
    else {
        return (context) => {
            const a = context === null || context === void 0 ? void 0 : context.activity;
            const isSubmit = (a === null || a === void 0 ? void 0 : a.type) === agents_activity_1.ActivityTypes.Message && !(a === null || a === void 0 ? void 0 : a.text) && typeof (a === null || a === void 0 ? void 0 : a.value) === 'object';
            return Promise.resolve(isSubmit && (a === null || a === void 0 ? void 0 : a.value)[filter] === verb);
        };
    }
}
function createSearchSelector(dataset) {
    if (typeof dataset === 'function') {
        return dataset;
    }
    else if (dataset instanceof RegExp) {
        return (context) => {
            const a = context === null || context === void 0 ? void 0 : context.activity;
            const valueDataset = (0, activityValueParsers_1.parseValueDataset)(a.value);
            const isSearch = (a === null || a === void 0 ? void 0 : a.type) === agents_activity_1.ActivityTypes.Invoke && (a === null || a === void 0 ? void 0 : a.name) === SEARCH_INVOKE_NAME;
            if (isSearch && typeof (valueDataset === null || valueDataset === void 0 ? void 0 : valueDataset.dataset) === 'string') {
                return Promise.resolve(dataset.test(valueDataset === null || valueDataset === void 0 ? void 0 : valueDataset.dataset));
            }
            else {
                return Promise.resolve(false);
            }
        };
    }
    else {
        return (context) => {
            const a = context === null || context === void 0 ? void 0 : context.activity;
            // const valueDataset = parseAdaptiveCardInvokeAction(a.value)
            const isSearch = (a === null || a === void 0 ? void 0 : a.type) === agents_activity_1.ActivityTypes.Invoke && (a === null || a === void 0 ? void 0 : a.name) === SEARCH_INVOKE_NAME;
            return Promise.resolve(isSearch);
        };
    }
}
async function sendInvokeResponse(context, response) {
    await context.sendActivity(agents_activity_1.Activity.fromObject({
        value: { body: response, status: 200 },
        type: agents_activity_1.ActivityTypes.InvokeResponse
    }));
}
//# sourceMappingURL=adaptiveCardsActions.js.map