import type { SkillDetail } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import InstanceAiSkillPreview from '../components/InstanceAiSkillPreview.vue';

const detail: SkillDetail = {
	id: 'skill-1',
	name: 'Brand voice',
	description: 'Write in the brand voice',
	scope: 'instance',
	projectId: null,
	projectName: null,
	projectType: null,
	source: 'assistant',
	createdBy: null,
	latestVersion: 2,
	usedByAgents: 0,
	availableToAssistant: true,
	availableToMCP: false,
	canEdit: true,
	canDelete: true,
	canStopSyncing: false,
	syncState: null,
	canCheckForUpdates: false,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-02T00:00:00.000Z',
	skill: {
		name: 'Brand voice',
		description: 'Write in the brand voice',
		instructions: 'Be kind.',
		references: [{ path: 'references/tone.md', content: 'Warm and short.' }],
	},
	skillHash: 'hash-2',
	usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
	syncedFrom: null,
};

/** The reused Skills Hub components use `data-testid`, which `getByTestId` does not read. */
function byTestId(container: Element, testId: string): Element | null {
	return container.querySelector(`[data-testid="${testId}"]`);
}

const renderComponent = createComponentRenderer(InstanceAiSkillPreview, {
	props: { skillId: 'skill-1' },
});

describe('InstanceAiSkillPreview', () => {
	function setup() {
		const pinia = createTestingPinia();
		const store = useSkillsStore();
		vi.mocked(store.fetchSkill).mockResolvedValue(detail);
		return { pinia, store };
	}

	it('shows the skill with the Skills Hub viewer', async () => {
		const { pinia, store } = setup();
		const { container, getByText } = renderComponent({ pinia });

		await waitFor(() => expect(byTestId(container, 'agent-skill-viewer')).toBeInTheDocument());

		expect(store.fetchSkill).toHaveBeenCalledWith('skill-1');
		expect(getByText('Brand voice')).toBeInTheDocument();
		expect(byTestId(container, 'agent-skill-file-nav')).toBeInTheDocument();
		expect(byTestId(container, 'agent-skill-instructions-text')).toHaveTextContent('Be kind.');
	});

	it('reloads the skill when the refresh key changes and keeps the open reference', async () => {
		const { pinia, store } = setup();
		const { container, rerender } = renderComponent({ pinia });
		await waitFor(() => expect(byTestId(container, 'agent-skill-viewer')).toBeInTheDocument());

		await userEvent.click(
			byTestId(container, 'agent-skill-reference-nav-item-references-tone-md') as Element,
		);
		expect(byTestId(container, 'agent-skill-reference-text')).toHaveTextContent('Warm and short.');

		vi.mocked(store.fetchSkill).mockResolvedValue({
			...detail,
			skill: {
				...detail.skill,
				references: [{ path: 'references/tone.md', content: 'Warm and very short.' }],
			},
		});
		await rerender({ refreshKey: 1 });

		await waitFor(() =>
			expect(byTestId(container, 'agent-skill-reference-text')).toHaveTextContent(
				'Warm and very short.',
			),
		);
		expect(store.fetchSkill).toHaveBeenCalledTimes(2);
	});

	it('opens the skill in the Skills Hub', async () => {
		const { pinia } = setup();
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { container, getByTestId } = renderComponent({ pinia });
		await waitFor(() => expect(byTestId(container, 'agent-skill-viewer')).toBeInTheDocument());

		await userEvent.click(getByTestId('instance-ai-skill-preview-open'));

		expect(open).toHaveBeenCalledWith(
			'/settings/context/skills?skillId=skill-1',
			'_blank',
			'noopener',
		);
	});

	it('shows an error when the skill cannot load', async () => {
		const { pinia, store } = setup();
		vi.mocked(store.fetchSkill).mockRejectedValue(new Error('Not found'));
		const { getByText } = renderComponent({ pinia });

		await waitFor(() => expect(getByText('Could not load the skill')).toBeInTheDocument());
	});
});
