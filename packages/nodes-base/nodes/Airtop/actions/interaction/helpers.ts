import type { IExecuteFunctions } from 'n8n-workflow';

import type { IAirtopInteractionRequest } from '../../transport/types';

export function constructInteractionRequest(
	this: IExecuteFunctions,
	index: number,
	parameters: Partial<IAirtopInteractionRequest> = {},
): IAirtopInteractionRequest {
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const request: IAirtopInteractionRequest = {
		...parameters,
		configuration: {
			...(parameters.configuration ?? {}),
		},
	};

	if (additionalFields.visualScope) {
		request.configuration.visualAnalysis = {
			scope: additionalFields.visualScope as string,
		};
	}

	if (additionalFields.waitForNavigation) {
		request.waitForNavigation = true;
		request.configuration.waitForNavigationConfig = {
			waitUntil: additionalFields.waitForNavigation as string,
		};
	}

	return request;
}
