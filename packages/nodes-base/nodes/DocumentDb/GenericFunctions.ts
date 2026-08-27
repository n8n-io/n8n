import { formatPemBlock } from '@n8n/utils/format-pem-block';
import get from 'lodash/get';
import set from 'lodash/set';
import { Binary, MongoClient, ObjectId } from 'mongodb';
import { NodeOperationError } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { createSecureContext } from 'tls';

import { routeBinaryProperties } from '@utils/binary';
import { isScalarValue } from '@utils/query-parameters';

import type {
	IDocumentDatabaseCredentials,
	IDocumentDatabaseCredentialsType,
	IDocumentDatabaseParametricCredentials,
} from './documentDb.types';

export function sanitizeDocumentDatabaseUriInMessage(
	error: unknown,
	connectionString: string,
): string {
	const message = error instanceof Error ? error.message : String(error);

	if (connectionString) {
		const scheme = /^mongodb(?:\+srv)?:\/\//i.exec(connectionString)?.[0] ?? '';
		const sanitizedMessage = message.replaceAll(connectionString, `${scheme}[REDACTED]`);
		if (sanitizedMessage !== message) return sanitizedMessage;
	}

	return message.replace(/mongodb(\+srv)?:\/\/(?=[^\s]*@)[^\s]+/gi, 'mongodb$1://[REDACTED]');
}

export function buildParameterizedConnString(
	credentials: IDocumentDatabaseParametricCredentials,
): string {
	const user = (credentials.user ?? '').trim();
	const host = (credentials.host ?? '').trim();
	const encodedUser = encodeURIComponent(user);
	const encodedPassword = encodeURIComponent(credentials.password);

	if (credentials.port) {
		return `mongodb://${encodedUser}:${encodedPassword}@${host}:${credentials.port}`;
	}

	return `mongodb+srv://${encodedUser}:${encodedPassword}@${host}`;
}

export function buildDocumentDatabaseConnectionParams(
	node: INode,
	credentials: IDocumentDatabaseCredentialsType,
): IDocumentDatabaseCredentials {
	const database = credentials.database?.trim() ?? '';

	if (credentials.configurationType === 'connectionString') {
		if (credentials.connectionString?.trim()) {
			return {
				connectionString: credentials.connectionString.trim(),
				database,
			};
		}

		throw new NodeOperationError(
			node,
			'Cannot override credentials: valid connection string not provided',
		);
	}

	return {
		connectionString: buildParameterizedConnString(credentials),
		database,
	};
}

export function validateAndResolveDocumentDatabaseCredentials(
	node: INode,
	credentials?: ICredentialDataDecryptedObject,
): IDocumentDatabaseCredentials {
	if (credentials === undefined) {
		throw new NodeOperationError(node, 'No credentials got returned!');
	}

	return buildDocumentDatabaseConnectionParams(
		node,
		credentials as unknown as IDocumentDatabaseCredentialsType,
	);
}

function describeUpdateKeyValueType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (value instanceof Date) return 'date';
	return typeof value;
}

export function prepareItems({
	items,
	fields,
	updateKey = '',
	useDotNotation = false,
	dateFields = [],
	isUpdate = false,
	node,
}: {
	items: INodeExecutionData[];
	fields: string[];
	updateKey?: string;
	useDotNotation?: boolean;
	dateFields?: string[];
	isUpdate?: boolean;
	node: INode;
}) {
	let data = items;

	if (updateKey) {
		if (!fields.includes(updateKey)) {
			fields.push(updateKey);
		}
		data = items.filter((item) => {
			const value = useDotNotation ? get(item.json, updateKey) : item.json[updateKey];
			return value !== undefined;
		});
	}

	return data.map(({ json }, itemIndex) => {
		const updateItem: IDataObject = {};

		for (const field of fields) {
			let fieldData;

			if (useDotNotation) {
				fieldData = get(json, field, null);
			} else {
				fieldData = json[field] !== undefined ? json[field] : null;
			}

			if (fieldData && dateFields.includes(field)) {
				fieldData = new Date(fieldData as string);
			}

			if (field === updateKey && !isScalarValue(fieldData)) {
				throw new NodeOperationError(
					node,
					`The value of "${updateKey}" must be a string, number, boolean, or date`,
					{
						itemIndex,
						description: `Got ${describeUpdateKeyValueType(fieldData)} instead. Objects and arrays are not allowed as the match value.`,
					},
				);
			}

			if (useDotNotation && !isUpdate) {
				set(updateItem, field, fieldData);
			} else {
				updateItem[field] = fieldData;
			}
		}

		return updateItem;
	});
}

export function prepareFields(fields: string) {
	return fields
		.split(',')
		.map((field) => field.trim())
		.filter((field) => !!field);
}

export function stringifyObjectIDs(items: INodeExecutionData[]) {
	items.forEach((item) => {
		if (item.json._id instanceof ObjectId) {
			item.json._id = item.json._id.toString();
		}
		if (item.json.id instanceof ObjectId) {
			item.json.id = item.json.id.toString();
		}
	});

	return items;
}

const mongoValueToBuffer = (value: unknown): Buffer | undefined => {
	if (value instanceof Binary) return Buffer.from(value.buffer);
	if (Buffer.isBuffer(value)) return value;
	return undefined;
};

export async function serializeDocumentDatabaseItems(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return await Promise.all(
		items.map(async (item) => {
			const { json, binary: routed } = await routeBinaryProperties.call(
				this,
				item.json,
				mongoValueToBuffer,
			);

			const result: INodeExecutionData = { ...item, json };
			if (item.binary !== undefined || Object.keys(routed).length) {
				result.binary = { ...(item.binary ?? {}), ...routed };
			}
			return result;
		}),
	);
}

export async function connectDocumentDatabaseClient(
	connectionString: string,
	nodeVersion: number,
	credentials: IDataObject = {},
) {
	const driverInfo = {
		name: 'n8n_crud',
		version: nodeVersion > 0 ? nodeVersion.toString() : 'unknown',
	};

	if (credentials.tls) {
		const ca = credentials.ca ? formatPemBlock(credentials.ca as string) : undefined;
		const cert = credentials.cert ? formatPemBlock(credentials.cert as string) : undefined;
		const key = credentials.key ? formatPemBlock(credentials.key as string) : undefined;
		const passphrase = (credentials.passphrase as string) || undefined;
		const secureContext = createSecureContext({ ca, cert, key, passphrase });

		return await MongoClient.connect(connectionString, {
			tls: true,
			secureContext,
			driverInfo,
		});
	}

	return await MongoClient.connect(connectionString, { driverInfo });
}
