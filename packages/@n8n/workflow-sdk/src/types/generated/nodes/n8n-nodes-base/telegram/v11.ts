/**
 * Telegram Node - Version 1.1
 * Sends data to Telegram
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get up to date information about a chat */
export type TelegramV11ChatGetConfig = {
	resource: 'chat';
	operation: 'get';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Get the Administrators of a chat */
export type TelegramV11ChatAdministratorsConfig = {
	resource: 'chat';
	operation: 'administrators';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Get the member of a chat */
export type TelegramV11ChatMemberConfig = {
	resource: 'chat';
	operation: 'member';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Unique identifier of the target user
 * @displayOptions.show { operation: ["member"], resource: ["chat"] }
 */
		userId: string | Expression<string>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Leave a group, supergroup or channel */
export type TelegramV11ChatLeaveConfig = {
	resource: 'chat';
	operation: 'leave';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Set the description of a chat */
export type TelegramV11ChatSetDescriptionConfig = {
	resource: 'chat';
	operation: 'setDescription';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * New chat description, 0-255 characters
 * @displayOptions.show { operation: ["setDescription"], resource: ["chat"] }
 */
		description: string | Expression<string>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Set the title of a chat */
export type TelegramV11ChatSetTitleConfig = {
	resource: 'chat';
	operation: 'setTitle';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * New chat title, 1-255 characters
 * @displayOptions.show { operation: ["setTitle"], resource: ["chat"] }
 */
		title: string | Expression<string>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send answer to callback query sent from inline keyboard */
export type TelegramV11CallbackAnswerQueryConfig = {
	resource: 'callback';
	operation: 'answerQuery';
/**
 * Unique identifier for the query to be answered
 * @displayOptions.show { operation: ["answerQuery"], resource: ["callback"] }
 */
		queryId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send answer to callback query sent from inline bot */
export type TelegramV11CallbackAnswerInlineQueryConfig = {
	resource: 'callback';
	operation: 'answerInlineQuery';
/**
 * Unique identifier for the answered query
 * @displayOptions.show { operation: ["answerInlineQuery"], resource: ["callback"] }
 */
		queryId: string | Expression<string>;
/**
 * A JSON-serialized array of results for the inline query
 * @displayOptions.show { operation: ["answerInlineQuery"], resource: ["callback"] }
 */
		results: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Get up to date information about a chat */
export type TelegramV11FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * The ID of the file
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 */
		fileId: string | Expression<string>;
/**
 * Whether to download the file
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 * @default true
 */
		download?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Delete a chat message */
export type TelegramV11MessageDeleteMessageConfig = {
	resource: 'message';
	operation: 'deleteMessage';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Unique identifier of the message to delete
 * @displayOptions.show { operation: ["deleteMessage"], resource: ["message"] }
 */
		messageId: string | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Edit a text message */
export type TelegramV11MessageEditMessageTextConfig = {
	resource: 'message';
	operation: 'editMessageText';
/**
 * The type of the message to edit
 * @displayOptions.show { operation: ["editMessageText"], resource: ["message"] }
 * @default message
 */
		messageType?: 'inlineMessage' | 'message' | Expression<string>;
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { messageType: ["message"], operation: ["editMessageText"], resource: ["message"] }
 */
		chatId: string | Expression<string>;
/**
 * Unique identifier of the message to edit
 * @displayOptions.show { messageType: ["message"], operation: ["editMessageText"], resource: ["message"] }
 */
		messageId: string | Expression<string>;
/**
 * Unique identifier of the inline message to edit
 * @displayOptions.show { messageType: ["inlineMessage"], operation: ["editMessageText"], resource: ["message"] }
 */
		inlineMessageId: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["editMessageText"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'none' | 'inlineKeyboard' | Expression<string>;
/**
 * Text of the message to be sent
 * @displayOptions.show { operation: ["editMessageText", "sendMessage"], resource: ["message"] }
 */
		text: string | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Pin a chat message */
export type TelegramV11MessagePinChatMessageConfig = {
	resource: 'message';
	operation: 'pinChatMessage';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Unique identifier of the message to pin or unpin
 * @displayOptions.show { operation: ["pinChatMessage", "unpinChatMessage"], resource: ["message"] }
 */
		messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send an animated file */
export type TelegramV11MessageSendAnimationConfig = {
	resource: 'message';
	operation: 'sendAnimation';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * Name of the binary property that contains the data to upload
 * @hint The name of the input binary field containing the file to be written
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Animation to send. Pass a file_id to send an animation that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get an animation from the Internet.
 * @displayOptions.show { operation: ["sendAnimation"], resource: ["message"], binaryData: [false] }
 */
		file?: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send a audio file */
export type TelegramV11MessageSendAudioConfig = {
	resource: 'message';
	operation: 'sendAudio';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * Name of the binary property that contains the data to upload
 * @hint The name of the input binary field containing the file to be written
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Audio file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.
 * @displayOptions.show { operation: ["sendAudio"], resource: ["message"], binaryData: [false] }
 */
		file?: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send a chat action */
export type TelegramV11MessageSendChatActionConfig = {
	resource: 'message';
	operation: 'sendChatAction';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Type of action to broadcast. Choose one, depending on what the user is about to receive. The status is set for 5 seconds or less (when a message arrives from your bot).
 * @displayOptions.show { operation: ["sendChatAction"], resource: ["message"] }
 * @default typing
 */
		action?: 'find_location' | 'record_audio' | 'record_video' | 'record_video_note' | 'typing' | 'upload_audio' | 'upload_document' | 'upload_photo' | 'upload_video' | 'upload_video_note' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send a document */
export type TelegramV11MessageSendDocumentConfig = {
	resource: 'message';
	operation: 'sendDocument';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * Name of the binary property that contains the data to upload
 * @hint The name of the input binary field containing the file to be written
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Document to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.
 * @displayOptions.show { operation: ["sendDocument"], resource: ["message"], binaryData: [false] }
 */
		file?: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send a location */
export type TelegramV11MessageSendLocationConfig = {
	resource: 'message';
	operation: 'sendLocation';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Location latitude
 * @displayOptions.show { operation: ["sendLocation"], resource: ["message"] }
 * @default 0
 */
		latitude?: number | Expression<number>;
/**
 * Location longitude
 * @displayOptions.show { operation: ["sendLocation"], resource: ["message"] }
 * @default 0
 */
		longitude?: number | Expression<number>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send group of photos or videos to album */
export type TelegramV11MessageSendMediaGroupConfig = {
	resource: 'message';
	operation: 'sendMediaGroup';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * The media to add
 * @displayOptions.show { operation: ["sendMediaGroup"], resource: ["message"] }
 * @default {}
 */
		media?: {
		media?: Array<{
			/** The type of the media to add
			 * @default photo
			 */
			type?: 'photo' | 'video' | Expression<string>;
			/** Media to send. Pass a file_id to send a file that exists on the Telegram servers (recommended) or pass an HTTP URL for Telegram to get a file from the Internet.
			 */
			media?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send a text message */
export type TelegramV11MessageSendMessageConfig = {
	resource: 'message';
	operation: 'sendMessage';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Text of the message to be sent
 * @displayOptions.show { operation: ["editMessageText", "sendMessage"], resource: ["message"] }
 */
		text: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send a message and wait for response */
export type TelegramV11MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
/**
 * Unique identifier for the target chat or username of the target channel (in the format @channelusername). To find your chat ID ask @get_id_bot.
 * @displayOptions.show { resource: ["message"], operation: ["sendAndWait"] }
 */
		chatId: string | Expression<string>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	approvalOptions?: {
		values?: {
			/** Type of Approval
			 * @default single
			 */
			approvalType?: 'single' | 'double' | Expression<string>;
			/** Approve Button Label
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default ✅ Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default ❌ Decline
			 */
			disapproveLabel?: string | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

/** Send a photo */
export type TelegramV11MessageSendPhotoConfig = {
	resource: 'message';
	operation: 'sendPhoto';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * Name of the binary property that contains the data to upload
 * @hint The name of the input binary field containing the file to be written
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Photo to send. Pass a file_id to send a photo that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a photo from the Internet.
 * @displayOptions.show { operation: ["sendPhoto"], resource: ["message"], binaryData: [false] }
 */
		file?: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send a sticker */
export type TelegramV11MessageSendStickerConfig = {
	resource: 'message';
	operation: 'sendSticker';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * Name of the binary property that contains the data to upload
 * @hint The name of the input binary field containing the file to be written
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Sticker to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a .webp file from the Internet.
 * @displayOptions.show { operation: ["sendSticker"], resource: ["message"], binaryData: [false] }
 */
		file?: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Send a video */
export type TelegramV11MessageSendVideoConfig = {
	resource: 'message';
	operation: 'sendVideo';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * Name of the binary property that contains the data to upload
 * @hint The name of the input binary field containing the file to be written
 * @displayOptions.show { operation: ["sendAnimation", "sendAudio", "sendDocument", "sendPhoto", "sendVideo", "sendSticker"], resource: ["message"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Video file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.
 * @displayOptions.show { operation: ["sendVideo"], resource: ["message"], binaryData: [false] }
 */
		file?: string | Expression<string>;
/**
 * Additional interface options
 * @displayOptions.show { operation: ["sendAnimation", "sendDocument", "sendMessage", "sendPhoto", "sendSticker", "sendVideo", "sendAudio", "sendLocation"], resource: ["message"] }
 * @default none
 */
		replyMarkup?: 'forceReply' | 'inlineKeyboard' | 'none' | 'replyKeyboard' | 'replyKeyboardRemove' | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Unpin a chat message */
export type TelegramV11MessageUnpinChatMessageConfig = {
	resource: 'message';
	operation: 'unpinChatMessage';
/**
 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
 * @displayOptions.show { operation: ["administrators", "deleteMessage", "get", "leave", "member", "pinChatMessage", "setDescription", "setTitle", "sendAnimation", "sendAudio", "sendChatAction", "sendDocument", "sendLocation", "sendMessage", "sendMediaGroup", "sendPhoto", "sendSticker", "sendVideo", "unpinChatMessage"], resource: ["chat", "message"] }
 */
		chatId: string | Expression<string>;
/**
 * Unique identifier of the message to pin or unpin
 * @displayOptions.show { operation: ["pinChatMessage", "unpinChatMessage"], resource: ["message"] }
 */
		messageId: string | Expression<string>;
	forceReply?: Record<string, unknown>;
/**
 * Adds an inline keyboard that appears right next to the message it belongs to
 * @displayOptions.show { replyMarkup: ["inlineKeyboard"], resource: ["message"] }
 * @default {}
 */
		inlineKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Label text on the button
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
/**
 * Adds a custom keyboard with reply options
 * @displayOptions.show { replyMarkup: ["replyKeyboard"] }
 * @default {}
 */
		replyKeyboard?: {
		rows?: Array<{
			/** The value to set
			 * @default {}
			 */
			row?: {
		buttons?: Array<{
			/** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.
			 */
			text?: string | Expression<string>;
			/** Additional Fields
			 * @default {}
			 */
			additionalFields?: Record<string, unknown>;
		}>;
	};
		}>;
	};
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

export type TelegramV11Params =
	| TelegramV11ChatGetConfig
	| TelegramV11ChatAdministratorsConfig
	| TelegramV11ChatMemberConfig
	| TelegramV11ChatLeaveConfig
	| TelegramV11ChatSetDescriptionConfig
	| TelegramV11ChatSetTitleConfig
	| TelegramV11CallbackAnswerQueryConfig
	| TelegramV11CallbackAnswerInlineQueryConfig
	| TelegramV11FileGetConfig
	| TelegramV11MessageDeleteMessageConfig
	| TelegramV11MessageEditMessageTextConfig
	| TelegramV11MessagePinChatMessageConfig
	| TelegramV11MessageSendAnimationConfig
	| TelegramV11MessageSendAudioConfig
	| TelegramV11MessageSendChatActionConfig
	| TelegramV11MessageSendDocumentConfig
	| TelegramV11MessageSendLocationConfig
	| TelegramV11MessageSendMediaGroupConfig
	| TelegramV11MessageSendMessageConfig
	| TelegramV11MessageSendAndWaitConfig
	| TelegramV11MessageSendPhotoConfig
	| TelegramV11MessageSendStickerConfig
	| TelegramV11MessageSendVideoConfig
	| TelegramV11MessageUnpinChatMessageConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type TelegramV11ChatGetOutput = {
	ok?: boolean;
	result?: {
		accent_color_id?: number;
		accepted_gift_types?: {
			limited_gifts?: boolean;
			premium_subscription?: boolean;
			unique_gifts?: boolean;
			unlimited_gifts?: boolean;
		};
		active_usernames?: Array<string>;
		can_send_gift?: boolean;
		first_name?: string;
		id?: number;
		max_reaction_count?: number;
		type?: string;
		username?: string;
	};
};

export type TelegramV11ChatAdministratorsOutput = {
	can_be_edited?: boolean;
	can_change_info?: boolean;
	can_delete_messages?: boolean;
	can_delete_stories?: boolean;
	can_edit_stories?: boolean;
	can_invite_users?: boolean;
	can_manage_chat?: boolean;
	can_manage_topics?: boolean;
	can_manage_video_chats?: boolean;
	can_manage_voice_chats?: boolean;
	can_pin_messages?: boolean;
	can_post_stories?: boolean;
	can_promote_members?: boolean;
	can_restrict_members?: boolean;
	is_anonymous?: boolean;
	status?: string;
	user?: {
		first_name?: string;
		id?: number;
		is_bot?: boolean;
		language_code?: string;
		last_name?: string;
		username?: string;
	};
};

export type TelegramV11ChatMemberOutput = {
	ok?: boolean;
	result?: {
		is_anonymous?: boolean;
		status?: string;
		user?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			language_code?: string;
			username?: string;
		};
	};
};

export type TelegramV11ChatLeaveOutput = {
	ok?: boolean;
	result?: boolean;
};

export type TelegramV11CallbackAnswerQueryOutput = {
	ok?: boolean;
	result?: boolean;
};

export type TelegramV11FileGetOutput = {
	ok?: boolean;
	result?: {
		file_id?: string;
		file_path?: string;
		file_size?: number;
		file_unique_id?: string;
	};
};

export type TelegramV11MessageDeleteMessageOutput = {
	ok?: boolean;
	result?: boolean;
};

export type TelegramV11MessageEditMessageTextOutput = {
	ok?: boolean;
	result?: {
		chat?: {
			first_name?: string;
			id?: number;
			type?: string;
			username?: string;
		};
		date?: number;
		edit_date?: number;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
		text?: string;
	};
};

export type TelegramV11MessagePinChatMessageOutput = {
	ok?: boolean;
	result?: boolean;
};

export type TelegramV11MessageSendAnimationOutput = {
	ok?: boolean;
	result?: {
		animation?: {
			duration?: number;
			file_id?: string;
			file_name?: string;
			file_size?: number;
			file_unique_id?: string;
			height?: number;
			mime_type?: string;
			thumb?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
			thumbnail?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
			width?: number;
		};
		chat?: {
			first_name?: string;
			id?: number;
			type?: string;
			username?: string;
		};
		date?: number;
		document?: {
			file_id?: string;
			file_name?: string;
			file_size?: number;
			file_unique_id?: string;
			mime_type?: string;
			thumb?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
			thumbnail?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
		};
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
	};
};

export type TelegramV11MessageSendAudioOutput = {
	ok?: boolean;
	result?: {
		audio?: {
			duration?: number;
			file_id?: string;
			file_name?: string;
			file_size?: number;
			file_unique_id?: string;
			mime_type?: string;
		};
		chat?: {
			first_name?: string;
			id?: number;
			last_name?: string;
			type?: string;
		};
		date?: number;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
	};
};

export type TelegramV11MessageSendChatActionOutput = {
	ok?: boolean;
	result?: boolean;
};

export type TelegramV11MessageSendDocumentOutput = {
	ok?: boolean;
	result?: {
		chat?: {
			first_name?: string;
			id?: number;
			last_name?: string;
			type?: string;
			username?: string;
		};
		date?: number;
		document?: {
			file_id?: string;
			file_name?: string;
			file_size?: number;
			file_unique_id?: string;
			mime_type?: string;
		};
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
	};
};

export type TelegramV11MessageSendLocationOutput = {
	ok?: boolean;
	result?: {
		chat?: {
			first_name?: string;
			id?: number;
			last_name?: string;
			type?: string;
			username?: string;
		};
		date?: number;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		location?: {
			latitude?: number;
			longitude?: number;
		};
		message_id?: number;
	};
};

export type TelegramV11MessageSendMediaGroupOutput = {
	ok?: boolean;
	result?: Array<{
		caption?: string;
		chat?: {
			first_name?: string;
			id?: number;
			type?: string;
			username?: string;
		};
		date?: number;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
		photo?: Array<{
			file_id?: string;
			file_size?: number;
			file_unique_id?: string;
			height?: number;
			width?: number;
		}>;
	}>;
};

export type TelegramV11MessageSendMessageOutput = {
	ok?: boolean;
	result?: {
		chat?: {
			first_name?: string;
			id?: number;
			last_name?: string;
			type?: string;
		};
		date?: number;
		entities?: Array<{
			length?: number;
			offset?: number;
			type?: string;
			url?: string;
		}>;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		link_preview_options?: {
			is_disabled?: boolean;
		};
		message_id?: number;
		text?: string;
	};
};

export type TelegramV11MessageSendAndWaitOutput = {
	data?: {
		text?: string;
	};
};

export type TelegramV11MessageSendPhotoOutput = {
	ok?: boolean;
	result?: {
		caption?: string;
		chat?: {
			first_name?: string;
			id?: number;
			type?: string;
			username?: string;
		};
		date?: number;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
		photo?: Array<{
			file_id?: string;
			file_size?: number;
			file_unique_id?: string;
			height?: number;
			width?: number;
		}>;
	};
};

export type TelegramV11MessageSendStickerOutput = {
	ok?: boolean;
	result?: {
		chat?: {
			first_name?: string;
			id?: number;
			last_name?: string;
			type?: string;
			username?: string;
		};
		date?: number;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
		sticker?: {
			emoji?: string;
			file_id?: string;
			file_size?: number;
			file_unique_id?: string;
			height?: number;
			is_animated?: boolean;
			is_video?: boolean;
			set_name?: string;
			thumb?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
			thumbnail?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
			type?: string;
			width?: number;
		};
	};
};

export type TelegramV11MessageSendVideoOutput = {
	ok?: boolean;
	result?: {
		caption?: string;
		chat?: {
			first_name?: string;
			id?: number;
			type?: string;
			username?: string;
		};
		date?: number;
		from?: {
			first_name?: string;
			id?: number;
			is_bot?: boolean;
			username?: string;
		};
		message_id?: number;
		video?: {
			duration?: number;
			file_id?: string;
			file_name?: string;
			file_size?: number;
			file_unique_id?: string;
			height?: number;
			mime_type?: string;
			thumb?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
			thumbnail?: {
				file_id?: string;
				file_size?: number;
				file_unique_id?: string;
				height?: number;
				width?: number;
			};
			width?: number;
		};
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface TelegramV11Credentials {
	telegramApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TelegramV11NodeBase {
	type: 'n8n-nodes-base.telegram';
	version: 1.1;
	credentials?: TelegramV11Credentials;
}

export type TelegramV11ChatGetNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11ChatGetConfig>;
	output?: TelegramV11ChatGetOutput;
};

export type TelegramV11ChatAdministratorsNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11ChatAdministratorsConfig>;
	output?: TelegramV11ChatAdministratorsOutput;
};

export type TelegramV11ChatMemberNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11ChatMemberConfig>;
	output?: TelegramV11ChatMemberOutput;
};

export type TelegramV11ChatLeaveNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11ChatLeaveConfig>;
	output?: TelegramV11ChatLeaveOutput;
};

export type TelegramV11ChatSetDescriptionNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11ChatSetDescriptionConfig>;
};

export type TelegramV11ChatSetTitleNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11ChatSetTitleConfig>;
};

export type TelegramV11CallbackAnswerQueryNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11CallbackAnswerQueryConfig>;
	output?: TelegramV11CallbackAnswerQueryOutput;
};

export type TelegramV11CallbackAnswerInlineQueryNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11CallbackAnswerInlineQueryConfig>;
};

export type TelegramV11FileGetNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11FileGetConfig>;
	output?: TelegramV11FileGetOutput;
};

export type TelegramV11MessageDeleteMessageNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageDeleteMessageConfig>;
	output?: TelegramV11MessageDeleteMessageOutput;
};

export type TelegramV11MessageEditMessageTextNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageEditMessageTextConfig>;
	output?: TelegramV11MessageEditMessageTextOutput;
};

export type TelegramV11MessagePinChatMessageNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessagePinChatMessageConfig>;
	output?: TelegramV11MessagePinChatMessageOutput;
};

export type TelegramV11MessageSendAnimationNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendAnimationConfig>;
	output?: TelegramV11MessageSendAnimationOutput;
};

export type TelegramV11MessageSendAudioNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendAudioConfig>;
	output?: TelegramV11MessageSendAudioOutput;
};

export type TelegramV11MessageSendChatActionNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendChatActionConfig>;
	output?: TelegramV11MessageSendChatActionOutput;
};

export type TelegramV11MessageSendDocumentNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendDocumentConfig>;
	output?: TelegramV11MessageSendDocumentOutput;
};

export type TelegramV11MessageSendLocationNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendLocationConfig>;
	output?: TelegramV11MessageSendLocationOutput;
};

export type TelegramV11MessageSendMediaGroupNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendMediaGroupConfig>;
	output?: TelegramV11MessageSendMediaGroupOutput;
};

export type TelegramV11MessageSendMessageNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendMessageConfig>;
	output?: TelegramV11MessageSendMessageOutput;
};

export type TelegramV11MessageSendAndWaitNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendAndWaitConfig>;
	output?: TelegramV11MessageSendAndWaitOutput;
};

export type TelegramV11MessageSendPhotoNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendPhotoConfig>;
	output?: TelegramV11MessageSendPhotoOutput;
};

export type TelegramV11MessageSendStickerNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendStickerConfig>;
	output?: TelegramV11MessageSendStickerOutput;
};

export type TelegramV11MessageSendVideoNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageSendVideoConfig>;
	output?: TelegramV11MessageSendVideoOutput;
};

export type TelegramV11MessageUnpinChatMessageNode = TelegramV11NodeBase & {
	config: NodeConfig<TelegramV11MessageUnpinChatMessageConfig>;
};

export type TelegramV11Node =
	| TelegramV11ChatGetNode
	| TelegramV11ChatAdministratorsNode
	| TelegramV11ChatMemberNode
	| TelegramV11ChatLeaveNode
	| TelegramV11ChatSetDescriptionNode
	| TelegramV11ChatSetTitleNode
	| TelegramV11CallbackAnswerQueryNode
	| TelegramV11CallbackAnswerInlineQueryNode
	| TelegramV11FileGetNode
	| TelegramV11MessageDeleteMessageNode
	| TelegramV11MessageEditMessageTextNode
	| TelegramV11MessagePinChatMessageNode
	| TelegramV11MessageSendAnimationNode
	| TelegramV11MessageSendAudioNode
	| TelegramV11MessageSendChatActionNode
	| TelegramV11MessageSendDocumentNode
	| TelegramV11MessageSendLocationNode
	| TelegramV11MessageSendMediaGroupNode
	| TelegramV11MessageSendMessageNode
	| TelegramV11MessageSendAndWaitNode
	| TelegramV11MessageSendPhotoNode
	| TelegramV11MessageSendStickerNode
	| TelegramV11MessageSendVideoNode
	| TelegramV11MessageUnpinChatMessageNode
	;