import {
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerFunctions,
	type ITriggerResponse,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import {
	buildEventItems,
	computeIntents,
	parseContentTypeFilter,
	type EventFilters,
} from './DiscordTrigger.helpers';
import { channelSearch, getRoles, guildSearch } from './DiscordTrigger.methods';
import { GatewayClient } from './GatewayClient';
import { channelRLC, guildRLC } from './v2/actions/common.description';

export class DiscordTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord Trigger',
		name: 'discordTrigger',
		icon: 'file:discord.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Discord events occur',
		defaults: {
			name: 'Discord Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger a Discord event (e.g. send a message in your server). This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, activate it. Then every matching Discord event will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger a Discord event (e.g. send a message in your server). This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every matching Discord event will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you've finished building your workflow, activate it to have it listen continuously (you just won't see those executions here). Note: the bot must be invited to the server, and message-content / member events require the matching privileged intents to be enabled in the Discord developer portal.",
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'discordBotApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['messageCreate'],
				description: 'The Discord events that should trigger the workflow',
				options: [
					{
						name: 'Member Added',
						value: 'memberAdd',
						description:
							'A new member joins the server (requires the Server Members privileged intent)',
					},
					{
						name: 'Member Left',
						value: 'memberRemove',
						description:
							'A member leaves or is removed from the server (requires the Server Members privileged intent)',
					},
					{
						name: 'Member Updated',
						value: 'memberUpdate',
						description:
							'A member is updated, e.g. roles or nickname change (requires the Server Members privileged intent)',
					},
					{
						name: 'Message Created',
						value: 'messageCreate',
						description:
							'A new message is sent (message text requires the Message Content privileged intent)',
					},
					{
						name: 'Message Deleted',
						value: 'messageDelete',
						description: 'A message is deleted',
					},
					{
						name: 'Message Reaction Added',
						value: 'reactionAdd',
						description: 'A reaction is added to a message',
					},
					{
						name: 'Message Reaction Removed',
						value: 'reactionRemove',
						description: 'A reaction is removed from a message',
					},
					{
						name: 'Message Updated',
						value: 'messageUpdate',
						description: 'A message is edited',
					},
				],
			},
			{
				...guildRLC,
				description: 'The server (guild) to listen to. The bot must be a member of this server.',
			},
			{
				...channelRLC,
				required: false,
				default: { mode: 'list', value: '' },
				description:
					'Only trigger on events in this channel. Leave empty to listen to all channels. Applies to message and reaction events.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Attachment Content Types',
						name: 'attachmentContentTypes',
						type: 'string',
						default: '',
						placeholder: 'e.g. image/*, application/pdf',
						hint: 'Comma-separated MIME types to require, with * wildcards (e.g. image/*, image/png). Use * for any attachment. Leave empty to not filter by attachments.',
						description:
							'Only fire for new or edited messages that have at least one attachment matching one of these MIME types. Leave empty to disable. Other event types are unaffected.',
					},
					{
						displayName: "Exclude My Bot's Own Messages and Reactions",
						name: 'excludeSelf',
						type: 'boolean',
						default: false,
						description:
							"Whether to ignore messages and reactions created by this bot's own user (useful to prevent loops)",
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
						displayName: 'Exclude Roles',
						name: 'excludeRoles',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getRoles',
							loadOptionsDependsOn: ['guildId.value'],
						},
						default: [],
						// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
						description:
							"Drop events from members who have any of these roles. Only applies to events that carry the member's roles (new/edited messages, reaction added, member added/updated); ignored where the event has no role data (message-deleted, reaction-removed, member-left).",
					},
					{
						displayName: 'Ignore Bot Messages',
						name: 'ignoreBots',
						type: 'boolean',
						default: false,
						description:
							'Whether to ignore messages sent by bots (including this one) for the "Message Created" event',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
						displayName: 'Include Roles',
						name: 'includeRoles',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getRoles',
							loadOptionsDependsOn: ['guildId.value'],
						},
						default: [],
						// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
						description:
							"Only fire for members who have at least one of these roles. Only applies to events that carry the member's roles (new/edited messages, reaction added, member added/updated); ignored where the event has no role data (message-deleted, reaction-removed, member-left).",
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			guildSearch,
			channelSearch,
		},
		loadOptions: {
			getRoles,
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const events = this.getNodeParameter('events', []) as string[];
		if (!events.length) {
			throw new NodeOperationError(this.getNode(), 'At least one event must be selected');
		}

		const guildId = this.getNodeParameter('guildId', '', { extractValue: true }) as string;
		const channelId = this.getNodeParameter('channelId', '', { extractValue: true }) as string;
		const options = this.getNodeParameter('options', {}) as {
			ignoreBots?: boolean;
			excludeSelf?: boolean;
			includeRoles?: string[];
			excludeRoles?: string[];
			attachmentContentTypes?: string;
		};

		const credentials = await this.getCredentials('discordBotApi');

		const filters: EventFilters = {
			selectedEvents: events,
			guildId,
			channelId,
			ignoreBots: options.ignoreBots ?? false,
			excludeSelf: options.excludeSelf ?? false,
			includeRoles: options.includeRoles ?? [],
			excludeRoles: options.excludeRoles ?? [],
			attachmentContentTypes: parseContentTypeFilter(options.attachmentContentTypes),
		};

		const client = new GatewayClient({
			token: credentials.botToken as string,
			intents: computeIntents(events),
			log: (message) => this.logger.debug(`[Discord Trigger] ${message}`),
		});

		// botUserId is read per-dispatch - it's known once READY arrives, which
		// always precedes the message/reaction dispatches the self-filter targets.
		const buildItems = (gatewayEvent: string, data: IDataObject): INodeExecutionData[] | null =>
			buildEventItems(gatewayEvent, data, { ...filters, botUserId: client.getBotUserId() });

		const manualTriggerFunction = async () =>
			await new Promise<void>((resolve, reject) => {
				client.on('dispatch', (gatewayEvent: string, data: IDataObject) => {
					const items = buildItems(gatewayEvent, data);
					if (items) {
						this.emit([items]);
						resolve();
					}
				});
				client.on('fatal', (error: Error) => reject(error));
				client.connect();
			});

		if (this.getMode() === 'trigger') {
			client.on('dispatch', (gatewayEvent: string, data: IDataObject) => {
				const items = buildItems(gatewayEvent, data);
				if (items) {
					this.emit([items]);
				}
			});
			client.on('fatal', (error: Error) => this.emitError(error));
			client.connect();
		}

		async function closeFunction() {
			await client.close();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
