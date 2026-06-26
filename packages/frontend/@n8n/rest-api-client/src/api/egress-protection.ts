import type {
	EgressCalibrationResponse,
	EgressPolicyStateResponse,
	UpdateEgressPolicyDto,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getEgressPolicy(
	context: IRestApiContext,
): Promise<EgressPolicyStateResponse> {
	return await makeRestApiRequest(context, 'GET', '/egress-protection/policy');
}

export async function updateEgressPolicy(
	context: IRestApiContext,
	data: UpdateEgressPolicyDto,
): Promise<EgressPolicyStateResponse> {
	return await makeRestApiRequest(context, 'PUT', '/egress-protection/policy', data);
}

export async function getEgressCalibration(
	context: IRestApiContext,
): Promise<EgressCalibrationResponse> {
	return await makeRestApiRequest(context, 'GET', '/egress-protection/calibration');
}

export async function clearEgressCalibration(context: IRestApiContext): Promise<{ success: true }> {
	return await makeRestApiRequest(context, 'DELETE', '/egress-protection/calibration');
}
