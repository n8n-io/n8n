import type { InstanceAiPhaseSpec, InstanceAiPlanSpec } from '@n8n/api-types';
import { deepCopy } from 'n8n-workflow';

import { MastraPlanStorage } from '../plan-storage';

function clone<T>(value: T): T {
	return deepCopy(value);
}

function makePhase(
	id: string,
	overrides: Partial<InstanceAiPhaseSpec> = {},
): InstanceAiPhaseSpec {
	return {
		id,
		title: `Phase ${id}`,
		description: `Description for ${id}`,
		objective: `Objective for ${id}`,
		dependsOn: [],
		inputs: [],
		deliverable: `Deliverable for ${id}`,
		verification: {
			mode: 'resource-check',
			successCriteria: `Success for ${id}`,
			expectedOutcome: `Outcome for ${id}`,
		},
		blockingQuestions: [],
		status: 'pending',
		verificationAttempts: 0,
		artifacts: [],
		...overrides,
	};
}

function makePlan(overrides: Partial<InstanceAiPlanSpec> = {}): InstanceAiPlanSpec {
	return {
		planId: 'plan-1',
		goal: 'Build something useful',
		summary: 'Summary',
		assumptions: [],
		externalSystems: [],
		dataContracts: [],
		acceptanceCriteria: [],
		openQuestions: [],
		status: 'running',
		phases: [makePhase('phase-1'), makePhase('phase-2', { dependsOn: ['phase-1'] })],
		...overrides,
	};
}

function createPlanStateRepo(initialPlan?: InstanceAiPlanSpec, initialVersion = 1) {
	let entity = initialPlan
		? {
				threadId: 'thread-1',
				planId: initialPlan.planId,
				version: initialVersion,
				plan: clone(initialPlan),
			}
		: null;

	let firstUpdateHook: (() => void) | null = null;

	const repo = {
		findOneBy: jest.fn().mockImplementation(async ({ threadId }: { threadId: string }) => {
			if (!entity || entity.threadId !== threadId) {
				return null;
			}

			return clone(entity);
		}),
		insert: jest.fn().mockImplementation(async (nextEntity) => {
			if (entity) {
				const error = new Error('duplicate key');
				error.name = 'QueryFailedError';
				throw error;
			}

			entity = clone(nextEntity);
		}),
		update: jest
			.fn()
			.mockImplementation(
				async (
					criteria: { threadId: string; version: number },
					partial: { planId: string; version: number; plan: InstanceAiPlanSpec },
				) => {
					if (firstUpdateHook) {
						const hook = firstUpdateHook;
						firstUpdateHook = null;
						hook();
					}

					if (!entity || entity.threadId !== criteria.threadId || entity.version !== criteria.version) {
						return { affected: 0 };
					}

					entity = {
						...entity,
						planId: partial.planId,
						version: partial.version,
						plan: clone(partial.plan),
					};

					return { affected: 1 };
				},
			),
		setFirstUpdateHook(hook: () => void) {
			firstUpdateHook = hook;
		},
		replaceEntity(nextEntity: typeof entity) {
			entity = nextEntity ? clone(nextEntity) : null;
		},
		getEntity() {
			return entity ? clone(entity) : null;
		},
	};

	return repo;
}

describe('MastraPlanStorage', () => {
	it('keeps monotonic phase progress when a stale save races with a newer version', async () => {
		const existingPlan = makePlan({
			phases: [
				makePhase('phase-1', { status: 'building' }),
				makePhase('phase-2', { dependsOn: ['phase-1'], status: 'pending' }),
			],
		});
		const advancedPlan = makePlan({
			phases: [
				makePhase('phase-1', { status: 'done' }),
				makePhase('phase-2', { dependsOn: ['phase-1'], status: 'ready' }),
			],
		});
		const stalePlan = makePlan({
			phases: [
				makePhase('phase-1', { status: 'building' }),
				makePhase('phase-2', { dependsOn: ['phase-1'], status: 'pending' }),
			],
		});

		const repo = createPlanStateRepo(existingPlan);
		const storage = new MastraPlanStorage(repo as never);

		repo.setFirstUpdateHook(() => {
			repo.replaceEntity({
				threadId: 'thread-1',
				planId: advancedPlan.planId,
				version: 2,
				plan: advancedPlan,
			});
		});

		await storage.save('thread-1', stalePlan);

		const saved = repo.getEntity();
		expect(saved).not.toBeNull();
		expect(saved?.version).toBe(3);
		expect(saved?.plan.phases[0].status).toBe('done');
		expect(saved?.plan.phases[1].status).toBe('ready');
	});
});
