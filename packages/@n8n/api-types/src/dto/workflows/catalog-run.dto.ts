import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Values a person supplies when running a workflow from the catalog.
 *
 * Left as an open record: the accepted keys are whatever the workflow declares
 * on its trigger, so they cannot be known here. The run service drops anything
 * the contract does not name.
 */
export class CatalogRunDto extends Z.class({
	inputs: z.record(z.string(), z.unknown()).optional(),
}) {}
