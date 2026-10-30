import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const dependencyPublicTypes = [
	'agent',
	'credential',
	'dataTable',
	'errorWorkflow',
	'errorWorkflowParent',
	'parentWorkflow',
	'subWorkflow',
] as const;

export type DependencyPublicType = (typeof dependencyPublicTypes)[number];

const dependencyPublicSchema = z.object({
	type: z.enum(dependencyPublicTypes).openapi({
		description:
			'The relation to the requested resource. ' +
			'`credential`, `dataTable`, `subWorkflow`, `errorWorkflow`: the requested workflow uses this dependency. ' +
			'`parentWorkflow`: this workflow uses the requested resource. ' +
			'`errorWorkflowParent`: this workflow uses the requested workflow as its error workflow. ' +
			'`agent`: this agent uses the requested resource.',
	}),
	id: z.string().openapi({ example: '2tUt1wbLX592XDdX' }),
	name: z.string().openapi({ example: 'Sync customers' }),
	projectId: z.string().optional().openapi({
		description: 'The project that owns the dependency, when it is known.',
	}),
});

export class ListDependenciesQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}

export class DependencyListPublicDto extends Z.class({
	data: z.array(dependencyPublicSchema),
	nextCursor: z.string().nullable(),
	inaccessibleCount: z.number().int().min(0).openapi({
		description: 'The number of dependencies that you do not have access to. They are not listed.',
	}),
}) {}
