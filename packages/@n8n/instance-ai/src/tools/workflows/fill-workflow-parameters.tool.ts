/**
 * Fill Workflow Parameters Tool
 *
 * The step between a validated skeleton and build-workflow: fans out one small
 * LLM call per node to generate its parameters (concurrently), assembles the
 * full workflow deterministically, and writes the TypeScript source to the
 * workspace. The agent then reviews the reported issues/assumptions and calls
 * build-workflow with the returned filePath — no monolithic codegen turn.
 */
import { Tool } from '@n8n/agents';

import {
	fillWorkflowParametersInputSchema,
	fillWorkflowParametersResultSchema,
	type FillWorkflowParametersInput,
} from './fill-workflow-parameters.schema';
import { fillWorkflowParameters } from './fill-workflow-parameters.service';
import type { InstanceAiContext } from '../../types';

export function createFillWorkflowParametersTool(context: InstanceAiContext) {
	return new Tool('fill-workflow-parameters')
		.description(
			'Generate parameters for every node of a validated workflow skeleton — one parallel, ' +
				'focused generation per node — then assemble and write the complete TypeScript workflow ' +
				'source to the workspace. Call after plan-workflow-skeleton returns valid, with the same ' +
				'skeleton, a concrete brief, and per-node hints for anything specific the user asked for. ' +
				'Review the returned parameterIssues and assumptions, fix what matters (edit the file or ' +
				're-run with better hints), then call build-workflow with the returned filePath.',
		)
		.input(fillWorkflowParametersInputSchema)
		.output(fillWorkflowParametersResultSchema)
		.handler(
			async (input: FillWorkflowParametersInput) => await fillWorkflowParameters(context, input),
		)
		.build();
}
