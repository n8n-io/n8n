import { INodeProperties } from 'n8n-workflow';
import {
	blockCobtactProperties,
	budinessProfileProperties,
	markMSGReadProperties,
	onWhatsappProperties,
	profilePictureProperties,
	statusContactPorperties,
	updatePresence,
	updateStatusProperties,
} from './descriptions/Chat.desc';
import {
	acceptInviteCodeProperties,
	changeExpirationProperties,
	createGroupPrperties,
	fetchParticipantsProperties,
	groupInviteCodeProperties,
	groupMetadataProperties,
	leaveGroupProperties,
	revokeInviteCodeProperties,
	updateGroupProperties,
	updateParticipantsPorperties,
	updatePropfilePictureProperties,
	updateRuleGroupProperties,
} from './descriptions/Group.desc';
import {
	buttonsProperties,
	contactProperties,
	linkPreviewProperties,
	listProperties,
	locationProperties,
	mediaBase64MessgeProperties,
	mediaMessageProperties,
	optionsProperties,
	templateProperties,
	textProperties,
	whatsAppAudioProperties,
} from './descriptions/SendMessage.desc';
import { formatNumber } from './Generic.func';

const messageResource: INodeProperties[] = [
	{
		displayName: 'List Recipient Phone Numbers',
		name: 'listPhoneNumbers',
		type: 'json',
		default: [],
		placeholder: `[Array:['5531900000000, '5521911111111']] or 5531922222222`,
		description: 'This field supports both a list and a single number',
		hint: 'When entering a phone number, make sure to include the country code',
		routing: { send: { type: 'body', property: 'numbers', preSend: [formatNumber] } },
		displayOptions: { show: { resource: ['sendMessage'] } },
	},

	/**┌──────────────────────────────┐
	 * │      Options Properties      │
	 * └──────────────────────────────┘
	 */
	...optionsProperties,

	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		placeholder: '',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Send Buttons',
				value: 'sendButtons',
				action: 'Send buttons a send message',
			},
			{
				name: 'Send Contact',
				value: 'sendContact',
				action: 'Send contact a send message',
			},
			{
				name: 'Send Link Preview',
				value: 'sendLinkPreview',
				action: 'Send link preview a send message',
			},
			{
				name: 'Send List',
				value: 'sendList',
				action: 'Send list a send message',
			},
			{
				name: 'Send Location',
				value: 'sendLocation',
				action: 'Send location a send message',
			},
			{
				name: 'Send Media',
				value: 'sendMedia',
				action: 'Send media a send message',
			},
			{
				name: 'Send Media Base64',
				value: 'sendMediaBase64',
				action: 'Send media base64 a send message',
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				action: 'Send template a send message',
			},
			{
				name: 'Send Text',
				value: 'sendText',
				action: 'Send text a send message',
			},
			{
				name: 'Send WhatsApp Audio',
				value: 'sendWhatsAppAudio',
				action: 'Send whats app audio a send message',
			},
		],
		default: 'sendText',
		routing: { request: { ignoreHttpStatusErrors: true } },
		displayOptions: { show: { resource: ['sendMessage'] } },
	},

	/**┌───────────────────────────┐
	 * │      Text Properties      │
	 * └───────────────────────────┘
	 */
	...textProperties,

	/**┌──────────────────────────────┐
	 * │      Buttons Properties      │
	 * └──────────────────────────────┘
	 */
	...buttonsProperties,

	/**┌───────────────────────────────┐
	 * │      Template Properties      │
	 * └───────────────────────────────┘
	 */
	...templateProperties,

	/**┌────────────────────────────┐
	 * │      Media Properties      │
	 * └────────────────────────────┘
	 */
	...mediaMessageProperties,

	/**┌───────────────────────────────────┐
	 * │      Media Base64 Properties      │
	 * └───────────────────────────────────┘
	 */
	...mediaBase64MessgeProperties,

	/**┌───────────────────────────────┐
	 * │      WhatsApp Properties      │
	 * └───────────────────────────────┘
	 */
	...whatsAppAudioProperties,

	/**┌───────────────────────────────┐
	 * │      Location Properties      │
	 * └───────────────────────────────┘
	 */
	...locationProperties,

	/**┌───────────────────────────┐
	 * │      List Properties      │
	 * └───────────────────────────┘
	 */
	...listProperties,

	/**┌───────────────────────────────────┐
	 * │      Link Preview Properties      │
	 * └───────────────────────────────────┘
	 */
	...linkPreviewProperties,

	/**┌───────────────────────────────┐
	 * │       Contact Properties      │
	 * └───────────────────────────────┘
	 */
	...contactProperties,
];

