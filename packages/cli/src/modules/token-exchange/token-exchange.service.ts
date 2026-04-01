import { Service } from '@n8n/di';

import type { TokenExchangeRequest } from './token-exchange.schemas';

@Service()
export class TokenExchangeService {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async exchange(_request: TokenExchangeRequest): Promise<true> {
		return true;
	}
}
