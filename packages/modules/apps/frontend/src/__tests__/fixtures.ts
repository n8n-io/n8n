import type { AppResponse, AppVersionResponse } from '@n8n/api-types';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';

export const PUBLISHED_URL = 'https://expenses.apps.example.com/';

export const testApp = (overrides: Partial<AppResponse> = {}): AppResponse => ({
	id: 'app-1',
	projectId: 'project-1',
	name: 'Expense tracker',
	namespace: 'expenses',
	visibility: 'project',
	draftVersionId: 'v2',
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
	...overrides,
});

export const testVersion: AppVersionResponse = {
	id: 'v2',
	appId: 'app-1',
	label: null,
	description: null,
	sourceArtifactId: 1,
	bundleArtifactId: 2,
	buildStatus: 'succeeded',
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-01T10:00:00.000Z',
};

export function providePermissions(scopes: Scope[], readOnly = false) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => readOnly,
	});
}
