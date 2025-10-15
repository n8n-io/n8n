import type { AuthenticatedRequest } from '@n8n/db';
import type { Request } from 'express';

import { isJSONRPCRequest } from './mcp.typeguards';

export const getClientInfo = (req: Request | AuthenticatedRequest) => {
	let clientInfo: { name?: string; version?: string } | undefined;
	if (isJSONRPCRequest(req.body) && req.body.params?.clientInfo) {
		clientInfo = req.body.params.clientInfo;
	}
	return clientInfo;
};
