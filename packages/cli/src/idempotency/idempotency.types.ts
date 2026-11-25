export type IdempotencyClaim =
	| { outcome: 'claimed'; id: string }
	| { outcome: 'replay'; responseStatus: number; responseBody: unknown }
	| { outcome: 'processing' }
	| { outcome: 'mismatch' };

export interface IdempotencyStore {
	claim(input: {
		userId: string;
		idempotencyKey: string;
		fingerprint: string;
	}): Promise<IdempotencyClaim>;

	complete(id: string, responseStatus: number, responseBody: unknown): Promise<void>;

	release(id: string): Promise<void>;
}
