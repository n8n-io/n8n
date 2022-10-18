import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	NodeApiError,
} from 'n8n-workflow';
import { RequestBody } from './CodeChat';

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response?.body as RequestBody.IError;
	if (body?.error) {
		if (body?.error) {
			throw new NodeApiError(
				this.getNode(),
				{ error: body.error, message: body.message },
				{
					message: 'Check the type of properties and values entered',
					description:
						'Check that there are no undefined values; whether the type of values is as expected or whether mandatory properties have been entered.',
					httpCode: body.statusCode.toString(),
				},
			);
		}
	}
	return data;
}

function isNotempty(value: string) {
	if (!value) return false;
	if (typeof value === 'string' && value === '') return false;
	return true;
}

function join(...paths: string[]) {
	let url = '';
	paths.forEach((path) => (url += `${path}/`));
	return url;
}

export function requestURL(...paths: string[]) {
	return join('{{$credentials.instanceName}}', ...paths, '{{$credentials.licenseKey}}');
}

export async function formatNumber(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.INumbers;

	const numbers: string[] = [];

	if (!Array.isArray(body.numbers)) {
		if (
			!body?.numbers ||
			typeof body.numbers !== 'string' ||
			!(body.numbers as string).match(/\d+/g)
		) {
			throw new NodeApiError(
				this.getNode(),
				{
					error: ['listPhoneNumbers cannot be empty', 'listPhoneNumbers must be a numeric string'],
				},
				{ message: 'Bad Request', description: 'Check the parameters', httpCode: '400' },
			);
		}
		numbers.push(body.numbers);
	}

	if (Array.isArray(body.numbers)) {
		const values: string[] = body.numbers;
		if (values.length === 0 || [...new Set(values)].length !== values.length) {
			throw new NodeApiError(
				this.getNode(),
				{
					error: [
						'listPhoneNumbers must not be an empty list',
						'listPhoneNumbers must have unique values',
					],
				},
				{
					message: 'Bad Request',
					description: 'Check the type of properties and values entered',
					httpCode: '400',
				},
			);
		}

		values.map((v, index) => {
			if (!v.match(/\d+/g)) {
				throw new NodeApiError(
					this.getNode(),
					{ error: `listPhoneNumbers[${index}] must be a numeric string` },
					{
						message: 'Bad Request',
						description: 'Check the type of properties and values entered',
						httpCode: '400',
					},
				);
			}

			numbers.push(v);
		});
	}
	Object.assign(requestOptions.body as {}, { numbers: [...numbers] });

	return requestOptions;
}

export async function prepareShippingOptions(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.IOptions;

	const opts: { [key: string]: {} | number | string[] } = {};
	if (body?.options) {
		for (const [key, value] of Object.entries(body.options)) {
			if (isNotempty(value as string)) {
				if (key === 'quoted') {
					opts[key] = { messageId: value as string };
					continue;
				}
				opts[key] = value as number | string[];
			}
		}
	}

	const optsKeys = Object.keys(opts);

	Object.assign(requestOptions.body as {}, { options: optsKeys.length > 0 ? opts: undefined });

	return requestOptions;
}

export async function sendButtonsMessage(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.IButtonsMessage;

	if (body?.mediaData) {
		if (body.mediaData?.type && body.mediaData?.source) {
			body.buttonsMessage.mediaMessage = {
				mediaType: body.mediaData.type,
				url: body.mediaData.source,
			};
		}
	}

	const buttonFieldTypeProperty = this.getNodeParameter('buttonFieldTypeProperty');
	if (buttonFieldTypeProperty === 'collection') {
		body.buttonsMessage.buttons = body.buttons!.replyButtons;
	}

	delete body.buttons;
	delete body.mediaData;

	Object.assign(requestOptions.body as {}, { ...body });

	return requestOptions;
}

