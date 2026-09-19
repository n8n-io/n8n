import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { CAL_API_VERSION, calApiRequestV2Versioned } from '../../GenericFunctions';
import type { CalApiResponse } from '../../helpers/interfaces';
import { timeZoneField } from '../common.descriptions';
import { requireString } from '../helpers';
import type { CalOperation } from '../router';
import { availabilityField, overridesField, toAvailability, toOverrides } from './shared';

const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Working hours',
		description: 'The name of the schedule',
	},
	timeZoneField,
	{
		displayName: 'Set as Default',
		name: 'isDefault',
		type: 'boolean',
		default: false,
		description: 'Whether to use this schedule for every event type without its own schedule',
	},
	availabilityField,
	overridesField,
];

const displayOptions = {
	show: {
		resource: ['schedule'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: CalOperation = async function (this, itemIndex) {
	const name = requireString.call(this, 'name', itemIndex, 'Name');
	const timeZone = requireString.call(this, 'timeZone', itemIndex, 'Time Zone');
	const isDefault = this.getNodeParameter('isDefault', itemIndex, false);

	// Cal.com defaults to Monday-Friday, 09:00-17:00 when no availability is sent.
	const body: IDataObject = { name, timeZone, isDefault: isDefault === true };

	const availability = toAvailability(this.getNodeParameter('availability', itemIndex, {}));
	if (availability !== undefined) body.availability = availability;

	const overrides = toOverrides(this.getNodeParameter('overrides', itemIndex, {}));
	if (overrides !== undefined) body.overrides = overrides;

	const response = await (calApiRequestV2Versioned<CalApiResponse<IDataObject>>).call(
		this,
		'POST',
		'/schedules',
		CAL_API_VERSION.SCHEDULES,
		body,
	);

	return response.data ?? {};
};
