import { IExecuteFunctions } from 'n8n-core';
import {
	getAnalyzers,
	getAnalyzerDetails,
	getResponders,
	getResponderDetails,
	getJobDetailsAndReport,
	getJobDetails,
	executeResponder,
	executeAnalyzer
} from './GenericFunctions';
import {
	analyzersOperations,
	analyzerFields
} from './AnalyzerDescriptions'

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	ILoadOptionsFunctions,
	IDataObject,

} from 'n8n-workflow';
import {
	createReadStream
} from 'fs';
import {
	IExecuteSingleFunctions
} from 'n8n-core'
import { respondersOperations, responderFields } from './ResponderDescription';
import { jobFields, jobsOperations } from './JobDescription';

function getEntityLabel(entity:any):string{
	let label:string='';
	console.log("getting entity of ",entity._type);
	switch (entity._type) {
		case  'case':
			label = `#${entity.caseId} ${entity.title}`
			break;
		case  'case_artifact':
			label = `[${entity.dataType}] ${entity.data?entity.data:(entity.attachment.name)}`
			break;
		case  'alert':
			label = `[${entity.source}:${entity.sourceRef}] ${entity.title}`
			break;
		case  'case_task_log':
			label = `${entity.message} from ${entity.createdBy}`
			break;
		case  'case_task':
			label = `${entity.title} (${entity.status})`
			break;
		case  'job':
			label = `${entity.analyzerName} (${entity.status})`
			break;
		default:
			break
	}
	return label;
}

export class Cortex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortex',
		name: 'cortex',
		icon: 'file:cortex.png',
		group: ['transform'],
		subtitle: '={{$parameter["resource"]+ ": " + $parameter["operation"]}}',

		version: 1,
		description: 'Apply the Cortex analyzer/responder on the given entity',
		defaults: {
			name: 'Cortex',
			color: '#54c4c3',

		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'cortexApi',
				required: true,
			}
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName:'Resource',
				name:'resource',
				type:'options',
				options:[
					{name:"Analyzer",value:'analyzer'},
					{name:"Responder",value:'responder'},
					{name:"Job",value:'job'}
				],
				default:'analyzer',
				description:'Choose a resource',
				required:true,


			},
			...analyzersOperations,
			...analyzerFields,
			...respondersOperations,
			...responderFields,
			...jobsOperations,
			...jobFields
		]
	};

	methods = {
		loadOptions: {

			async loadActiveAnalyzers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the enabled analyzers from instance 
				let requestResult = await getAnalyzers.call(this);

				const returnData: INodePropertyOptions[] = [];
				for (const analyzer of requestResult) {
					returnData.push({
						name: analyzer.name as string,
						value: `${analyzer.id as string}::${analyzer.name as string}`,
						description: analyzer.description as string,
					});
				}

				return returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
			},
			async loadActiveResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the enabled responders from instance 
				let requestResult = await getResponders.call(this);

				const returnData: INodePropertyOptions[] = [];
				for (const responder of requestResult) {
					returnData.push({
						name: responder.name as string,
						value: `${responder.id as string}::${responder.name as string}`,
						description: responder.description as string,
					});
				}

				return returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
			},
			async loadObservableOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {

				let selectedAnalyzerId = (this.getNodeParameter('analyzer') as string).split('::')[0];
				// request the analyzers from instance 
				let requestResult = await getAnalyzerDetails.call(this, selectedAnalyzerId);

				// parse supported observable types  into options
				const returnData: INodePropertyOptions[] = [];
				for (const dataType of requestResult.dataTypeList) {
					returnData.push(
						{
							value: dataType as string,
							name: (dataType as string)
						},
					);
				}
				return returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
			},
			async loadDataTypeOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {

				let selectedResponderId = (this.getNodeParameter('responder') as string).split('::')[0];
				// request the responder from instance 
				let requestResult = await getResponderDetails.call(this, selectedResponderId);
				// parse the accepted dataType into options
				const returnData: INodePropertyOptions[] = [];
				for (const dataType of requestResult.dataTypeList) {
					returnData.push(
						{
							value: (dataType as string).split(':')[1],
							name: (dataType as string).split(':')[1]
						},
					);
				}
				return returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
			},
			
		},
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		let response: any ={};

		let resource = this.getNodeParameter('resource');
		let operation = this.getNodeParameter('operation');
		let body = {}
		let option = {}
		let jobId;
		

		switch (resource) {
			case 'analyzer':
				switch (operation) {
					case 'execute':
						let analyzer = (this.getNodeParameter('analyzer') as string).split('::')[0];
						let observableType = this.getNodeParameter('observableType');
				
						let cache = Boolean(this.getNodeParameter('cache'));
						let tlp = this.getNodeParameter('tlp');
						let timeout = Number.parseInt(String(this.getNodeParameter('timeout')));
				
						let streamData;
				
						if (observableType === 'file') {
							let fileType: string = this.getNodeParameter('fileType') as string;
							if (fileType === 'path') {
								let path: string = this.getNodeParameter('path') as string;
								streamData = createReadStream(path);
							} else if (fileType === 'binary') {
								let mimeType = this.getNodeParameter('mimeType') as string;
								let fileName = this.getNodeParameter('fileName') as string;
								let data = this.getNodeParameter('data') as string;
				
								let buff = Buffer.from(data, 'base64');
				
								streamData = {
									value: buff,
									options: {
										filename: fileName,
										contentType: mimeType
									}
								}
							}
				
							option = {
								formData: {
									'data': streamData,
									_json: JSON.stringify({
										'dataType': observableType,
										'tlp': tlp,
									})
								},
							}
						} else {
							let observableValue = this.getNodeParameter('observableValue');
							body = {
								'dataType': observableType,
								'data': observableValue,
								'tlp': tlp
							}
						}
						response = await executeAnalyzer.call(this, analyzer, cache, timeout, body, option)
						break;
					default:
						break;
				}
				break;
			case 'responder':
				switch (operation) {
					case 'execute':
						// get what reponder to execute and on which entity
						let responderId= (this.getNodeParameter('responder')as string).split('::')[0];
						let dataType= this.getNodeParameter('dataType') as string;
						let entityJson = JSON.parse(this.getNodeParameter('objectData')as string);

						let body={
							responderId,
							label: getEntityLabel(entityJson),
							dataType: `thehive:${dataType}`,
							data: entityJson,
							tlp: entityJson.tlp,
							pap: entityJson.pap,
							message: entityJson.message || '',
							parameters:[],
						}
						response = await executeResponder.call(this,responderId,true,3,body,{});
						break;
				
					default:
						break;
				}
				break;
			case 'job':
				switch(operation){
					case 'getJob':
						jobId= this.getNodeParameter('jobId');
						response = await getJobDetails.call(this,jobId);
						break;
					case 'getReport':
						jobId= this.getNodeParameter('jobId');
						response = await getJobDetailsAndReport.call(this,jobId);
						break;
					default:
						break;
				}
				break;
			default:
				break;
		}
		
		return {
			json: response,
		};

	}

}
