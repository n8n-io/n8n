/**
 * Telegram Node - Version 1.1
 * Sends data to Telegram
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Credentials
// ===========================================================================

export interface TelegramV11Credentials {
	telegramApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TelegramV11Node = {
	type: 'n8n-nodes-base.telegram';
	version: 1.1;
	config: NodeConfig<TelegramV11Params>;
	credentials?: TelegramV11Credentials;
};