export async function sendTemplateMessage(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.ITemplateMessage;

	if (body?.mediaData) {
		if (body.mediaData?.type && body.mediaData?.source) {
			body.templateMessage.mediaMessage = {
				mediaType: body.mediaData?.type,
				url: body.mediaData?.source,
			};
		}
	}

	const templateFieldTypeProperty = this.getNodeParameter('templateFieldTypeProperty');
	if (templateFieldTypeProperty === 'collection') {
		body.templateMessage.buttons = body.buttons!.templateButtons;
	}

	delete body.buttons;
	delete body.mediaData;

	Object.assign(requestOptions.body as {}, { ...body });

	return requestOptions;
}

export async function sendListMessage(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.IListMessage;

	const listFieldTypeProperty = this.getNodeParameter('listFieldTypeProperty');

	let sections: RequestBody.Isection[];

	if (listFieldTypeProperty === 'collection') {
		const listMessage = {
			title: body.listMessage.title,
			description: body.listMessage.description,
			footerText: body.listMessage.footerText,
			buttonText: body.listMessage.buttonText,
			sections: (body.listMessage.sections as RequestBody.Isection[]).map((section) => {
				return {
					title: section.title,
					rows: section.rowsProperty!.rows,
				};
			}),
		};

		sections = listMessage.sections;

		Object.assign(requestOptions.body as {}, { listMessage });
	} else {
		sections = body.listMessage?.sections;
	}

	if (
		!Array.isArray(sections) ||
		sections.length === 0 ||
		sections.length !== [...new Set(sections)].length
	) {
		throw new NodeApiError(
			this.getNode(),
			{ error: ['List items must not be empty', 'List items must be unique'] },
			{ message: 'Bad Request', description: 'check properties', httpCode: '400' },
		);
	}

	sections.forEach((section, index) => {
		if (!section?.title) {
			throw new NodeApiError(
				this.getNode(),
				{ error: `Section[${index}].title is empty` },
				{ message: 'Dad Request', description: 'Title cannot be empty', httpCode: '400' },
			);
		}

		if (
			!Array.isArray(section?.rows) ||
			!section.rows?.length ||
			section.rows.length === 0 ||
			[...new Set(section.rows)].length !== section.rows.length
		) {
			throw new NodeApiError(
				this.getNode(),
				{ error: 'Empty list items' },
				{ message: 'Bad Request', description: 'List items cannot be empty', httpCode: '400' },
			);
		}

		if ([...new Set(section.rows)].length !== section.rows.length) {
			throw new NodeApiError(
				this.getNode(),
				{ error: ['List items must not be empty', 'List items must be unique'] },
				{ message: 'Bad Request', description: 'check properties', httpCode: '400' },
			);
		}
	});

	return requestOptions;
}

export async function sendContactMessage(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.IContactMessage;

	const contactTypeProperty = this.getNodeParameter('contactTypeProperty');
	if (contactTypeProperty === 'collection') {
		Object.assign(requestOptions.body as {}, {
			contactsMessage: [...body.contactMessage.contacts],
		});
	}

	return requestOptions;
}

export async function readMessage(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.IReadMessage;
	if (!Array.isArray(body?.readMessage)) {
		throw new NodeApiError(
			this.getNode(),
			{ error: 'readMessagesProperty must be an array' },
			{ message: 'Bad request', description: 'check properties', httpCode: '400' },
		);
	}

	requestOptions.body = [...body.readMessage];

	return requestOptions;
}

export async function createGroup(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as RequestBody.ICreateGroup;

	if (!Array.isArray(body.participants)) {
		body.participants = [...body.participants.replace(/[' ']+/gm, '').split(/,/)];
	}

	const descriptionGruop = this.getNodeParameter(
		'descriptionProperty.groupDescription.description',
	);
	const profilePicture = this.getNodeParameter(
		'profilePictureProperty.profilePictureGroup.profilePicture',
	);

	Object.assign(requestOptions.body as {}, { descriptionGruop, profilePicture });

	return requestOptions;
}

export async function updateGroupIngo(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as {};

	const keys = Object.keys(body) || [];
	if (keys.length === 0) {
		throw new NodeApiError(
			this.getNode(),
			{ error: ['The Subject and Description properties are missing', 'Report at least one'] },
			{ message: 'Bad Request', description: 'Properties not found', httpCode: '400' },
		);
	}

	return requestOptions;
}
