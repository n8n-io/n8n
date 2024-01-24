import type { INodeProperties } from 'n8n-workflow';

import * as generateAudio from './generateAudio.operation';
import * as transcribeRecording from './transcribeRecording.operation';
import * as translateRecording from './translateRecording.operation';

export { generateAudio, transcribeRecording, translateRecording };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate Audio',
				value: 'generateAudio',
				action: 'Generate audio',
				description: 'Creates audio from a text prompt',
			},
			{
				name: 'Transcribe a Recording',
				value: 'transcribeRecording',
				action: 'Transcribe a recording',
				description: 'Transcribes audio into the text',
			},
			{
				name: 'Translate a Recording',
				value: 'translateRecording',
				action: 'Translate a recording',
				description: 'Translate audio into the text in the english language',
			},
		],
		default: 'messageModel',
		displayOptions: {
			show: {
				resource: ['audio'],
			},
		},
	},
	{
		displayName: 'OpenAI API limits the size of the audio file to 25 MB',
		name: 'fileSizeLimitNotice',
		type: 'notice',
		default: ' ',
		displayOptions: {
			show: {
				resource: ['audio'],
				operation: ['translateRecording', 'transcribeRecording'],
			},
		},
	},
	...generateAudio.description,
	...transcribeRecording.description,
	...translateRecording.description,
];
