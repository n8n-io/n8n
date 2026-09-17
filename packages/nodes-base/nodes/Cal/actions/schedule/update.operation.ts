import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, toPathSegment } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { scheduleRLC } from '../common.descriptions';
import { requireResourceId } from '../helpers';
import type { CalOperation } from '../router';
import { availabilityField, overridesField, toAvailability, toOverrides } from './shared';

const properties: INodeProperties[] = [
	scheduleRLC,
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			availabilityField,
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name of the schedule',
			},
			overridesField,
			{
				displayName: 'Set as Default',
				name: 'isDefault',
				type: 'boolean',
				default: false,
				description: 'Whether to use this schedule for every event type without its own schedule',
			},
			{
				displayName: 'Time Zone',
				name: 'timeZone',
				type: 'string',
				default: '',
				placeholder: 'e.g. Europe/Berlin',
				description: 'The new IANA time zone of the schedule',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['schedule'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const scheduleId = requireResourceId.call(this, 'schedule', itemIndex, 'Schedule');
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {});

	const body: IDataObject = {};
	if (typeof updateFields.name === 'string' && updateFields.name) body.name = updateFields.name;
	if (typeof updateFields.timeZone === 'string' && updateFields.timeZone) {
		body.timeZone = updateFields.timeZone;
	}
	if (typeof updateFields.isDefault === 'boolean') body.isDefault = updateFields.isDefault;

	const availability = toAvailability(updateFields.availability);
	if (availability !== undefined) body.availability = availability;

	const overrides = toOverrides(updateFields.overrides);
	if (overrides !== undefined) body.overrides = overrides;

	if (Object.keys(body).length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select at least one field to update', {
			itemIndex,
		});
	}

	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject>>).call(
		this,
		'PATCH',
		`/schedules/${toPathSegment(scheduleId)}`,
		CAL_API_VERSION.SCHEDULES,
		body,
	);

	return response.data ?? {};
};
