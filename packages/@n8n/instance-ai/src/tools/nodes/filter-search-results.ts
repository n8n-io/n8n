import type { NodeSearchResult } from '@n8n/ai-utilities/node-catalog';
import type { NoulQuestion, ResultFor, Question } from '@typesafe-ai/sdk';

import { createJevClient, type JevDecisionClient } from '../../utils/jev-client';

export { createJevClient, type JevDecisionClient };

function createNodeRelevanceQuestion(node: NodeSearchResult, query: string): NoulQuestion {
	const isTrigger = Array.isArray(node.inputs) && node.inputs.length === 0;
	const service = node.displayName.replace(/\s+Trigger$/i, '').replace(/\s+Tool$/i, '');
	if (isTrigger) {
		return {
			type: 'noul',
			instructions: `Does the search query "${query}" intend to trigger or start a workflow on events from ${service} (n8n node "${node.displayName}": ${node.description})?`,
			criteria: {
				true: `The search is looking for a trigger from ${service}`,
				false: `${service} is not relevant to "${query}", or is an unrelated service with a shared prefix`,
			},
		};
	}
	return {
		type: 'noul',
		instructions: `Does the search query "${query}" intend to use, read from, write to, or interact with ${service} (n8n node "${node.displayName}": ${node.description})?`,
		criteria: {
			true: `The node is relevant to "${query}", including action nodes, AI tools, or MCP registry integrations for ${service}`,
			false: `${service} is not what "${query}" is looking for, or only shares a common brand prefix like Google/AWS/Microsoft`,
		},
	};
}

export async function filterSearchResultsWithJev(
	query: string,
	candidates: NodeSearchResult[],
	options: {
		client?: JevDecisionClient;
		limit?: number;
		minProbability?: number;
	} = {},
): Promise<NodeSearchResult[]> {
	if (candidates.length <= 3) {
		return candidates;
	}

	const client = options.client ?? (await createJevClient());
	if (!client) {
		// If Jev is not present, return everything as it is right now
		return candidates;
	}

	const limit = options.limit ?? 10;
	const minProbability = options.minProbability ?? 0.15;

	try {
		console.log(
			`[Jev Search Filter] Query: "${query}" | Initial candidates (${candidates.length}):`,
			candidates.map((c) => c.displayName),
		);

		const questions: Record<string, NoulQuestion> = {};
		candidates.forEach((node, index) => {
			questions[`node_${index}`] = createNodeRelevanceQuestion(node, query);
		});

		const response = await client.systemOne({
			state: query,
			questions,
		});

		const answers = response.answers as Record<string, ResultFor<Question> | undefined>;

		const scored = candidates
			.map((node, index) => {
				const ans = answers[`node_${index}`];
				const probability = ans?.type === 'noul' ? ans.noul : 0;
				return { node, probability, originalIndex: index };
			})
			.filter(({ probability }) => probability >= minProbability)
			.sort((a, b) => b.probability - a.probability);

		console.log(
			`[Jev Search Filter] Query: "${query}" | Jev probabilities:`,
			candidates.map((c, i) => {
				const ans = answers[`node_${i}`];
				const prob = ans?.type === 'noul' ? ans.noul.toFixed(2) : 'N/A';
				return `${c.displayName}: ${prob}`;
			}),
		);

		const finalResults =
			scored.length === 0
				? candidates.slice(0, limit)
				: scored.slice(0, limit).map(({ node }) => node);

		console.log(
			`[Jev Search Filter] Query: "${query}" | Filtered results (${finalResults.length}):`,
			finalResults.map((n) => `${n.displayName} (${n.name})`),
		);

		return finalResults;
	} catch (error) {
		console.warn(
			`[Jev Search Filter] Error querying Jev for query "${query}", falling back:`,
			error,
		);
		// On Jev error/failure, gracefully fall back to returning candidates as they are
		return candidates;
	}
}
