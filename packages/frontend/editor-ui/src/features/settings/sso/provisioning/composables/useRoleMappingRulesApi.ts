import type {
	RoleMappingRuleResponse,
	RoleMappingRuleType,
	CreateRoleMappingRuleInput,
	PatchRoleMappingRuleInput,
} from '../types';

const MOCK_DELAY_MS = 200;

async function delay(): Promise<void> {
	return await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function generateId(): string {
	return crypto.randomUUID();
}

function nowIso(): string {
	return new Date().toISOString();
}

/**
 * Mocked API layer for role mapping rules.
 * Replace the body of each method with real REST calls when the backend is ready.
 * Only this file needs to change — the composable and UI are decoupled.
 */
export function useRoleMappingRulesApi() {
	const store: RoleMappingRuleResponse[] = [];

	async function listRules(): Promise<RoleMappingRuleResponse[]> {
		await delay();
		return [...store].sort((a, b) => a.order - b.order);
	}

	async function createRule(input: CreateRoleMappingRuleInput): Promise<RoleMappingRuleResponse> {
		await delay();
		const now = nowIso();
		const rule: RoleMappingRuleResponse = {
			id: generateId(),
			expression: input.expression,
			role: input.role,
			type: input.type,
			order: input.order,
			projectIds: input.projectIds ?? [],
			enabled: true,
			createdAt: now,
			updatedAt: now,
		};
		store.push(rule);
		return { ...rule };
	}

	async function updateRule(
		id: string,
		patch: PatchRoleMappingRuleInput,
	): Promise<RoleMappingRuleResponse> {
		await delay();
		const index = store.findIndex((r) => r.id === id);
		if (index === -1) {
			throw new Error(`Rule ${id} not found`);
		}
		const updated: RoleMappingRuleResponse = {
			...store[index],
			...patch,
			updatedAt: nowIso(),
		};
		store[index] = updated;
		return { ...updated };
	}

	async function deleteRule(id: string): Promise<void> {
		await delay();
		const index = store.findIndex((r) => r.id === id);
		if (index === -1) {
			throw new Error(`Rule ${id} not found`);
		}
		store.splice(index, 1);
	}

	async function reorderRules(
		type: RoleMappingRuleType,
		orderedIds: string[],
	): Promise<RoleMappingRuleResponse[]> {
		await delay();
		orderedIds.forEach((id, newOrder) => {
			const rule = store.find((r) => r.id === id && r.type === type);
			if (rule) {
				rule.order = newOrder;
				rule.updatedAt = nowIso();
			}
		});
		return store
			.filter((r) => r.type === type)
			.sort((a, b) => a.order - b.order)
			.map((r) => ({ ...r }));
	}

	return { listRules, createRule, updateRule, deleteRule, reorderRules };
}
