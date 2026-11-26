import type { WorkflowEntity } from '@n8n/db';

import type { RequirementsExtractor } from './requirements-extractor';
import type { PackageImportBindings } from '../n8n-packages.types';

/** What a reference reads of a workflow to find the entities that the workflow uses. */
export type WorkflowReferenceSource = Pick<WorkflowEntity, 'id' | 'nodes' | 'settings'>;

/**
 *  When we pull out a requirement, we also need to rebind on the other side.
 *
 *  When we bring credentials/variables into this model we should be able to merge the interfaces.
 **/
export interface EntityReference<TRequirement> extends RequirementsExtractor<TRequirement> {
	/** A workflow file of a package holds these fields too, so a check can read its references. */
	extract(workflow: WorkflowReferenceSource): TRequirement[];

	/**
	 *
	 * @param workflow The workflow which bindings should be injected
	 * @param bindings Bindings that should be injected into the workflow
	 */
	apply(workflow: WorkflowEntity, bindings: PackageImportBindings): void;
}
