import '../../openapi-extend';
import type { IRunData } from 'n8n-workflow';
import { z } from 'zod';

import { destinationNodeSchema } from './manual-run.dto';
import { objectGuardSchema } from '../../schemas/object-guard.schema';
import { Z } from '../../zod-class';

const publicDestinationNodeSchema = z
	.object({
		nodeName: destinationNodeSchema.shape.nodeName.openapi({
			description: 'Name of the node to run to.',
		}),
		mode: destinationNodeSchema.shape.mode.openapi({
			description:
				'`inclusive` runs the destination node. `exclusive` stops before the destination node.',
		}),
	})
	.strict();

export const runWorkflowPublicSchema = z.object({
	runData: objectGuardSchema<IRunData>().openapi({
		type: 'object',
		additionalProperties: true,
		description:
			'Run data to reuse, keyed by node name. Use `data.resultData.runData` from ' +
			'`GET /executions/{id}?includeData=true`. n8n reuses the output of these nodes and runs ' +
			'the other nodes up to the destination node. If the run data does not reach the ' +
			'destination node from a trigger, n8n runs the workflow from its trigger. If that trigger ' +
			'needs an external event to start, the API returns `409`.',
	}),
	destinationNode: publicDestinationNodeSchema.openapi({
		description: 'The node where the run stops.',
	}),
	dirtyNodeNames: z
		.array(z.string())
		.optional()
		.openapi({
			description:
				'Names of nodes that changed since the run data was made. n8n runs these nodes again ' +
				'and does not reuse their run data.',
		}),
});

export class RunWorkflowPublicDto extends Z.class(runWorkflowPublicSchema.shape, {
	strict: true,
}) {}

export const startedWorkflowRunPublicSchema = z.object({
	executionId: z.string().openapi({
		description: 'ID of the new execution. Use `GET /executions/{id}` to read its status.',
		example: '1001',
	}),
});

export class StartedWorkflowRunPublicDto extends Z.class(startedWorkflowRunPublicSchema.shape) {}
