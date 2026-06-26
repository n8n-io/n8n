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
	order?: number;
	projectIds?: string[];
};

export type PatchRoleMappingRuleInput = {
	expression?: string;
	role?: string;
	type?: RoleMappingRuleType;
	order?: number;
	projectIds?: string[];
};

type RoleMappingRuleListResponse =
	| { count: number; items: RoleMappingRuleResponse[] }
	| RoleMappingRuleResponse[];

// The list endpoint paginates with a small default page size, so a single
// request silently drops every rule past the first page. The settings UI needs
// the complete set to render and save correctly, so walk every page here.
export const listRoleMappingRules = async (
	context: IRestApiContext,
): Promise<RoleMappingRuleResponse[]> => {
	const pageSize = 250;
	const rules: RoleMappingRuleResponse[] = [];

	for (let skip = 0; ; skip += pageSize) {
		const response = await makeRestApiRequest<RoleMappingRuleListResponse>(
			context,
			'GET',
			'/role-mapping-rule',
			{ skip, take: pageSize },
		);

		if (Array.isArray(response)) return response;

		rules.push(...response.items);

		if (rules.length >= response.count || response.items.length === 0) break;
	}

	return rules;
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
