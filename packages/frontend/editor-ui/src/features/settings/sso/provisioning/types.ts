export type RoleMappingRuleType = 'instance' | 'project';

export interface RoleMappingRuleResponse {
	id: string;
	expression: string;
	role: string;
	type: RoleMappingRuleType;
	order: number;
	projectIds: string[];
	enabled: boolean;
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateRoleMappingRuleInput {
	expression: string;
	role: string;
	type: RoleMappingRuleType;
	order: number;
	projectIds?: string[];
}

export interface PatchRoleMappingRuleInput {
	expression?: string;
	role?: string;
	type?: RoleMappingRuleType;
	order?: number;
	projectIds?: string[];
}
