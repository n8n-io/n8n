import { BadRequestError } from '@/ResponseHelper';
import { LoggerProxy } from 'n8n-workflow';
import * as utils from '@/utils';

export function handleListQueryError(
	paramName: 'filter' | 'select',
	paramValue: string,
	maybeError: unknown,
) {
	const error = utils.toError(maybeError);

	LoggerProxy.error(`Invalid "${paramName}" query parameter`, {
		paramName,
		paramValue,
		error,
	});

	throw new BadRequestError(
		`Invalid "${paramName}" query parameter: ${paramValue}. Error: ${error.message}`,
	);
}
