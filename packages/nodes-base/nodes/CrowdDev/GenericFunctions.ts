import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

const addOptName = 'additionalOptions';

const getAllParams = (execFns: IExecuteSingleFunctions): Record<string, unknown> => {
	const params = execFns.getNode().parameters;
	const keys = Object.keys(params);
	const paramsWithValues = keys
		.filter((i) => i !== addOptName)
		.map((name) => [name, execFns.getNodeParameter(name)]);

	const paramsWithValuesObj = Object.fromEntries(paramsWithValues);

	if (keys.includes(addOptName)) {
		const additionalOptions = execFns.getNodeParameter(addOptName);
		return Object.assign(paramsWithValuesObj, additionalOptions);
	}

	return paramsWithValuesObj;
};

const formatParams = (
	obj: Record<string, unknown>,
	filters?: { [paramName: string]: (value: any) => boolean },
	mappers?: { [paramName: string]: (value: any) => any },
) => {
	return Object.fromEntries(
		Object.entries(obj)
			.filter(([name, value]) => !filters || (name in filters ? filters[name](value) : false))
			.map(([name, value]) =>
				!mappers || !(name in mappers) ? [name, value] : [name, mappers[name](value)],
			),
	);
};

const objectFromProps = (src: any, props: string[]) => {
	const result = props.filter((p) => src.hasOwnProperty(p)).map((p) => [p, src[p]]);
	return Object.fromEntries(result);
};

const idFn = (i: any) => i;

const keyValueToObj = (arr: any[]) => {
	const obj: any = {};
	arr.forEach((item) => {
		obj[item.key] = item.value;
	});
	return obj;
};

const transformSingleProp = (prop: string) => (values: any) =>
	(values.itemChoice || []).map((i: any) => i[prop]);

export async function activityPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this);
	const isCreateWithMember = params.operation === 'createWithMember';
	const isCreateForMember = params.operation === 'createForMember';

	if (isCreateWithMember) {
		// Move following props into "member" subproperty
		const memberProps = ['displayName', 'emails', 'joinedAt', 'username'];
		params.member = objectFromProps(params, memberProps);
		memberProps.forEach((p) => delete params[p]);
	}
	opts.body = formatParams(
		params,
		{
			member: (v) => (isCreateWithMember || isCreateForMember) && v,
			type: idFn,
			timestamp: idFn,
			platform: idFn,
			title: idFn,
			body: idFn,
			channel: idFn,
			sourceId: idFn,
			sourceParentId: idFn,
		},
		{
			member: (v) =>
				typeof v === 'object'
					? formatParams(
							v as Record<string, unknown>,
							{
								username: (un) => un.itemChoice,
								displayName: idFn,
								emails: idFn,
								joinedAt: idFn,
							},
							{
								username: (un) => keyValueToObj(un.itemChoice as any[]),
								emails: transformSingleProp('email'),
							},
						)
					: v,
		},
	);
	return opts;
}

export async function automationPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this);
	opts.body = {
		data: {
			settings: {
				url: params.url,
			},
			type: 'webhook',
			trigger: params.trigger,
		},
	};
	return opts;
}

export async function memberPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this);
	opts.body = formatParams(
		params,
		{
			platform: idFn,
			username: idFn,
			displayName: idFn,
			emails: (i) => i.itemChoice,
			joinedAt: idFn,
			organizations: (i) => i.itemChoice,
			tags: (i) => i.itemChoice,
			tasks: (i) => i.itemChoice,
			notes: (i) => i.itemChoice,
			activities: (i) => i.itemChoice,
		},
		{
			emails: transformSingleProp('email'),
			organizations: (i) =>
				i.itemChoice.map((org: any) =>
					formatParams(
						org as Record<string, unknown>,
						{
							name: idFn,
							url: idFn,
							description: idFn,
							logo: idFn,
							employees: idFn,
							members: (j) => j.itemChoice,
						},
						{
							members: transformSingleProp('member'),
						},
					),
				),
			tags: transformSingleProp('tag'),
			tasks: transformSingleProp('task'),
			notes: transformSingleProp('note'),
			activities: transformSingleProp('activity'),
		},
	);
	return opts;
}

export async function notePresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this);
	opts.body = {
		body: params.body,
	};
	return opts;
}

export async function organizationPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this);
	opts.body = formatParams(
		params,
		{
			name: idFn,
			url: idFn,
			description: idFn,
			logo: idFn,
			employees: idFn,
			members: (j) => j.itemChoice,
		},
		{
			members: transformSingleProp('member'),
		},
	);
	return opts;
}

export async function taskPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this);
	opts.body = formatParams(
		params,
		{
			name: idFn,
			body: idFn,
			status: idFn,
			members: (i) => i.itemChoice,
			activities: (i) => i.itemChoice,
			assigneess: idFn,
		},
		{
			members: transformSingleProp('member'),
			activities: transformSingleProp('activity'),
		},
	);
	return opts;
}
