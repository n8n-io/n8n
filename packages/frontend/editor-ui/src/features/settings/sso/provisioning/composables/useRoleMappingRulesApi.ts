import { useRootStore } from '@n8n/stores/useRootStore';
import * as roleMappingRuleApi from '@n8n/rest-api-client/api/roleMappingRule';
import type {
	RoleMappingRuleResponse,
	CreateRoleMappingRuleInput,
	PatchRoleMappingRuleInput,
} from '@n8n/rest-api-client/api/roleMappingRule';

/**
 * API layer for role mapping rules.
 * Delegates to the REST API client in @n8n/rest-api-client.
 */
export function useRoleMappingRulesApi() {
	const rootStore = useRootStore();

	async function listRules(): Promise<RoleMappingRuleResponse[]> {
		return await roleMappingRuleApi.listRoleMappingRules(rootStore.restApiContext);
	}

	async function createRule(input: CreateRoleMappingRuleInput): Promise<RoleMappingRuleResponse> {
		return await roleMappingRuleApi.createRoleMappingRule(rootStore.restApiContext, input);
	}

	async function updateRule(
		id: string,
		patch: PatchRoleMappingRuleInput,
	): Promise<RoleMappingRuleResponse> {
		return await roleMappingRuleApi.updateRoleMappingRule(rootStore.restApiContext, id, patch);
	}

	async function deleteRule(id: string): Promise<void> {
		await roleMappingRuleApi.deleteRoleMappingRule(rootStore.restApiContext, id);
	}

	async function moveRule(id: string, targetIndex: number): Promise<RoleMappingRuleResponse> {
		return await roleMappingRuleApi.moveRoleMappingRule(rootStore.restApiContext, id, targetIndex);
	}

	return { listRules, createRule, updateRule, deleteRule, moveRule };
}
