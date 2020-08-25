import { OptionsWithUri} from 'request';
import {
	IAnalyzer, IJob,IResponder
}from './AnalyzerInterface'
import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';
import {
	IDataObject,
} from 'n8n-workflow';

export async function cortexApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('cortexApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const headerWithAuthentication = Object.assign({},
		{ Authorization: ` Bearer ${credentials.cortexApiKey}`,
		  'Content-Type': Object.keys(option).length ===  0? undefined:'multipart/form-data'});
	let options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `${credentials.host}/api/${resource}`,
		body,
		json: true,
		
	};
	if (Object.keys(option).length !== 0) {
		options = Object.assign({},options, option);
	}
	if (Object.keys(body).length ===  0) {
		delete options.body;
	}
	if (Object.keys(query).length ===  0) {
		delete options.qs;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.error ) {
			const errorMessage = `Cortex error response [${error.statusCode}]: ${error.error.message}`;
			throw new Error(errorMessage);
		} else throw error;
	}
}


export async function getAnalyzers(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions): Promise<any> { // tslint:disable-line:no-any
    const resource = 'analyzer/_search';

    let responseData:IAnalyzer[] = await cortexApiRequest.call(this, 'POST', resource, {}, {}, undefined, {});
    
	return responseData;
}

export async function getAnalyzerDetails(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, analyzerId: any): Promise<any> { // tslint:disable-line:no-any
    const resource = `analyzer/${analyzerId}`;


    let responseData:IAnalyzer = await cortexApiRequest.call(this, 'GET', resource, {}, {}, undefined, {});
    
	return responseData;
}

export async function getResponders(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions): Promise<any> { // tslint:disable-line:no-any
    const resource = 'responder';

    let responseData:IResponder[] = await cortexApiRequest.call(this, 'GET', resource, {}, {}, undefined, {});
    
	return responseData;
}

export async function getResponderDetails(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, responderId: any): Promise<any> { // tslint:disable-line:no-any
    const resource = `responder/${responderId}`;

    let responseData:IResponder = await cortexApiRequest.call(this, 'GET', resource, {}, {}, undefined, {});
    
	return responseData;
}


export async function getJobs(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, analyzerId: any): Promise<any> { // tslint:disable-line:no-any
    const resource = `job/_search?range=all`;

    let responseData:IJob = await cortexApiRequest.call(this, 'POST', resource, {}, {}, undefined, {});
    
	return responseData;
}


export async function getJobDetails(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, jobId: any): Promise<any> { // tslint:disable-line:no-any
    const resource = `job/${jobId}`;

    let responseData:IJob = await cortexApiRequest.call(this, 'GET', resource, {}, {}, undefined, {});
    
	return responseData;
}


export async function getJobDetailsAndReport(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, jobId: any): Promise<any> { // tslint:disable-line:no-any
    const resource = `job/${jobId}/report`;

    let responseData:IJob = await cortexApiRequest.call(this, 'GET', resource, {}, {}, undefined, {});
    
	return responseData.report;
}

export async function getJobDetailsAndReport_Wait(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, jobId: any,timeout:string): Promise<any> { // tslint:disable-line:no-any
    const resource = `job/${jobId}/waitreport`;
	let query ={};
	if (timeout){
		query= {atMost: timeout};
	}
    let responseData:IJob = await cortexApiRequest.call(this, 'GET', resource, {}, query, undefined, {});
    
	return responseData;
}



export async function executeAnalyzer(this: IExecuteSingleFunctions |IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions , analyzerId: any,cache:boolean,timeout:number,body:IDataObject,option:IDataObject): Promise<any> { // tslint:disable-line:no-any
	const resource = `analyzer/${analyzerId}/run`;
	
	// run the analyzer (get back a job model)
    let responseData:IJob = await cortexApiRequest.call(this, 'POST', resource, body, {force:!cache?1:0}, undefined, option);
	
	// using wait report feature in Cortex (default timeout value: 3seconds) 
	responseData = await getJobDetailsAndReport_Wait.call(this,responseData.id,`${timeout}second`);

	return responseData;
}
export async function executeResponder(this: IExecuteSingleFunctions |IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions , responderId: any,cache:boolean,timeout:number,body:IDataObject,option:IDataObject): Promise<any> { // tslint:disable-line:no-any
	const resource = `responder/${responderId}/run`;
	
	// run the responder (get back a job model)
    let responseData:IJob = await cortexApiRequest.call(this, 'POST', resource, body, {force:!cache?1:0}, undefined, option);
	
	return responseData;
}
