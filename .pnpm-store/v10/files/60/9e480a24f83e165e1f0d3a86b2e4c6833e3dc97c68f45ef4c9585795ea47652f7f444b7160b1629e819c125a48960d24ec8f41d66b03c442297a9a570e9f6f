/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
import { Activity, Attachment, CardAction, InputHints } from '@microsoft/agents-activity';
/**
 * A factory class for creating various types of message activities.
 */
export declare class MessageFactory {
    /**
     * Creates a text message activity.
     * @param text The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created text message activity.
     */
    static text(text: string, speak?: string, inputHint?: InputHints | string): Activity;
    /**
     * Creates a message activity with suggested actions.
     * @param actions The suggested actions.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with suggested actions.
     */
    static suggestedActions(actions: Array<CardAction | string>, text?: string, speak?: string, inputHint?: InputHints | string): Activity;
    /**
     * Creates a message activity with a single attachment.
     * @param attachment The attachment to include in the message.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with an attachment.
     */
    static attachment(attachment: Attachment, text?: string, speak?: string, inputHint?: InputHints | string): Activity;
    /**
     * Creates a message activity with a list of attachments.
     * @param attachments The list of attachments to include in the message.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with a list of attachments.
     */
    static list(attachments: Attachment[], text?: string, speak?: string, inputHint?: InputHints | string): Activity;
    /**
     * Creates a message activity with a carousel of attachments.
     * @param attachments The list of attachments to include in the carousel.
     * @param text (Optional) The text of the message.
     * @param speak (Optional) The text to be spoken by the agent.
     * @param inputHint (Optional) The input hint for the message.
     * @returns The created message activity with a carousel of attachments.
     */
    static carousel(attachments: Attachment[], text?: string, speak?: string, inputHint?: InputHints | string): Activity;
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
    static contentUrl(url: string, contentType: string, name?: string, text?: string, speak?: string, inputHint?: InputHints | string): Activity;
}
