import type { INodeProperties } from 'n8n-workflow';
import * as textToVideo from './generate.t2v.operation';
import * as imageToVideo from './generate.i2v.operation';
import * as download from './download.operation';

export { textToVideo, imageToVideo, download };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['video'],
			},
		},
		options: [
			{
				name: 'Generate Video From Text',
				value: 'textToVideo',
				action: 'Generate video from text prompt',
				description: 'Generate a video from a text prompt',
			},
			{
				name: 'Generate Video From Image',
				value: 'imageToVideo',
				action: 'Generate video from image',
				description: 'Generate a video from one or more images using Wan models',
			},
			{
				name: 'Download Video',
				value: 'download',
				action: 'Download a generated video',
				description: 'Download a generated video from a URL',
			},
		],
		default: 'textToVideo',
	},
	...textToVideo.description,
	...imageToVideo.description,
	...download.description,
];
