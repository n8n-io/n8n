import '../../openapi-extend';
import type { IDestinationNode, IRunData } from 'n8n-workflow';
import { z } from 'zod';

import { objectGuardSchema } from '../../schemas/object-guard.schema';
import { Z } from '../../zod-class';

const publicDestinationNodeSchema = z
	.object({
		nodeName: z.string().openapi({
			description: 'Name of the node to run to.',
		}),
		mode: z.enum(['inclusive', 'exclusive']).openapi({
			description:
				'`inclusive` runs the destination node. `exclusive` stops before the destination node.',
		}),
	})
	.strict() satisfies z.ZodType<IDestinationNode>;

const publicRunDataSchema = objectGuardSchema<IRunData>();

const publicDirtyNodeNamesSchema = z.array(z.string()).optional();

export const runWorkflowPublicSchema = z.object({
	runData: publicRunDataSchema.openapi({
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
	dirtyNodeNames: publicDirtyNodeNamesSchema.openapi({
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
