import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

export type InstanceAiWorkflowForLearning = {
	id: string;
	name: string;
	isArchived: boolean;
	nodes: unknown[];
	connections: unknown;
	settings?: unknown;
	meta?: unknown;
	tags?: Array<{ name: string }>;
};

@Service()
export class InstanceAiLearningSerializer {
	serialize(workflow: WorkflowEntity, usePublishedVersion: boolean): InstanceAiWorkflowForLearning {
		const source = usePublishedVersion ? (workflow.activeVersion ?? workflow) : workflow;
		const nodes = source.nodes.map((node) => ({
			id: node.id,
			name: node.name,
			type: node.type,
			typeVersion: node.typeVersion,
			position: node.position,
			disabled: node.disabled,
			parameters: this.redact(node.parameters),
			credentials: node.credentials
				? Object.fromEntries(
						Object.entries(node.credentials).map(([type, credential]) => [
							type,
							{ name: credential.name },
						]),
					)
				: undefined,
		}));

		return {
			id: workflow.id,
			name: workflow.name,
			isArchived: workflow.isArchived,
			nodes,
			connections: this.redact(source.connections),
			settings: this.redact(workflow.settings),
			meta: this.redact(workflow.meta),
			tags: workflow.tags?.map(({ name }) => ({ name })),
		};
	}

	private redact(value: unknown, key = ''): unknown {
		if (Array.isArray(value)) return value.map((item) => this.redact(item, key));

		if (value === null || typeof value !== 'object') {
			if (typeof value !== 'string') return value;
			if (this.isSensitiveKey(key)) return '[REDACTED]';
			return scrubSecretsInText(value);
		}

		return Object.fromEntries(
			Object.entries(value).map(([entryKey, entryValue]) => [
				entryKey,
				this.redact(entryValue, entryKey),
			]),
		);
	}

	private isSensitiveKey(key: string): boolean {
		const normalized = key.toLowerCase();
		return ['password', 'secret', 'token', 'apikey', 'api_key', 'authorization'].some((part) =>
			normalized.includes(part),
		);
	}
}
