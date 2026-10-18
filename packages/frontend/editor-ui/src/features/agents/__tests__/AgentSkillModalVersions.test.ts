import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import type { SkillDetail, SkillVersionSummary } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import AgentSkillModal, { type AgentSkillModalData } from '../components/AgentSkillModal.vue';
import type { AgentSkill } from '../types';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

const { getHubSkill, getSkillVersions, getSkillVersion, updateSkillVersionLabel } = vi.hoisted(
	() => ({
		getHubSkill: vi.fn(),
		getSkillVersions: vi.fn(),
		getSkillVersion: vi.fn(),
		updateSkillVersionLabel: vi.fn(),
	}),
);
vi.mock('../composables/useAgentApi', () => ({
	getHubSkill,
	listAttachableSkills: vi.fn(async () => []),
}));
vi.mock('@/features/settings/context/skills.api', () => ({
	getSkillVersions,
	getSkillVersion,
	updateSkillVersionLabel,
}));

const { showMessage, showError } = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ resolve: vi.fn(() => ({ href: '/' })) }),
}));

vi.mock('v-code-diff', () => ({
	CodeDiff: {
		name: 'CodeDiff',
		props: ['oldString', 'newString'],
		template: '<div data-testid="code-diff" :data-old="oldString" :data-new="newString" />',
	},
}));

// A plain list of the menu items, so a test can pick one without the popper.
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<object>()),
	N8nActionDropdown: {
		name: 'N8nActionDropdown',
		props: ['items'],
		emits: ['select'],
		template: `
			<div>
				<slot name="activator" />
				<button
					v-for="item in items"
					:key="item.id"
					:data-testid="'skill-version-menu-' + item.id"
					:disabled="item.disabled"
					@click="$emit('select', item.id)"
				>{{ item.label }}</button>
			</div>
		`,
	},
}));

const MODAL_NAME = 'AgentSkillModal';

const LATEST: AgentSkill = {
	name: 'Refund policy',
	description: 'How to answer refund requests',
	instructions: 'Refunds within 14 days.\nAsk for the order number.',
};
const OLDER: AgentSkill = { ...LATEST, instructions: 'Refunds within 14 days.' };

function summary(versionNumber: number, label: string | null = null): SkillVersionSummary {
	return {
		id: `id-${versionNumber}`,
		version: versionNumber,
		label,
		createdBy: { id: 'u1', email: 'ada@acme.test', firstName: 'Ada', lastName: null },
		createdAt: '2026-10-01T00:00:00.000Z',
	};
}

function detail(overrides: Partial<SkillDetail> = {}): SkillDetail {
	return {
		id: 's1',
		name: LATEST.name,
		description: LATEST.description,
		scope: 'instance',
		projectId: null,
		projectName: null,
		projectType: null,
		agentId: null,
		agentName: null,
		source: 'ui',
		createdBy: null,
		latestVersion: 2,
		latestVersionLabel: null,
		latestVersionSavedBy: null,
		usedByAgents: 0,
		canEdit: true,
		canDelete: true,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		skill: LATEST,
		skillHash: 'hash-2',
		usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
		...overrides,
	};
}

