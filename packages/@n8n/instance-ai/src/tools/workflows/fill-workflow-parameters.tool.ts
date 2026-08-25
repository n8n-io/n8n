/**
 * Fill Workflow Parameters Tool
 *
 * The single entry point for new-workflow source generation: validates the
 * skeleton internally, fans out one small LLM call per node to generate its
 * parameters (concurrently), assembles the full workflow deterministically,
 * and writes the TypeScript source to the workspace. The agent then reviews
 * the reported issues/assumptions and calls build-workflow with the returned
 * filePath — no monolithic codegen turn.
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
			'THE way to produce a NEW workflow’s source file — never hand-write it. Takes a topology ' +
				'skeleton (nodes, connections, no parameters), a concrete brief, and per-node hints; ' +
				'validates the skeleton (no separate plan-workflow-skeleton call needed), generates every ' +
				'node’s parameters in parallel, assembles the workflow deterministically, and writes the ' +
				'TypeScript source to the workspace. Review the returned parameterIssues and assumptions, ' +
				'fix what matters (edit the file or re-run with better hints), then call build-workflow ' +
				'with the returned filePath.',
		)
		.systemInstruction(
			'Create every NEW workflow’s source with the fill-workflow-parameters tool. Never hand-write ' +
				'a new workflow’s TypeScript with workspace_write_file — hand-written source is only for ' +
				'editing existing workflows, or as a fallback when fill-workflow-parameters fails.',
		)
		.input(fillWorkflowParametersInputSchema)
		.output(fillWorkflowParametersResultSchema)
		.handler(
			async (input: FillWorkflowParametersInput) => await fillWorkflowParameters(context, input),
		)
		.build();
}
