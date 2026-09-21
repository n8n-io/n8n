import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { DataContract } from '../ir/schema';
import type { ValidationIssue } from './report';

/**
 * Producer/consumer contract checks along main connections: when both sides
 * declare a contract, every required consumer field must exist on the
 * producer, and a single-item consumer must not sit behind a many-item
 * producer without an explicit aggregation.
 */
export function validateContracts(
	workflow: WorkflowJSON,
	outputContracts: ReadonlyMap<string, DataContract>,
	inputContracts: ReadonlyMap<string, DataContract>,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const [source, outputs] of Object.entries(workflow.connections)) {
		const producer = outputContracts.get(source);
		if (!producer) continue;
		for (const { node: nodeName } of (outputs.main ?? []).flatMap((slot) => slot ?? [])) {
			const consumer = inputContracts.get(nodeName);
			if (!consumer) continue;
			for (const field of consumer.fields) {
				if (field.nullable || producer.fields.some((candidate) => candidate.name === field.name))
					continue;
				issues.push({
					severity: 'error',
					code: 'contract_missing_field',
					message: `"${nodeName}" needs "${field.name}" but "${source}" does not produce it.`,
					nodeName,
					parameter: field.name,
				});
			}
			if (consumer.cardinality === 'one' && producer.cardinality === 'many') {
				const message = `"${nodeName}" expects one item but "${source}" produces many.`;
				issues.push({ severity: 'warning', code: 'contract_cardinality', message, nodeName });
			}
		}
	}
	return issues;
}
