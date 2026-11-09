import type { INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse, CalSchedule } from '../../helpers/interfaces';
import { getLimit } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [...returnAllOrLimit];

const displayOptions = {
	show: {
		resource: ['schedule'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const limit = getLimit.call(this, itemIndex);

	// The endpoint answers with every schedule at once, so the limit applies here.
	const response = await (calApiRequestV2Versioned<CalApiResponse<CalSchedule[]>>).call(
		this,
		'GET',
		'/schedules',
		CAL_API_VERSION.SCHEDULES,
	);

	const schedules = Array.isArray(response.data) ? response.data : [];
	return schedules.length > limit ? schedules.slice(0, limit) : schedules;
};
