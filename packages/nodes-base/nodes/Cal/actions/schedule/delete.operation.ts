import type { INodeProperties } from 'n8n-workflow';
import { toPathSegment } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import { scheduleRLC } from '../common.descriptions';
import { requireResourceIdNumber } from '../helpers';
import type { CalOperation } from '../router';

const properties: INodeProperties[] = [scheduleRLC];

const displayOptions = {
	show: {
		resource: ['schedule'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const scheduleId = requireResourceIdNumber.call(this, 'schedule', itemIndex, 'Schedule');

	// The endpoint answers with a status only, so the item reports the deleted ID.
	await calApiRequestV2Versioned.call(
		this,
		'DELETE',
		`/schedules/${toPathSegment(scheduleId)}`,
		CAL_API_VERSION.SCHEDULES,
	);

	return { success: true, scheduleId };
};
