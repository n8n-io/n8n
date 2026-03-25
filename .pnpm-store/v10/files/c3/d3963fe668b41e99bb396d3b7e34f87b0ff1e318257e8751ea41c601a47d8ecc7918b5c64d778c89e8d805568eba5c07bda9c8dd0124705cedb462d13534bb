"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = exports.activityZodSchema = void 0;
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const semanticAction_1 = require("./action/semanticAction");
const suggestedActions_1 = require("./action/suggestedActions");
const activityEventNames_1 = require("./activityEventNames");
const activityImportance_1 = require("./activityImportance");
const activityTypes_1 = require("./activityTypes");
const attachment_1 = require("./attachment/attachment");
const attachmentLayoutTypes_1 = require("./attachment/attachmentLayoutTypes");
const productInfo_1 = require("./entity/productInfo");
const channelAccount_1 = require("./conversation/channelAccount");
const channels_1 = require("./conversation/channels");
const conversationAccount_1 = require("./conversation/conversationAccount");
const conversationReference_1 = require("./conversation/conversationReference");
const endOfConversationCodes_1 = require("./conversation/endOfConversationCodes");
const deliveryModes_1 = require("./deliveryModes");
const entity_1 = require("./entity/entity");
const inputHints_1 = require("./inputHints");
const messageReaction_1 = require("./messageReaction");
const textFormatTypes_1 = require("./textFormatTypes");
const textHighlight_1 = require("./textHighlight");
const roleTypes_1 = require("./conversation/roleTypes");
const exceptionHelper_1 = require("./exceptionHelper");
const errorHelper_1 = require("./errorHelper");
/**
 * Zod schema for validating an Activity object.
 */
exports.activityZodSchema = zod_1.z.object({
    type: zod_1.z.union([activityTypes_1.activityTypesZodSchema, zod_1.z.string().min(1)]),
    text: zod_1.z.string().optional(),
    id: zod_1.z.string().min(1).optional(),
    channelId: zod_1.z.string().min(1).optional(),
    from: channelAccount_1.channelAccountZodSchema.optional(),
    timestamp: zod_1.z.union([zod_1.z.date(), zod_1.z.string().min(1).transform(s => new Date(s))]).optional(),
    localTimestamp: zod_1.z.union([zod_1.z.date(), zod_1.z.string().min(1).transform(s => new Date(s))]).optional(),
    localTimezone: zod_1.z.string().min(1).optional(),
    callerId: zod_1.z.string().min(1).optional(),
    serviceUrl: zod_1.z.string().min(1).optional(),
    conversation: conversationAccount_1.conversationAccountZodSchema.optional(),
    recipient: channelAccount_1.channelAccountZodSchema.optional(),
    textFormat: zod_1.z.union([textFormatTypes_1.textFormatTypesZodSchema, zod_1.z.string().min(1)]).optional(),
    attachmentLayout: zod_1.z.union([attachmentLayoutTypes_1.attachmentLayoutTypesZodSchema, zod_1.z.string().min(1)]).optional(),
    membersAdded: zod_1.z.array(channelAccount_1.channelAccountZodSchema).optional(),
    membersRemoved: zod_1.z.array(channelAccount_1.channelAccountZodSchema).optional(),
    reactionsAdded: zod_1.z.array(messageReaction_1.messageReactionZodSchema).optional(),
    reactionsRemoved: zod_1.z.array(messageReaction_1.messageReactionZodSchema).optional(),
    topicName: zod_1.z.string().min(1).optional(),
    historyDisclosed: zod_1.z.boolean().optional(),
    locale: zod_1.z.string().min(1).optional(),
    speak: zod_1.z.string().min(1).optional(),
    inputHint: zod_1.z.union([inputHints_1.inputHintsZodSchema, zod_1.z.string().min(1)]).optional(),
    summary: zod_1.z.string().min(1).optional(),
    suggestedActions: suggestedActions_1.suggestedActionsZodSchema.optional(),
    attachments: zod_1.z.array(attachment_1.attachmentZodSchema).optional(),
    entities: zod_1.z.array(entity_1.entityZodSchema.passthrough()).optional(),
    channelData: zod_1.z.any().optional(),
    action: zod_1.z.string().min(1).optional(),
    replyToId: zod_1.z.string().min(1).optional(),
    label: zod_1.z.string().min(1).optional(),
    valueType: zod_1.z.string().min(1).optional(),
    value: zod_1.z.unknown().optional(),
    name: zod_1.z.union([activityEventNames_1.activityEventNamesZodSchema, zod_1.z.string().min(1)]).optional(),
    relatesTo: conversationReference_1.conversationReferenceZodSchema.optional(),
    code: zod_1.z.union([endOfConversationCodes_1.endOfConversationCodesZodSchema, zod_1.z.string().min(1)]).optional(),
    expiration: zod_1.z.union([zod_1.z.date(), zod_1.z.string().min(1).transform(s => new Date(s))]).optional(),
    importance: zod_1.z.union([activityImportance_1.activityImportanceZodSchema, zod_1.z.string().min(1)]).optional(),
    deliveryMode: zod_1.z.union([deliveryModes_1.deliveryModesZodSchema, zod_1.z.string().min(1)]).optional(),
    listenFor: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    textHighlights: zod_1.z.array(textHighlight_1.textHighlightZodSchema).optional(),
    semanticAction: semanticAction_1.semanticActionZodSchema.optional(),
});
/**
 * Represents an activity in a conversation.
 */
