export { slug } from '../../workflow-compiler/text';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import {
	ModelDecisionService,
	NodeRegistry,
	NullDecisionService,
	type DecisionService,
} from '../../workflow-compiler';

/** Pieces the compiler-backed tools (`build-workflow`, `build-agent`) share. */

export const verificationLevelSchema = z.enum(['pass', 'fail', 'warn', 'not_run']);

export const clarificationQuestionsSchema = z
	.array(
		z.object({
			fields: z.array(z.string()),
			question: z.string(),
			candidates: z.array(z.unknown()).optional(),
		}),
	)
	.optional();

export const issueSchema = z.object({
	severity: z.enum(['error', 'warning', 'info']),
	code: z.string(),
	message: z.string(),
});

export const decisionDiagnosticsShape = {
	decisionCount: z.number(),
	decisionWaves: z.number(),
	decisionLatencyMs: z.number(),
	timings: z.record(z.string(), z.number()),
};

export const optional = <T extends z.ZodTypeAny>(schema: T, description: string) =>
	schema.optional().describe(description);
export const optionalString = (description: string) => optional(z.string(), description);

const registryByNodeService = new WeakMap<InstanceAiContext['nodeService'], NodeRegistry>();

/** One registry per node service, so descriptions load once per process. */
export function registryFor(context: InstanceAiContext): NodeRegistry {
	const key = context.nodeService;
	let registry = registryByNodeService.get(key);
	if (!registry) {
		registry = new NodeRegistry({
			descriptions: {
				getDescription: async (type, version) => await key.getDescription(type, version),
			},
		});
		registryByNodeService.set(key, registry);
	}
	return registry;
}

/** Decision backend priority: host-wired structured reads, then the run's model, then abstain. */
export function selectDecisionService(context: InstanceAiContext): DecisionService {
	if (context.decisionService) return context.decisionService;
	if (context.modelId) return new ModelDecisionService(context.modelId);
	return new NullDecisionService();
}
