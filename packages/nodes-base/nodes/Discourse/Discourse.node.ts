import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { discourseApiRequest } from './GenericFunctions';

import { postFields, postOperations } from './PostDescription';

import { categoryFields, categoryOperations } from './CategoryDescription';

import { groupFields, groupOperations } from './GroupDescription';

import { userFields, userOperations } from './UserDescription';

import { userGroupFields, userGroupOperations } from './UserGroupDescription';

export class Discourse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discourse',
		name: 'discourse',
		icon: 'file:discourse.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Discourse API',
		defaults: {
			name: 'Discourse',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'discourseApi',
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
						name: 'Category',
						value: 'category',
					},
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'Post',
						value: 'post',
					},
					// {
					// 	name: 'Search',
					// 	value: 'search',
					// },
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'User Group',
						value: 'userGroup',
					},
				],
				default: 'post',
			},
			...categoryOperations,
			...categoryFields,
			...groupOperations,
			...groupFields,
			...postOperations,
			...postFields,
			// ...searchOperations,
			// ...searchFields,
			...userOperations,
			...userFields,
			...userGroupOperations,
			...userGroupFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the calendars to display them to user so that he can
			// select them easily
			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { category_list } = await discourseApiRequest.call(this, 'GET', `/categories.json`);
				for (const category of category_list.categories) {
					returnData.push({
						name: category.name,
						value: category.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'category') {
					//https://docs.discourse.org/#tag/Categories/paths/~1categories.json/post
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const color = this.getNodeParameter('color', i) as string;
						const textColor = this.getNodeParameter('textColor', i) as string;

						const body: IDataObject = {
							name,
							color,
							text_color: textColor,
						};

						responseData = await discourseApiRequest.call(this, 'POST', `/categories.json`, body);

						responseData = responseData.category;
					}
					//https://docs.discourse.org/#tag/Categories/paths/~1categories.json/get
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await discourseApiRequest.call(this, 'GET', `/categories.json`, {}, qs);

						responseData = responseData.category_list.categories;

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					//https://docs.discourse.org/#tag/Categories/paths/~1categories~1{id}/put
					if (operation === 'update') {
						const categoryId = this.getNodeParameter('categoryId', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {
							name,
						};

						Object.assign(body, updateFields);

						responseData = await discourseApiRequest.call(
							this,
							'PUT',
							`/categories/${categoryId}.json`,
							body,
						);

						responseData = responseData.category;
					}
				}
				if (resource === 'group') {
					//https://docs.discourse.org/#tag/Posts/paths/~1posts.json/post
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject = {
							name,
						};

						responseData = await discourseApiRequest.call(this, 'POST', `/admin/groups.json`, {
							group: body,
						});

						responseData = responseData.basic_group;
					}
					//https://docs.discourse.org/#tag/Groups/paths/~1groups~1{name}.json/get
					if (operation === 'get') {
						const name = this.getNodeParameter('name', i) as string;

						responseData = await discourseApiRequest.call(this, 'GET', `/groups/${name}`, {}, qs);

						responseData = responseData.group;
					}
					//https://docs.discourse.org/#tag/Groups/paths/~1groups.json/get
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await discourseApiRequest.call(this, 'GET', `/groups.json`, {}, qs);

						responseData = responseData.groups;

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					//https://docs.discourse.org/#tag/Posts/paths/~1posts~1{id}.json/put
					if (operation === 'update') {
						const groupId = this.getNodeParameter('groupId', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject = {
							name,
						};

						responseData = await discourseApiRequest.call(this, 'PUT', `/groups/${groupId}.json`, {
							group: body,
						});
					}
				}
				if (resource === 'post') {
					//https://docs.discourse.org/#tag/Posts/paths/~1posts.json/post
					if (operation === 'create') {
						const content = this.getNodeParameter('content', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							title,
							raw: content,
						};

						Object.assign(body, additionalFields);

						responseData = await discourseApiRequest.call(this, 'POST', `/posts.json`, body);
					}
					//https://docs.discourse.org/#tag/Posts/paths/~1posts~1{id}.json/get
					if (operation === 'get') {
						const postId = this.getNodeParameter('postId', i) as string;

						responseData = await discourseApiRequest.call(this, 'GET', `/posts/${postId}`, {}, qs);
					}
					//https://docs.discourse.org/#tag/Posts/paths/~1posts.json/get
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const limit = this.getNodeParameter('limit', i, 0);

						responseData = await discourseApiRequest.call(this, 'GET', `/posts.json`, {}, qs);
						responseData = responseData.latest_posts;

						//Getting all posts relying on https://github.com/discourse/discourse_api/blob/main/spec/discourse_api/api/posts_spec.rb
						let lastPost = responseData.pop();
						let previousLastPostID;
						while (lastPost.id !== previousLastPostID) {
							if (limit && responseData.length > limit) {
								break;
							}
							const chunk = await discourseApiRequest.call(
								this,
								'GET',
								`/posts.json?before=${lastPost.id}`,
								{},
								qs,
							);
							responseData = responseData.concat(chunk.latest_posts);
							previousLastPostID = lastPost.id;
							lastPost = responseData.pop();
						}
						responseData.push(lastPost);

						if (returnAll === false) {
							responseData = responseData.splice(0, limit);
						}
					}
					//https://docs.discourse.org/#tag/Posts/paths/~1posts~1{id}.json/put
					if (operation === 'update') {
						const postId = this.getNodeParameter('postId', i) as string;

						const content = this.getNodeParameter('content', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {
							raw: content,
						};

						Object.assign(body, updateFields);

						responseData = await discourseApiRequest.call(
							this,
							'PUT',
							`/posts/${postId}.json`,
							body,
						);

						responseData = responseData.post;
					}
				}
				// TODO figure how to paginate the results
				// if (resource === 'search') {
				// 	//https://docs.discourse.org/#tag/Search/paths/~1search~1query/get
				// 	if (operation === 'query') {
				// 		qs.term = this.getNodeParameter('term', i) as string;

				// 		const simple = this.getNodeParameter('simple', i) as boolean;

				// 		const updateFields = this.getNodeParameter('updateFields', i);

				// 		Object.assign(qs, updateFields);

				// 		qs.page = 1;

				// 		responseData = await discourseApiRequest.call(
				// 			this,
				// 			'GET',
				// 			`/search/query`,
				// 			{},
				// 			qs,
				// 		);

				// 		if (simple === true) {
				// 			const response = [];
				// 			for (const key of Object.keys(responseData)) {
				// 				for (const data of responseData[key]) {
				// 					response.push(Object.assign(data, { __type: key }));
				// 				}
				// 			}
				// 			responseData = response;
				// 		}
				// 	}
				// }
				if (resource === 'user') {
					//https://docs.discourse.org/#tag/Users/paths/~1users/post
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const password = this.getNodeParameter('password', i) as string;
						const username = this.getNodeParameter('username', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							name,
							password,
							email,
							username,
						};

						Object.assign(body, additionalFields);

						responseData = await discourseApiRequest.call(this, 'POST', `/users.json`, body);
					}
					//https://docs.discourse.org/#tag/Users/paths/~1users~1{username}.json/get
					if (operation === 'get') {
						const by = this.getNodeParameter('by', i) as string;
						let endpoint = '';
						if (by === 'username') {
							const username = this.getNodeParameter('username', i) as string;
							endpoint = `/users/${username}`;
						} else if (by === 'externalId') {
							const externalId = this.getNodeParameter('externalId', i) as string;
							endpoint = `/u/by-external/${externalId}.json`;
						}

						responseData = await discourseApiRequest.call(this, 'GET', endpoint);
					}
					//https://docs.discourse.org/#tag/Users/paths/~1admin~1users~1{id}.json/delete
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const flag = this.getNodeParameter('flag', i) as boolean;

						responseData = await discourseApiRequest.call(
							this,
							'GET',
							`/admin/users/list/${flag}.json`,
							{},
							qs,
						);

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
				}
				if (resource === 'userGroup') {
					//https://docs.discourse.org/#tag/Groups/paths/~1groups~1{group_id}~1members.json/put
					if (operation === 'add') {
						const usernames = this.getNodeParameter('usernames', i) as string;
						const groupId = this.getNodeParameter('groupId', i) as string;
						const body: IDataObject = {
							usernames,
						};

						responseData = await discourseApiRequest.call(
							this,
							'PUT',
							`/groups/${groupId}/members.json`,
							body,
						);
					}
					//https://docs.discourse.org/#tag/Groups/paths/~1groups~1{group_id}~1members.json/delete
					if (operation === 'remove') {
						const usernames = this.getNodeParameter('usernames', i) as string;
						const groupId = this.getNodeParameter('groupId', i) as string;
						const body: IDataObject = {
							usernames,
						};

						responseData = await discourseApiRequest.call(
							this,
							'DELETE',
							`/groups/${groupId}/members.json`,
							body,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
