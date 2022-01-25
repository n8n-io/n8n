import { INodeProperties } from 'n8n-workflow';

import { canvasFields } from './CreateUpdateCanvasFieldsDescription';
import { textFields } from './CreateUpdateTextFieldsDescription';
import { shapeFields } from './CreateUpdateShapeFieldsDescription';

export const createUpdateElementFields = [
	// ----------------------------------
	//       element shared fields
	// ----------------------------------
	{
		displayName: 'Pinned',
		name: 'pinned',
		type: 'boolean',
		default: false,
		description: 'If true, element will be "pinned" and immovable in the workspace',
		displayOptions: {
			show: {
				content: ['elements'],
				operation: ['update', 'create'],
			},
		},
	},
	{
		displayName: 'Z-Index',
		name: 'zIndex',
		type: 'number',
		description:
			'Stack order, an element with a higher stack order is in front of a lower stack order',
		displayOptions: {
			show: {
				content: ['elements'],
				operation: ['update', 'create'],
			},
		},
	},
	// ----------------------------------
	//       Element type fields
	// ----------------------------------
	...canvasFields,
	...textFields,
	...shapeFields,
] as INodeProperties[];
