import { API_KEY_RESOURCES } from '@n8n/permissions';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { mock } from 'vitest-mock-extended';

import {
	requiredAgentScopes,
	type AgentImportPlan,
	type AgentPlanItem,
} from '@/modules/n8n-packages/entities/agent/agent-import.types';
import type { SharedSkillWrite } from '@/modules/n8n-packages/entities/skill/skill-import.types';
import { requiredSharedSkillScopes } from '@/modules/n8n-packages/engine/import-gates';

import { resolvePublicApiRoutes, scopesInRequirement } from '../../public-api-route-resolver';

import '../controllers';

vi.unmock('node:fs');

const PUBLIC_API_ROOT = path.resolve(__dirname, '..', '..');
const OPENAPI_SPEC_PATH = path.join(PUBLIC_API_ROOT, 'v1', 'openapi.yml');

describe('Public API scope parity', () => {
	test('openapi.yml tags are sorted alphabetically by name', () => {
		const spec = yaml.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8')) as {
			tags?: Array<{ name: string }>;
		};
		const tagNames = (spec.tags ?? []).map((tag) => tag.name);
		const sorted = [...tagNames].sort((a, b) => (a < b ? -1 : 1));
		expect(tagNames).toEqual(sorted);
	});

	test('every API key scope in API_KEY_RESOURCES is consumed by at least one endpoint', () => {
		const routes = resolvePublicApiRoutes();
		const consumed = new Set<string>(
			routes.flatMap((route) => (route.apiKeyScope ? scopesInRequirement(route.apiKeyScope) : [])),
		);
		// Package imports check these grants after the planner selects the actions.
		expect(routes).toContainEqual(
			expect.objectContaining({ method: 'post', path: '/n8n-packages/import' }),
		);
		const plannedScopes = requiredAgentScopes(
			mock<AgentImportPlan>({
				items: [
					mock<AgentPlanItem>({ action: 'create', publishingAction: 'publish' }),
					mock<AgentPlanItem>({ action: 'update', publishingAction: 'unpublish' }),
				],
			}),
		);
		for (const scope of plannedScopes) consumed.add(scope);
		const createAndUpdate = [
			{ base: undefined },
			{ base: { skillHash: 'hash', versionId: 'version' } },
		] as SharedSkillWrite[];
		for (const scope of requiredSharedSkillScopes([{ shared: createAndUpdate }])) {
			consumed.add(scope);
		}
		const declared = new Set<string>();
		for (const [resource, operations] of Object.entries(API_KEY_RESOURCES)) {
			for (const operation of operations) {
				declared.add(`${resource}:${operation}`);
			}
		}
		const orphans = [...declared].filter((scope) => !consumed.has(scope));
		expect(orphans).toEqual([]);
	});
});
