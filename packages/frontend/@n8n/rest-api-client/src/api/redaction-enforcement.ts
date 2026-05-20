import type { RedactionEnforcementDto, UpdateRedactionEnforcementDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

/**
 * Single seam for the instance-level data-redaction enforcement API.
 *
 * Both endpoints currently piggyback on `/rest/settings/security` because the
 * backend wiring lands in a follow-up (see IAM-619). When that ticket decides
 * on its final surface (extend `SecuritySettingsController` vs. a new
 * `/redaction-enforcement` endpoint vs. public-API), update the two URL
 * constants below — no component changes required.
 */
const GET_ENDPOINT = '/settings/security';
const UPDATE_ENDPOINT = '/settings/security';

export async function getRedactionEnforcement(
	context: IRestApiContext,
): Promise<RedactionEnforcementDto> {
	const response = await makeRestApiRequest<Partial<RedactionEnforcementDto>>(
		context,
		'GET',
		GET_ENDPOINT,
	);
	return {
		redactionEnforced: response.redactionEnforced ?? false,
		redactionScope: response.redactionScope ?? 'non-manual',
	};
}

export async function updateRedactionEnforcement(
	context: IRestApiContext,
	payload: UpdateRedactionEnforcementDto,
): Promise<void> {
	await makeRestApiRequest(context, 'POST', UPDATE_ENDPOINT, payload);
}
