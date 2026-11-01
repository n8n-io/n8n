import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { toPathSegment } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { scheduleRLC } from '../common.descriptions';
import { requireResourceIdNumber } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [scheduleRLC];

const displayOptions = {
	show: {
		resource: ['schedule'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const scheduleId = requireResourceIdNumber.call(this, 'schedule', itemIndex, 'Schedule');

	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject>>).call(
		this,
		'GET',
		`/schedules/${toPathSegment(scheduleId)}`,
		CAL_API_VERSION.SCHEDULES,
	);

	return response.data ?? {};
};
