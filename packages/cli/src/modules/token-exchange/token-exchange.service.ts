import { Service } from '@n8n/di';

import type { TokenExchangeRequest } from './token-exchange.schemas';
import type { TokenExchangeSuccessResponse } from './token-exchange.types';

@Service()
export class TokenExchangeService {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async exchange(_request: TokenExchangeRequest): Promise<TokenExchangeSuccessResponse> {
		return {
			access_token: 'stub-access-token',
			token_type: 'Bearer',
			expires_in: 3600,
			issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
		};
	}
}
