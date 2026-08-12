import type { IConnections, INode } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * The slice of a workflow the generator needs. Node shapes stay loose (the
 * editor's in-memory nodes vary and the generator only reads name/type/version/
 * parameters), but both fields must be present.
 */
export interface SampleDataWorkflow {
	name?: string;
	nodes: INode[];
	connections: IConnections;
}

/**
 * One prompt carries every requested node's schema block, so the cap keeps a
 * single request from ballooning. The NDV button sends exactly one node; the
 * ceiling is headroom for a future whole-workflow action.
 */
const MAX_NODES_PER_REQUEST = 20;

const MAX_HINT_LENGTH = 2000;

/**
 * Deliberately loose, matching `AiBuilderChatRequestDto`'s `currentWorkflow`: the
 * editor's in-memory workflow has many valid shapes, and the generator is
 * defensive downstream (it filters nodes by name and returns nothing when none
 * match).
 *
 * The type guard comes first because this field is required, so the predicate is
 * handed whatever the body contained. Anything that isn't a plain object has to
 * come back as a validation failure — a throw inside a custom validator escapes
 * the parse and turns a bad request into a 500.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const workflowSchema = z.custom<SampleDataWorkflow>((value: unknown) => {
	if (!isRecord(value)) return false;
	// Both required, unlike the builder's optional workflow context: the generator
	// reads `nodes` unconditionally and builds a graph from `connections`, so a
	// half-workflow is a 500 waiting to happen rather than a degraded result.
	return Array.isArray(value.nodes) && isRecord(value.connections);
});

export class InstanceAiGenerateSampleDataRequestDto extends Z.class({
	/**
	 * The workflow as it currently stands in the editor — unsaved edits included.
	 * Provides the node graph the generator uses to match the field names
	 * downstream nodes actually read. Send `{ name, nodes, connections }` only:
	 * credentials and existing pin data are never read and pin data can be large.
	 */
	workflow: workflowSchema,
	nodeNames: z.array(z.string()).min(1).max(MAX_NODES_PER_REQUEST),
	/** Freeform steer for the generated data, e.g. "failed payment scenario". */
	hint: z.string().max(MAX_HINT_LENGTH).optional(),
}) {}
