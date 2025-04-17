import type { INodeProperties } from 'n8n-workflow';

export const showFor =
	(resources: string[]) =>
	(operations?: string[]): Partial<INodeProperties> => {
		return operations !== undefined
			? {
					displayOptions: {
						show: {
							resource: resources,
							operation: operations,
						},
					},
				}
			: {
					displayOptions: {
						show: {
							resource: resources,
						},
					},
				};
	};

export const mapWith =
	<T>(...objects: Array<Partial<T>>) =>
	(item: Partial<T>) =>
		Object.assign({}, item, ...objects);

export const getId = (): INodeProperties => ({
	displayName: 'ID',
	name: 'id',
	type: 'string',
	required: true,
	default: '',
	routing: {
		send: {
			type: 'query',
			property: 'ids[]',
		},
	},
});

export const getAdditionalOptions = (fields: INodeProperties[]): INodeProperties => {
	return {
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		default: {},
		placeholder: 'Add option',
		options: fields,
	};
};
