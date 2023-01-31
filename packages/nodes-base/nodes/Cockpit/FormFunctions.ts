import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';
import type { IForm } from './FormInterface';
import { cockpitApiRequest } from './GenericFunctions';

export async function submitForm(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	resourceName: string,
	form: IDataObject,
) {
	const body: IForm = {
		form,
	};

	return cockpitApiRequest.call(this, 'post', `/forms/submit/${resourceName}`, body);
}
