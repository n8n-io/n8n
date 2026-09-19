import type { NoulQuestion, ResultFor, Question } from '@typesafe-ai/sdk';

import { createJevClient, type JevDecisionClient } from '../../utils/jev-client';

export interface CredentialCandidate {
	id: string;
	name: string;
	type: string;
	__aiGatewayManaged?: boolean;
}

function createCredentialRelevanceQuestion(cred: CredentialCandidate, query: string): NoulQuestion {
	return {
		type: 'noul',
		instructions: `Does the request/task "${query}" involve, reference, or need the "${cred.type}" credential named "${cred.name}"?`,
		criteria: {
			true: `The task interacts with, sends messages to, reads data from, or uses the service/integration for "${cred.name}" (${cred.type})`,
			false: `The credential is for an unrelated service or account not mentioned or needed by "${query}"`,
		},
	};
}

export async function filterCredentialsWithJev<T extends CredentialCandidate>(
	query: string | undefined,
	candidates: T[],
	options: {
		client?: JevDecisionClient;
		limit?: number;
		minProbability?: number;
	} = {},
): Promise<T[]> {
	if (!query || candidates.length <= 1) {
		return candidates;
	}

	const client = options.client ?? (await createJevClient());
	if (!client) {
		// If Jev is not present, return everything as it is right now
		return candidates;
	}

	const minProbability = options.minProbability ?? 0.35;
	const limit = options.limit;

	try {
		console.log(
			`[Jev Credential Filter] Query: "${query}" | Initial credentials (${candidates.length}):`,
			candidates.map((c) => `"${c.name}" (${c.type})`),
		);

		const questions: Record<string, NoulQuestion> = {};
		candidates.forEach((cred, index) => {
			questions[`cred_${index}`] = createCredentialRelevanceQuestion(cred, query);
		});

		const response = await client.systemOne({
			state: query,
			questions,
		});

		const answers = response.answers as Record<string, ResultFor<Question> | undefined>;

		const scored = candidates
			.map((cred, index) => {
				const ans = answers[`cred_${index}`];
				const probability = ans?.type === 'noul' ? ans.noul : 0;
				return { cred, probability, originalIndex: index };
			})
			.filter(({ probability }) => probability >= minProbability)
			.sort((a, b) => b.probability - a.probability);

		console.log(
			`[Jev Credential Filter] Query: "${query}" | Jev probabilities:`,
			candidates.map((c, i) => {
				const ans = answers[`cred_${i}`];
				const prob = ans?.type === 'noul' ? ans.noul.toFixed(2) : 'N/A';
				return `"${c.name}" (${c.type}): ${prob}`;
			}),
		);

		if (scored.length === 0) {
			console.log(
				`[Jev Credential Filter] Query: "${query}" | No credentials above threshold (${minProbability}), returning initial list`,
			);
			return limit !== undefined ? candidates.slice(0, limit) : candidates;
		}

		const filtered = scored.map(({ cred }) => cred);
		const finalResults = limit !== undefined ? filtered.slice(0, limit) : filtered;

		console.log(
			`[Jev Credential Filter] Query: "${query}" | Filtered credentials (${finalResults.length}):`,
			finalResults.map((c) => `"${c.name}" (${c.type})`),
		);

		return finalResults;
	} catch (error) {
		console.warn(
			`[Jev Credential Filter] Error querying Jev for query "${query}", falling back:`,
			error,
		);
		// On Jev error/failure, gracefully fall back to returning candidates as they are
		return candidates;
	}
}
