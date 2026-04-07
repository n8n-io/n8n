import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export type RoleMappingRuleType = 'instance' | 'project';

export type RoleMappingRuleResponse = {
	id: string;
	expression: string;
	role: string;
	type: RoleMappingRuleType;
	order: number;
	projectIds: string[];
	description?: string;
	createdAt: string;
	updatedAt: string;
};

export type CreateRoleMappingRuleInput = {
	expression: string;
	role: string;
	type: RoleMappingRuleType;
	order: number;
	projectIds?: string[];
};

export type PatchRoleMappingRuleInput = {
	expression?: string;
	role?: string;
	type?: RoleMappingRuleType;
	order?: number;
	projectIds?: string[];
};

export const listRoleMappingRules = async (
	context: IRestApiContext,
): Promise<RoleMappingRuleResponse[]> => {
	const response = await makeRestApiRequest(context, 'GET', '/role-mapping-rule');
	return (response as { items: RoleMappingRuleResponse[] }).items ?? response;
};

export const createRoleMappingRule = async (
	context: IRestApiContext,
	input: CreateRoleMappingRuleInput,
): Promise<RoleMappingRuleResponse> => {
	return await makeRestApiRequest(context, 'POST', '/role-mapping-rule', input);
};

export const updateRoleMappingRule = async (
	context: IRestApiContext,
	id: string,
	patch: PatchRoleMappingRuleInput,
): Promise<RoleMappingRuleResponse> => {
	return await makeRestApiRequest(context, 'PATCH', `/role-mapping-rule/${id}`, patch);
};

export const deleteRoleMappingRule = async (
	context: IRestApiContext,
	id: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `/role-mapping-rule/${id}`);
};

export const moveRoleMappingRule = async (
	context: IRestApiContext,
	id: string,
	targetIndex: number,
): Promise<RoleMappingRuleResponse> => {
	return await makeRestApiRequest(context, 'POST', `/role-mapping-rule/${id}/move`, {
		targetIndex,
	});
};
