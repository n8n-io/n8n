/**
 * Execute Workflow Node Validator Plugin
 *
 * Validates that database-backed Execute Workflow nodes provide executable
 * input mappings instead of persisting the Resource Mapper's temporary null value.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import { parseVersion } from '../../string-utils';
import {
	type PluginContext,
	type ValidationIssue,
	type ValidatorPlugin,
	findMapKey,
	formatNodeRef,
	isAutoRenamed,
} from '../types';

const MIN_WORKFLOW_INPUTS_VERSION = 1.2;
const DATABASE_SOURCE = 'database';
const DEFINE_BELOW_MODE = 'defineBelow';
const WORKFLOW_INPUTS_VALUE_PATH = 'parameters.workflowInputs.value';
const VALID_MAPPING_EXAMPLE =
	"{ mappingMode: 'defineBelow', value: { order: expr('{{ $json }}') } }";

export const executeWorkflowValidator: ValidatorPlugin = {
	id: 'core:execute-workflow',
	name: 'Execute Workflow Validator',
	nodeTypes: ['n8n-nodes-base.executeWorkflow'],
	priority: 40,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		if (parseVersion(node.version) < MIN_WORKFLOW_INPUTS_VERSION) {
			return [];
		}

		const parameters = isRecord(node.config?.parameters) ? node.config.parameters : {};
		const source = parameters.source ?? DATABASE_SOURCE;

		if (source !== DATABASE_SOURCE) {
			return [];
		}

		const workflowInputs = parameters.workflowInputs;
		if (isRecord(workflowInputs)) {
			const mappingMode = workflowInputs.mappingMode ?? DEFINE_BELOW_MODE;
			if (mappingMode !== DEFINE_BELOW_MODE || isRecord(workflowInputs.value)) {
				return [];
			}
		}

		const mapKey = findMapKey(graphNode, ctx);
		const originalName = node.name;
		const renamed = isAutoRenamed(mapKey, originalName);
		const displayName = renamed ? mapKey : originalName;
		const origForWarning = renamed ? originalName : undefined;
		const nodeRef = formatNodeRef(displayName, origForWarning, node.type);

		return [
			{
				code: 'EXECUTE_WORKFLOW_INVALID_INPUT_MAPPING',
				message:
					`${nodeRef} has an invalid ${WORKFLOW_INPUTS_VALUE_PATH}. ` +
					`When parameters.workflowInputs.mappingMode is '${DEFINE_BELOW_MODE}', ${WORKFLOW_INPUTS_VALUE_PATH} must be an object whose keys match the selected sub-workflow's declared inputs. ` +
					`Set parameters.workflowInputs to ${VALID_MAPPING_EXAMPLE}.`,
				severity: 'error',
				violationLevel: 'major',
				nodeName: displayName,
				parameterPath: WORKFLOW_INPUTS_VALUE_PATH,
				originalName: origForWarning,
			},
		];
	},
};