class Activity {
    /**
     * Creates a new Activity instance.
     * @param t The type of the activity.
     * @throws Will throw an error if the activity type is invalid.
     */
    constructor(t) {
        if (t === undefined) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.InvalidActivityTypeUndefined);
        }
        if (t === null) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.InvalidActivityTypeNull);
        }
        if ((typeof t === 'string') && (t.length === 0)) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.InvalidActivityTypeEmptyString);
        }
        this.type = t;
    }
    /**
     * Creates an Activity instance from a JSON string.
     * @param json The JSON string representing the activity.
     * @returns The created Activity instance.
     */
    static fromJson(json) {
        return this.fromObject(JSON.parse(json));
    }
    /**
     * Creates an Activity instance from an object.
     * @param o The object representing the activity.
     * @returns The created Activity instance.
     */
    static fromObject(o) {
        const parsedActivity = exports.activityZodSchema.passthrough().parse(o);
        const activity = new Activity(parsedActivity.type);
        Object.assign(activity, parsedActivity);
        return activity;
    }
    /**
     * Return the combined channel:subChannel value like agent:email
     */
    get channelId() {
        var _a;
        return (_a = this._channelId) === null || _a === void 0 ? void 0 : _a.concat(this.channelIdSubChannel ? `:${this.channelIdSubChannel}` : '');
    }
    /**
     * Given a composite channelId like agent:email, return the channel and subChannel.
     * @param value
     * @returns [channel, subChannel]
     */
    static parseChannelId(value) {
        let channel;
        let subChannel;
        if (value && value.indexOf(':') !== -1) {
            channel = value.substring(0, value.indexOf(':'));
            subChannel = value.substring(value.indexOf(':') + 1);
        }
        else {
            channel = value;
        }
        return [channel, subChannel];
    }
    /**
     * Sets the channel ID for the activity - if a subChannel is provided, will create the necessary ProductInfo entity
     * @param value The channel ID value.
     */
    set channelId(value) {
        const [channel, subChannel] = Activity.parseChannelId(value);
        // if they passed in a value but the channel is blank, this is invalid
        if (value && !channel) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.InvalidChannelIdFormat, undefined, { channelId: value });
        }
        this._channelId = channel;
        if (subChannel) {
            (0, productInfo_1.addProductInfoToActivity)(this, subChannel);
        }
        else {
            (0, productInfo_1.clearProductInfoFromActivity)(this);
        }
    }
    /**
     * Sets the primary channel ID for the activity.
     */
    set channelIdChannel(value) {
        this._channelId = value;
    }
    /**
     * Returns the primary channel ID for the activity.
     */
    get channelIdChannel() {
        return this._channelId;
    }
    /**
     * Returns the sub-channel ID for the activity.
     */
    get channelIdSubChannel() {
        var _a, _b;
        return (_b = (_a = this.entities) === null || _a === void 0 ? void 0 : _a.find(e => e.type === 'ProductInfo')) === null || _b === void 0 ? void 0 : _b.id;
    }
    /**
     * Sets the sub-channel ID for the activity.
     */
    set channelIdSubChannel(value) {
        if (!this._channelId) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.PrimaryChannelNotSet);
        }
        this.channelId = `${this._channelId}${value ? `:${value}` : ''}`;
    }
    /**
     * Creates a continuation activity from a conversation reference.
     * @param reference The conversation reference.
     * @returns The created continuation activity.
     */
    static getContinuationActivity(reference) {
        var _a;
        const continuationActivityObj = {
            type: activityTypes_1.ActivityTypes.Event,
            name: activityEventNames_1.ActivityEventNames.ContinueConversation,
            id: (_a = reference.activityId) !== null && _a !== void 0 ? _a : (0, uuid_1.v4)(),
            channelId: reference.channelId,
            locale: reference.locale,
            serviceUrl: reference.serviceUrl,
            conversation: reference.conversation,
            recipient: reference.agent,
            from: reference.user,
            relatesTo: reference
        };
        const continuationActivity = Activity.fromObject(continuationActivityObj);
        return continuationActivity;
    }
    /**
     * Gets the appropriate reply-to ID for the activity.
     * @returns The reply-to ID, or undefined if not applicable.
     */
    getAppropriateReplyToId() {
        if (this.type !== activityTypes_1.ActivityTypes.ConversationUpdate ||
            (this.channelId !== channels_1.Channels.Directline && this.channelId !== channels_1.Channels.Webchat)) {
            return this.id;
        }
        return undefined;
    }
    /**
     * Gets the conversation reference for the activity.
     * @returns The conversation reference.
     * @throws Will throw an error if required properties are undefined.
     */
    getConversationReference() {
        if (this.recipient === null || this.recipient === undefined) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ActivityRecipientUndefined);
        }
        if (this.conversation === null || this.conversation === undefined) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ActivityConversationUndefined);
        }
        if (this.channelId === null || this.channelId === undefined) {
            throw exceptionHelper_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ActivityChannelIdUndefined);
        }
        return {
            activityId: this.getAppropriateReplyToId(),
            user: this.from,
            agent: this.recipient,
            conversation: this.conversation,
            channelId: this.channelId,
            locale: this.locale,
            serviceUrl: this.serviceUrl
        };
    }
    /**
     * Applies a conversation reference to the activity.
     * @param reference The conversation reference.
     * @param isIncoming Whether the activity is incoming.
     * @returns The updated activity.
     */
    applyConversationReference(reference, isIncoming = false) {
        var _a, _b, _c;
        this.channelId = reference.channelId;
        (_a = this.locale) !== null && _a !== void 0 ? _a : (this.locale = reference.locale);
        this.serviceUrl = reference.serviceUrl;
        this.conversation = reference.conversation;
        if (isIncoming) {
            this.from = reference.user;
            this.recipient = (_b = reference.agent) !== null && _b !== void 0 ? _b : undefined;
            if (reference.activityId) {
                this.id = reference.activityId;
            }
        }
        else {
            this.from = (_c = reference.agent) !== null && _c !== void 0 ? _c : undefined;
            this.recipient = reference.user;
            if (reference.activityId) {
                this.replyToId = reference.activityId;
            }
        }
        return this;
    }
    clone() {
        const activityCopy = JSON.parse(JSON.stringify(this));
        for (const key in activityCopy) {
            if (typeof activityCopy[key] === 'string' && !isNaN(Date.parse(activityCopy[key]))) {
                activityCopy[key] = new Date(activityCopy[key]);
            }
        }
        Object.setPrototypeOf(activityCopy, Activity.prototype);
        return activityCopy;
    }
    /**
     * Gets the mentions in the activity.
     * @param activity The activity.
     * @returns The list of mentions.
     */
    getMentions(activity) {
        const result = [];
        if (activity.entities !== undefined) {
            for (let i = 0; i < activity.entities.length; i++) {
                if (activity.entities[i].type.toLowerCase() === 'mention') {
                    result.push(activity.entities[i]);
                }
            }
        }
        return result;
    }
    /**
     * Normalizes mentions in the activity by removing mention tags and optionally removing recipient mention.
     * @param removeMention Whether to remove the recipient mention from the activity.
     */
    normalizeMentions(removeMention = false) {
        var _a, _b;
        if (this.type === activityTypes_1.ActivityTypes.Message) {
            if (removeMention) {
                // Strip recipient mention tags and text
                this.removeRecipientMention();
                // Strip entity.mention records for recipient id
                if (this.entities !== undefined && ((_a = this.recipient) === null || _a === void 0 ? void 0 : _a.id)) {
                    this.entities = this.entities.filter((entity) => {
                        var _a;
                        if (entity.type.toLowerCase() === 'mention') {
                            const mention = entity;
                            return mention.mentioned.id !== ((_a = this.recipient) === null || _a === void 0 ? void 0 : _a.id);
                        }
                        return true;
                    });
                }
            }
            // Remove <at> </at> tags keeping the inner text
            if (this.text) {
                this.text = Activity.removeAt(this.text);
            }
            // Remove <at> </at> tags from mention records keeping the inner text
            if (this.entities !== undefined) {
                const mentions = this.getMentions(this);
                for (const mention of mentions) {
                    if (mention.text) {
                        mention.text = (_b = Activity.removeAt(mention.text)) === null || _b === void 0 ? void 0 : _b.trim();
                    }
                }
            }
        }
    }
    /**
     * Removes <at> </at> tags from the specified text.
     * @param text The text to process.
     * @returns The text with <at> </at> tags removed.
     */
    static removeAt(text) {
        if (!text) {
            return text;
        }
        let foundTag;
        do {
            foundTag = false;
            const iAtStart = text.toLowerCase().indexOf('<at');
            if (iAtStart >= 0) {
                const iAtEnd = text.indexOf('>', iAtStart);
                if (iAtEnd > 0) {
                    const iAtClose = text.toLowerCase().indexOf('</at>', iAtEnd);
                    if (iAtClose > 0) {
                        // Replace </at>
                        let followingText = text.substring(iAtClose + 5);
                        // If first char of followingText is not whitespace, insert space
                        if (followingText.length > 0 && !(/\s/.test(followingText[0]))) {
                            followingText = ` ${followingText}`;
                        }
                        text = text.substring(0, iAtClose) + followingText;
                        // Get tag content (text between <at...> and </at>)
                        const tagContent = text.substring(iAtEnd + 1, iAtClose);
                        // Replace <at ...> with just the tag content
                        let prefixText = text.substring(0, iAtStart);
                        // If prefixText is not empty and doesn't end with whitespace, add a space
                        if (prefixText.length > 0 && !(/\s$/.test(prefixText))) {
                            prefixText += ' ';
                        }
                        text = prefixText + tagContent + followingText;
                        // We found one, try again, there may be more
                        foundTag = true;
                    }
                }
            }
        } while (foundTag);
        return text;
    }
    /**
     * Removes the mention text for a given ID.
     * @param id The ID of the mention to remove.
     * @returns The updated text.
     */
    removeMentionText(id) {
        const mentions = this.getMentions(this);
        const mentionsFiltered = mentions.filter((mention) => mention.mentioned.id === id);
        if ((mentionsFiltered.length > 0) && this.text) {
            this.text = this.text.replace(mentionsFiltered[0].text, '').trim();
        }
        return this.text || '';
    }
    /**
     * Removes the recipient mention from the activity text.
     * @returns The updated text.
     */
    removeRecipientMention() {
        if ((this.recipient != null) && this.recipient.id) {
            return this.removeMentionText(this.recipient.id);
        }
        return '';
    }
    /**
     * Gets the conversation reference for a reply.
     * @param replyId The ID of the reply.
     * @returns The conversation reference.
     */
    getReplyConversationReference(replyId) {
        const reference = this.getConversationReference();
        reference.activityId = replyId;
        return reference;
    }
    toJsonString() {
        // Use channelId instead of _channelId when outputting json
        const copy = { ...this };
        copy.channelId = copy._channelId;
        delete copy._channelId;
        return JSON.stringify(copy);
    }
    /**
     * Does this activity represent an agentic request?
     * @returns True if agentic
     */
    isAgenticRequest() {
        if (!this.recipient || !this.recipient.role) {
            return false;
        }
        return this.recipient.role.toLowerCase() === roleTypes_1.RoleTypes.AgenticUser.toLowerCase() || this.recipient.role.toLowerCase() === roleTypes_1.RoleTypes.AgenticIdentity.toLowerCase();
    }
    /**
     * Retrieves the tenant ID associated with the agentic recipient of the activity, if available; otherwise, returns the tenant ID from the conversation.
     * @returns The tenant ID of the agentic recipient if present; otherwise, the tenant ID from the conversation. Returns undefined if neither is available.
     */
    getAgenticTenantId() {
        var _a, _b, _c;
        return (_b = (_a = this.recipient) === null || _a === void 0 ? void 0 : _a.tenantId) !== null && _b !== void 0 ? _b : (_c = this.conversation) === null || _c === void 0 ? void 0 : _c.tenantId;
    }
    /**
     * Gets the agent instance ID from the context if its agentic
     * @returns agent instance id as string
     */
    getAgenticInstanceId() {
        var _a;
        if (this.isAgenticRequest()) {
            return (_a = this.recipient) === null || _a === void 0 ? void 0 : _a.agenticAppId;
        }
        return undefined;
    }
    /**
     * Gets the agentic user (UPN) from the context if it's an agentic request.
     */
    getAgenticUser() {
        var _a;
        if (this.isAgenticRequest()) {
            return (_a = this.recipient) === null || _a === void 0 ? void 0 : _a.agenticUserId;
        }
        return undefined;
    }
}
exports.Activity = Activity;
//# sourceMappingURL=activity.js.map