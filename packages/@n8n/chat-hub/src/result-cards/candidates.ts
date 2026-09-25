import { resultCardSchema, type ResultCard, type ResultCardArchetype } from '@n8n/api-types';

import { applyAnswers } from './apply';
import { applicableArchetypes, buildGenericCard } from './generic';
import { schemaHash } from './hash';
import { buildQuestions } from './questions';
import { describeNodeRun } from './registry';
import type { CandidateSet, JevState, NodeRunFacts } from './types';

export function buildState(facts: NodeRunFacts, options?: { includeSamples?: boolean }): JevState {
	const includeSamples = options?.includeSamples ?? true;
	return {
		workflow: { name: facts.workflow.name, description: facts.workflow.description },
		node: {
			type: facts.nodeType,
			name: facts.nodeName,
			resource: facts.resource,
			operation: facts.operation,
		},
		itemCount: facts.itemCount,
		fields: facts.fields.map((field) =>
			includeSamples
				? { path: field.path, type: field.type, sample: field.sample }
				: { path: field.path, type: field.type },
		),
	};
}

export function buildCandidateSet(facts: NodeRunFacts): CandidateSet | null {
	const registryCard = describeNodeRun(facts);
	let archetypes: ResultCardArchetype[];
	let defaultCard: ResultCard;

	if (registryCard) {
		archetypes = [registryCard.type];
		defaultCard = registryCard;
	} else {
		if (!facts.isFinalOutput) return null;
		archetypes = applicableArchetypes(facts);
		if (archetypes.length === 0) return null;
		let built: ResultCard | null = null;
		while (!built && archetypes.length > 0) {
			built = buildGenericCard(facts, archetypes[0]);
			if (!built) archetypes.shift();
		}
		if (!built) return null;
		defaultCard = built;
	}

	const validated = resultCardSchema.safeParse(defaultCard);
	if (!validated.success) return null;
	defaultCard = validated.data;

	const isRegistryCard = registryCard !== null;
	const questions = buildQuestions(facts, archetypes, isRegistryCard, defaultCard);

	return {
		facts,
		schemaHash: schemaHash(facts),
		archetypes,
		defaultCard,
		questions,
		buildState: (options) => buildState(facts, options),
		apply: (answers) =>
			applyAnswers(facts, defaultCard, archetypes, isRegistryCard, questions, answers),
	};
}
