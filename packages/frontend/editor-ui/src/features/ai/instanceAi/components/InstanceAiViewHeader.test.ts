import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import InstanceAiViewHeader from './InstanceAiViewHeader.vue';

const { sessionFilesEnabledMock, getSessionFilesMock, sessionFilesForMock, setSessionFilesMock } =
	vi.hoisted(() => ({
		sessionFilesEnabledMock: { value: false },
		getSessionFilesMock: vi.fn().mockResolvedValue({ files: [] }),
		sessionFilesForMock: vi.fn().mockReturnValue([]),
		setSessionFilesMock: vi.fn(),
	}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		creditsRemaining: undefined,
		creditsQuota: undefined,
		isLowCredits: false,
		threadCreditsUsed: () => undefined,
		sessionFilesFor: sessionFilesForMock,
		setSessionFiles: setSessionFilesMock,
	}),
}));

vi.mock('../instanceAiLayout', () => ({
	useSidebarState: () => ({ collapsed: { value: false }, toggle: vi.fn() }),
}));

vi.mock('@/features/integrations/sourceControl.ee/sourceControl.store', () => ({
	useSourceControlStore: () => ({ preferences: { branchReadOnly: false } }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get moduleSettings() {
			return {
				'instance-ai': {
					sessionFilesEnabled: sessionFilesEnabledMock.value,
					sandboxEnabled: true,
				},
			};
		},
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));

vi.mock('../instanceAi.memory.api', () => ({
	getSessionFiles: (...args: unknown[]) => getSessionFilesMock(...args),
}));

vi.mock('@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue', () => ({
	default: { template: '<div />' },
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/design-system')>()),
	N8nIconButton: {
		emits: ['click'],
		template: '<button v-bind="$attrs" @click="$emit(\'click\')" />',
	},
	N8nTooltip: { template: '<div><slot /></div>' },
	N8nCallout: { template: '<div><slot /></div>' },
	TOOLTIP_DELAY_MS: 0,
}));

vi.mock('./InstanceAiThreadList.vue', () => ({
	default: { template: '<div><slot name="trigger" /></div>' },
}));

vi.mock('@/features/ai/shared/components/ChatHistoryDropdownTrigger.vue', () => ({
	default: { template: '<button />' },
}));

async function mountHeader(threadId?: string) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: { template: '<div />' } },
			{ path: '/threads/:threadId', component: { template: '<div />' } },
		],
	});
	await router.push(threadId ? `/threads/${threadId}` : '/');
	await router.isReady();
	return mount(InstanceAiViewHeader, {
		global: { plugins: [router] },
	});
}

describe('InstanceAiViewHeader session files', () => {
	beforeEach(() => {
		sessionFilesEnabledMock.value = false;
		getSessionFilesMock.mockReset();
		getSessionFilesMock.mockResolvedValue({ files: [] });
		sessionFilesForMock.mockReset();
		sessionFilesForMock.mockReturnValue([]);
		setSessionFilesMock.mockReset();
		setSessionFilesMock.mockImplementation((_threadId: string, files: unknown[]) => {
			sessionFilesForMock.mockReturnValue(files);
		});
	});

	it('hides the files button when the flag is off', async () => {
		const wrapper = await mountHeader('thread-1');
		expect(wrapper.find('[data-testid="session-files-toggle"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('hides the files button when there is no thread', async () => {
		sessionFilesEnabledMock.value = true;
		const wrapper = await mountHeader();
		expect(wrapper.find('[data-testid="session-files-toggle"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('fetches session files when the button is opened', async () => {
		sessionFilesEnabledMock.value = true;
		getSessionFilesMock.mockResolvedValueOnce({
			files: [
				{
					id: 'att-1',
					kind: 'attachment',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					sizeBytes: 5,
					createdAt: '2026-01-01T00:00:00.000Z',
					previewable: true,
					onDisk: false,
				},
			],
		});
		const wrapper = await mountHeader('thread-1');

		await wrapper.get('[data-testid="session-files-toggle"]').trigger('click');
		await flushPromises();

		expect(getSessionFilesMock).toHaveBeenCalledWith({ baseUrl: '/rest' }, 'thread-1');
		expect(setSessionFilesMock).toHaveBeenCalledWith(
			'thread-1',
			expect.arrayContaining([expect.objectContaining({ id: 'att-1', fileName: 'notes.txt' })]),
		);
		expect(wrapper.get('[data-testid="session-files-list"]').text()).toContain('notes.txt');
		wrapper.unmount();
	});
});
