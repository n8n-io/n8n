import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { isEmpty } from 'lodash';
import FormData from 'form-data';

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

export function parseDiscordError(this: IExecuteFunctions, error: any) {
	if ((error?.message as string)?.toLowerCase()?.includes('bad request') && error?.cause?.error) {
		const errorData = error.cause.error as IDataObject;
		const errorOptions: IDataObject = {};

		if (errorData?.message) {
			errorOptions.message = errorData.message;
		}

		if (errorData?.errors) {
			errorOptions.description = JSON.stringify(errorData.errors as string);
		}

		return new NodeOperationError(this.getNode(), error, errorOptions);
	}
	return error;
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

export function prepareEmbeds(this: IExecuteFunctions, embeds: IDataObject[]) {
	return embeds
		.map((embed) => {
			if (embed.inputMethod === 'json') {
				if (typeof embed.json === 'object') {
					return embed.json;
				}
				try {
					return jsonParse(embed.json as string);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Not a valid JSON', error);
				}
			}

			const embedReturnData: IDataObject = {};

			delete embed.inputMethod;

			for (const key of Object.keys(embed)) {
				if (embed[key] !== '') {
					embedReturnData[key] = embed[key];
				}
			}

			if (embedReturnData.author) {
				embedReturnData.author = {
					name: embedReturnData.author,
				};
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
		attachments.push({
			id: index,
			filename: binaryData.fileName,
		});
		filesData.push({
			data: await this.helpers.getBinaryDataBuffer(i, file.inputFieldName as string),
			name: binaryData.fileName,
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
