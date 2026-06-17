import {
	getSendAndWaitConfig,
	getSendAndWaitProperties,
} from 'n8n-nodes-base/dist/utils/sendAndWait/utils';
import {
	ChatNodeMessageType,
	FREE_TEXT_CHAT_RESPONSE_TYPE,
	NodeOperationError,
	UserError,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';
import type {
	ChatNodeMessage,
	ChatNodeMessageButtonType,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

export function configureWaitTillDate(context: IExecuteFunctions) {
	let waitTill = WAIT_INDEFINITELY;

	const limitOptions = context.getNodeParameter('options.limitWaitTime.values', 0, {}) as {
		limitType?: string;
		resumeAmount?: number;
		resumeUnit?: string;
		maxDateAndTime?: string;
	};

	if (Object.keys(limitOptions).length) {
		try {
			if (limitOptions.limitType === 'afterTimeInterval') {
				let waitAmount = limitOptions.resumeAmount as number;

				if (limitOptions.resumeUnit === 'minutes') {
					waitAmount *= 60;
				}
				if (limitOptions.resumeUnit === 'hours') {
					waitAmount *= 60 * 60;
				}
				if (limitOptions.resumeUnit === 'days') {
					waitAmount *= 60 * 60 * 24;
				}

				waitAmount *= 1000;
				waitTill = new Date(new Date().getTime() + waitAmount);
			} else {
				waitTill = new Date(limitOptions.maxDateAndTime as string);
			}

			if (isNaN(waitTill.getTime())) {
				throw new UserError('Invalid date format');
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), 'Could not configure Limit Wait Time', {
				description: error.message,
			});
		}
	}

	return waitTill;
}

export const configureInputs = (parameters: { options?: { memoryConnection?: boolean } }) => {
	const inputs = [
		{
			type: 'main',
		},
	];
	if (parameters.options?.memoryConnection) {
		return [
			...inputs,
			{
				type: 'ai_memory',
				displayName: 'Memory',
				maxConnections: 1,
			},
		];
	}

	return inputs;
};

const freeTextResponseTypeOption: INodePropertyOptions = {
	name: 'Free Text',
	// use a different name to not show options for `freeText` response type
	value: FREE_TEXT_CHAT_RESPONSE_TYPE,
	description: 'User can submit a response in the chat',
};

const blockUserInput: INodeProperties = {
	displayName: 'Block User Input',
	name: 'blockUserInput',
	type: 'boolean',
	default: false,
	description: 'Whether to block input from the user while waiting for approval',
	displayOptions: {
		show: {
			responseType: ['approval'],
		},
	},
};

export const getSendAndWaitPropertiesForChatNode = () => {
	const originalProperties = getSendAndWaitProperties([], null);
	const filteredProperties = originalProperties.filter(
		// `subject` is not needed and we provide our own `message` and `options` properties
		(p) => p.name !== 'subject' && p.name !== 'message' && p.name !== 'options',
	);
	const responseTypeProperty = filteredProperties.find((p) => p.name === 'responseType');
	if (responseTypeProperty) {
		const approvalOption = responseTypeProperty.options?.find(
			(o) => 'value' in o && o.value === 'approval',
		);
		responseTypeProperty.options = approvalOption
			? [
					// for now we only support `approval` and `freeText` response types
					approvalOption,
					freeTextResponseTypeOption,
				]
			: [freeTextResponseTypeOption];
		responseTypeProperty.default = FREE_TEXT_CHAT_RESPONSE_TYPE;
	}

	filteredProperties.splice(1, 0, blockUserInput);
	return filteredProperties;
};

export function getChatMessage(ctx: IExecuteFunctions): ChatNodeMessage {
	const nodeVersion = ctx.getNode().typeVersion;
	const message = ctx.getNodeParameter('message', 0, '') as string;
	if (nodeVersion < 1.1) {
		return message;
	}

	const responseType = ctx.getNodeParameter(
		'responseType',
		0,
		FREE_TEXT_CHAT_RESPONSE_TYPE,
	) as string;
	if (responseType === FREE_TEXT_CHAT_RESPONSE_TYPE) {
		// for free text, we just return the message
		// since the user will respond with the text in the chat
		return message;
	}

	const blockUserInput = ctx.getNodeParameter('blockUserInput', 0, false) as boolean;
	const config = getSendAndWaitConfig(ctx);
	return {
		type: ChatNodeMessageType.WITH_BUTTONS,
		text: message,
		blockUserInput,
		// the buttons are reversed to show the primary button first
		buttons: [...config.options].reverse().map((option) => ({
			text: option.label,
			link: option.url,
			type: option.style as ChatNodeMessageButtonType,
		})),
	};
}
