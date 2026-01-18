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
	 */
	chatId: string | Expression<string>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Get the Administrators of a chat */
export type TelegramV12ChatAdministratorsConfig = {
	resource: 'chat';
	operation: 'administrators';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Get the member of a chat */
export type TelegramV12ChatMemberConfig = {
	resource: 'chat';
	operation: 'member';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Unique identifier of the target user
	 */
	userId: string | Expression<string>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Leave a group, supergroup or channel */
export type TelegramV12ChatLeaveConfig = {
	resource: 'chat';
	operation: 'leave';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Set the description of a chat */
export type TelegramV12ChatSetDescriptionConfig = {
	resource: 'chat';
	operation: 'setDescription';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * New chat description, 0-255 characters
	 */
	description: string | Expression<string>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Set the title of a chat */
export type TelegramV12ChatSetTitleConfig = {
	resource: 'chat';
	operation: 'setTitle';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * New chat title, 1-255 characters
	 */
	title: string | Expression<string>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send answer to callback query sent from inline keyboard */
export type TelegramV12CallbackAnswerQueryConfig = {
	resource: 'callback';
	operation: 'answerQuery';
	/**
	 * Unique identifier for the query to be answered
	 */
	queryId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send answer to callback query sent from inline bot */
export type TelegramV12CallbackAnswerInlineQueryConfig = {
	resource: 'callback';
	operation: 'answerInlineQuery';
	/**
	 * Unique identifier for the answered query
	 */
	queryId: string | Expression<string>;
	/**
	 * A JSON-serialized array of results for the inline query
	 */
	results: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Get up to date information about a chat */
export type TelegramV12FileGetConfig = {
	resource: 'file';
	operation: 'get';
	/**
	 * The ID of the file
	 */
	fileId: string | Expression<string>;
	/**
	 * Whether to download the file
	 * @default true
	 */
	download?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Delete a chat message */
export type TelegramV12MessageDeleteMessageConfig = {
	resource: 'message';
	operation: 'deleteMessage';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Unique identifier of the message to delete
	 */
	messageId: string | Expression<string>;
	forceReply?: Record<string, unknown>;
	/**
	 * Adds an inline keyboard that appears right next to the message it belongs to
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Edit a text message */
export type TelegramV12MessageEditMessageTextConfig = {
	resource: 'message';
	operation: 'editMessageText';
	/**
	 * The type of the message to edit
	 * @default message
	 */
	messageType?: 'inlineMessage' | 'message' | Expression<string>;
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Unique identifier of the message to edit
	 */
	messageId: string | Expression<string>;
	/**
	 * Unique identifier of the inline message to edit
	 */
	inlineMessageId: string | Expression<string>;
	/**
	 * Additional interface options
	 * @default none
	 */
	replyMarkup?: 'none' | 'inlineKeyboard' | Expression<string>;
	/**
	 * Text of the message to be sent
	 */
	text: string | Expression<string>;
	forceReply?: Record<string, unknown>;
	/**
	 * Adds an inline keyboard that appears right next to the message it belongs to
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Unique identifier of the message to pin or unpin
	 */
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	forceReply?: Record<string, unknown>;
	/**
	 * Adds an inline keyboard that appears right next to the message it belongs to
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send an animated file */
export type TelegramV12MessageSendAnimationConfig = {
	resource: 'message';
	operation: 'sendAnimation';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * Name of the binary property that contains the data to upload
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Animation to send. Pass a file_id to send an animation that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get an animation from the Internet.
	 */
	file?: string | Expression<string>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * Name of the binary property that contains the data to upload
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Audio file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.
	 */
	file?: string | Expression<string>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Type of action to broadcast. Choose one, depending on what the user is about to receive. The status is set for 5 seconds or less (when a message arrives from your bot).
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
};

/** Send a document */
export type TelegramV12MessageSendDocumentConfig = {
	resource: 'message';
	operation: 'sendDocument';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * Name of the binary property that contains the data to upload
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Document to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.
	 */
	file?: string | Expression<string>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Location latitude
	 * @default 0
	 */
	latitude?: number | Expression<number>;
	/**
	 * Location longitude
	 * @default 0
	 */
	longitude?: number | Expression<number>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * The media to add
	 * @default {}
	 */
	media?: Record<string, unknown>;
	forceReply?: Record<string, unknown>;
	/**
	 * Adds an inline keyboard that appears right next to the message it belongs to
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Text of the message to be sent
	 */
	text: string | Expression<string>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
	replyKeyboardOptions?: Record<string, unknown>;
	replyKeyboardRemove?: Record<string, unknown>;
	/**
	 * Unique identifier for the target chat or username of the target channel (in the format @channelusername). To find your chat ID ask @get_id_bot.
	 */
	chatId: string | Expression<string>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: Record<string, unknown>;
	approvalOptions?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Send a photo */
export type TelegramV12MessageSendPhotoConfig = {
	resource: 'message';
	operation: 'sendPhoto';
	/**
	 * Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot
	 */
	chatId: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * Name of the binary property that contains the data to upload
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Photo to send. Pass a file_id to send a photo that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a photo from the Internet.
	 */
	file?: string | Expression<string>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * Name of the binary property that contains the data to upload
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Sticker to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a .webp file from the Internet.
	 */
	file?: string | Expression<string>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * Name of the binary property that contains the data to upload
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Video file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.
	 */
	file?: string | Expression<string>;
	/**
	 * Additional interface options
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
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
	 */
	chatId: string | Expression<string>;
	/**
	 * Unique identifier of the message to pin or unpin
	 */
	messageId: string | Expression<string>;
	forceReply?: Record<string, unknown>;
	/**
	 * Adds an inline keyboard that appears right next to the message it belongs to
	 * @default {}
	 */
	inlineKeyboard?: Record<string, unknown>;
	/**
	 * Adds a custom keyboard with reply options
	 * @default {}
	 */
	replyKeyboard?: Record<string, unknown>;
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
