import type { Questions, SystemOneResult } from '@typesafe-ai/sdk';

export interface JevDecisionClient {
	systemOne<const Q extends Questions>(request: {
		state: string;
		questions: Q;
	}): Promise<SystemOneResult<Q>>;
}

export async function createJevClient(): Promise<JevDecisionClient | undefined> {
	const apiKey = process.env.TYPESAFE_API_KEY?.trim();
	if (!apiKey) return undefined;
	try {
		const { TypeSafeClient } = await import('@typesafe-ai/sdk');
		return new TypeSafeClient({ apiKey });
	} catch {
		return undefined;
	}
}
