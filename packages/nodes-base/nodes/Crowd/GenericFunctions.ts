import { IExecuteFunctions, IHttpRequestOptions, JsonObject, NodeApiError } from "n8n-workflow";

export interface ICrowdCreds {
	domain: string;
	tenantId: string;
	token: string;
	debug: boolean;
	debugOutput: 'params' | 'request';
}

const formatParams = (
	obj: any,
	filters?: { [paramName: string]: (value: any) => boolean },
	mappers?: { [paramName: string]: (value: any) => any },
) => {
	return Object.fromEntries(
		Object.entries(obj)
			.filter(([name, value]) => !filters || (name in filters ? filters[name](value) : false))
			.map(([name, value]) => !mappers || !(name in mappers) ? [name, value] : [name, mappers[name](value)])
	)
}

const idFn = (i: any) => i

const keyValueToObj = (arr: any[]) => {
  const obj: any = {};
  arr.forEach((item) => {
    obj[item.key] = item.value;
  });
  return obj;
}

const transformSingleProp = (prop: string) => (values: any) => (values.itemChoice || []).map((i: any) => i[prop]);

const getRequestOpts = (
	execFns: IExecuteFunctions,
	creds: ICrowdCreds,
	itemIndex: number,
	resource: string,
	operation: string,
): IHttpRequestOptions => {
	const opts: IHttpRequestOptions = {
		baseURL: `${creds.domain}/api/tenant/${creds.tenantId}`,
		url: '',
		json: true,
	}
	const params = getAllParams(execFns, itemIndex);
	switch (resource) {
		case 'activity':
			switch (operation) {
				case 'createWithMember':
					opts.url = '/activity/with-member'
					opts.method = 'POST';
					break;

				case 'createForMember':
					opts.url = '/activity'
					opts.method = 'POST';
					break;

				default:
					throw new Error(`Not implemented operation '${operation}' for resource '${resource}'`)
			}

			opts.body = formatParams(
				params,
				{
					'member': v => (
								operation === 'createWithMember' && v.itemChoice)
						|| (operation === 'createForMember' && v
					),
					'type': idFn,
					'timestamp': idFn,
					'platform': idFn,
					'title': idFn,
					'body': idFn,
					'channel': idFn,
					'sourceId': idFn,
					'sourceParentId': idFn
				}, {
					'member': v => v.itemChoice
						? formatParams(v.itemChoice, {
							'username': un => un.itemChoice,
							'displayName': idFn,
							'emails': idFn,
							'joinedAt': idFn
						}, {
							'username': un => keyValueToObj(un.itemChoice),
							'emails': transformSingleProp('email')
						})
						: v,
				}
			)

			break;

		case 'automation':
			switch (operation) {
				case 'create':
					opts.url = `/automation`
					opts.method = 'POST';
					break;

				case 'destroy':
					opts.url = `/automation/${params.id}`
					opts.method = 'DELETE';
					break;

				case 'find':
					opts.url = `/automation/${params.id}`
					opts.method = 'GET';
					break;

				case 'list':
					opts.url = `/automation`
					opts.method = 'GET';
					break;

				case 'update':
					opts.url = `/automation/${params.id}`
					opts.method = 'PUT';
					break;

				default:
					throw new Error(`Not implemented operation '${operation}' for resource '${resource}'`)
			}

			if (['create', 'update'].includes(operation)) {
				opts.body = {
					data: {
						settings: {
							url: params.url,
						},
						type: 'webhook',
						trigger: params.trigger,
					}
				}
			}

			break;

		case 'member':
			switch (operation) {
				case 'createOrUpdate':
					opts.url = `/member`
					opts.method = 'POST';
					break;

				case 'delete':
					opts.url = `/member/${params.id}`
					opts.method = 'DELETE';
					break;

				case 'find':
					opts.url = `/member/${params.id}`
					opts.method = 'GET';
					break;

				case 'update':
					opts.url = `/member/${params.id}`
					opts.method = 'PUT';
					break;

				default:
					throw new Error(`Not implemented operation '${operation}' for resource '${resource}'`)
			}

			if (['createOrUpdate', 'update'].includes(operation)) {
				opts.body = formatParams(params, {
					'platform': idFn,
					'username': i => i.itemChoice,
					'displayName': idFn,
					'emails': i => i.itemChoice,
					'joinedAt': idFn,
					'organizations': i => i.itemChoice,
					'tags': i => i.itemChoice,
					'tasks': i => i.itemChoice,
					'notes': i => i.itemChoice,
					'activities': i => i.itemChoice,
				}, {
					'username': i => keyValueToObj(i.itemChoice),
					'emails': transformSingleProp('email'),
					'organizations': i => i.itemChoice.map((org: any) => formatParams(org, {
						'name': idFn,
						'url': idFn,
						'description': idFn,
						'logo': idFn,
						'employees': idFn,
						'members': j => j.itemChoice,
					}, {
						'members': transformSingleProp('member'),
					})),
					'tags': transformSingleProp('tag'),
					'tasks': transformSingleProp('task'),
					'notes': transformSingleProp('note'),
					'activities': transformSingleProp('activity')
				});
			}

			break;

		case 'note':
			switch (operation) {
				case 'create':
					opts.url = `/note`
					opts.method = 'POST';
					break;

				case 'delete':
					opts.url = `/note/${params.id}`
					opts.method = 'DELETE';
					break;

				case 'find':
					opts.url = `/note/${params.id}`
					opts.method = 'GET';
					break;

				case 'update':
					opts.url = `/note/${params.id}`
					opts.method = 'PUT';
					break;

				default:
					throw new Error(`Not implemented operation '${operation}' for resource '${resource}'`)
			}

			if (['create', 'update'].includes(operation)) {
				opts.body = {
					body: params.body
				}
			}

			break;

		case 'organization':
			switch (operation) {
				case 'create':
					opts.url = `/organization`
					opts.method = 'POST';
					break;

				case 'delete':
					opts.url = `/organization/${params.id}`
					opts.method = 'DELETE';
					break;

				case 'find':
					opts.url = `/organization/${params.id}`
					opts.method = 'GET';
					break;

				case 'update':
					opts.url = `/organization/${params.id}`
					opts.method = 'PUT';
					break;

				default:
					throw new Error(`Not implemented operation '${operation}' for resource '${resource}'`)
			}

			if (['create', 'update'].includes(operation)) {
				opts.body = formatParams(params, {
					'name': idFn,
					'url': idFn,
					'description': idFn,
					'logo': idFn,
					'employees': idFn,
					'members': j => j.itemChoice,
				}, {
					'members': transformSingleProp('member'),
				})
			}

			break;

		case 'task':
			switch (operation) {
				case 'create':
					opts.url = `/task`
					opts.method = 'POST';
					break;

				case 'delete':
					opts.url = `/task/${params.id}`
					opts.method = 'DELETE';
					break;

				case 'find':
					opts.url = `/task/${params.id}`
					opts.method = 'GET';
					break;

				case 'update':
					opts.url = `/task/${params.id}`
					opts.method = 'PUT';
					break;

				default:
					throw new Error(`Not implemented operation '${operation}' for resource '${resource}'`)
			}

			if (['create', 'update'].includes(operation)) {
				opts.body = formatParams(params, {
					'name': idFn,
					'body': idFn,
					'status': idFn,
					'members': i => i.itemChoice,
					'activities': i => i.itemChoice,
					'assigneess': idFn,
				}, {
					'members': transformSingleProp('member'),
					'activities': transformSingleProp('activity'),
				})
			}

			break;

		default:
			throw new Error(`Not implemented resource '${resource}'`)
	}
	return opts;
}

const getAllParams = (execFns: IExecuteFunctions, itemIndex: number): any => {
	const params = execFns.getNode().parameters;
	const paramsWithValues = Object.keys(params).map(name => [name, execFns.getNodeParameter(name, itemIndex)]);
	return Object.fromEntries(paramsWithValues);
}

export const callApi = async (
	execFns: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string,
): Promise<any> => {
	const creds = (await execFns.getCredentials('crowdApi')) as unknown as ICrowdCreds;
	if (creds.debug && creds.debugOutput === 'params') {
		return getAllParams(execFns, itemIndex);
	}
	const requestOpts = getRequestOpts(execFns, creds, itemIndex, resource, operation);
	if (creds.debug && creds.debugOutput === 'request') {
		return requestOpts;
	}

	try {
		return await execFns.helpers.requestWithAuthentication.call(execFns, 'crowdApi', requestOpts);
	} catch (error) {
		throw new NodeApiError(execFns.getNode(), error as JsonObject);
	}
}
