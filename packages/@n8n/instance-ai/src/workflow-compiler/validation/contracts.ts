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
		for (const slot of outputs.main ?? []) {
			for (const connection of slot ?? []) {
				const consumer = inputContracts.get(connection.node);
				if (!consumer) continue;
				for (const field of consumer.fields) {
					if (field.nullable) continue;
					if (!producer.fields.some((candidate) => candidate.name === field.name)) {
						issues.push({
							severity: 'error',
							code: 'contract_missing_field',
							message: `"${connection.node}" needs "${field.name}" but "${source}" does not produce it.`,
							nodeName: connection.node,
							parameter: field.name,
						});
					}
				}
				if (consumer.cardinality === 'one' && producer.cardinality === 'many') {
					issues.push({
						severity: 'warning',
						code: 'contract_cardinality',
						message: `"${connection.node}" expects one item but "${source}" produces many.`,
						nodeName: connection.node,
					});
				}
			}
		}
	}
	return issues;
}
