/**
 * Telegram Node Types
 *
 * Sends data to Telegram
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/telegram/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get up to date information about a chat */
export type TelegramV12ChatGetConfig = {
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
export type TelegramV12ChatAdministratorsConfig = {
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
export type TelegramV12ChatMemberConfig = {
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
export type TelegramV12ChatLeaveConfig = {
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
export type TelegramV12ChatSetDescriptionConfig = {
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
export type TelegramV12ChatSetTitleConfig = {
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
export type TelegramV12CallbackAnswerQueryConfig = {
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
export type TelegramV12CallbackAnswerInlineQueryConfig = {
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
export type TelegramV12FileGetConfig = {
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
export type TelegramV12MessageDeleteMessageConfig = {
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
export type TelegramV12MessageEditMessageTextConfig = {
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
export type TelegramV12MessagePinChatMessageConfig = {
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
export type TelegramV12MessageSendAnimationConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageSendAudioConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageSendChatActionConfig = {
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
	action?:
		| 'find_location'
		| 'record_audio'
		| 'record_video'
		| 'record_video_note'
		| 'typing'
		| 'upload_audio'
		| 'upload_document'
		| 'upload_photo'
		| 'upload_video'
		| 'upload_video_note'
		| Expression<string>;
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
export type TelegramV12MessageSendDocumentConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageSendLocationConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageSendMediaGroupConfig = {
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
export type TelegramV12MessageSendMessageConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageSendAndWaitConfig = {
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
	formFields?: {
		values?: Array<{
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [2.4] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"lt":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { fieldType: ["hiddenField"], @version: [{"_cnd":{"lt":2.4}}] }
			 */
			fieldName?: string | Expression<string>;
			/** The type of field to add to the form
			 * @default text
			 */
			fieldType?:
				| 'checkbox'
				| 'html'
				| 'date'
				| 'dropdown'
				| 'email'
				| 'file'
				| 'hiddenField'
				| 'number'
				| 'password'
				| 'radio'
				| 'text'
				| 'textarea'
				| Expression<string>;
			/** Optional field. It can be used to include the html in the output.
			 * @displayOptions.show { fieldType: ["html"] }
			 */
			elementName?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.5}}] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Sample text to display inside the field
			 * @displayOptions.hide { fieldType: ["dropdown", "date", "file", "html", "hiddenField", "radio", "checkbox"] }
			 */
			placeholder?: string | Expression<string>;
			/** Default value that will be pre-filled in the form field
			 * @displayOptions.show { fieldType: ["text", "number", "email", "textarea"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default date value that will be pre-filled in the form field (format: YYYY-MM-DD)
			 * @displayOptions.show { fieldType: ["date"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value that will be pre-selected. Must match one of the option labels.
			 * @displayOptions.show { fieldType: ["dropdown", "radio"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value(s) that will be pre-selected. Must match one or multiple of the option labels. Separate multiple pre-selected options with a comma.
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Input value can be set here or will be passed as a query parameter via Field Name if no value is set
			 * @displayOptions.show { fieldType: ["hiddenField"] }
			 */
			fieldValue?: string | Expression<string>;
			/** List of options that can be selected from the dropdown
			 * @displayOptions.show { fieldType: ["dropdown"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Option
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Checkboxes
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Checkbox Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Radio Buttons
			 * @displayOptions.show { fieldType: ["radio"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Radio Button Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Whether to allow the user to select multiple options from the dropdown list
			 * @displayOptions.show { fieldType: ["dropdown"], @version: [{"_cnd":{"lt":2.3}}] }
			 * @default false
			 */
			multiselect?: boolean | Expression<boolean>;
			/** Limit Selection
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default unlimited
			 */
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			/** Number of Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["exact"] }
			 * @default 1
			 */
			numberOfSelections?: number | Expression<number>;
			/** Minimum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 0
			 */
			minSelections?: number | Expression<number>;
			/** Maximum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 1
			 */
			maxSelections?: number | Expression<number>;
			/** HTML elements to display on the form page
			 * @hint Does not accept &lt;code&gt;&lt;script&gt;&lt;/code&gt;, &lt;code&gt;&lt;style&gt;&lt;/code&gt; or &lt;code&gt;&lt;input&gt;&lt;/code&gt; tags
			 * @displayOptions.show { fieldType: ["html"] }
			 * @default <!-- Your custom HTML here --->



			 */
			html?: string | Expression<string>;
			/** Whether to allow the user to select multiple files from the file input or just one
			 * @displayOptions.show { fieldType: ["file"] }
			 * @default true
			 */
			multipleFiles?: boolean | Expression<boolean>;
			/** Comma-separated list of allowed file extensions
			 * @hint Leave empty to allow all file types
			 * @displayOptions.show { fieldType: ["file"] }
			 */
			acceptFileTypes?: string | Expression<string>;
			/** Whether to require the user to enter a value for this field before submitting the form
			 * @displayOptions.hide { fieldType: ["html", "hiddenField"] }
			 * @default false
			 */
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
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
export type TelegramV12MessageSendPhotoConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageSendStickerConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageSendVideoConfig = {
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
	replyMarkup?:
		| 'forceReply'
		| 'inlineKeyboard'
		| 'none'
		| 'replyKeyboard'
		| 'replyKeyboardRemove'
		| Expression<string>;
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
export type TelegramV12MessageUnpinChatMessageConfig = {
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

export type TelegramV12Params =
	| TelegramV12ChatGetConfig
	| TelegramV12ChatAdministratorsConfig
	| TelegramV12ChatMemberConfig
	| TelegramV12ChatLeaveConfig
	| TelegramV12ChatSetDescriptionConfig
	| TelegramV12ChatSetTitleConfig
	| TelegramV12CallbackAnswerQueryConfig
	| TelegramV12CallbackAnswerInlineQueryConfig
	| TelegramV12FileGetConfig
	| TelegramV12MessageDeleteMessageConfig
	| TelegramV12MessageEditMessageTextConfig
	| TelegramV12MessagePinChatMessageConfig
	| TelegramV12MessageSendAnimationConfig
	| TelegramV12MessageSendAudioConfig
	| TelegramV12MessageSendChatActionConfig
	| TelegramV12MessageSendDocumentConfig
	| TelegramV12MessageSendLocationConfig
	| TelegramV12MessageSendMediaGroupConfig
	| TelegramV12MessageSendMessageConfig
	| TelegramV12MessageSendAndWaitConfig
	| TelegramV12MessageSendPhotoConfig
	| TelegramV12MessageSendStickerConfig
	| TelegramV12MessageSendVideoConfig
	| TelegramV12MessageUnpinChatMessageConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TelegramV12Credentials {
	telegramApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type TelegramV12Node = {
	type: 'n8n-nodes-base.telegram';
	version: 1 | 1.1 | 1.2;
	config: NodeConfig<TelegramV12Params>;
	credentials?: TelegramV12Credentials;
};

export type TelegramNode = TelegramV12Node;
