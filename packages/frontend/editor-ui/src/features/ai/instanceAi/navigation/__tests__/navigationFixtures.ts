import { vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { ExperienceMode, InstanceAiThreadSummary } from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { INSTANCE_AI_THREADS_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '../../constants';

export const T0 = '2026-03-01T10:00:00.000Z';
export const T1 = '2026-03-01T11:00:00.000Z';

const emptyView = { template: '<div />' };

/** A router with the routes that the sidebar sections link to. */
export function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'home', component: emptyView },
			{ path: '/home/workflows', name: VIEWS.HOMEPAGE, component: emptyView },
			{ path: '/workflow/:workflowId', name: VIEWS.WORKFLOW, component: emptyView },
			{ path: '/assistant', name: INSTANCE_AI_VIEW, component: emptyView },
			{ path: '/assistant/history', name: INSTANCE_AI_THREADS_VIEW, component: emptyView },
			{ path: '/assistant/:threadId', name: INSTANCE_AI_THREAD_VIEW, component: emptyView },
		],
	});
}

/** Sets up the settings and scopes that make the Assistant reachable (or not). */
export function configureInstanceAi({
	available = true,
	experienceModes = false,
	defaultMode = 'simple',
}: { available?: boolean; experienceModes?: boolean; defaultMode?: ExperienceMode } = {}) {
	const settingsStore = mockedStore(useSettingsStore);
	settingsStore.isModuleActive = vi.fn().mockReturnValue(available);
	settingsStore.moduleSettings = {
		'instance-ai': {
			enabled: true,
			mcpConnectionsAvailable: true,
			localGatewayDisabled: false,
			browserUseEnabled: true,
			proxyEnabled: false,
			cloudManaged: false,
			setupCompleted: true,
			sandboxEnabled: true,
			workflowBuilderAvailable: true,
			sandboxUnavailableReason: null,
			runDebugEnabled: false,
			experience: { enabled: experienceModes, defaultMode },
		},
	};
	vi.mocked(useRBACStore().hasScope).mockImplementation((scope) => scope === 'instanceAi:message');
}

export function chat(
	id: string,
	title: string,
	overview: Partial<InstanceAiThreadSummary> = {},
): InstanceAiThreadSummary {
	return { id, title, createdAt: T0, updatedAt: T0, ...overview };
}

/** Replaces `localStorage` with a map that the test can read and fill. */
export function stubLocalStorage(storage: Map<string, string>) {
	vi.stubGlobal('localStorage', {
		getItem: vi.fn((key: string) => storage.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
		}),
	});
}
