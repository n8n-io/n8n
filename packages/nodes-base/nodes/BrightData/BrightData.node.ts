import {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeOperationError,
	IDataObject,
} from 'n8n-workflow';

import { getActiveZones, getCountries, getDataSets } from './SearchFunctions';

import { brightdataApiRequest } from './GenericFunctions';

import { webUnlockerOperations, webUnlockerFields } from './WebUnlockerDescription';
import {
	marketplaceDatasetOperations,
	marketplaceDatasetFields,
} from './MarketplaceDatasetDescription';
import { webScrapperOperations, webScrapperFields } from './WebScrapperDescription';

export class BrightData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BrightData',
		name: 'brightData',
		icon: 'file:brightdatasquared.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Interact with Bright Data to scrape websites or use existing datasets from the marketplace to generate adapted snapshots',
		defaults: {
			name: 'BrightData',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'brightdataApi',
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
						name: 'Marketplace Dataset',
						value: 'marketplaceDataset',
					},
					{
						name: 'Web Scraper',
						value: 'webScrapper',
					},
					{
						name: 'Web Unlocker',
						value: 'webUnlocker',
					},
				],
				default: 'webUnlocker',
			},
			...webUnlockerOperations,
			...webUnlockerFields,
			...marketplaceDatasetOperations,
			...marketplaceDatasetFields,
			...webScrapperOperations,
			...webScrapperFields,
		],
	};

	methods = {
		listSearch: {
			getActiveZones: getActiveZones,
			getCountries: getCountries,
			getDataSets: getDataSets,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as
			| 'marketplaceDataset'
			| 'webScrapper'
			| 'webUnlocker';
		const operation = this.getNodeParameter('operation', 0) as string;

		// Retrieve the routing info defined for the current operation from the node description
		if (resource === 'webScrapper') {
			if (operation === 'monitorProgressSnapshot') {
				for (let i = 0; i < items.length; i++) {
					const snapshot_id = this.getNodeParameter('snapshot_id', i) as string;

					if (!snapshot_id) {
						throw new NodeOperationError(this.getNode(), 'Snapshot ID is required');
					}
					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'GET',
							`/datasets/v3/progress/${snapshot_id}`,
							{},
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'getSnapshots') {
				for (let i = 0; i < items.length; i++) {
					const dataset = this.getNodeParameter('dataset_id', i) as { value: string };
					if (dataset === undefined) {
						throw new NodeOperationError(this.getNode(), 'Dataset ID is required');
					}

					// Check if dataset_id is a string
					const dataset_id = dataset.value;
					const qs: IDataObject = {
						dataset_id,
						status: this.getNodeParameter('status', i) as string,
						skip: this.getNodeParameter('skip', i) as number,
						limit: this.getNodeParameter('limit', i) as number,
						from_date: this.getNodeParameter('from_date', i) as string,
						to_date: this.getNodeParameter('to_date', i) as string,
					};
					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'GET',
							'/datasets/v3/snapshots',
							{},
							qs,
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'scrapeByUrl') {
				for (let i = 0; i < items.length; i++) {
					const dataset = this.getNodeParameter('dataset_id', i) as { value: string };
					if (dataset === undefined) {
						throw new NodeOperationError(this.getNode(), 'Dataset ID is required');
					}

					// Check if dataset_id is a string
					const dataset_id = dataset.value;

					console.log('Dataset ID:', dataset_id);
					const bodyString = this.getNodeParameter('urls', i) as string;
					const format = this.getNodeParameter('format', i) as string;
					const include_errors = this.getNodeParameter('include_errors', i) as boolean;
					let body = null;
					try {
						body = JSON.parse(bodyString);
					} catch (error) {
						console.log('Error parsing JSON:', error);
						throw new NodeOperationError(this.getNode(), 'Invalid JSON format for URLs');
					}

					if (!body) {
						console.log('Body is null or undefined');
						throw new NodeOperationError(this.getNode(), 'URL is required');
					}

					const qs: IDataObject = {
						dataset_id,
						format,
						include_errors,
					};

					try {
						console.log('Body:', body, 'qs:', qs);
						const responseData = await brightdataApiRequest.call(
							this,
							'POST',
							'/datasets/v3/scrape',
							body,
							qs,
						);
						console.log('Response:', responseData);
						//detect data type. if
						try {
							//if is string
							if (typeof responseData === 'object') {
								const isArray = Array.isArray(responseData);
								if (isArray) {
									//if is array
									returnData.push(...responseData);
								}
							} else if (typeof responseData === 'string') {
								//if is string
								returnData.push({ data: responseData });
							}
						} catch (error) {
							console.log('Error parsing response:', error);
							throw new NodeOperationError(this.getNode(), 'Error parsing response');
						}
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'triggerCollectionByUrl') {
				for (let i = 0; i < items.length; i++) {
					const dataset = this.getNodeParameter('dataset_id', i) as { value: string };
					if (dataset === undefined) {
						throw new NodeOperationError(this.getNode(), 'Dataset ID is required');
					}
					// Check if dataset_id is a string
					const dataset_id = dataset.value;
					const bodyString = this.getNodeParameter('urls', i) as string;
					let body = null;
					try {
						body = JSON.parse(bodyString);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), 'Invalid JSON format for URLs');
					}

					if (!body) {
						throw new NodeOperationError(this.getNode(), 'URL is required');
					}
					const notify = this.getNodeParameter('notify', i) as string;
					const endpoint = this.getNodeParameter('endpoint', i) as string;
					const qs: IDataObject = {
						dataset_id,
						endpoint,
						notify,
					};

					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'POST',
							'/datasets/v3/trigger',
							body,
							qs,
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'deliverSnapshot') {
				for (let i = 0; i < items.length; i++) {
					const notify = this.getNodeParameter('notify', i) as string;
					const snapshot_id = this.getNodeParameter('snapshot_id', i) as string;
					const deliver_type = this.getNodeParameter('deliver_type', i) as string;

					let body: IDataObject = {
						deliver: {
							type: deliver_type,
						},
					};

					let qs: IDataObject = {
						notify,
					};

					switch (deliver_type) {
						case 'webhook': {
							(body.deliver as IDataObject)['endpoint'] = this.getNodeParameter(
								'endpoint',
								i,
							) as string;
							// Common filename fields for webhook
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							break;
						}
						case 's3': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								'aws-access-key': this.getNodeParameter('aws-access-key', i) as string,
								'aws-secret-key': this.getNodeParameter('aws-secret-key', i) as string,
							};
							const region = this.getNodeParameter('region', i) as string;
							if (region) {
								(body.deliver as IDataObject)['region'] = region;
							}
							const roleArn = this.getNodeParameter('role_arn', i) as string;
							if (roleArn) {
								((body.deliver as IDataObject)['credentials'] as IDataObject)['role_arn'] = roleArn;
							}
							const externalId = this.getNodeParameter('external_id', i) as string;
							if (externalId) {
								((body.deliver as IDataObject)['credentials'] as IDataObject)['external_id'] =
									externalId;
							}
							break;
						}
						case 'ali_oss': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								'access-key': this.getNodeParameter('access-key', i) as string,
								'secret-key': this.getNodeParameter('secret-key', i) as string,
							};
							const region = this.getNodeParameter('region', i) as string;
							if (region) {
								(body.deliver as IDataObject)['region'] = region;
							}
							break;
						}
						case 'gcs_pubsub': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								client_email: this.getNodeParameter('client_email', i) as string,
								private_key: this.getNodeParameter('private_key', i) as string,
							};
							(body.deliver as IDataObject)['topic_id'] = this.getNodeParameter(
								'topic_id',
								i,
							) as string;
							(body.deliver as IDataObject)['attributes'] = this.getNodeParameter(
								'attributes',
								i,
							) as string;
							break;
						}
						case 'gcs': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								client_email: this.getNodeParameter('client_email', i) as string,
								private_key: this.getNodeParameter('private_key', i) as string,
							};
							break;
						}
						case 'azure': {
							(body.deliver as IDataObject)['container'] = this.getNodeParameter(
								'container',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								account: this.getNodeParameter('account', i) as string,
								key: this.getNodeParameter('key', i) as string,
								sas_token: this.getNodeParameter('sas_token', i) as string,
							};
							break;
						}
						case 'sftp': {
							(body.deliver as IDataObject)['host'] = this.getNodeParameter('host', i) as string;
							(body.deliver as IDataObject)['port'] = this.getNodeParameter('port', i) as number;
							(body.deliver as IDataObject)['path'] = this.getNodeParameter('path', i) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								username: this.getNodeParameter('username', i) as string,
								password: this.getNodeParameter('password', i) as string,
								ssh_key: this.getNodeParameter('ssh_key', i) as string,
								passphrase: this.getNodeParameter('passphrase', i) as string,
							};
							break;
						}
						case 'snowflake': {
							(body.deliver as IDataObject)['database'] = this.getNodeParameter(
								'database',
								i,
							) as string;
							(body.deliver as IDataObject)['schema'] = this.getNodeParameter(
								'schema',
								i,
							) as string;
							(body.deliver as IDataObject)['stage'] = this.getNodeParameter('stage', i) as string;
							(body.deliver as IDataObject)['role'] = this.getNodeParameter('role', i) as string;
							(body.deliver as IDataObject)['warehouse'] = this.getNodeParameter(
								'warehouse',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								account: this.getNodeParameter('credentials.account', i) as string,
								user: this.getNodeParameter('credentials.user', i) as string,
								password: this.getNodeParameter('credentials.password', i) as string,
							};
							break;
						}
						default:
							break;
					}

					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'POST',
							`/datasets/v3/deliver/${snapshot_id}`,
							body,
							qs,
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			}
		} else if (resource === 'marketplaceDataset') {
			if (operation === 'listDatasets') {
				for (let i = 0; i < items.length; i++) {
					const responseData = await brightdataApiRequest.call(this, 'GET', '/datasets/list', {});
					returnData.push({ items: responseData });
				}
			} else if (operation === 'filterDataset') {
				for (let i = 0; i < items.length; i++) {
					const dataset = this.getNodeParameter('dataset_id', i) as { value: string };
					if (dataset === undefined) {
						throw new NodeOperationError(this.getNode(), 'Dataset ID is required');
					}
					// Check if dataset_id is a string
					const dataset_id = dataset.value;

					const records_limit = this.getNodeParameter('records_limit', i) as number;
					const filterType = this.getNodeParameter('filter_type', i) as string;

					let body: IDataObject = {
						records_limit,
						dataset_id,
					};

					if (filterType === 'filter_single') {
						const fieldName = this.getNodeParameter('field_name', i) as string;
						const operator = this.getNodeParameter('field_operator', i) as string;
						const fieldValue = this.getNodeParameter('field_value', i) as string;
						body.filter = {
							name: fieldName,
							operator,
							value: fieldValue,
						};
						console.log('Filter:', body.filter);
					} else if (filterType === 'filters_group') {
						let filtersGroup: IDataObject;
						try {
							filtersGroup = JSON.parse(
								this.getNodeParameter('filters_group', i) as string,
							) as IDataObject;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Invalid JSON format for filters group');
						}
						body.filter = filtersGroup;
					} else if (filterType === 'csv_filter') {
						body.filter = this.getNodeParameter('csv_filter', i) as string;
					} else if (filterType === 'json_filter') {
						let jsonFilter: IDataObject;
						try {
							jsonFilter = JSON.parse(
								this.getNodeParameter('json_filter', i) as string,
							) as IDataObject;
							console.log(jsonFilter);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Invalid JSON format for JSON filter');
						}
						body.filter = {
							operator: jsonFilter.operator,
							filters: jsonFilter.filters,
						};
					}

					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'POST',
							'/datasets/filter',
							body,
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'getDatasetMetadata') {
				for (let i = 0; i < items.length; i++) {
					const dataset = this.getNodeParameter('dataset_id', i) as { value: string };
					if (dataset === undefined) {
						throw new NodeOperationError(this.getNode(), 'Dataset ID is required');
					}
					// Check if dataset_id is a string
					const dataset_id = dataset.value;
					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'GET',
							`/datasets/${dataset_id}/metadata`,
							{},
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'getSnapshotContent') {
				for (let i = 0; i < items.length; i++) {
					const snapshot_id = this.getNodeParameter('snapshot_id', i) as string;
					const qs: IDataObject = {
						format: this.getNodeParameter('format', i) as string,
						compress: this.getNodeParameter('compress', i) as boolean,
						batch_size: this.getNodeParameter('batch_size', i) as number,
						part: this.getNodeParameter('part', i) as number,
					};
					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'GET',
							// `/datasets/v3/snapshots/${snapshot_id}`,
							`/datasets/snapshots/${snapshot_id}/download`,
							{},
							qs,
						);

						returnData.push({
							items: responseData,
						});
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'getSnapshotMetadata') {
				for (let i = 0; i < items.length; i++) {
					const snapshot_id = this.getNodeParameter('snapshot_id', i) as string;
					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'GET',
							`/datasets/snapshots/${snapshot_id}`,
							{},
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'getSnapshotParts') {
				for (let i = 0; i < items.length; i++) {
					const snapshot_id = this.getNodeParameter('snapshot_id', i) as string;
					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'GET',
							`/datasets/snapshots/${snapshot_id}/parts`,
							{},
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'listSnapshots') {
				for (let i = 0; i < items.length; i++) {
					const dataset = this.getNodeParameter('dataset_id', i) as { value: string };
					if (dataset === undefined) {
						throw new NodeOperationError(this.getNode(), 'Dataset ID is required');
					}
					// Check if dataset_id is a string
					const dataset_id = dataset.value;
					const view_id = this.getNodeParameter('view_id', i) as string;
					const status = this.getNodeParameter('status', i) as string;
					const qs: IDataObject = {
						dataset_id,
						view_id,
						status,
					};
					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'GET',
							'/datasets/snapshots',
							{},
							qs,
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			} else if (operation === 'deliverSnapshot') {
				for (let i = 0; i < items.length; i++) {
					const snapshot_id = this.getNodeParameter('snapshot_id', i) as string;
					const deliver_type = this.getNodeParameter('deliver_type', i) as string;

					let body: IDataObject = {
						deliver: {
							type: deliver_type,
						},
					};

					switch (deliver_type) {
						case 'webhook': {
							(body.deliver as IDataObject)['endpoint'] = this.getNodeParameter(
								'endpoint',
								i,
							) as string;
							// Common filename fields for webhook
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							break;
						}
						case 's3': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								'aws-access-key': this.getNodeParameter('aws-access-key', i) as string,
								'aws-secret-key': this.getNodeParameter('aws-secret-key', i) as string,
							};
							const region = this.getNodeParameter('region', i) as string;
							if (region) {
								(body.deliver as IDataObject)['region'] = region;
							}
							const roleArn = this.getNodeParameter('role_arn', i) as string;
							if (roleArn) {
								((body.deliver as IDataObject)['credentials'] as IDataObject)['role_arn'] = roleArn;
							}
							const externalId = this.getNodeParameter('external_id', i) as string;
							if (externalId) {
								((body.deliver as IDataObject)['credentials'] as IDataObject)['external_id'] =
									externalId;
							}
							break;
						}
						case 'ali_oss': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								'access-key': this.getNodeParameter('access-key', i) as string,
								'secret-key': this.getNodeParameter('secret-key', i) as string,
							};
							const region = this.getNodeParameter('region', i) as string;
							if (region) {
								(body.deliver as IDataObject)['region'] = region;
							}
							break;
						}
						case 'gcs_pubsub': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								client_email: this.getNodeParameter('client_email', i) as string,
								private_key: this.getNodeParameter('private_key', i) as string,
							};
							(body.deliver as IDataObject)['topic_id'] = this.getNodeParameter(
								'topic_id',
								i,
							) as string;
							(body.deliver as IDataObject)['attributes'] = this.getNodeParameter(
								'attributes',
								i,
							) as string;
							break;
						}
						case 'gcs': {
							(body.deliver as IDataObject)['bucket'] = this.getNodeParameter(
								'bucket',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								client_email: this.getNodeParameter('client_email', i) as string,
								private_key: this.getNodeParameter('private_key', i) as string,
							};
							break;
						}
						case 'azure': {
							(body.deliver as IDataObject)['container'] = this.getNodeParameter(
								'container',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								account: this.getNodeParameter('account', i) as string,
								key: this.getNodeParameter('key', i) as string,
								sas_token: this.getNodeParameter('sas_token', i) as string,
							};
							break;
						}
						case 'sftp': {
							(body.deliver as IDataObject)['host'] = this.getNodeParameter('host', i) as string;
							(body.deliver as IDataObject)['port'] = this.getNodeParameter('port', i) as number;
							(body.deliver as IDataObject)['path'] = this.getNodeParameter('path', i) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								username: this.getNodeParameter('username', i) as string,
								password: this.getNodeParameter('password', i) as string,
								ssh_key: this.getNodeParameter('ssh_key', i) as string,
								passphrase: this.getNodeParameter('passphrase', i) as string,
							};
							break;
						}
						case 'snowflake': {
							(body.deliver as IDataObject)['database'] = this.getNodeParameter(
								'database',
								i,
							) as string;
							(body.deliver as IDataObject)['schema'] = this.getNodeParameter(
								'schema',
								i,
							) as string;
							(body.deliver as IDataObject)['stage'] = this.getNodeParameter('stage', i) as string;
							(body.deliver as IDataObject)['role'] = this.getNodeParameter('role', i) as string;
							(body.deliver as IDataObject)['warehouse'] = this.getNodeParameter(
								'warehouse',
								i,
							) as string;
							(body.deliver as IDataObject)['filename'] = {
								template: this.getNodeParameter('filename_template', i) as string,
								extension: this.getNodeParameter('filename_extension', i) as string,
							};
							(body.deliver as IDataObject)['credentials'] = {
								account: this.getNodeParameter('credentials.account', i) as string,
								user: this.getNodeParameter('credentials.user', i) as string,
								password: this.getNodeParameter('credentials.password', i) as string,
							};
							break;
						}
						default:
							break;
					}

					try {
						const responseData = await brightdataApiRequest.call(
							this,
							'POST',
							`/datasets/snapshots/${snapshot_id}/deliver`,
							body,
						);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			}
		} else if (resource === 'webUnlocker') {
			if (operation === 'request') {
				for (let i = 0; i < items.length; i++) {
					const zoneData = this.getNodeParameter('zone', i) as { value: string };
					const countryData = this.getNodeParameter('country', i) as { value: string };
					const zone = zoneData.value;
					const country = countryData.value;
					const method = this.getNodeParameter('method', i) as string;
					const url = this.getNodeParameter('url', i) as string;
					const format = this.getNodeParameter('format', i) as string;

					const body: IDataObject = {
						zone,
						country,
						method,
						url,
						format,
					};

					try {
						const responseData = await brightdataApiRequest.call(this, 'POST', '/request', body);
						returnData.push(responseData);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error);
					}
				}
			}
		}

		return this.prepareOutputData(this.helpers.returnJsonArray(returnData));
	}
}
