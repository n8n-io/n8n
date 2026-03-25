"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFactory = void 0;
/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
const agents_activity_1 = require("@microsoft/agents-activity");
/**
 * A factory class for creating various types of message activities.
 */
class MessageFactory {
    /**
     * Creates a text message activity.
     * @param text The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created text message activity.
     */
    static text(text, speak, inputHint) {
        let msgObj = {};
        msgObj = {
            type: agents_activity_1.ActivityTypes.Message,
            text,
            inputHint: inputHint || agents_activity_1.InputHints.AcceptingInput
        };
        if (speak) {
            msgObj = { ...msgObj, speak };
        }
        const msg = agents_activity_1.Activity.fromObject(msgObj);
        return msg;
    }
    /**
     * Creates a message activity with suggested actions.
     * @param actions The suggested actions.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with suggested actions.
     */
    static suggestedActions(actions, text, speak, inputHint) {
        const formattedActions = (actions || []).map((action) => {
            if (typeof action === 'object') {
                return action;
            }
            else {
                return {
                    type: agents_activity_1.ActionTypes.ImBack,
                    value: { text: action.toString() },
                    title: action.toString(),
                    channelData: undefined
                };
            }
        });
        const msgObj = {
            type: agents_activity_1.ActivityTypes.Message,
            inputHint: inputHint || agents_activity_1.InputHints.AcceptingInput,
            suggestedActions: { actions: formattedActions, to: [] }
        };
        const msg = agents_activity_1.Activity.fromObject(msgObj);
        if (text) {
            msg.text = text;
        }
        if (speak) {
            msg.speak = speak;
        }
        return msg;
    }
    /**
     * Creates a message activity with a single attachment.
     * @param attachment The attachment to include in the message.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with an attachment.
     */
    static attachment(attachment, text, speak, inputHint) {
        return attachmentActivity(agents_activity_1.AttachmentLayoutTypes.List, [attachment], text, speak, inputHint);
    }
    /**
     * Creates a message activity with a list of attachments.
     * @param attachments The list of attachments to include in the message.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with a list of attachments.
     */
    static list(attachments, text, speak, inputHint) {
        return attachmentActivity(agents_activity_1.AttachmentLayoutTypes.List, attachments, text, speak, inputHint);
    }
    /**
     * Creates a message activity with a carousel of attachments.
     * @param attachments The list of attachments to include in the carousel.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with a carousel of attachments.
     */
    static carousel(attachments, text, speak, inputHint) {
        return attachmentActivity(agents_activity_1.AttachmentLayoutTypes.Carousel, attachments, text, speak, inputHint);
    }
    /**
     * Creates a message activity with content from a URL.
     * @param url The URL of the content.
     * @param contentType The content type of the attachment.
     * @param name (Optional) The name of the attachment.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with content from a URL.
     */
    static contentUrl(url, contentType, name, text, speak, inputHint) {
        const a = { contentType, contentUrl: url };
        if (name) {
            a.name = name;
        }
        return attachmentActivity(agents_activity_1.AttachmentLayoutTypes.List, [a], text, speak, inputHint);
    }
}
exports.MessageFactory = MessageFactory;
/**
 * Creates a message activity with attachments.
 * @param attachmentLayout The layout for the attachments.
 * @param attachments The list of attachments to include in the message.
 * @param text (Optional) The text of the message.
 * @param speak (Optional) The text to be spoken by the agent.
 * @param inputHint (Optional) The input hint for the message.
 * @returns The created message activity with attachments.
 */
function attachmentActivity(attachmentLayout, attachments, text, speak, inputHint) {
    const msgObj = {
        type: agents_activity_1.ActivityTypes.Message,
        attachmentLayout,
        attachments,
        inputHint: inputHint || agents_activity_1.InputHints.AcceptingInput
    };
    const msg = agents_activity_1.Activity.fromObject(msgObj);
    if (text) {
        msg.text = text;
    }
    if (speak) {
        msg.speak = speak;
    }
    return msg;
}
//# sourceMappingURL=messageFactory.js.map