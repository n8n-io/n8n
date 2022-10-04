import {
		IExecuteFunctions,
		IHookFunctions,
		IPollFunctions
} from 'n8n-core';

import {
		IDataObject,
		IHttpRequestOptions,
		INodeExecutionData,
		INodeType,
		INodeTypeDescription,
		NodeOperationError,
} from 'n8n-workflow';

import {
		OptionsWithUri,
} from 'request';

import moment from 'moment';

export class Baresquare implements INodeType {
		description: INodeTypeDescription = {
				displayName: 'Baresquare',
				name: 'baresquare',
				icon: 'file:baresquare.svg',
				group: ['trigger'],
				version: 1,
				description: 'Consume Baresquare API',
				defaults: {
						name: 'Baresquare',
				},
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
						{
								name: 'baresquareApi',
								required: true,
						},
				],
				polling:true,
				properties: [
						{
							displayName: 'Get Data',
							name: 'getData',
							type: 'options',
							options: [
								{
									name: 'New Tickets',
									value: 'newTicketsCreated',
								},
								{
									name:'Last X Tickets',
									value: 'lastTickets',
								},
							],
							required: true,
							default: 'newTicketsCreated',
							description: 'If new ticket created triggers workflow',
						},
						{
							displayName: 'Ticket Limit',
							name: 'limit',
							type: 'number',
							typeOptions:{
								minValue: 1,
							},
							default: 50,
							required: true,
							description: 'Max number of results to return',
						},									
					],
		};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		let responseData;
		const getData = this.getNodeParameter('getData','newTicketsCreated') as string;
		const ticketLimit = this.getNodeParameter('limit',30) as string;

		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('baresquareApi') as IDataObject;

		const yesterday = moment().subtract(1,'days').toDate().toISOString().slice(0,10);

		const options: OptionsWithUri = {
			headers: {
					'Accept': 'appliceation/json',
					'Authorization': `Bearer ${credentials.apiKey}`,
			},
			qs: {
				from: yesterday,
				limit: ticketLimit,
			},
			method: 'GET',
			uri: `https://my.baresquare.com/api/p/v2/incidents`,
			json: true,
			
		};
		try{
			responseData = await this.helpers.request(options);
		}catch(error){
			throw new NodeOperationError(this.getNode(), `COuld not fetch data from API with following error:${error.message}`);
		}
		responseData = responseData.results;

		if (getData === 'newTicketsCreated'){
			const data = this.getWorkflowStaticData("node");

			// Deduplication here
			const newItems = [];
		
			data.ids = data.ids || [];
			
			const items =this.helpers.returnJsonArray(responseData);

			const dataIDsTemp = data.ids.toString();

			for (let i = items.length - 1; i >= 0; i--) {

				// Check if data is already present
				if (dataIDsTemp.includes(responseData[i].id)) {
					break;
				} else {
					// if new data then add it to an array
					newItems.push({
						"ID": items[i].json.id,
						"Title": items[i].json.title,
						"Impact Score": items[i].json.impact,
						"Sentiment":items[i].json.sentiment,
						"Incident date":items[i].json.incident_datetime,
						"Description":items[i].json.description,
						"Assignee email address":items[i].json.assigned_to,
						"Priority":items[i].json.priority,
						"Author email address":items[i].json.author_email_address,
						"Granularity":items[i].json.granularity,
						"Volume index value":items[i].json.volume_index,
						"Deviation index value":items[i].json.deviation_index,
						"Status":items[i].json.status,
						"Creation date":items[i].json.created_at,
						"Last updated":items[i].json.updated_at,
						"Number of comments":items[i].json.comments_count,
						"Archive status":items[i].json.archive,
						"Ticket URL":items[i].json.ticket_url,
					});
				}
			}

			data.ids = items.map((item) => item.json.id);
			
			return [this.helpers.returnJsonArray(newItems)];
		} else if (getData === 'lastTickets'){
			const filteredData = responseData.map((data: any) =>(({
				id,
				title,
				impact,
				sentiment,
				incident_datetime,
				description,
				assigned_to,
				priority,
				author_email_address,
				granularity,
				volume_index,
				deviation_index,
				status,
				status_text,
				created_at,
				updated_at,
				comments_count,
				archive,
				ticket_url,
			}) => ({ 
				"ID":id, 
				"Title":title,
				"Impact Score":impact,
				"Sentiment":sentiment,
				"Incident date":incident_datetime,
				"Description":description,
				"Assignee email address":assigned_to,
				"Priority":priority,
				"Author email adress":author_email_address,
				"Granularity":granularity,
				"Volume index value":volume_index,
				"Deviation index value":deviation_index,
				"Status":status,
				"Creation date":created_at,
				"Last updated": updated_at,
				"Number of comments":comments_count,
				"Archive status":archive,
				"Ticket URL":ticket_url,

			}))(data));

			return [this.helpers.returnJsonArray(filteredData)];
		}else{
			throw new NodeOperationError(this.getNode(), `The defined option "${getData}" is not supported`);
		}
		
	}
}