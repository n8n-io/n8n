import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeExecutionData, IRedactedFieldMarker } from 'n8n-workflow';

import type { RedactableExecution } from '@/executions/execution-redaction';
import { NodeTypes } from '@/node-types';

import type {
	IExecutionRedactionStrategy,
	RedactionContext,
} from '../execution-redaction.interfaces';

@Service()
export class NodeDefinedFieldRedactionStrategy implements IExecutionRedactionStrategy {
	readonly name = 'node-defined-field-redaction';

	constructor(
		private readonly logger: Logger,
		private readonly nodeTypes: NodeTypes,
	) {}

	async apply(execution: RedactableExecution, _context: RedactionContext): Promise<void> {
		const sensitiveFieldsMap = this.buildSensitiveFieldsMap(execution);
		if (sensitiveFieldsMap.size === 0) return;

		const runData = execution.data.resultData.runData;
		if (!runData) return;

		for (const nodeName of Object.keys(runData)) {
			const fieldPaths = sensitiveFieldsMap.get(nodeName);
			if (!fieldPaths?.length) continue;

			for (const taskData of runData[nodeName]) {
				if (taskData.data) {
					for (const outputs of Object.values(taskData.data)) {
						for (const items of outputs) {
							if (items) {
								for (const item of items) {
									this.redactFields(item, fieldPaths);
								}
							}
						}
					}
				}
			}
		}
	}

	/**
	 * Builds a map from workflow node name → sensitive field paths declared on
	 * that node's type description.  Resolved once per execution call.
	 */
	private buildSensitiveFieldsMap(execution: RedactableExecution): Map<string, string[]> {
		const map = new Map<string, string[]>();

		for (const node of execution.workflowData.nodes) {
			let description;
			try {
				description = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
			} catch {
				this.logger.warn(
					`[NodeDefinedFieldRedactionStrategy] Could not load type for node "${node.name}" (${node.type} v${node.typeVersion}) — skipping`,
				);
				continue;
			}

			if (description.sensitiveOutputFields?.length) {
				map.set(node.name, description.sensitiveOutputFields);
			}
		}

		return map;
	}

	/**
	 * Replaces declared sensitive field values in `item.json` with an
	 * `IRedactedFieldMarker`.  Uses fail-fast path traversal: stops at the
	 * first missing segment (no error, no sibling traversal).
	 */
	private redactFields(item: INodeExecutionData, fieldPaths: string[]): void {
		for (const path of fieldPaths) {
			this.redactPath(item.json, path);
		}
	}

	private redactPath(obj: Record<string, unknown>, path: string): void {
		const segments = path.split('.');
		let current: Record<string, unknown> = obj;

		for (let i = 0; i < segments.length - 1; i++) {
			const segment = segments[i];
			const next = current[segment];
			if (next === null || next === undefined || typeof next !== 'object') {
				// Fail fast — path does not exist, nothing to redact
				return;
			}
			current = next as Record<string, unknown>;
		}

		const lastSegment = segments[segments.length - 1];
		if (!(lastSegment in current)) return;

		const marker: IRedactedFieldMarker = {
			__redacted: true,
			reason: 'node_defined_field',
			canReveal: false,
		};
		current[lastSegment] = marker;
	}
}
