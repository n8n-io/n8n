import {
	instanceAiLearningReductionSchema,
	instanceAiWorkflowObservationDocumentSchema,
	type InstanceAiGeneratedLearning,
	type InstanceAiLearningReduction,
	type InstanceAiWorkflowObservationDocument,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';

import { InstanceAiModelService } from './instance-ai-model.service';
import type { InstanceAiWorkflowForLearning } from './instance-ai-learning-serializer.service';

const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

@Service()
export class InstanceAiLearningAiService {
	constructor(private readonly modelService: InstanceAiModelService) {}

	async resolveModel(user: User): Promise<ModelConfig> {
		return await this.modelService.resolveAgentModelConfig(user);
	}

	async observe(
		model: ModelConfig,
		workflow: InstanceAiWorkflowForLearning,
	): Promise<InstanceAiWorkflowObservationDocument> {
		const { Agent } = await import('@n8n/agents');
		const agent = new Agent('instance-ai-workflow-observer')
			.model(model)
			.instructions('Extract evidence-based observations from one n8n workflow.')
			.structuredOutput(instanceAiWorkflowObservationDocumentSchema);
		const result = await agent.generate(this.observationPrompt(workflow), {
			abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
		});
		const parsed = instanceAiWorkflowObservationDocumentSchema.safeParse(result.structuredOutput);
		if (!parsed.success) throw new Error('Workflow observation output did not match its schema');
		return parsed.data;
	}

	async reduce(
		model: ModelConfig,
		projectId: string,
		documents: InstanceAiWorkflowObservationDocument[],
	): Promise<InstanceAiLearningReduction> {
		const { Agent } = await import('@n8n/agents');
		const agent = new Agent('instance-ai-workflow-learning-reducer')
			.model(model)
			.instructions('Synthesize reusable project-specific learnings from workflow observations.')
			.structuredOutput(instanceAiLearningReductionSchema);
		const result = await agent.generate(this.reductionPrompt(projectId, documents), {
			abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
		});
		const parsed = instanceAiLearningReductionSchema.safeParse(result.structuredOutput);
		if (!parsed.success) throw new Error('Workflow learning output did not match its schema');
		return this.normalizeReduction(parsed.data, documents);
	}

	private observationPrompt(workflow: InstanceAiWorkflowForLearning): string {
		return `Extract concrete observations from this n8n workflow. Describe only what the graph supports.

What makes an observation useful: it captures a CHOICE — something that could
plausibly have been done another way — together with its specific values (channel
names, credential names, dataset/table names, URLs, model ids, prompt structure
and language, naming patterns). "Uses a Slack node" is useless; "sends error
notifications to Slack #ops-alerts with the execution URL in the message" is useful.
Common patterns are fine to record when you capture their specifics; skip commentary
on n8n itself and best-practice judgments.
Sticky notes are the builder's own documentation — treat their content as high-signal
evidence.

Rules:
- Cite exact node IDs and node names. Do not invent nodes.
- Do not include secrets, tokens, raw credential values, customer data, or long payloads.
- Never include credential IDs.
- Ignore disconnected nodes unless the observation explicitly says they are disconnected.
- Prefer 3-10 useful observations. An empty list is valid for a trivial workflow.
- Use IDs in the form "${workflow.id}-obs-1", incrementing within this workflow.

<workflow_json>
${JSON.stringify(workflow)}
</workflow_json>`;
	}

	private reductionPrompt(
		projectId: string,
		documents: InstanceAiWorkflowObservationDocument[],
	): string {
		return `Synthesize reusable, instance-specific knowledge from independently extracted n8n
workflow observations. You do not have the original workflows. Do not claim evidence that is not
present in these observations.

A valid learning must:
- help an assistant build or modify another workflow in the same scope;
- reflect this team, project, or environment;
- be supported by concrete observations;
- not be a universal n8n best practice;
- not expose secrets or unnecessarily reproduce sensitive data.

Distinguish preferences, environment facts, and tentative hypotheses. Analyze application choices
by purpose, systems of record, error handling and escalation, AI prompt conventions, architecture
and reuse, naming, organization, and transformations. Also discover patterns outside these lenses.

For each candidate:
- state when it applies;
- cite supporting workflow IDs and observation IDs;
- count distinct supporting workflows;
- count only explicit contradictions as counterexamples (omission is not a counterexample);
- do not use "all", "every", "always", "exclusively", or equivalent universal language;
- state the evidence scope explicitly;
- explain transferability and assign calibrated confidence;
- reject it if generic, unsupported, one-off, or not actionable.

A one-workflow candidate may survive only when it is an explicit, useful environment mapping and
must have appropriately lower confidence. Prefer a small set of strong learnings over an exhaustive
catalogue. Never repeat a credential ID, even if one appears in an observation. Omit database record
IDs, secrets, tokens, and unnecessary personal data. Credential names and types may be retained when
they are actionable.

Project ID: ${projectId}

<workflow_observations>
${JSON.stringify(documents)}
</workflow_observations>`;
	}

	private normalizeReduction(
		reduction: InstanceAiLearningReduction,
		documents: InstanceAiWorkflowObservationDocument[],
	): InstanceAiLearningReduction {
		const observationOwners = new Map<string, string>();
		const knownWorkflowIds = new Set<string>();
		for (const document of documents) {
			knownWorkflowIds.add(document.workflowId);
			for (const observation of document.observations) {
				observationOwners.set(observation.id, document.workflowId);
			}
		}

		return {
			...reduction,
			learnings: reduction.learnings.map((learning) =>
				this.normalizeLearning(learning, observationOwners, knownWorkflowIds),
			),
		};
	}

	private normalizeLearning(
		learning: InstanceAiGeneratedLearning,
		observationOwners: Map<string, string>,
		knownWorkflowIds: Set<string>,
	): InstanceAiGeneratedLearning {
		const supportingObservationIds = [
			...new Set(learning.supportingObservationIds.filter((id) => observationOwners.has(id))),
		];
		const supportingWorkflowIds = [
			...new Set(
				supportingObservationIds.flatMap((id) => {
					const workflowId = observationOwners.get(id);
					return workflowId ? [workflowId] : [];
				}),
			),
		];
		const counterexampleWorkflowIds = [
			...new Set(learning.counterexampleWorkflowIds.filter((id) => knownWorkflowIds.has(id))),
		];

		return {
			...learning,
			supportingObservationIds,
			supportingWorkflowIds,
			supportingWorkflowCount: supportingWorkflowIds.length,
			counterexampleWorkflowIds,
			counterexampleCount: counterexampleWorkflowIds.length,
		};
	}
}
