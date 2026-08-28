import type { WorkflowEntity } from '@n8n/db';

import type { RequirementsExtractor } from './requirements-extractor';
import type { PackageImportBindings } from '../n8n-packages.types';

/**
 *  When we pull out a requirement, we also need to rebind on the other side.
 *
 *  When we bring credentials/variables into this model we should be able to merge the interfaces.
 **/
export interface EntityReference<TRequirement> extends RequirementsExtractor<TRequirement> {
	/**
	 *
	 * @param workflow The workflow which bindings should be injected
	 * @param bindings Bindings that should be injected into the workflow
	 */
	apply(workflow: WorkflowEntity, bindings: PackageImportBindings): void;
}
