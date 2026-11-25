import { UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import get from 'lodash/get';
import {
	isResourceLocatorValue,
	isNodeParameters,
	NodeConnectionTypes,
	NodeHelpers,
	NodeOperationError,
	type IExecuteFunctions,
	type IGetNodeParameterOptions,
	type NodeParameterValueType,
	type INode,
	type INodeType,
	type INodeTypeDescription,
	type LegacyRequestOptions,
} from 'n8n-workflow';

async function delegate(channel: string): Promise<{ node: INodeType; typeVersion: number }> {
	switch (channel) {
		case 'slack': {
			const { Slack } = await import('../Slack/Slack.node.js');
			return { node: new Slack().getNodeType(2.2), typeVersion: 2.2 };
		}
		case 'telegram': {
			const { Telegram } = await import('../Telegram/Telegram.node.js');
			return { node: new Telegram(), typeVersion: 1.2 };
		}
		case 'discord': {
			const { Discord } = await import('../Discord/Discord.node.js');
			return { node: new Discord().getNodeType(2), typeVersion: 2 };
		}
		default:
			throw new UserError('Unsupported Agent review channel');
	}
}

export class AgentChannelApproval implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Agent channel approval',
		name: 'agentChannelApproval',
		hidden: true,
		group: ['output'],
		version: 1,
		description: 'Request an Agent review through a connected channel',
		defaults: { name: 'Request approval' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{ name: 'slackApi', required: true, displayOptions: { show: { channel: ['slack'] } } },
			{ name: 'telegramApi', required: true, displayOptions: { show: { channel: ['telegram'] } } },
			{ name: 'discordBotApi', required: true, displayOptions: { show: { channel: ['discord'] } } },
		],
		properties: [
			{ displayName: 'Channel', name: 'channel', type: 'hidden', default: '' },
			{ displayName: 'Parameters', name: 'parameters', type: 'hidden', default: {} },
		],
	};

	async execute(this: IExecuteFunctions) {
		const source = this.getNode();
		const channel = source.parameters.channel;
		if (typeof channel !== 'string' || !isNodeParameters(source.parameters.parameters)) {
			throw new NodeOperationError(source, 'Invalid Agent review channel configuration');
		}
		const { node, typeVersion } = await delegate(channel);
		const virtual: INode = {
			...source,
			type: `n8n-nodes-base.${channel}`,
			typeVersion,
			parameters: {
				...source.parameters.parameters,
				resource: 'message',
				operation: 'sendAndWait',
				responseType: 'approval',
				chatApproval: false,
				captureResponder: false,
			},
		};
		virtual.parameters =
			NodeHelpers.getNodeParameters(
				node.description.properties,
				virtual.parameters,
				true,
				false,
				virtual,
				node.description,
			) ?? {};
		const urls = new Map<string, { reference: string; approved: boolean }>();
		for (const approved of [true, false]) {
			urls.set(`agent-review://${String(approved)}`, {
				reference: this.getApprovalCallbackReference(approved ? 'approve' : 'decline'),
				approved,
			});
		}
		const converted = new Set<string>();
		// Adapt only the issued approval links. Delivery and durable waiting stay in the channel node.
		const adapt = (value: unknown): unknown => {
			if (Array.isArray(value)) return value.map(adapt);
			if (!isRecord(value)) return value;
			const callback = typeof value.url === 'string' ? urls.get(value.url) : undefined;
			if (callback) {
				converted.add(callback.reference);
				const { url: _url, ...button } = value;
				if (channel === 'slack') return { ...button, action_id: callback.reference };
				if (channel === 'telegram') return { ...button, callback_data: callback.reference };
				return { ...button, style: callback.approved ? 1 : 4, custom_id: callback.reference };
			}
			return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, adapt(child)]));
		};
		const adaptRequest = (request: LegacyRequestOptions): LegacyRequestOptions => {
			// Discord opens a direct-message channel before it sends the approval.
			if (
				channel === 'discord' &&
				isRecord(request.body) &&
				typeof request.body.recipient_id === 'string' &&
				Object.keys(request.body).length === 1
			)
				return request;
			converted.clear();
			const body = adapt(request.body);
			if (converted.size !== 2)
				throw new NodeOperationError(source, 'Could not create the Agent review buttons');
			return { ...request, body };
		};
		const helpers = new Proxy(this.helpers, {
			get: (target, property) => {
				if (property === 'request') {
					const request: IExecuteFunctions['helpers']['request'] = async (options, extra) =>
						await target.request(
							typeof options === 'string' ? options : adaptRequest(options),
							extra,
						);
					return request;
				}
				if (property === 'requestWithAuthentication') {
					const request: IExecuteFunctions['helpers']['requestWithAuthentication'] = async (
						credentials,
						options,
						additional,
						itemIndex,
					) =>
						await target.requestWithAuthentication.call(
							this,
							credentials,
							adaptRequest(options),
							additional,
							itemIndex,
						);
					return request;
				}
				return Reflect.get(target, property);
			},
		});
		const getNodeParameter = (
			name: string,
			index = 0,
			fallback?: NodeParameterValueType,
			options?: IGetNodeParameterOptions,
		) => {
			if (name === 'chatApproval' || name === 'captureResponder') return false;
			if (name === 'resource') return 'message';
			if (name === 'operation') return 'sendAndWait';
			if (name === 'responseType') return 'approval';
			const value = this.getNodeParameter(
				`parameters.${name}`,
				index,
				get(virtual.parameters, name, fallback),
				{ ...options, extractValue: false },
			);
			return options?.extractValue && isResourceLocatorValue(value) ? value.value : value;
		};
		const context = new Proxy(this, {
			get: (target, property) => {
				if (property === 'getNode') return () => virtual;
				if (property === 'getNodeParameter') return getNodeParameter;
				// These private links are replaced before delivery. No webhook URL is issued.
				if (property === 'getSignedResumeUrl')
					return (query: Record<string, string>) => `agent-review://${query.approved}`;
				if (property === 'helpers') return helpers;
				const value: unknown = Reflect.get(target, property);
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});
		if (!node.execute)
			throw new NodeOperationError(source, 'Channel review execution is unavailable');
		return await node.execute.call(context);
	}
}
