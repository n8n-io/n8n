import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

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
