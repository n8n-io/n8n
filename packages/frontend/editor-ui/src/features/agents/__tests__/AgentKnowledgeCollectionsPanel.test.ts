import { computed } from 'vue';
import { configure, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentKnowledgeCollectionDto } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';
import AgentKnowledgeCollectionsPanel from '@/features/agents/components/AgentKnowledgeCollectionsPanel.vue';

configure({ testIdAttribute: 'data-testid' });

const listAgentKnowledgeCollections = vi.fn();
const addAgentKnowledgeCollection = vi.fn();
const removeAgentKnowledgeCollection = vi.fn();
vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentKnowledgeCollections: async (...args: unknown[]) =>
		await listAgentKnowledgeCollections(...args),
	addAgentKnowledgeCollection: async (...args: unknown[]) =>
		await addAgentKnowledgeCollection(...args),
	removeAgentKnowledgeCollection: async (...args: unknown[]) =>
		await removeAgentKnowledgeCollection(...args),
}));
vi.mock('@/features/agents/composables/useAgentProjectBreadcrumb', () => ({
	useAgentProjectBreadcrumb: () => ({ projectName: computed(() => 'Darwin') }),
}));

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({
		resolve: ({ name, params }: { name: string; params?: Record<string, string> }) => ({
			href: params?.collectionId
				? `/projects/${params.projectId}/collections/${params.collectionId}`
				: `/${name}`,
		}),
	}),
}));
vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(',')}` : key,
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('@/features/agents/components/modals/AgentModal.vue', async () => ({
	default: (await import('./utils/AgentModalTestStub')).AgentModalTestStub,
}));
vi.mock('@/features/agents/components/AgentItemContextMenu.vue', () => ({
	default: {
		props: ['disabled', 'removeLabel'],
		emits: ['remove'],
		template: `<div><slot /><button data-testid="chip-menu-remove" :disabled="disabled" @click="$emit('remove')">{{ removeLabel }}</button></div>`,
	},
}));
vi.mock('@/features/shared/toolsConnection/ToolsConnectionModal.vue', () => ({
	default: {
		props: ['items', 'categories', 'categoryLabels', 'emptyMessage', 'noResultsMessage'],
		emits: ['connect', 'disconnect', 'update:searchQuery'],
		template: `
			<div>
				<input data-testid="picker-search" @input="$emit('update:searchQuery', $event.target.value)" />
				<span data-testid="picker-tab-label">{{ categoryLabels?.project }}</span>
				<p data-testid="picker-empty">{{ emptyMessage }}</p>
				<p data-testid="picker-no-results">{{ noResultsMessage }}</p>
				<div v-for="item in items" :key="item.id" data-testid="picker-row">
					<span>{{ item.title }}</span>
					<span>{{ item.description }}</span>
					<span>{{ item.summary }}</span>
					<button v-if="item.attached" :data-testid="'picker-remove-' + item.collectionId" @click="$emit('disconnect', item)" />
					<button v-else :data-testid="'picker-add-' + item.collectionId" @click="$emit('connect', item)" />
				</div>
			</div>
		`,
	},
}));

const renderPanel = createComponentRenderer(AgentKnowledgeCollectionsPanel, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
});

function collection(id: string, usedByAgent = false): AgentKnowledgeCollectionDto {
	return {
		id,
		name: `Collection ${id}`,
		description: `About ${id}`,
		fileCount: 3,
		usedByAgent,
	};
}

/** A request that stays open until the test settles it. */
function deferred() {
	let resolve!: (value: unknown) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}

async function render(props: { disabled?: boolean } = {}) {
	const result = renderPanel({ props, pinia: createTestingPinia() });
	await waitFor(() => expect(listAgentKnowledgeCollections).toHaveBeenCalled());
	await waitFor(() => expect(result.queryByTestId('agent-collections-add')).not.toBeNull());
	return result;
}

function chipNames(result: Awaited<ReturnType<typeof render>>) {
	return result.queryAllByTestId('agent-collections-chip').map((chip) => chip.textContent?.trim());
}

describe('AgentKnowledgeCollectionsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// The panel reads the list again after a change, so the mocks keep the server state.
		let server = [collection('a', true), collection('b')];
		const setOnServer = (id: string, usedByAgent: boolean) => {
			server = server.map((item) => (item.id === id ? { ...item, usedByAgent } : item));
			return { success: true };
		};
		listAgentKnowledgeCollections.mockImplementation(async () => server);
		addAgentKnowledgeCollection.mockImplementation(
			async (_context, _projectId, _agentId, id: string) => setOnServer(id, true),
		);
		removeAgentKnowledgeCollection.mockImplementation(
			async (_context, _projectId, _agentId, id: string) => setOnServer(id, false),
		);
	});

	it('shows only the added collections as pills', async () => {
		const result = await render();

		expect(listAgentKnowledgeCollections).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		await waitFor(() => expect(chipNames(result)).toEqual(['Collection a']));
	});

	it('offers Add collection when the agent has no collections', async () => {
		listAgentKnowledgeCollections.mockResolvedValue([collection('b')]);
		const result = await render();

		expect(chipNames(result)).toEqual([]);
		expect(result.getByTestId('agent-collections-add')).toHaveTextContent(
			'agents.builder.collections.add',
		);
	});

	it('lists every collection with its description in the picker, and adds one', async () => {
		const result = await render();
		await userEvent.click(result.getByTestId('agent-collections-add'));

		await waitFor(() =>
			expect(result.getAllByTestId('picker-row').map((row) => row.textContent?.trim())).toEqual([
				'Collection aAbout asettings.context.collections.fileCount 3',
				'Collection bAbout bsettings.context.collections.fileCount 3',
			]),
		);

		await userEvent.click(result.getByTestId('picker-add-b'));

		expect(addAgentKnowledgeCollection).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'b');
		expect(chipNames(result)).toEqual(['Collection a', 'Collection b']);
	});

	it('removes a collection from the picker', async () => {
		const result = await render();
		await userEvent.click(result.getByTestId('agent-collections-add'));

		await userEvent.click(await result.findByTestId('picker-remove-a'));

		expect(removeAgentKnowledgeCollection).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'a');
		expect(chipNames(result)).toEqual([]);
	});

	it('removes a collection from the pill menu', async () => {
		const result = await render();

		const remove = await result.findByTestId('chip-menu-remove');
		expect(remove).toHaveTextContent('agents.builder.collections.remove');
		await userEvent.click(remove);

		expect(removeAgentKnowledgeCollection).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'a');
		expect(chipNames(result)).toEqual([]);
	});

	it('puts the pill back and reports the error when a remove fails', async () => {
		removeAgentKnowledgeCollection.mockRejectedValue(new Error('nope'));
		const result = await render();

		await userEvent.click(await result.findByTestId('chip-menu-remove'));

		await waitFor(() => expect(chipNames(result)).toEqual(['Collection a']));
		expect(showError).toHaveBeenCalledWith(
			expect.any(Error),
			'agents.builder.collections.removeError',
		);
	});

	it('ignores a second click on a collection while its first request runs', async () => {
		const add = deferred();
		addAgentKnowledgeCollection.mockReturnValue(add.promise);
		const result = await render();
		await userEvent.click(result.getByTestId('agent-collections-add'));

		await userEvent.click(await result.findByTestId('picker-add-b'));
		await userEvent.click(await result.findByTestId('picker-remove-b'));
		listAgentKnowledgeCollections.mockResolvedValue([collection('a', true), collection('b', true)]);
		add.resolve({ success: true });

		await waitFor(() => expect(chipNames(result)).toEqual(['Collection a', 'Collection b']));
		expect(removeAgentKnowledgeCollection).not.toHaveBeenCalled();
	});

	it('drops a list read that overlaps a request, and reads the list again after it', async () => {
		const remove = deferred();
		removeAgentKnowledgeCollection.mockReturnValue(remove.promise);
		const result = await render();

		await userEvent.click(await result.findByTestId('chip-menu-remove'));
		// The picker reads the list while the remove still runs, and the server still has it.
		await userEvent.click(result.getByTestId('agent-collections-add'));
		await waitFor(() => expect(listAgentKnowledgeCollections).toHaveBeenCalledTimes(2));
		expect(chipNames(result)).toEqual([]);

		listAgentKnowledgeCollections.mockResolvedValue([collection('a'), collection('b')]);
		remove.resolve({ success: true });

		await waitFor(() => expect(listAgentKnowledgeCollections).toHaveBeenCalledTimes(3));
		expect(await result.findByTestId('picker-add-a')).toBeInTheDocument();
		expect(chipNames(result)).toEqual([]);
	});

	it('ignores a request from an earlier visit after a switch away and back to the agent', async () => {
		const oldRemove = deferred();
		removeAgentKnowledgeCollection.mockReturnValueOnce(oldRemove.promise);
		const result = await render();

		await userEvent.click(await result.findByTestId('chip-menu-remove'));
		await result.rerender({ agentId: 'agent-2' });
		await result.rerender({ agentId: 'agent-1' });
		await waitFor(() => expect(chipNames(result)).toEqual(['Collection a']));

		// The earlier request still runs, but the new visit can remove the collection.
		const newRemove = deferred();
		removeAgentKnowledgeCollection.mockReturnValueOnce(newRemove.promise);
		await userEvent.click(await result.findByTestId('chip-menu-remove'));
		expect(removeAgentKnowledgeCollection).toHaveBeenCalledTimes(2);

		oldRemove.reject(new Error('nope'));
		await userEvent.click(await result.findByTestId('agent-collections-add'));
		await userEvent.click(await result.findByTestId('picker-add-a'));

		// The new remove still runs, so the second click on the same collection waits for it.
		expect(addAgentKnowledgeCollection).not.toHaveBeenCalled();
		expect(showError).not.toHaveBeenCalled();
		expect(chipNames(result)).toEqual([]);
	});

	it('opens a pill in a new tab', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const result = await render();

		await userEvent.click(await result.findByTestId('agent-collections-chip'));

		expect(open).toHaveBeenCalledWith('/projects/project-1/collections/a', '_blank', 'noopener');
		open.mockRestore();
	});

	it('does not let a user who cannot edit the agent remove a pill', async () => {
		const result = await render({ disabled: true });

		expect(await result.findByTestId('chip-menu-remove')).toBeDisabled();
	});

	it('labels the project tab with the project name, and says when the project has no collections', async () => {
		listAgentKnowledgeCollections.mockResolvedValue([]);
		const result = await render();
		await userEvent.click(result.getByTestId('agent-collections-add'));

		expect(await result.findByTestId('picker-tab-label')).toHaveTextContent('Darwin');
		expect(result.getByTestId('picker-empty')).toHaveTextContent(
			'agents.builder.collections.picker.empty',
		);
	});

	it('names the search text in the no-match message', async () => {
		const result = await render();
		await userEvent.click(result.getByTestId('agent-collections-add'));

		await userEvent.type(await result.findByTestId('picker-search'), ' invoices ');

		expect(result.getByTestId('picker-no-results')).toHaveTextContent(
			'agents.builder.collections.picker.noResults invoices',
		);
	});

	it('opens Settings > Context > Collections in a new tab from Manage collections', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const result = await render();
		await userEvent.click(result.getByTestId('agent-collections-add'));

		await userEvent.click(await result.findByTestId('agent-collections-picker-manage'));

		expect(open).toHaveBeenCalledWith(
			`/${VIEWS.SETTINGS_CONTEXT_COLLECTIONS}`,
			'_blank',
			'noopener',
		);
		open.mockRestore();
	});
});
