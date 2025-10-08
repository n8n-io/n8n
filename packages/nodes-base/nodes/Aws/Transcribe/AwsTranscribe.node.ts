import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { awsApiRequestREST, awsApiRequestRESTAllItems } from './GenericFunctions';

export class AwsTranscribe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Transcribe',
		name: 'awsTranscribe',
		icon: 'file:transcribe.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to AWS Transcribe',
		defaults: {
			name: 'AWS Transcribe',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				noDataExpression: true,
				options: [
					{
						name: 'Transcription Job',
						value: 'transcriptionJob',
					},
				],
				default: 'transcriptionJob',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a transcription job',
						action: 'Create a transcription job',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a transcription job',
						action: 'Delete a transcription job',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a transcription job',
						action: 'Get a transcription job',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many transcription jobs',
						action: 'Get many transcription jobs',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Job Name',
				name: 'transcriptionJobName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['create', 'get', 'delete'],
					},
				},
				description: 'The name of the job',
			},
			{
				displayName: 'Media File URI',
				name: 'mediaFileUri',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['create'],
					},
				},
				description: 'The S3 object location of the input media file',
			},
			{
				displayName: 'Detect Language',
				name: 'detectLanguage',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['create'],
					},
				},
				default: false,
				description:
					'Whether to set this field to true to enable automatic language identification',
			},
			{
				displayName: 'Language',
				name: 'languageCode',
				type: 'options',
				options: [
					{
						name: 'Abkhaz',
						value: 'ab-GE',
					},
					{
						name: 'Afrikaans',
						value: 'af-ZA',
					},
					{
						name: 'Arabic, Gulf',
						value: 'ar-AE',
					},
					{
						name: 'Arabic, Modern Standard',
						value: 'ar-SA',
					},
					{
						name: 'Armenian',
						value: 'hy-AM',
					},
					{
						name: 'Asturian',
						value: 'ast-ES',
					},
					{
						name: 'Azerbaijani',
						value: 'az-AZ',
					},
					{
						name: 'Bashkir',
						value: 'ba-RU',
					},
					{
						name: 'Basque',
						value: 'eu-ES',
					},
					{
						name: 'Belarusian',
						value: 'be-BY',
					},
					{
						name: 'Bengali',
						value: 'bn-IN',
					},
					{
						name: 'Bosnian',
						value: 'bs-BA',
					},
					{
						name: 'Bulgarian',
						value: 'bg-BG',
					},
					{
						name: 'Catalan',
						value: 'ca-ES',
					},
					{
						name: 'Central Kurdish, Iran',
						value: 'ckb-IR',
					},
					{
						name: 'Central Kurdish, Iraq',
						value: 'ckb-IQ',
					},
					{
						name: 'Chinese, Cantonese',
						value: 'zh-HK',
					},
					{
						name: 'Chinese, Simplified',
						value: 'zh-CN',
					},
					{
						name: 'Chinese, Traditional',
						value: 'zh-TW',
					},
					{
						name: 'Croatian',
						value: 'hr-HR',
					},
					{
						name: 'Czech',
						value: 'cs-CZ',
					},
					{
						name: 'Danish',
						value: 'da-DK',
					},
					{
						name: 'Dutch',
						value: 'nl-NL',
					},
					{
						name: 'English, Australian',
						value: 'en-AU',
					},
					{
						name: 'English, British',
						value: 'en-GB',
					},
					{
						name: 'English, Indian',
						value: 'en-IN',
					},
					{
						name: 'English, Irish',
						value: 'en-IE',
					},
					{
						name: 'English, New Zealand',
						value: 'en-NZ',
					},
					{
						name: 'English, Scottish',
						value: 'en-AB',
					},
					{
						name: 'English, South African',
						value: 'en-ZA',
					},
					{
						name: 'English, US',
						value: 'en-US',
					},
					{
						name: 'English, Welsh',
						value: 'en-WL',
					},
					{
						name: 'Estonian (et-EE)',
						value: 'et-EE',
					},
					{
						name: 'Estonian (et-ET)',
						value: 'et-ET',
					},
					{
						name: 'Farsi',
						value: 'fa-IR',
					},
					{
						name: 'Finnish',
						value: 'fi-FI',
					},
					{
						name: 'French',
						value: 'fr-FR',
					},
					{
						name: 'French, Canadian',
						value: 'fr-CA',
					},
					{
						name: 'Galician',
						value: 'gl-ES',
					},
					{
						name: 'Georgian',
						value: 'ka-GE',
					},
					{
						name: 'German',
						value: 'de-DE',
					},
					{
						name: 'German, Swiss',
						value: 'de-CH',
					},
					{
						name: 'Greek',
						value: 'el-GR',
					},
					{
						name: 'Gujarati',
						value: 'gu-IN',
					},
					{
						name: 'Hausa',
						value: 'ha-NG',
					},
					{
						name: 'Hebrew',
						value: 'he-IL',
					},
					{
						name: 'Hindi, Indian',
						value: 'hi-IN',
					},
					{
						name: 'Hungarian',
						value: 'hu-HU',
					},
					{
						name: 'Icelandic',
						value: 'is-IS',
					},
					{
						name: 'Indonesian',
						value: 'id-ID',
					},
					{
						name: 'Italian',
						value: 'it-IT',
					},
					{
						name: 'Japanese',
						value: 'ja-JP',
					},
					{
						name: 'Kabyle',
						value: 'kab-DZ',
					},
					{
						name: 'Kannada',
						value: 'kn-IN',
					},
					{
						name: 'Kazakh',
						value: 'kk-KZ',
					},
					{
						name: 'Kinyarwanda',
						value: 'rw-RW',
					},
					{
						name: 'Korean',
						value: 'ko-KR',
					},
					{
						name: 'Kyrgyz',
						value: 'ky-KG',
					},
					{
						name: 'Latvian',
						value: 'lv-LV',
					},
					{
						name: 'Lithuanian',
						value: 'lt-LT',
					},
					{
						name: 'Luganda',
						value: 'lg-IN',
					},
					{
						name: 'Macedonian',
						value: 'mk-MK',
					},
					{
						name: 'Malay',
						value: 'ms-MY',
					},
					{
						name: 'Malayalam',
						value: 'ml-IN',
					},
					{
						name: 'Maltese',
						value: 'mt-MT',
					},
					{
						name: 'Marathi',
						value: 'mr-IN',
					},
					{
						name: 'Meadow Mari',
						value: 'mhr-RU',
					},
					{
						name: 'Mongolian',
						value: 'mn-MN',
					},
					{
						name: 'Norwegian Bokmål',
						value: 'no-NO',
					},
					{
						name: 'Odia/Oriya',
						value: 'or-IN',
					},
					{
						name: 'Pashto',
						value: 'ps-AF',
					},
					{
						name: 'Polish',
						value: 'pl-PL',
					},
					{
						name: 'Portuguese',
						value: 'pt-PT',
					},
					{
						name: 'Portuguese, Brazilian',
						value: 'pt-BR',
					},
					{
						name: 'Punjabi',
						value: 'pa-IN',
					},
					{
						name: 'Romanian',
						value: 'ro-RO',
					},
					{
						name: 'Russian',
						value: 'ru-RU',
					},
					{
						name: 'Serbian',
						value: 'sr-RS',
					},
					{
						name: 'Sinhala',
						value: 'si-LK',
					},
					{
						name: 'Slovak',
						value: 'sk-SK',
					},
					{
						name: 'Slovenian',
						value: 'sl-SI',
					},
					{
						name: 'Somali',
						value: 'so-SO',
					},
					{
						name: 'Spanish',
						value: 'es-ES',
					},
					{
						name: 'Spanish, US',
						value: 'es-US',
					},
					{
						name: 'Sundanese',
						value: 'su-ID',
					},
					{
						name: 'Swahili, Kenya',
						value: 'sw-KE',
					},
					{
						name: 'Swahili, Burundi',
						value: 'sw-BI',
					},
					{
						name: 'Swahili, Rwanda',
						value: 'sw-RW',
					},
					{
						name: 'Swahili, Tanzania',
						value: 'sw-TZ',
					},
					{
						name: 'Swahili, Uganda',
						value: 'sw-UG',
					},
					{
						name: 'Swedish',
						value: 'sv-SE',
					},
					{
						name: 'Tagalog/Filipino',
						value: 'tl-PH',
					},
					{
						name: 'Tamil',
						value: 'ta-IN',
					},
					{
						name: 'Tatar',
						value: 'tt-RU',
					},
					{
						name: 'Telugu',
						value: 'te-IN',
					},
					{
						name: 'Thai',
						value: 'th-TH',
					},
					{
						name: 'Turkish',
						value: 'tr-TR',
					},
					{
						name: 'Ukrainian',
						value: 'uk-UA',
					},
					{
						name: 'Uyghur',
						value: 'ug-CN',
					},
					{
						name: 'Uzbek',
						value: 'uz-UZ',
					},
					{
						name: 'Vietnamese',
						value: 'vi-VN',
					},
					{
						name: 'Welsh',
						value: 'cy-WL',
					},
					{
						name: 'Wolof',
						value: 'wo-SN',
					},
					{
						name: 'Zulu',
						value: 'zu-ZA',
					},
				],
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['create'],
						detectLanguage: [false],
					},
				},
				default: 'en-US',
				description: 'Language used in the input media file',
			},
			// ----------------------------------
			//     Transcription Job Settings
			// ----------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Channel Identification',
						name: 'channelIdentification',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							"Instructs Amazon Transcribe to process each audiochannel separately and then merge the transcription output of each channel into a single transcription. You can't set both Max Speaker Labels and Channel Identification in the same request. If you set both, your request returns a BadRequestException.",
					},
					{
						displayName: 'Max Alternatives',
						name: 'maxAlternatives',
						type: 'number',
						default: 2,
						typeOptions: {
							minValue: 2,
							maxValue: 10,
						},
						description: 'The number of alternative transcriptions that the service should return',
					},
					{
						displayName: 'Max Speaker Labels',
						name: 'maxSpeakerLabels',
						type: 'number',
						default: 2,
						typeOptions: {
							minValue: 2,
							maxValue: 10,
						},
						description:
							'The maximum number of speakers to identify in the input audio. If there are more speakers in the audio than this number, multiple speakers are identified as a single speaker.',
					},
					{
						displayName: 'Vocabulary Name',
						name: 'vocabularyName',
						type: 'string',
						default: '',
						description: 'Name of vocabulary to use when processing the transcription job',
					},
					{
						displayName: 'Vocabulary Filter Name',
						name: 'vocabularyFilterName',
						type: 'string',
						default: '',
						description:
							'The name of the vocabulary filter to use when transcribing the audio. The filter that you specify must have the same language code as the transcription job.',
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
						default: 'remove',
						description:
							'<p>Set to mask to remove filtered text from the transcript and replace it with three asterisks ("***") as placeholder text.</p><p>Set to remove to remove filtered text from the transcript without using placeholder text. Set to tag to mark the word in the transcription output that matches the vocabulary filter. When you set the filter method to tag, the words matching your vocabulary filter are not masked or removed.</p>',
					},
				],
			},
			{
				displayName: 'Return Transcript',
				name: 'returnTranscript',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['get'],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default, the response only contains metadata about the transcript. Enable this option to retrieve the transcript instead.',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['get'],
						returnTranscript: [true],
					},
				},
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 20,
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['transcriptionJob'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Job Name Contains',
						name: 'jobNameContains',
						type: 'string',
						description: 'Return only transcription jobs whose name contains the specified string',
						default: '',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Completed',
								value: 'COMPLETED',
							},
							{
								name: 'Failed',
								value: 'FAILED',
							},
							{
								name: 'In Progress',
								value: 'IN_PROGRESS',
							},
							{
								name: 'Queued',
								value: 'QUEUED',
							},
						],
						description: 'Return only transcription jobs with the specified status',
						default: 'COMPLETED',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'transcriptionJob') {
					//https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectDominantLanguage.html
					if (operation === 'create') {
						const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;
						const mediaFileUri = this.getNodeParameter('mediaFileUri', i) as string;
						const detectLang = this.getNodeParameter('detectLanguage', i) as boolean;

						const options = this.getNodeParameter('options', i, {});

						const body: IDataObject = {
							TranscriptionJobName: transcriptionJobName,
							Media: {
								MediaFileUri: mediaFileUri,
							},
							Settings: {},
						};

						if (detectLang) {
							body.IdentifyLanguage = detectLang;
						} else {
							body.LanguageCode = this.getNodeParameter('languageCode', i) as string;
						}

						if (body.Settings) {
							if (options.channelIdentification) {
								Object.assign(body.Settings, {
									ChannelIdentification: options.channelIdentification,
								});
							}

							if (options.maxAlternatives) {
								Object.assign(body.Settings, {
									ShowAlternatives: true,
									MaxAlternatives: options.maxAlternatives,
								});
							}

							if (options.maxSpeakerLabels) {
								Object.assign(body.Settings, {
									ShowSpeakerLabels: true,
									MaxSpeakerLabels: options.maxSpeakerLabels,
								});
							}

							if (options.vocabularyName) {
								Object.assign(body.Settings, {
									VocabularyName: options.vocabularyName,
								});
							}

							if (options.vocabularyFilterName) {
								Object.assign(body.Settings, {
									VocabularyFilterName: options.vocabularyFilterName,
								});
							}

							if (options.vocabularyFilterMethod) {
								Object.assign(body.Settings, {
									VocabularyFilterMethod: options.vocabularyFilterMethod,
								});
							}
						}

						const action = 'Transcribe.StartTranscriptionJob';
						responseData = await awsApiRequestREST.call(
							this,
							'transcribe',
							'POST',
							'',
							JSON.stringify(body),
							{ 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
						);
						responseData = responseData.TranscriptionJob;
					}
					//https://docs.aws.amazon.com/transcribe/latest/dg/API_DeleteTranscriptionJob.html
					if (operation === 'delete') {
						const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;

						const body: IDataObject = {
							TranscriptionJobName: transcriptionJobName,
						};

						const action = 'Transcribe.DeleteTranscriptionJob';
						responseData = await awsApiRequestREST.call(
							this,
							'transcribe',
							'POST',
							'',
							JSON.stringify(body),
							{ 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
						);
						responseData = { success: true };
					}
					//https://docs.aws.amazon.com/transcribe/latest/dg/API_GetTranscriptionJob.html
					if (operation === 'get') {
						const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;
						const resolve = this.getNodeParameter('returnTranscript', 0) as boolean;

						const body: IDataObject = {
							TranscriptionJobName: transcriptionJobName,
						};

						const action = 'Transcribe.GetTranscriptionJob';
						responseData = await awsApiRequestREST.call(
							this,
							'transcribe',
							'POST',
							'',
							JSON.stringify(body),
							{ 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
						);
						responseData = responseData.TranscriptionJob;

						if (resolve && responseData.TranscriptionJobStatus === 'COMPLETED') {
							responseData = await this.helpers.request({
								method: 'GET',
								uri: responseData.Transcript.TranscriptFileUri,
								json: true,
							});
							const simple = this.getNodeParameter('simple', 0) as boolean;
							if (simple) {
								responseData = {
									transcript: responseData.results.transcripts
										.map((data: IDataObject) => data.transcript)
										.join(' '),
								};
							}
						}
					}
					//https://docs.aws.amazon.com/transcribe/latest/dg/API_ListTranscriptionJobs.html
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						const action = 'Transcribe.ListTranscriptionJobs';
						const body: IDataObject = {};

						if (filters.status) {
							body.Status = filters.status;
						}

						if (filters.jobNameContains) {
							body.JobNameContains = filters.jobNameContains;
						}

						if (returnAll) {
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'TranscriptionJobSummaries',
								'transcribe',
								'POST',
								'',
								JSON.stringify(body),
								{ 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
							);
						} else {
							const limit = this.getNodeParameter('limit', i);
							body.MaxResults = limit;
							responseData = await awsApiRequestREST.call(
								this,
								'transcribe',
								'POST',
								'',
								JSON.stringify(body),
								{ 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
							);
							responseData = responseData.TranscriptionJobSummaries;
						}
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
