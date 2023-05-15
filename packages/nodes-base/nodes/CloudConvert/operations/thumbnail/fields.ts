import type { INodeProperties } from 'n8n-workflow';

export const thumbnailFields: INodeProperties[] = [
	{
		displayName: 'Width',
		name: 'width',
		type: 'number',
		default: '',
		displayOptions: {
			show: {
				operation: ['thumbnail'],
			},
		},
		placeholder: '',
		description: 'Thumbnail width in pixels',
	},
	{
		displayName: 'Height',
		name: 'height',
		type: 'number',
		default: '',
		displayOptions: {
			show: {
				operation: ['thumbnail'],
			},
		},
		placeholder: '',
		description: 'Thumbnail height in pixels',
	},
	{
		displayName: 'Fit',
		name: 'fit',
		type: 'options',
		default: 'max',
		options: [
			{
				name: 'Max',
				value: 'max',
			},
			{
				name: 'Crop',
				value: 'crop',
			},
			{
				name: 'Scale',
				value: 'scale',
			},
		],
		displayOptions: {
			show: {
				operation: ['thumbnail'],
			},
		},
		description:
			'Sets the mode of resizing the image. "Max" resizes the image to fit within the width and height, but will not increase the size of the image if it is smaller than width or height. "Crop" resizes the image to fill the width and height dimensions and crops any excess image data. "Scale" enforces the image width and height by scaling.',
	},
];
