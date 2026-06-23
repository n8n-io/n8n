import { z } from 'zod';

const idCollectionSchema = z.array(z.string().trim().min(1)).max(300).optional();

const exportWorkflowsRequestSchema = z
	.object({
		workflowIds: idCollectionSchema,
		folderIds: idCollectionSchema,
	})
	.refine((data) => (data.workflowIds?.length ?? 0) + (data.folderIds?.length ?? 0) > 0, {
		message: 'Provide at least one workflow or folder to export',
	});

type ExportWorkflowsRequest = z.infer<typeof exportWorkflowsRequestSchema>;

/**
 * Export request body: `workflowIds` and/or `folderIds`, at least one non-empty.
 * Hand-rolled rather than a `Z.class` because the "at least one" rule is
 * cross-field, which `Z.class` cannot express (it only allows field-level refinement).
 */
export class ExportWorkflowsRequestDto {
	declare workflowIds?: string[];

	declare folderIds?: string[];

	constructor(data: ExportWorkflowsRequest) {
		Object.assign(this, exportWorkflowsRequestSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return exportWorkflowsRequestSchema.safeParse(data);
	}

	static parse(data: unknown): ExportWorkflowsRequest {
		return exportWorkflowsRequestSchema.parse(data);
	}
}