function renderModal(data: Partial<AgentSkillModalData> = {}) {
	const renderComponent = createComponentRenderer(AgentSkillModal, {
		global: {
			stubs: {
				AgentModal: AgentModalTestStub,
				MarkdownEditor: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: `<textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
				},
			},
		},
	});
	return renderComponent({
		props: {
			modalName: MODAL_NAME,
			data: {
				skill: LATEST,
				skillId: 's1',
				versioned: true,
				existingSkillNames: [],
				onConfirm: vi.fn(),
				...data,
			},
		},
	});
}

/** The editor unlocks once the saved skill has loaded. */
async function editable(container: Element): Promise<HTMLInputElement> {
	await waitFor(() => {
		expect(container.querySelector('[data-testid="skill-version-status"]')).not.toBeNull();
		titleInput(container);
	});
	return titleInput(container);
}

/** Each timeline row selects its version through one button. */
function selectButton(row: HTMLElement | undefined): HTMLElement {
	const button = row?.querySelector<HTMLElement>('[data-testid="skill-version-row-select"]');
	if (!button) throw new Error('Expected a select button in the timeline row');
	return button;
}

function titleInput(container: Element): HTMLInputElement {
	const input = container.querySelector<HTMLInputElement>(
		'[data-testid="agent-modal-title-input"]',
	);
	if (!input) throw new Error('Expected an editable skill title');
	return input;
}

describe('AgentSkillModal with versions', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
		getHubSkill.mockResolvedValue(detail());
		getSkillVersions.mockResolvedValue([summary(2), summary(1, 'First draft')]);
		getSkillVersion.mockImplementation(async (_context: unknown, _id: string, version: number) => ({
			...summary(version),
			skill: version === 1 ? OLDER : LATEST,
		}));
	});

	it('keeps the version UI out of a skill without `versioned`', async () => {
		const { queryByTestId, getByTestId } = renderModal({ versioned: false });

		expect(queryByTestId('skill-version-save')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-create-save')).toBeInTheDocument();
	});

	it('shows the saved version and a disabled Save until the user edits', async () => {
		const { getByTestId, findByTestId, queryByTestId, container } = renderModal();

		await editable(container);
		expect(await findByTestId('skill-version-status')).toHaveTextContent(/^v2$/);
		expect(getByTestId('skill-version-save')).toBeDisabled();
		expect(getByTestId('skill-version-save')).toHaveTextContent('Saved');
		expect(queryByTestId('skill-version-dirty')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();

		await fireEvent.update(titleInput(container), 'Refunds');

		expect(getByTestId('skill-version-save')).toBeEnabled();
		expect(getByTestId('skill-version-dirty')).toBeInTheDocument();
		expect(getByTestId('skill-version-save')).toHaveTextContent('Save');
	});

	it('keeps Save and the timeline out of the menu, as the header has buttons for them', async () => {
		const { queryByTestId, getByTestId, container } = renderModal();
		await editable(container);

		expect(queryByTestId('skill-version-menu-save')).not.toBeInTheDocument();
		expect(queryByTestId('skill-version-menu-timeline')).not.toBeInTheDocument();
		expect(getByTestId('skill-version-menu-review')).toBeInTheDocument();
		expect(getByTestId('skill-version-menu-name')).toBeInTheDocument();
	});

	it('closes rather than cancels an existing skill from the footer', async () => {
		const { getByTestId, container } = renderModal();
		await editable(container);

		expect(getByTestId('agent-modal-cancel')).toHaveTextContent('Close');
	});

	it('opens the timeline from the header icon next to Save', async () => {
		const { getByTestId, findAllByTestId, container } = renderModal();

		await editable(container);
		expect(getByTestId('skill-version-save')).toBeInTheDocument();
		const toggle = getByTestId('skill-version-timeline-toggle');
		expect(toggle).toHaveAttribute('aria-label', 'View timeline');
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await fireEvent.click(toggle);

		expect(await findAllByTestId('skill-version-row')).not.toHaveLength(0);
		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		expect(toggle).toHaveAttribute('aria-label', 'Hide timeline');
	});

	it('adds the version name to the status', async () => {
		getSkillVersions.mockResolvedValue([summary(2, 'EU rules'), summary(1)]);
		const { getByTestId } = renderModal({ initialVersionView: 'timeline' });

		await waitFor(() =>
			expect(getByTestId('skill-version-status')).toHaveTextContent(/^v2 · EU rules$/),
		);
	});

	it('saves with the base hash, stays open and reloads the versions', async () => {
		const onConfirm = vi.fn(async () => ({ saved: true as const, created: true }));
		const { getByTestId, container } = renderModal({ onConfirm });
		await editable(container);

		getHubSkill.mockResolvedValue(
			detail({ latestVersion: 3, skill: { ...LATEST, name: 'Refunds' }, skillHash: 'hash-3' }),
		);
		getSkillVersions.mockResolvedValue([summary(3), summary(2), summary(1)]);
		await fireEvent.update(titleInput(container), 'Refunds');
		await fireEvent.click(getByTestId('skill-version-save'));

		expect(onConfirm).toHaveBeenCalledWith({
			id: 's1',
			skill: { ...LATEST, name: 'Refunds' },
			baseSkillHash: 'hash-2',
		});
		await waitFor(() => expect(getByTestId('skill-version-status')).toHaveTextContent(/^v3$/));
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(getByTestId('skill-version-save')).toBeDisabled();
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Saved v3',
				message:
					'Drafts that use the latest version now use v3. Publish an agent to use it there too.',
			}),
		);
	});

	it('saves on Cmd+S', async () => {
		const onConfirm = vi.fn(async () => ({ saved: true as const, created: true }));
		const { container } = renderModal({ onConfirm });
		await editable(container);

		await fireEvent.update(titleInput(container), 'Refunds');
		await fireEvent.keyDown(document, { key: 's', metaKey: true });

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('saves with a name from the menu', async () => {
		const onConfirm = vi.fn(async () => ({ saved: true as const, created: true }));
		const { getByTestId, findByTestId, container } = renderModal({ onConfirm });
		await editable(container);

		await fireEvent.update(titleInput(container), 'Refunds');
		expect(getByTestId('skill-version-menu-name')).toHaveTextContent('Save with a name');
		await fireEvent.click(getByTestId('skill-version-menu-name'));
		await fireEvent.update(await findByTestId('skill-version-name-input'), 'EU rules');
		await fireEvent.click(getByTestId('skill-version-name-submit'));

		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ label: 'EU rules' }));
	});

	it('names the latest version when there are no edits', async () => {
		updateSkillVersionLabel.mockResolvedValue(summary(2, 'EU rules'));
		const { getByTestId, findByTestId, container } = renderModal();
		await editable(container);

		expect(getByTestId('skill-version-menu-name')).toHaveTextContent('Name version');
		await fireEvent.click(getByTestId('skill-version-menu-name'));
		await fireEvent.update(await findByTestId('skill-version-name-input'), 'EU rules');
		await fireEvent.click(getByTestId('skill-version-name-submit'));

		await waitFor(() =>
			expect(updateSkillVersionLabel).toHaveBeenCalledWith(expect.anything(), 's1', 2, 'EU rules'),
		);
	});

	it('opens a version from the timeline read-only and restores it as a new version', async () => {
		const onConfirm = vi.fn(async () => ({ saved: true as const, created: true }));
		const { getByTestId, findAllByTestId, queryByTestId } = renderModal({
			onConfirm,
			initialVersionView: 'timeline',
		});

		const rows = await findAllByTestId('skill-version-row');
		expect(rows.map((row) => row.getAttribute('data-version'))).toEqual(['2', '1']);
		await fireEvent.click(selectButton(rows[1]));

		await waitFor(() => expect(getByTestId('skill-version-viewing')).toBeInTheDocument());
		expect(getByTestId('skill-version-viewing')).toHaveTextContent(
			"You're viewing v1 · First draft. It's read-only.",
		);
		expect(queryByTestId('agent-modal-title-input')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('skill-version-restore'));

		// A restore has no automatic name.
		expect(onConfirm).toHaveBeenCalledWith({
			id: 's1',
			skill: OLDER,
			baseSkillHash: 'hash-2',
		});
	});

	it('goes back to the latest version from the latest row of the timeline', async () => {
		const { getByTestId, findAllByTestId, queryByTestId } = renderModal({
			initialVersionView: 'timeline',
		});
		const rows = await findAllByTestId('skill-version-row');
		await fireEvent.click(selectButton(rows[1]));
		await waitFor(() => expect(getByTestId('skill-version-viewing')).toBeInTheDocument());
		expect(queryByTestId('skill-version-viewing-back')).not.toBeInTheDocument();

		await fireEvent.click(selectButton(rows[0]));

		expect(queryByTestId('skill-version-viewing')).not.toBeInTheDocument();
	});

	it('shows the callout of a viewed version beside the timeline, not above it', async () => {
		const { getByTestId, findAllByTestId } = renderModal({ initialVersionView: 'timeline' });
		const rows = await findAllByTestId('skill-version-row');
		await fireEvent.click(selectButton(rows[1]));
		await waitFor(() => expect(getByTestId('skill-version-viewing')).toBeInTheDocument());

		// The callout's own column holds the editor only, not the timeline.
		const callout = getByTestId('skill-version-viewing');
		expect(callout.parentElement?.contains(getByTestId('skill-version-timeline'))).toBe(false);
	});

	it('compares the two newest versions when opened for compare', async () => {
		const { findByTestId } = renderModal({ initialVersionView: 'compare' });

		expect(await findByTestId('skill-version-compare')).toBeInTheDocument();
		expect(await findByTestId('skill-version-diff-stat')).toHaveTextContent('+1 −0');
	});

	it('reviews the unsaved edits against the latest version', async () => {
		const { getByTestId, findByTestId, container } = renderModal();
		await editable(container);
		expect(getByTestId('skill-version-menu-review')).toBeDisabled();

		await fireEvent.update(titleInput(container), 'Refunds');
		await fireEvent.click(getByTestId('skill-version-menu-review'));

		expect(await findByTestId('skill-version-diff-to')).toHaveTextContent('Your unsaved changes');
	});

	it('shows the timeline but no Save or Restore to a read-only user', async () => {
		getHubSkill.mockResolvedValue(detail({ canEdit: false }));
		const { getByTestId, findAllByTestId, queryByTestId } = renderModal({ readOnly: true });
		await waitFor(() => expect(getHubSkill).toHaveBeenCalled());

		expect(queryByTestId('skill-version-save')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('skill-version-timeline-toggle'));
		const rows = await findAllByTestId('skill-version-row');
		await fireEvent.click(selectButton(rows[1]));

		await waitFor(() => expect(getByTestId('skill-version-viewing')).toBeInTheDocument());
		expect(queryByTestId('skill-version-restore')).not.toBeInTheDocument();
		expect(getByTestId('skill-version-viewing-compare')).toBeInTheDocument();
	});

	describe('a draft pinned behind the latest version', () => {
		function renderPinned(onUseLatestVersion = vi.fn()) {
			return renderModal({
				skill: OLDER,
				hubSkillsEnabled: true,
				outdated: true,
				pinnedVersion: 1,
				initialVersionView: 'timeline',
				onUseLatestVersion,
			});
		}

		it('shows the pinned version read-only and selects it in the timeline', async () => {
			const { findAllByTestId, queryByTestId } = renderPinned();

			const rows = await findAllByTestId('skill-version-row');
			const selected = rows.find(
				(row) => selectButton(row).getAttribute('aria-current') === 'true',
			);
			expect(selected?.getAttribute('data-version')).toBe('1');
			expect(queryByTestId('skill-version-save')).not.toBeInTheDocument();
			expect(queryByTestId('skill-version-viewing')).not.toBeInTheDocument();
		});

		it('opens the latest version from the timeline and goes back to the pinned one', async () => {
			const { getByTestId, findAllByTestId, queryByTestId } = renderPinned();
			const rows = await findAllByTestId('skill-version-row');

			await fireEvent.click(selectButton(rows[0]));
			await waitFor(() => expect(getByTestId('skill-version-viewing')).toBeInTheDocument());
			expect(getByTestId('skill-version-viewing')).toHaveTextContent("You're viewing v2.");

			await fireEvent.click(selectButton(rows[1]));
			expect(queryByTestId('skill-version-viewing')).not.toBeInTheDocument();
		});

		it('says it once, in a warning callout with the actions', async () => {
			const { findByTestId, queryByTestId, getByTestId } = renderPinned();

			const callout = await findByTestId('skill-version-pinned');
			await waitFor(() =>
				expect(callout).toHaveTextContent('This agent uses v1. The latest version is v2.'),
			);
			expect(getByTestId('skill-version-pinned-see-changes')).toHaveTextContent('See changes');
			// No repeat in the header or the footer.
			expect(queryByTestId('skill-version-status')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-footer-hint')).not.toBeInTheDocument();
			expect(getByTestId('agent-modal-footer-actions').textContent).not.toContain('Follow latest');
		});

		it('opens the changes from the pinned version to the latest one', async () => {
			const { findByTestId, queryByTestId } = renderPinned();

			await fireEvent.click(await findByTestId('skill-version-pinned-see-changes'));

			expect(await findByTestId('skill-version-compare')).toBeInTheDocument();
			expect(await findByTestId('skill-version-diff-from')).toHaveTextContent('v1');
			expect(await findByTestId('skill-version-diff-to')).toHaveTextContent('v2');
			expect(queryByTestId('skill-version-pinned')).not.toBeInTheDocument();
		});

		it('follows the latest version from the callout', async () => {
			const onUseLatestVersion = vi.fn();
			const { findByTestId } = renderPinned(onUseLatestVersion);

			const useLatest = await findByTestId('agent-skill-use-latest');
			expect(useLatest).toHaveTextContent('Use latest');
			await fireEvent.click(useLatest);

			expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
			expect(onUseLatestVersion).toHaveBeenCalledWith('s1');
		});
	});
});
