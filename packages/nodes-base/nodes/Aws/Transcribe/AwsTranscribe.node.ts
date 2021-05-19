import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
} from './GenericFunctions';

export class AwsTranscribe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Transcribe',
		name: 'AwsTranscribe',
		icon: 'file:transcribe.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Amazon Transcribe',
		defaults: {
			name: 'AWS Transcribe',
			color: '#5aa08d',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Audio File',
						value: 'file',
					},
				],
				default: 'file',
				description: 'The resource to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Start Transcription Job',
						value: 'startTranscriptionJob',
						description: 'Starts a transcription job',
					},
					{
						name: 'List Transcription Jobs',
						value: 'listTranscriptionJobs',
						description: 'Lists transcription jobs',
					},
					{
						name: 'Get Transcription Job',
						value: 'getTranscriptionJob',
						description: 'Returns information about a transcription job',
					},
				],
				default: 'startTranscriptionJob',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Job Name',
				name: 'transcriptionJobName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
						operation: [
							'startTranscriptionJob',
							'getTranscriptionJob',
						],
					},
				},
				description: 'The name of the job.',
			},
			{
				displayName: 'Media File URI',
				name: 'mediaFileUri',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
						operation: [
							'startTranscriptionJob',
						],
					},
				},
				description: 'The S3 object location of the input media file. ',
			},
			{
				displayName: 'Detect Language',
				name: 'detectLanguage',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
						operation: [
							'startTranscriptionJob',
						],
					},
				},
				default: false,
				description: 'When set to true a simplify version of the response will be used else the raw data.',
			},
			{
				displayName: 'Language Code',
				name: 'languageCode',
				type: 'options',
				options: [
					{
						name: 'American English',
						value: 'en-US',
					},
					{
						name: 'British English',
						value: 'en-GB',
					},
					{
						name: 'Irish English',
						value: 'en-IE',
					},
					{
						name: 'Indian English',
						value: 'en-IN',
					},
					{
						name: 'Spanish',
						value: 'es-ES',
					},
					{
						name: 'German',
						value: 'de-DE',
					},
					{
						name: 'Russian',
						value: 'ru-RU',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'file',
						],
						operation: [
							'startTranscriptionJob',
						],
					},
				},
				default: 'en-US',
				description: 'The language code for the language used in the input media file.',
			},
			// ----------------------------------
			//         Transcription Job Settigns
			// ----------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: [
							'startTranscriptionJob',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Channel Identification',
						name: 'channelIdentification',
						type: 'boolean',
						default: false,
						description: 'Instructs Amazon Transcribe to process each audio channel separately.',
					},
					{
						displayName: 'Show Alternatives',
						name: 'showAlternatives',
						type: 'boolean',
						default: false,
						description: 'Instructs Amazon Transcribe to process each audio channel separately.',
					},
					{
						displayName: 'Max Alternatives',
						name: 'maxAlternatives',
						type: 'number',
						default: 2,
						description: 'The number of alternative transcriptions that the service should return[2-10].',
					},
					{
						displayName: 'Max Speaker Labels',
						name: 'maxSpeakerLabels',
						type: 'number',
						default: 2,
						description: 'The maximum number of speakers to identify in the input audio[2-10].',
					},
					{
						displayName: 'Vocabulary Name',
						name: 'vocabularyName',
						type: 'string',
						default: '',
						description: 'The name of a vocabulary to use when processing the transcription job.',
					},
					{
						displayName: 'Vocabulary Filter Name',
						name: 'vocabularyFilterName',
						type: 'string',
						default: '',
						description: 'The name of the vocabulary filter to use when transcribing the audio.',
					},
					{
						displayName: 'Vocabulary Filter Method',
						name: 'vocabularyFilterMethod',
						type: 'options',
						options: [
							{
								name: 'Remove',
								value: 'remove',
							},
							{
								name: 'Mask',
								value: 'mask',
							},
							{
								name: 'Tag',
								value: 'tag',
							},
							
						],
						default: '',
						description: 'Defines how to handle filtered text.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			if (resource === 'file') {
				//https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectDominantLanguage.html
				if (operation === 'startTranscriptionJob') {
					const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;
					const mediaFileUri = this.getNodeParameter('mediaFileUri', i) as string;
					const languageCode = this.getNodeParameter('languageCode', i) as string;
					const detectLang = this.getNodeParameter('detectLanguage', i) as boolean;

					const options = this.getNodeParameter('options', i, {}) as IDataObject;

					// const channelIdentification = this.getNodeParameter('channelIdentification', i) as boolean;
					// const maxAlternatives = this.getNodeParameter('maxAlternatives', i) as number;
					// const maxSpeakerLabels = this.getNodeParameter('maxSpeakerLabels', i) as number;
					// const showAlternatives = this.getNodeParameter('showAlternatives', i) as boolean;
					// const showSpeakerLabels = this.getNodeParameter('showSpeakerLabels', i) as boolean;
					// const vocabularyName = this.getNodeParameter('vocabularyName', i) as string;
					// const vocabularyFilterName = this.getNodeParameter('vocabularyFilterName', i) as string;
					// const vocabularyFilterMethod = this.getNodeParameter('vocabularyFilterMethod', i) as string;

					const body: IDataObject = {
						TranscriptionJobName: transcriptionJobName,
						Media: {
							MediaFileUri: mediaFileUri
						}
					};

					if (detectLang) {
						body.IdentifyLanguage = detectLang;
					} else {
						body.LanguageCode = languageCode;
					}

					if (options.channelIdentification) {
						body.Settings = {
							ChannelIdentification: options.channelIdentification,
						}
					}

					if (options.showAlternatives) {
						body.Settings = {
							ShowAlternatives: options.maxAlternatives,
							MaxAlternatives: options.maxAlternatives,
						}
					}

					if (options.showSpeakerLabels) {
						body.Settings = {
							ShowSpeakerLabels: options.showSpeakerLabels,
							MaxSpeakerLabels: options.maxSpeakerLabels,
						}
					}

					if (options.vocabularyName) {
						body.Settings = {
							VocabularyName: options.vocabularyName,
						}
					}

						if (options.vocabularyFilterName) {
						body.Settings = {
							VocabularyFilterName: options.vocabularyFilterName,
						}
					}

					if (options.vocabularyFilterMethod) {
						body.Settings = {
							VocabularyFilterMethod: options.vocabularyFilterMethod,
						}
					}

					const action = 'Transcribe.StartTranscriptionJob';
					responseData = await awsApiRequestREST.call(this, 'transcribe', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
				}

				if (operation === 'getTranscriptionJob') {
					const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;

					const body: IDataObject = {
						TranscriptionJobName: transcriptionJobName
					};

					const action = 'Transcribe.GetTranscriptionJob';
					responseData = await awsApiRequestREST.call(this, 'transcribe', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
