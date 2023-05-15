import type { INodeProperties } from 'n8n-workflow';

export const watermarkFields: INodeProperties[] = [
	{
		displayName: 'Watermark Image',
		name: 'useWatermarkImage',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['watermark'],
			},
		},
		description: 'Whether the watermark should be an image',
	},
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['watermark'],
				useWatermarkImage: [true],
			},
		},
		placeholder: 'https://...',
		description: 'The URL to the image (PNG, JPG, SVG) which should be added as watermark',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['watermark'],
				useWatermarkImage: [false],
			},
		},
		placeholder: '',
		description: 'Sets the text to use as watermark',
	},
	{
		displayName: 'Font Size',
		name: 'font_size',
		type: 'number',
		default: 40,
		required: true,
		displayOptions: {
			show: {
				operation: ['watermark'],
				useWatermarkImage: [false],
			},
		},
		placeholder: '',
		description: 'Watermark font size',
	},
	{
		displayName: 'Font Color',
		name: 'font_color',
		type: 'color',
		default: '#000000',
		displayOptions: {
			show: {
				operation: ['watermark'],
				useWatermarkImage: [false],
			},
		},
		placeholder: '',
		description: 'Watermark font size',
	},
	{
		displayName: 'Vertical Position',
		name: 'position_vertical',
		type: 'options',
		default: 'center',
		options: [
			{
				name: 'Top',
				value: 'top',
			},
			{
				name: 'Center',
				value: 'center',
			},
			{
				name: 'Bottom',
				value: 'bottom',
			},
		],
		displayOptions: {
			show: { operation: ['watermark'] },
		},
		description: 'Vertical position of the watermark',
	},
	{
		displayName: 'Horizontal Position',
		name: 'position_horizontal',
		type: 'options',
		default: 'center',
		options: [
			{
				name: 'Left',
				value: 'left',
			},
			{
				name: 'Center',
				value: 'center',
			},
			{
				name: 'Right',
				value: 'right',
			},
		],
		displayOptions: {
			show: { operation: ['watermark'] },
		},
		description: 'Horizontal position of the watermark',
	},
	{
		displayName: 'Vertical Margin',
		name: 'margin_vertical',
		type: 'number',
		default: 25,
		displayOptions: {
			show: {
				operation: ['watermark'],
			},
		},
		placeholder: '',
		description: 'Spacing to the left and to the right of the watermark',
	},
	{
		displayName: 'Horizontal Margin',
		name: 'margin_horizontal',
		type: 'number',
		default: 25,
		displayOptions: {
			show: {
				operation: ['watermark'],
			},
		},
		placeholder: '',
		description: 'Spacing to the top and to the bottom of the watermark',
	},
	{
		displayName: 'Opacity',
		name: 'opacity',
		type: 'number',
		default: 100,
		displayOptions: {
			show: {
				operation: ['watermark'],
			},
		},
		placeholder: '',
		description:
			'Opacity in % to make the watermark transparent. A value of 100 means it is fully visible.',
	},
];
