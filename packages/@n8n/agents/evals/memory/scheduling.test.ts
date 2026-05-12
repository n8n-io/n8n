import assert from 'node:assert/strict';

import type { MemoryEvalCategory, MemoryEvalScenario } from './scenarios';
import { countSelectedCategories, createEvalJobs, resolveEffectiveConcurrency } from './scheduling';

function scenario(id: string, category: MemoryEvalCategory): MemoryEvalScenario {
	return {
		id,
		title: id,
		category,
		agentDescription: 'Test agent',
		seedThreads: [
			{
				id: `${id}-seed`,
				turns: ['Remember this scenario.'],
			},
		],
		recall: {
			threadId: `${id}-recall`,
			prompt: 'What should be recalled?',
		},
		expect: {},
	};
}

const scenarios = [
	scenario('profile-a', 'user-profile'),
	scenario('profile-b', 'user-profile'),
	scenario('retrieval-a', 'retrieval'),
	scenario('retrieval-b', 'retrieval'),
	scenario('dedupe-a', 'dedupe'),
];

const orderedJobs = createEvalJobs({ scenarios, repeats: 2, parallelTopics: false });

assert.deepEqual(
	orderedJobs.map((job) => `${job.repeat}:${job.scenario.id}`),
	[
		'1:profile-a',
		'1:profile-b',
		'1:retrieval-a',
		'1:retrieval-b',
		'1:dedupe-a',
		'2:profile-a',
		'2:profile-b',
		'2:retrieval-a',
		'2:retrieval-b',
		'2:dedupe-a',
	],
	'ordered scheduling should preserve repeat-major scenario order',
);

assert.deepEqual(
	orderedJobs.map((job) => job.order),
	[0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
	'ordered jobs should have stable increasing order indexes',
);

const parallelTopicJobs = createEvalJobs({ scenarios, repeats: 2, parallelTopics: true });

assert.deepEqual(
	parallelTopicJobs.map((job) => `${job.repeat}:${job.scenario.id}`),
	[
		'1:profile-a',
		'1:retrieval-a',
		'1:dedupe-a',
		'1:profile-b',
		'1:retrieval-b',
		'2:profile-a',
		'2:retrieval-a',
		'2:dedupe-a',
		'2:profile-b',
		'2:retrieval-b',
	],
	'parallel topic scheduling should interleave categories while preserving intra-category order',
);

assert.equal(countSelectedCategories(scenarios), 3);

assert.equal(
	resolveEffectiveConcurrency({
		configuredConcurrency: 1,
		explicitConcurrency: false,
		parallelTopics: true,
		selectedCategoryCount: 3,
		jobCount: 10,
	}),
	3,
	'parallel topic scheduling should default concurrency to selected category count',
);

assert.equal(
	resolveEffectiveConcurrency({
		configuredConcurrency: 4,
		explicitConcurrency: true,
		parallelTopics: true,
		selectedCategoryCount: 3,
		jobCount: 10,
	}),
	4,
	'explicit concurrency should win when parallel topics are enabled',
);

assert.equal(
	resolveEffectiveConcurrency({
		configuredConcurrency: 1,
		explicitConcurrency: false,
		parallelTopics: false,
		selectedCategoryCount: 3,
		jobCount: 10,
	}),
	1,
	'ordered scheduling should keep the configured default concurrency',
);

assert.equal(
	resolveEffectiveConcurrency({
		configuredConcurrency: 1,
		explicitConcurrency: false,
		parallelTopics: true,
		selectedCategoryCount: 3,
		jobCount: 2,
	}),
	2,
	'effective concurrency should not exceed available jobs',
);

console.log('memory eval scheduling tests passed');
