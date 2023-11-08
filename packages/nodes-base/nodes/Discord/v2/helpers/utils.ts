import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { isEmpty } from 'lodash';
import FormData from 'form-data';
import { capitalize } from '../../../../utils/utilities';
import { extension } from 'mime-types';
import { discordApiRequest } from '../transport';

export const createSimplifyFunction =
	(includedFields: string[]) =>
	(item: IDataObject): IDataObject => {
		const result: IDataObject = {};

		for (const field of includedFields) {
			if (item[field] === undefined) continue;

			result[field] = item[field];
		}

		return result;
	};

export function parseDiscordError(this: IExecuteFunctions, error: any, itemIndex = 0) {
	let errorData = error.cause.error;
	const errorOptions: IDataObject = { itemIndex };

	if (!errorData && error.description) {
		try {
			const errorString = (error.description as string).split(' - ')[1];
			if (errorString) {
				errorData = jsonParse(errorString);
			}
		} catch (err) {}
	}

	if (errorData?.message) {
		errorOptions.message = errorData.message;
	}

	if ((error?.message as string)?.toLowerCase()?.includes('bad request') && errorData) {
		if (errorData?.message) {
			errorOptions.message = errorData.message;
		}

		if (errorData?.errors?.embeds) {
			const embedErrors = errorData.errors.embeds?.[0];
			const embedErrorsKeys = Object.keys(embedErrors).map((key) => capitalize(key));

			if (embedErrorsKeys.length) {
				const message =
					embedErrorsKeys.length === 1
						? `The parameter ${embedErrorsKeys[0]} is not properly formatted`
						: `The parameters ${embedErrorsKeys.join(', ')} are not properly formatted`;
				errorOptions.message = message;
				errorOptions.description = 'Review the formatting or clear it';
			}

			return new NodeOperationError(this.getNode(), errorData.errors, errorOptions);
		}

		if (errorData?.errors?.message_reference) {
			errorOptions.message = "The message to reply to ID can't be found";
			errorOptions.description =
				'Check the "Message to Reply to" parameter and remove it if you don\'t want to reply to an existing message';

			return new NodeOperationError(this.getNode(), errorData.errors, errorOptions);
		}
	}
	return new NodeOperationError(this.getNode(), errorData || error, errorOptions);
}

export function prepareErrorData(this: IExecuteFunctions, error: any, i: number) {
	let description = error.description;

	try {
		description = JSON.parse(error.description as string);
	} catch (err) {}

	return this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ error: error.message, description }),
		{ itemData: { item: i } },
	);
}

export function prepareOptions(options: IDataObject, guildId?: string) {
	if (options.flags) {
		if ((options.flags as string[]).length === 2) {
			options.flags = (1 << 2) + (1 << 12);
		} else if ((options.flags as string[]).includes('SUPPRESS_EMBEDS')) {
			options.flags = 1 << 2;
		} else if ((options.flags as string[]).includes('SUPPRESS_NOTIFICATIONS')) {
			options.flags = 1 << 12;
		}
	}

	if (options.message_reference) {
		options.message_reference = {
			message_id: options.message_reference,
			guild_id: guildId,
		};
	}

	return options;
}

export function prepareEmbeds(this: IExecuteFunctions, embeds: IDataObject[], i = 0) {
	return embeds
		.map((embed, index) => {
			let embedReturnData: IDataObject = {};

			if (embed.inputMethod === 'json') {
				if (typeof embed.json === 'object') {
					embedReturnData = embed.json as IDataObject;
				}
				try {
					embedReturnData = jsonParse(embed.json as string);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Not a valid JSON', error);
				}
			} else {
				delete embed.inputMethod;

				for (const key of Object.keys(embed)) {
					if (embed[key] !== '') {
						embedReturnData[key] = embed[key];
					}
				}
			}

			if (!embedReturnData.description) {
				throw new NodeOperationError(
					this.getNode(),
					`Description is required, embed ${index} in item ${i} is missing it`,
				);
			}

			if (embedReturnData.author) {
				embedReturnData.author = {
					name: embedReturnData.author,
				};
			}
			if (embedReturnData.color && typeof embedReturnData.color === 'string') {
				embedReturnData.color = parseInt(embedReturnData.color.replace('#', ''), 16);
			}
			if (embedReturnData.video) {
				embedReturnData.video = {
					url: embedReturnData.video,
					width: 1270,
					height: 720,
				};
			}
			if (embedReturnData.thumbnail) {
				embedReturnData.thumbnail = {
					url: embedReturnData.thumbnail,
				};
			}
			if (embedReturnData.image) {
				embedReturnData.image = {
					url: embedReturnData.image,
				};
			}

			return embedReturnData;
		})
		.filter((embed) => !isEmpty(embed));
}

export async function prepareMultiPartForm(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	files: IDataObject[],
	jsonPayload: IDataObject,
	i: number,
) {
	const multiPartBody = new FormData();
	const attachments: IDataObject[] = [];
	const filesData: IDataObject[] = [];

	for (const [index, file] of files.entries()) {
		const binaryData = (items[i].binary as IBinaryKeyData)?.[file.inputFieldName as string];

		if (!binaryData) {
			throw new NodeOperationError(
				this.getNode(),
				`Input item [${i}] does not contain binary data on property ${file.inputFieldName}`,
			);
		}

		let filename = binaryData.fileName as string;

		if (!filename.includes('.')) {
			if (binaryData.fileExtension) {
				filename += `.${binaryData.fileExtension}`;
			}
			if (binaryData.mimeType) {
				filename += `.${extension(binaryData.mimeType)}`;
			}
		}

		attachments.push({
			id: index,
			filename,
		});

		filesData.push({
			data: await this.helpers.getBinaryDataBuffer(i, file.inputFieldName as string),
			name: filename,
			mime: binaryData.mimeType,
		});
	}

	multiPartBody.append('payload_json', JSON.stringify({ ...jsonPayload, attachments }), {
		contentType: 'application/json',
	});

	for (const [index, binaryData] of filesData.entries()) {
		multiPartBody.append(`files[${index}]`, binaryData.data, {
			contentType: binaryData.name as string,
			filename: binaryData.mime as string,
		});
	}

	return multiPartBody;
}

export function checkAccessToGuild(
	node: INode,
	guildId: string,
	userGuilds: IDataObject[],
	itemIndex = 0,
) {
	if (!userGuilds.some((guild) => guild.id === guildId)) {
		throw new NodeOperationError(
			node,
			`You do not have access to the guild with the id ${guildId}`,
			{
				itemIndex,
			},
		);
	}
}

export async function checkAccessToChannel(
	this: IExecuteFunctions,
	channelId: string,
	userGuilds: IDataObject[],
	itemIndex = 0,
) {
	let guildId = '';

	try {
		const channel = await discordApiRequest.call(this, 'GET', `/channels/${channelId}`);
		guildId = channel.guild_id;
	} catch (error) {}

	if (!guildId) {
		throw new NodeOperationError(
			this.getNode(),
			`Could not fing server for channel with the id ${channelId}`,
			{
				itemIndex,
			},
		);
	}

	checkAccessToGuild(this.getNode(), guildId, userGuilds, itemIndex);
}

export async function setupChannelGetter(this: IExecuteFunctions, userGuilds: IDataObject[]) {
	const isOAuth2 = this.getNodeParameter('authentication', 0) === 'oAuth2';

	return async (i: number) => {
		const channelId = this.getNodeParameter('channelId', i, undefined, {
			extractValue: true,
		}) as string;

		if (isOAuth2) await checkAccessToChannel.call(this, channelId, userGuilds, i);

		return channelId;
	};
}
