import { mount, flushPromises } from '@vue/test-utils';
import type { AgentPublishHistoryItemDto } from '@n8n/api-types';
import { ref } from 'vue';
import AgentPublishTimeline from '../components/VersionHistory/AgentPublishTimeline.vue';

const mocks = vi.hoisted(() => ({ list: vi.fn(), showError: vi.fn(), intersect: vi.fn() }));
vi.mock('../composables/useAgentApi', () => ({ listAgentPublishHistory: mocks.list }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: mocks.showError }) }));
vi.mock('@vueuse/core', () => ({ useNow: () => ref(new Date('2026-10-20T12:00:00Z')) }));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate: Record<string, string> }) =>
			[key, ...Object.values(options?.interpolate ?? {})].join(':'),
	}),
}));
vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: ({ onIntersect }: { onIntersect: () => void }) => {
		mocks.intersect.mockImplementation(onIntersect);
		return { observe: vi.fn() };
	},
}));
vi.mock('@n8n/design-system', () => ({
	N8nText: { template: '<span><slot /></span>' },
	N8nTooltip: { template: '<div :title="content"><slot /></div>', props: ['content'] },
	N8nButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	N8nLoading: { template: '<div data-testid="loading" />' },
}));

const event = (
	id: number,
	overrides: Partial<AgentPublishHistoryItemDto> = {},
): AgentPublishHistoryItemDto => ({
	id,
	versionId: 'same-version',
	name: 'Release',
	description: 'Support updates',
	event: 'activated',
	author: 'Ada Lovelace',
	createdAt: '2026-10-20T10:00:00Z',
	endedAt: '2026-10-20T11:00:00Z',
	isActive: false,
	isLegacy: false,
	...overrides,
});
const render = () =>
	mount(AgentPublishTimeline, { props: { projectId: 'project', agentId: 'agent' } });

beforeEach(() => {
	vi.clearAllMocks();
});

it('shows each publication of the same version, its duration, and publisher details', async () => {
	mocks.list.mockResolvedValue([
		event(3, { isActive: true, endedAt: null }),
		event(2, { event: 'deactivated' }),
		event(1),
	]);
	const wrapper = render();
	await flushPromises();
	const rows = wrapper.findAll('[data-test-id="agent-publish-timeline-entry"]');
	expect(rows).toHaveLength(3);
	expect(rows[0].text()).toContain('2h');
	expect(rows[1].text()).toContain('agents.versionHistory.timeline.unpublished');
	expect(rows[2].text()).toContain('1h');
	expect(rows[0].find('[title]').attributes('title')).toContain('Ada Lovelace');
	expect(rows[0].find('[title]').attributes('title')).toContain('Support updates');
	expect(rows[0].find('[role="img"]').attributes('aria-label')).toBe(
		'agents.versionHistory.item.publishedBadge',
	);
	wrapper.unmount();
});

it('does not invent a duration for legacy records or lose deleted-version records', async () => {
	mocks.list.mockResolvedValue([
		event(1, { isLegacy: true, versionId: null, name: null, description: null }),
	]);
	const wrapper = render();
	await flushPromises();
	expect(wrapper.text()).toContain('agents.versionHistory.timeline.legacyDuration');
	expect(wrapper.text()).toContain('agents.versionHistory.timeline.deletedVersion');
	expect(wrapper.find('[title]').attributes('title')).toContain(
		'agents.versionHistory.timeline.legacyHint',
	);
	wrapper.unmount();
});

it('shows an empty state before the first publication', async () => {
	mocks.list.mockResolvedValue([]);
	const wrapper = render();
	await flushPromises();
	expect(wrapper.text()).toContain('agents.versionHistory.timeline.empty');
	wrapper.unmount();
});

it('lets a failed initial request retry', async () => {
	mocks.list.mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce([event(1)]);
	const wrapper = render();
	await flushPromises();
	expect(wrapper.find('[role="alert"]').exists()).toBe(true);
	await wrapper.find('button').trigger('click');
	await flushPromises();
	expect(wrapper.findAll('[data-test-id="agent-publish-timeline-entry"]')).toHaveLength(1);
	wrapper.unmount();
});

it.each([1, 20])('retries a failed refresh after loading %i events', async (count) => {
	mocks.list
		.mockResolvedValueOnce(Array.from({ length: count }, (_, index) => event(index)))
		.mockRejectedValueOnce(new Error('Refresh failed'))
		.mockResolvedValueOnce([event(99)]);
	const wrapper = render();
	await flushPromises();
	await wrapper.vm.refresh();
	await wrapper.get('button').trigger('click');
	await flushPromises();
	expect(mocks.list).toHaveBeenLastCalledWith({}, 'project', 'agent', { take: 20, skip: 0 });
	expect(wrapper.findAll('[data-test-id="agent-publish-timeline-entry"]')).toHaveLength(1);
	wrapper.unmount();
});

it('retries a failed page without replacing the loaded events', async () => {
	mocks.list
		.mockResolvedValueOnce(Array.from({ length: 20 }, (_, index) => event(index)))
		.mockRejectedValueOnce(new Error('Page failed'))
		.mockResolvedValueOnce([event(99)]);
	const wrapper = render();
	await flushPromises();
	mocks.intersect();
	await flushPromises();
	await wrapper.get('button').trigger('click');
	await flushPromises();
	expect(mocks.list).toHaveBeenLastCalledWith({}, 'project', 'agent', { take: 20, skip: 20 });
	expect(wrapper.findAll('[data-test-id="agent-publish-timeline-entry"]')).toHaveLength(21);
	wrapper.unmount();
});

it('paginates by event count and keeps separate publications of one version', async () => {
	mocks.list
		.mockResolvedValueOnce(Array.from({ length: 20 }, (_, index) => event(index + 2)))
		.mockResolvedValueOnce([event(1)]);
	const wrapper = render();
	await flushPromises();
	mocks.intersect();
	await flushPromises();
	expect(mocks.list).toHaveBeenLastCalledWith({}, 'project', 'agent', { take: 20, skip: 20 });
	expect(wrapper.findAll('[data-test-id="agent-publish-timeline-entry"]')).toHaveLength(21);
	wrapper.unmount();
});

it('ignores a late failure after the panel is closed', async () => {
	let reject!: (reason: Error) => void;
	mocks.list.mockReturnValue(
		new Promise((_resolve, fail) => {
			reject = fail;
		}),
	);
	const wrapper = render();
	wrapper.unmount();
	reject(new Error('Failed'));
	await flushPromises();
	expect(mocks.showError).not.toHaveBeenCalled();
});
