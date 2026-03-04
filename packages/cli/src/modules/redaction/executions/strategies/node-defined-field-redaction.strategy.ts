import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeExecutionData, IRedactedFieldMarker, ITaskDataConnections } from 'n8n-workflow';

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
		const { sensitiveFields, unknownNodes } = this.buildSensitiveFieldsMap(execution);
		if (sensitiveFields.size === 0 && unknownNodes.size === 0) return;

		const runData = execution.data.resultData.runData;
		if (!runData) return;

		for (const nodeName of Object.keys(runData)) {
			if (unknownNodes.has(nodeName)) {
				for (const taskData of runData[nodeName]) {
					if (taskData.data) {
						this.redactAllOutputs(taskData.data);
					}
				}
				continue;
			}

			const fieldPaths = sensitiveFields.get(nodeName);
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
	 *
	 * When a node type cannot be resolved (e.g. community node uninstalled), the
	 * node is added to `unknownNodes` so its entire output is wiped conservatively
	 * (fail-closed), honouring the contract that `sensitiveOutputFields` are
	 * always redacted and never revealable.
	 */
	private buildSensitiveFieldsMap(execution: RedactableExecution): {
		sensitiveFields: Map<string, string[]>;
		unknownNodes: Set<string>;
	} {
		const sensitiveFields = new Map<string, string[]>();
		const unknownNodes = new Set<string>();

		for (const node of execution.workflowData.nodes) {
			let description;
			try {
				description = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
			} catch {
				this.logger.warn(
					`[NodeDefinedFieldRedactionStrategy] Could not load type for node "${node.name}" (${node.type} v${node.typeVersion}) — redacting all outputs conservatively`,
				);
				unknownNodes.add(node.name);
				continue;
			}

			if (description.sensitiveOutputFields?.length) {
				sensitiveFields.set(node.name, description.sensitiveOutputFields);
			}
		}

		return { sensitiveFields, unknownNodes };
	}

	/**
	 * Clears all items across every connection output for a node whose type
	 * could not be resolved.  Fail-closed: wipes `json` and `binary`, sets a
	 * redaction marker so callers know the data was removed.
	 */
	private redactAllOutputs(connections: ITaskDataConnections): void {
		for (const outputs of Object.values(connections)) {
			for (const items of outputs) {
				if (items) {
					for (const item of items) {
						item.json = {};
						delete item.binary;
						item.redaction = { redacted: true, reason: 'node_type_unavailable' };
					}
				}
			}
		}
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

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	private redactPath(obj: Record<string, unknown>, path: string): void {
		const segments = path.split('.');
		let current: Record<string, unknown> = obj;

		for (let i = 0; i < segments.length - 1; i++) {
			const segment = segments[i];
			const next = current[segment];
			if (!this.isRecord(next)) {
				// Fail fast — path does not exist, nothing to redact
				return;
			}
			current = next;
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
