import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import { ExecutionLimitPolicyAssignment } from '../execution-limit-policy-assignment.entity';

/** Inserts a policy and returns its id. */
export async function insertPolicy(
	overrides: Partial<Pick<ExecutionLimitPolicy, 'name' | 'maxExecutions'>> = {},
): Promise<string> {
	const id = randomUUID();
	await Container.get(DataSource)
		.getRepository(ExecutionLimitPolicy)
		.insert({ id, name: `policy-${id}`, maxExecutions: 100, ...overrides });
	return id;
}

export async function assignPolicyToProject(policyId: string, projectId: string): Promise<void> {
	await Container.get(DataSource)
		.getRepository(ExecutionLimitPolicyAssignment)
		.insert({ policyId, projectId });
}
