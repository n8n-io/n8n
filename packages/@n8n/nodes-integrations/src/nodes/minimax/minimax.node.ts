import { defineNode, parse, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { minimaxKey } from './credentials';

const INTERNATIONAL = 'https://api.minimax.io/v1';

const baseResponse = t.obj({
	base_resp: t.obj({ status_code: t.int(), status_msg: t.str() }).optional(),
});

export const minimax = defineNode({
	id: 'minimax',
	displayName: 'MiniMax',
	credential: credential({ types: [minimaxKey] }),
	baseUrl: INTERNATIONAL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatMinimax'],
	// MiniMax can answer 200 with the error in `base_resp`; status code 0 is success.
	errorOf: (body) => {
		const { status_code: code, status_msg: reason } = parse(baseResponse, body).base_resp ?? {};
		return code ? `MiniMax error ${code}${reason ? `: ${reason}` : ''}` : undefined;
	},
});
