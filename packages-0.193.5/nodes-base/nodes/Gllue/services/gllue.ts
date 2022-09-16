import {IDataObject} from 'n8n-workflow';
import {buildOptionWithUri, getResponseByUri, gllueUrlBuilder, UrlParams} from '../helpers';
import {PipelineResponse} from '../interfaces';
import {N8nRequest} from '../GenericFunctions';


export class Gllue {
	apiHost = '';
	token = '';
	request: N8nRequest;
	operation = 'simple_list_with_ids';

	constructor(apiHost: string, token: string, request: N8nRequest) {
		this.apiHost = apiHost;
		this.token = token;
		this.request = request;
	}

	async getDetail(resource: string, resourceId: number, fields?: string) {
		const query = `id__eq=${resourceId}`;
		const urlParams = new UrlParams(query, fields, this.token);
		const uriGenerated = gllueUrlBuilder(this.apiHost, resource, this.operation, urlParams);

		return await getResponseByUri(uriGenerated, this.request);
	}

	static extractIdAndEmail(data: PipelineResponse) {
		const hasCvSent = data.result.hasOwnProperty('cvsent');
		// @ts-ignore
		const firstCvSent = hasCvSent ? data.result.cvsent[0] : {gllueext_send_terms_cv_sent: null};
		const firstCandidate = data.result.candidate[0];
		return {
			id: firstCandidate.id,
			email: firstCandidate.email,
			cvsentField: firstCvSent.gllueext_send_terms_cv_sent,
		};
	}
}

export class GllueCandidateListEndpoint extends Gllue {
	resource = 'candidate';

	async get(resourceId: number, fields?: string) {
		let response = await this.getDetail(this.resource, resourceId, fields);
		if (response !== undefined && Object.keys(response).includes('result') && response.result.candidate !== undefined) {
			response = response.result.candidate;
		}
		return response;
	}

}

export class GllueCandidateCreateEndpoint extends Gllue {
	resource = 'candidate';
	operation = 'add';

	async post(payload: IDataObject) {
		const urlParams = new UrlParams('', '', this.token);
		const urlGenerated = gllueUrlBuilder(this.apiHost, this.resource, this.operation, urlParams);

		const options = buildOptionWithUri(urlGenerated, 'POST', payload);
		return await this.request(options);
	}
}


export class GllueCandidateService {
	createEndpoint: GllueCandidateCreateEndpoint;
	listEndpoint: GllueCandidateListEndpoint;

	constructor(apiHost: string, token: string, request: N8nRequest) {
		this.createEndpoint = new GllueCandidateCreateEndpoint(apiHost, token, request);
		this.listEndpoint = new GllueCandidateListEndpoint(apiHost, token, request);
	}

	async getCandidateById(candidateId: number, fields?: string): Promise<IDataObject | undefined> {
		const candidates = await this.listEndpoint.get(candidateId, fields);
		if (candidates === undefined || !candidates.length) {
			return undefined;
		}
		return candidates[0];
	}

	async createOrUpdate(data: IDataObject, candidateId?: string): Promise<IDataObject> {
		return await this.createEndpoint.post(data);
	}

}
