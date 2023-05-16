import * as WebhookHelpers from '@/WebhookHelpers';
import { merge } from 'lodash';
import type { AxiosRequestConfig, AxiosError } from 'axios';
import axios from 'axios';
import { convert as convertOpenApiToPostmanV2 } from 'openapi-to-postmanv2';
import type { CollectionDefinition, ItemDefinition, ItemGroupDefinition } from 'postman-collection';
import { NodeTypes } from '@/NodeTypes';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { Workflow, LoggerProxy as Logger } from 'n8n-workflow';
import Container from 'typedi';
import { v4 as uuid } from 'uuid';

export const createPostmanCollectionRequestsForWorkflowWebhooks = async (
	workflowEntity: WorkflowEntity,
	additionalData: IWorkflowExecuteAdditionalData,
): Promise<void> => {
	type GetCollectionsResponseType = {
		collections: Array<{ id: string; uid: string; name: string }>;
	};

	type GetCollectionResponseType = {
		collection: CollectionDefinition;
	};

	const dcsEnv = process.env.DCS_ENV;
	const projectName = process.env.ESA_PROJECT_NAME;
	const postmanWorkspaceUID = process.env.ESA_N8N_WEBHOOKS_POSTMAN_WORKSPACE_UID;
	const postmanAPIKey = process.env.ESA_POSTMAN_API_KEY;

	if (!projectName || !postmanWorkspaceUID || !postmanAPIKey) {
		return;
	}

	if (!dcsEnv) throw new Error('dcsEnv not found in ESA sendgrid node');

	const postmanAPIBaseUrl = 'https://api.getpostman.com';
	const postmanCollectionAPIUrl = `${postmanAPIBaseUrl}/collections`;
	const collectionName = `${projectName}_${dcsEnv}_n8n`;
	// if the collectionItemID is already used by another item in other collections on postman generally regardless of the workspace, an error is returned. This variable helps to attempt the request with another ID.
	const maxNumberOfRetriesForIDCollision =
		Number(process.env.ESA_POSTMAN_ID_COLLISION_RETRY_COUNT) || 10;

	const workflow = new Workflow({
		id: workflowEntity.id?.toString(),
		name: workflowEntity.name,
		nodes: workflowEntity.nodes,
		connections: workflowEntity.connections,
		active: false,
		nodeTypes: Container.get(NodeTypes),
		staticData: undefined,
		settings: workflowEntity.settings,
	});

	const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
	for (const webhook of webhooks) {
		const webhookNode = workflow.getNode(webhook.node);
		if (!webhookNode) continue;

		const trimURLSlashes = (url: string) => url.replace(/^\/+/, '').replace(/\/+$/, '');

		try {
			// get the node parameters
			const {
				swagger: swaggerObj,
				httpMethod: httpMethodObj,
				path: pathObj,
			} = webhookNode.parameters;

			const swagger = swaggerObj?.toString();
			const httpMethod = httpMethodObj?.toString();
			const webhookPath = pathObj ? trimURLSlashes(pathObj.toString()) : undefined;

			if (!swagger || !httpMethod || !webhookPath) continue;

			const convertedCollectionData: CollectionDefinition = await new Promise((resolve, reject) => {
				convertOpenApiToPostmanV2(
					{
						type: 'json',
						data: swagger,
					},
					{},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(error: any, conversionResult) => {
						if (!conversionResult.result) {
							const message =
								// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
								'ESA: Could not convert openAPI code to postman collection: ' +
								conversionResult.reason;

							reject(new Error(message));
						} else {
							const foundCollection = conversionResult.output.find(
								(collection) => collection.type === 'collection',
							);
							if (foundCollection) {
								resolve(foundCollection.data);
								return;
							}

							const message =
								'No collection object found after converting openAPI code to postman collection';

							reject(new Error(message));
						}
					},
				);
			});

			let collectionItemData!: ItemDefinition | null;

			// the converted data might have the request item that is of interest inside folders, hence go deep to find it
			if (convertedCollectionData.item) {
				const getLeafItem = (
					item: Array<ItemDefinition | ItemGroupDefinition>,
				): ItemDefinition | null =>
					item.length > 0
						? 'item' in item[0] && Array.isArray(item[0].item)
							? getLeafItem(item[0].item)
							: item[0]
						: null;
				collectionItemData = getLeafItem(convertedCollectionData.item);
			}

			if (!collectionItemData) {
				throw new Error(
					'could not find itemData after converting openAPI code to postman collection',
				);
			}

			// remove leading slash if found in name
			collectionItemData.name = collectionItemData.name?.trim();
			if (collectionItemData.name?.startsWith('/'))
				collectionItemData.name = collectionItemData.name.slice(1);

			// if item auth property is empty, set auth from collectionData into the itemData
			if (!collectionItemData.request?.auth && convertedCollectionData.auth) {
				collectionItemData.request = merge(collectionItemData.request, {
					auth: convertedCollectionData.auth,
				});
			}

			const defaultAxiosConfig: AxiosRequestConfig = {
				headers: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'X-Api-Key': postmanAPIKey,
				},
			};

			const { data: collections } = await axios.get<GetCollectionsResponseType>(
				postmanCollectionAPIUrl,
				merge(defaultAxiosConfig, {
					params: {
						workspace: postmanWorkspaceUID,
					},
				}),
			);

			// find the collection in list of collections returned
			const collectionMinimalDetails = collections.collections.find(
				(collection) => collection.name === collectionName,
			);

			let collectionItems: CollectionDefinition['item'];

			let collectionRequestItemIndex = -1;

			if (collectionMinimalDetails) {
				const url = `${postmanCollectionAPIUrl}/${collectionMinimalDetails.uid}`;
				const {
					data: { collection: collectionFullDetails },
				} = await axios.get<GetCollectionResponseType>(url, defaultAxiosConfig);
				collectionItems = collectionFullDetails.item;

				if (collectionItems) {
					// find it directly in the collection, i.e. not within folders
					collectionRequestItemIndex = collectionItems.findIndex((requestItem) => {
						if ('request' in requestItem) {
							const requestItemUrlData =
								typeof requestItem.request?.url === 'string'
									? requestItem.request?.url
									: requestItem.request?.url.path;
							if (requestItemUrlData) {
								const requestItemUrl = trimURLSlashes(
									Array.isArray(requestItemUrlData)
										? requestItemUrlData.join('/')
										: requestItemUrlData,
								);
								return (
									requestItem.request?.method?.toLowerCase() === httpMethod.toLowerCase() &&
									requestItemUrl === webhookPath
								);
							}
						}

						return false;
					});

					if (collectionRequestItemIndex > -1) {
						const responseItem = collectionItems[collectionRequestItemIndex];
						collectionItemData.id = responseItem.id;
						collectionItems[collectionRequestItemIndex] = collectionItemData;
					}
				}
			}

			if (!collectionItems) collectionItems = [];

			if (collectionRequestItemIndex <= -1) {
				collectionItems.push(collectionItemData);
				collectionRequestItemIndex = collectionItems.length - 1;
			}

			if (!collectionItemData.id) collectionItemData.id = uuid();

			let currentRetryStage = -1;
			let retry: boolean;
			do {
				retry = false;
				try {
					const requestData = {
						collection: {
							info: {
								name: collectionName,
								schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
							},
							item: collectionItems,
						},
					};

					if (collectionMinimalDetails)
						await axios.put(
							`${postmanCollectionAPIUrl}/${collectionMinimalDetails.uid}`,
							requestData,
							defaultAxiosConfig,
						);
					else await axios.post(postmanCollectionAPIUrl, requestData, defaultAxiosConfig);
				} catch (error) {
					retry = true;

					let errorHandled = false;
					if (currentRetryStage < maxNumberOfRetriesForIDCollision - 1) {
						const errorObj = error as AxiosError<{
							error: {
								name: string;
							};
						}>;
						if (errorObj.response) {
							if (errorObj.response.data.error.name === 'instanceFoundError') {
								// use another id
								collectionItems[collectionRequestItemIndex].id = uuid();

								currentRetryStage++;
								errorHandled = true;
							}
						}
					}

					if (!errorHandled) throw error;
				}
			} while (retry);
		} catch (error) {
			Logger.error(
				`ESA: error when creating postman collection request record for webhookNode( ${webhookNode.id} ) in workflow( ${workflowEntity.id} )`,
				error as object,
			);

			// TODO: create an incident report
		}
	}
};
