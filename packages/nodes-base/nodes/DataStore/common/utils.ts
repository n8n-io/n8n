import {
	type IDataStoreProjectAggregateService,
	type IDataStoreProjectService,
	UserError,
	type IExecuteFunctions,
} from 'n8n-workflow';

import { DATA_STORE_ID_FIELD } from './fields';

export async function getDataStoreProxy(
	ctx: IExecuteFunctions,
	i: number,
): Promise<IDataStoreProjectService> {
	if (ctx.helpers.getDataStoreProxy === undefined)
		throw new UserError('Attempted to use Data Store node but the module is disabled');

	const dataStoreId = ctx.getNodeParameter(DATA_STORE_ID_FIELD, i, '', {
		extractValue: true,
	}) as string;

	return await ctx.helpers.getDataStoreProxy(dataStoreId);
}

export async function getDataStoreAggregateProxy(
	this: IExecuteFunctions,
): Promise<IDataStoreProjectAggregateService> {
	if (this.helpers.getDataStoreAggregateProxy === undefined)
		throw new UserError('Attempted to use Data Store node but the module is disabled');

	return await this.helpers.getDataStoreAggregateProxy();
}
