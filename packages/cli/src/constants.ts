/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/naming-convention */

import { RESPONSE_ERROR_MESSAGES as CORE_RESPONSE_ERROR_MESSAGES } from 'n8n-core';

export const RESPONSE_ERROR_MESSAGES = {
	NO_CREDENTIAL: 'Credential not found',
	NO_ENCRYPTION_KEY: CORE_RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY,
	NO_NODE_NAME: 'Query param "nodeName" missing',
	NO_PIN_DATA: 'Key "pinData" missing in body',
	NO_WORKFLOW: 'Failed to find workflow ID',
	NO_PINDATA_ID: 'Key `pinDataId` missing in body',
};

export const AUTH_COOKIE_NAME = 'n8n-auth';