const chatResource: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		placeholder: '',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Block Contact',
				value: 'blockContact',
				action: 'Block contact a chat',
			},
			{
				name: 'Business Profile',
				value: 'businesProfile',
				action: 'Business profile a chat',
			},
			{
				name: 'Contact Status',
				value: 'contactStatus',
				action: 'Contact status a chat',
			},
			{
				name: 'Mark Message As Read',
				value: 'markMessageAsRead',
				action: 'Mark message as read a chat',
			},
			{
				name: 'On WhatsApp',
				value: 'onWhatsApp',
				action: 'On whats app a chat',
			},
			{
				name: 'Profile Picture Url',
				value: 'profilePictureUrl',
				action: 'Profile picture url a chat',
			},
			{
				name: 'Update Presence',
				value: 'updatePresence',
				action: 'Update presence a chat',
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				action: 'Update status a chat',
			},
		],
		default: 'onWhatsApp',
		routing: { request: { ignoreHttpStatusErrors: true } },
		displayOptions: { show: { resource: ['chat'] } },
	},

	/**┌───────────────────────────────────┐
	 * │      On WhatsApp Properties       │
	 * └───────────────────────────────────┘
	 */
	...onWhatsappProperties,

	/**┌───────────────────────────────────────┐
	 * │      Update Presence Properties       │
	 * └───────────────────────────────────────┘
	 */
	...updatePresence,

	/**┌───────────────────────────────────┐
	 * │      Read Message Properties      │
	 * └───────────────────────────────────┘
	 */
	...markMSGReadProperties,

	/**┌────────────────────────────────────┐
	 * │      Block Contact Properties      │
	 * └────────────────────────────────────┘
	 */
	...blockCobtactProperties,

	/**┌─────────────────────────────────────┐
	 * │      Status Contact Properties      │
	 * └─────────────────────────────────────┘
	 */
	...statusContactPorperties,

	/**┌────────────────────────────────────┐
	 * │      Update Status Properties      │
	 * └────────────────────────────────────┘
	 */
	...updateStatusProperties,

	/**┌───────────────────────────────────────┐
	 * │      Business Profile Properties      │
	 * └───────────────────────────────────────┘
	 */
	...budinessProfileProperties,

	/**┌──────────────────────────────────────┐
	 * │      Profile Picture Properties      │
	 * └──────────────────────────────────────┘
	 */
	...profilePictureProperties,
];

const groupResource: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		required: true,
		noDataExpression: true,
		type: 'options',
		options: [
			{
				name: 'Accept Invite',
				value: 'acceptInvite',
				action: 'Accept invite a group',
			},
			{
				name: 'Change Expiration',
				value: 'changeExpiration',
				action: 'Change expiration a group',
			},
			{
				name: 'Create Group',
				value: 'createGroup',
				action: 'Create group a group',
			},
			{
				name: 'Fetch Participants',
				value: 'fetchParticpants',
				action: 'Fetch participants a group',
			},
			{
				name: 'Group Metadata',
				value: 'groupMetadata',
				action: 'Group metadata a group',
			},
			{
				name: 'Invite Code',
				value: 'inviteCode',
				action: 'Invite code a group',
			},
			{
				name: 'Leave the Group',
				value: 'leaveGroup',
				action: 'Leave the group a group',
			},
			{
				name: 'Revoke Invite',
				value: 'revokeInvite',
				action: 'Revoke invite a group',
			},
			{
				name: 'Update Info',
				value: 'updateInfo',
				action: 'Update info a group',
			},
			{
				name: 'Update Participants',
				value: 'updateParticipants',
				action: 'Update participants a group',
			},
			{
				name: 'Update Profile Picture',
				value: 'updatePicture',
				action: 'Update profile picture a group',
			},
			{
				name: 'Update Rules',
				value: 'updateRule',
				action: 'Update rules a group',
			},
		],
		default: 'createGroup',
		displayOptions: {
			show: { resource: ['group'] },
		},
	},

	/**┌───────────────────────────────────┐
	 * │      Create Group Properties      │
	 * └───────────────────────────────────┘
	 */
	...createGroupPrperties,

	/**┌──────────────────────────────────┐
	 * │      Invite Code Properties      │
	 * └──────────────────────────────────┘
	 */
	...groupInviteCodeProperties,

	/**┌────────────────────────────────────┐
	 * │      Accept Invite Properties      │
	 * └────────────────────────────────────┘
	 */
	...acceptInviteCodeProperties,

	/**┌────────────────────────────────────┐
	 * │      Revoke Invite Properties      │
	 * └────────────────────────────────────┘
	 */
	...revokeInviteCodeProperties,

	/**┌───────────────────────────────────┐
	 * │      Update Group Properties      │
	 * └───────────────────────────────────┘
	 */
	...updateGroupProperties,

	/**┌─────────────────────────────────────────────┐
	 * │      Update Profile Picture Properties      │
	 * └─────────────────────────────────────────────┘
	 */
	...updatePropfilePictureProperties,

	/**┌─────────────────────────────────────┐
	 * │      Group Metadata Properties      │
	 * └─────────────────────────────────────┘
	 */
	...groupMetadataProperties,

	/**┌──────────────────────────────────────────┐
	 * │      Update Participants Properties      │
	 * └──────────────────────────────────────────┘
	 */
	...updateParticipantsPorperties,

	/**┌──────────────────────────────────────┐
	 * │      Update Settings Properties      │
	 * └──────────────────────────────────────┘
	 */
	...updateRuleGroupProperties,

	/**┌────────────────────────────────────────┐
	 * │      Change Expiration Properties      │
	 * └────────────────────────────────────────┘
	 */
	...changeExpirationProperties,

	/**┌────────────────────────────────────────────┐
	 * │      Retrieve Participants Properties      │
	 * └────────────────────────────────────────────┘
	 */
	...fetchParticipantsProperties,

	/**┌──────────────────────────────────┐
	 * │      Leave Group Properties      │
	 * └──────────────────────────────────┘
	 */
	...leaveGroupProperties,
];

export const codechatFields: INodeProperties[] = [
	/**┌─────────────────────────────┐
	 * │      Resource: Message      │
	 * └─────────────────────────────┘
	 */
	...messageResource,

	/**┌──────────────────────────┐
	 * │      Resource: Caht      │
	 * └──────────────────────────┘
	 */
	...chatResource,

	/**┌───────────────────────────┐
	 * │      Resource: Group      │
	 * └───────────────────────────┘
	 */
	...groupResource,
];
