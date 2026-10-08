import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, type PropType } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { IMenuItem } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';
import SimpleSidebarSections from '../SimpleSidebarSections.vue';
import { createTestRouter, stubLocalStorage } from './navigationFixtures';

// The Chats and Automations sections have their own tests. Here they only mark their place.
vi.mock('../AssistantChatsSection.vue', async () => {
	const vue = await import('vue');
	const ChatsStub = vue.defineComponent({
		setup: () => () => vue.h('section', { 'data-test-id': 'chats' }),
	});
	return { default: ChatsStub };
});
vi.mock('../AssistantAutomationsSection.vue', async () => {
	const vue = await import('vue');
	const AutomationsStub = vue.defineComponent({
		setup: () => () => vue.h('section', { 'data-test-id': 'automations' }),
	});
	return { default: AutomationsStub };
});

const OPEN_KEY = 'n8n:sidebar:workspace-open';

type WorkspaceItem = { item: IMenuItem; testId: string };

const page = (id: string, label: string): WorkspaceItem => ({
	item: { id, label, icon: 'user', route: { to: { name: VIEWS.HOMEPAGE } } },
	testId: `page-${id}`,
});

const PERSONAL = page('personal-1', 'Personal');
const SHARED = page('shared', 'Shared with you');

/** A parent that owns the Workspace state through v-model, as ProjectNavigation does. */
const Parent = defineComponent({
	props: {
		collapsed: { type: Boolean, default: false },
		items: { type: Array as PropType<WorkspaceItem[]>, default: () => [PERSONAL, SHARED] },
		nestedItemIds: { type: Array as PropType<string[]>, default: () => [] },
		activeTabId: { type: String, default: undefined },
	},
	setup(props) {
		const workspaceOpen = ref(false);
		return () => [
			h(SimpleSidebarSections, {
				collapsed: props.collapsed,
				items: props.items,
				nestedItemIds: props.nestedItemIds,
				activeTabId: props.activeTabId,
				workspaceOpen: workspaceOpen.value,
				'onUpdate:workspaceOpen': (value: boolean) => {
					workspaceOpen.value = value;
				},
			}),
			h('output', { 'data-test-id': 'parent-open' }, String(workspaceOpen.value)),
		];
	},
});

const renderSections = createComponentRenderer(Parent);
const storage = new Map<string, string>();

type ParentProps = {
	collapsed?: boolean;
	items?: WorkspaceItem[];
	nestedItemIds?: string[];
	activeTabId?: string;
};

function render(props: ParentProps = {}) {
	return renderSections({ props, global: { plugins: [createTestRouter()] } });
}

/** True when `first` comes before `second` in the document. */
function precedes(first: Element, second: Element) {
	return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('SimpleSidebarSections', () => {
	beforeEach(() => {
		createTestingPinia();
		storage.clear();
		stubLocalStorage(storage);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows Chats, then Automations, then a closed Workspace', () => {
		const { getByTestId, getByRole, queryByTestId } = render();

		const workspace = getByRole('button', { name: 'Workspace' });
		expect(workspace).toHaveAttribute('aria-expanded', 'false');
		expect(precedes(getByTestId('chats'), getByTestId('automations'))).toBe(true);
		expect(precedes(getByTestId('automations'), workspace)).toBe(true);
		expect(queryByTestId('page-personal-1')).not.toBeInTheDocument();
	});

	it('lists the pages in the given order when the user opens the Workspace', async () => {
		const { getByRole, getByTestId, queryByTestId } = render();
		const workspace = getByRole('button', { name: 'Workspace' });

		await userEvent.click(workspace);

		expect(getByTestId('page-personal-1')).toHaveTextContent('Personal');
		expect(precedes(workspace, getByTestId('page-personal-1'))).toBe(true);
		expect(precedes(getByTestId('page-personal-1'), getByTestId('page-shared'))).toBe(true);
		expect(getByTestId('parent-open')).toHaveTextContent('true');
		await waitFor(() => expect(storage.get(OPEN_KEY)).toBe('true'));

		await userEvent.click(workspace);

		expect(queryByTestId('page-personal-1')).not.toBeInTheDocument();
		expect(getByTestId('parent-open')).toHaveTextContent('false');
	});

	it('shows the Workspace for the rows below it alone, without an empty page list', async () => {
		const { getByRole, getByTestId, queryAllByRole } = render({
			items: [],
			nestedItemIds: ['project-1'],
		});

		await userEvent.click(getByRole('button', { name: 'Workspace' }));

		expect(getByTestId('parent-open')).toHaveTextContent('true');
		expect(queryAllByRole('menuitem')).toHaveLength(0);
	});

	it('shows no Workspace when it would hold nothing', () => {
		const { getByTestId, queryByRole } = render({ items: [], nestedItemIds: [] });

		expect(getByTestId('chats')).toBeInTheDocument();
		expect(queryByRole('button', { name: 'Workspace' })).not.toBeInTheDocument();
		expect(getByTestId('parent-open')).toHaveTextContent('false');
	});

	describe('for the current page', () => {
		it.each([
			['a page of the Workspace', 'shared'],
			['a row below the pages', 'project-1'],
		])('opens the Workspace on %s, without storing it', async (_case, activeTabId) => {
			const { getByRole, getByTestId, findByTestId } = render({
				nestedItemIds: ['project-1'],
				activeTabId,
			});

			expect(await findByTestId('page-shared')).toBeInTheDocument();
			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true');
			expect(getByTestId('parent-open')).toHaveTextContent('true');
			expect(storage.has(OPEN_KEY)).toBe(false);
		});

		it.each([
			['a page outside the Workspace', 'home'],
			['no sidebar page', undefined],
		])('keeps the Workspace closed on %s', (_case, activeTabId) => {
			const { getByRole, queryByTestId } = render({ nestedItemIds: ['project-1'], activeTabId });

			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'false');
			expect(queryByTestId('page-shared')).not.toBeInTheDocument();
		});

		it('opens the Workspace when the user goes to one of its pages', async () => {
			const { getByRole, getByTestId, rerender } = render({ activeTabId: 'home' });

			await rerender({ activeTabId: 'personal-1' });

			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true');
			expect(getByTestId('page-personal-1')).toBeInTheDocument();
		});
	});

	it('shows the pages as icons in the collapsed sidebar', async () => {
		const { getByRole, getByTestId } = render({ collapsed: true });

		await userEvent.click(getByRole('button', { name: 'Workspace' }));

		expect(getByTestId('page-personal-1')).toBeInTheDocument();
		expect(getByTestId('page-shared')).toBeInTheDocument();
	});
});
