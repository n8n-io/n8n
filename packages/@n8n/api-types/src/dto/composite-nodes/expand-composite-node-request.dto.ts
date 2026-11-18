import type { INode } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

const isNode = (value: unknown): value is INode =>
	typeof value === 'object' &&
	value !== null &&
	'name' in value &&
	typeof value.name === 'string' &&
	'type' in value &&
	typeof value.type === 'string' &&
	'typeVersion' in value &&
	typeof value.typeVersion === 'number' &&
	'parameters' in value &&
	typeof value.parameters === 'object';

export class ExpandCompositeNodeRequestDto extends Z.class({
	/** The composite node as it is on the canvas, including unsaved changes. */
	node: z.custom<INode>(isNode, {
		message: 'Node must have a name, a type, a version and parameters',
	}),
}) {}
