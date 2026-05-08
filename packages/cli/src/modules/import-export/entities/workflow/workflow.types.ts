import type { Folder, TagEntity } from '@n8n/db';

import type { IWorkflowWithVersionMetadata } from '@/interfaces';

import type { SerializedWorkflow } from '../../spec/serialized/workflow.serialized';

/**
 * Shape WorkflowImporter constructs and ImportService.importWorkflows consumes.
 *
 * Builds on the wire shape (`SerializedWorkflow`) plus the relation/metadata
 * fields ImportService reads:
 *   - `parentFolder`: TypeORM relation object — required for upsert mapping,
 *     since WorkflowEntity stores `parentFolder` (relation) alongside
 *     `parentFolderId` (column).
 *   - `tags`: minimal `{id, name}` entries — ImportService only reads `tag.id`
 *     and delegates to `TagRepository.setTags`, which matches by name. Passing
 *     fully-hydrated `TagEntity[]` would require fabricating timestamps.
 *   - `versionMetadata`: WorkflowHistory metadata for the rollback UI.
 *
 * The wire-only `tagIds` field is intentionally absent — it is stripped at
 * construction time.
 */
export interface WorkflowReadyForImport extends Omit<SerializedWorkflow, 'tagIds'> {
	parentFolder: Pick<Folder, 'id'> | null;
	tags?: Array<Pick<TagEntity, 'id' | 'name'>>;
	versionMetadata: {
		name: string;
		description: string;
	};
}

/**
 * Bridge from the importer's structural type to ImportService's declared
 * signature. The narrower `tags` and `parentFolder` shapes on
 * `WorkflowReadyForImport` are runtime-compatible: ImportService only reads
 * `tag.id` and `parentFolder.id`. ImportService also mutates the input to
 * populate fields it requires (`active`, `activeVersionId`, `versionId`,
 * timestamps), so passing a partial shape is the established contract.
 *
 * Localising the cast here keeps `workflow.importer.ts` free of `as unknown`.
 */
export function asImportServicePayload(
	workflows: WorkflowReadyForImport[],
): IWorkflowWithVersionMetadata[] {
	return workflows as unknown as IWorkflowWithVersionMetadata[];
}
