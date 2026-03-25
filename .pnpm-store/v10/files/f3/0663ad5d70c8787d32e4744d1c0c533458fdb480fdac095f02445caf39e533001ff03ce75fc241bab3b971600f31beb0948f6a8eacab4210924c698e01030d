/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
import { ActionTypes, Activity, ActivityTypes, Attachment, AttachmentLayoutTypes, CardAction, InputHints, SuggestedActions } from '@microsoft/agents-activity'

/**
 * A factory class for creating various types of message activities.
 */
export class MessageFactory {
  /**
   * Creates a text message activity.
   * @param text The text of the message.
   * @param speak (Optional) The text to be spoken by the agent.
   * @param inputHint (Optional) The input hint for the message.
   * @returns The created text message activity.
   */
  static text (text: string, speak?: string, inputHint?: InputHints | string): Activity {
    let msgObj = {}
    msgObj = {
      type: ActivityTypes.Message,
      text,
      inputHint: inputHint || InputHints.AcceptingInput
    }
    if (speak) {
      msgObj = { ...msgObj, speak }
    }
    const msg = Activity.fromObject(msgObj)
    return msg
  }

  /**
   * Creates a message activity with suggested actions.
   * @param actions The suggested actions.
   * @param text (Optional) The text of the message.
   * @param speak (Optional) The text to be spoken by the agent.
   * @param inputHint (Optional) The input hint for the message.
   * @returns The created message activity with suggested actions.
   */
  static suggestedActions (
    actions: Array<CardAction | string>,
    text?: string,
    speak?: string,
    inputHint?: InputHints | string
  ): Activity {
    const formattedActions: CardAction[] = (actions || []).map((action) => {
      if (typeof action === 'object') {
        return action
      } else {
        return {
          type: ActionTypes.ImBack,
          value: { text: action.toString() },
          title: action.toString(),
          channelData: undefined
        }
      }
    })
    const msgObj = {
      type: ActivityTypes.Message,
      inputHint: inputHint || InputHints.AcceptingInput,
      suggestedActions: { actions: formattedActions, to: [] } as SuggestedActions
    }
    const msg = Activity.fromObject(msgObj)
    if (text) {
      msg.text = text
    }
    if (speak) {
      msg.speak = speak
    }
    return msg
  }

  /**
   * Creates a message activity with a single attachment.
   * @param attachment The attachment to include in the message.
   * @param text (Optional) The text of the message.
   * @param speak (Optional) The text to be spoken by the agent.
   * @param inputHint (Optional) The input hint for the message.
   * @returns The created message activity with an attachment.
   */
  static attachment (
    attachment: Attachment,
    text?: string,
    speak?: string,
    inputHint?: InputHints | string
  ): Activity {
    return attachmentActivity(AttachmentLayoutTypes.List, [attachment], text, speak, inputHint)
  }

  /**
   * Creates a message activity with a list of attachments.
   * @param attachments The list of attachments to include in the message.
   * @param text (Optional) The text of the message.
   * @param speak (Optional) The text to be spoken by the agent.
   * @param inputHint (Optional) The input hint for the message.
   * @returns The created message activity with a list of attachments.
   */
  static list (
    attachments: Attachment[],
    text?: string,
    speak?: string,
    inputHint?: InputHints | string
  ): Activity {
    return attachmentActivity(AttachmentLayoutTypes.List, attachments, text, speak, inputHint)
  }

  /**
   * Creates a message activity with a carousel of attachments.
   * @param attachments The list of attachments to include in the carousel.
   * @param text (Optional) The text of the message.
   * @param speak (Optional) The text to be spoken by the agent.
   * @param inputHint (Optional) The input hint for the message.
   * @returns The created message activity with a carousel of attachments.
   */
  static carousel (
    attachments: Attachment[],
    text?: string,
    speak?: string,
    inputHint?: InputHints | string
  ): Activity {
    return attachmentActivity(AttachmentLayoutTypes.Carousel, attachments, text, speak, inputHint)
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
  static contentUrl (
    url: string,
    contentType: string,
    name?: string,
    text?: string,
    speak?: string,
    inputHint?: InputHints | string
  ): Activity {
    const a: Attachment = { contentType, contentUrl: url }
    if (name) {
      a.name = name
    }
    return attachmentActivity(AttachmentLayoutTypes.List, [a], text, speak, inputHint)
  }
}

/**
 * Creates a message activity with attachments.
 * @param attachmentLayout The layout for the attachments.
 * @param attachments The list of attachments to include in the message.
 * @param text (Optional) The text of the message.
 * @param speak (Optional) The text to be spoken by the agent.
 * @param inputHint (Optional) The input hint for the message.
 * @returns The created message activity with attachments.
 */
function attachmentActivity (
  attachmentLayout: AttachmentLayoutTypes,
  attachments: Attachment[],
  text?: string,
  speak?: string,
  inputHint?: InputHints | string
): Activity {
  const msgObj = {
    type: ActivityTypes.Message,
    attachmentLayout,
    attachments,
    inputHint: inputHint || InputHints.AcceptingInput
  }
  const msg = Activity.fromObject(msgObj)
  if (text) {
    msg.text = text
  }
  if (speak) {
    msg.speak = speak
  }
  return msg
}
