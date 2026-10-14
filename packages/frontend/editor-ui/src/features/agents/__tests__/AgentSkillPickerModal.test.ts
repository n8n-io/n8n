import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { configure, fireEvent, waitFor, within } from '@testing-library/vue';
import type { SkillListItem } from '@n8n/api-types';

import AgentSkillPickerModal, {
	type AgentSkillPickerModalData,
} from '../components/AgentSkillPickerModal.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

const { getSkills } = vi.hoisted(() => ({ getSkills: vi.fn() }));
vi.mock('@/features/settings/context/skills.api', () => ({ getSkills }));

const MODAL_NAME = 'agentSkillPickerModal';

function skill(id: string, name: string, scope: SkillListItem['scope']): SkillListItem {
	return {
		id,
		name,
		description: `${name} description`,
		scope,
		projectId: null,
		projectName: null,
		agentId: null,
		agentName: null,
		source: 'ui',
		latestVersion: 1,
		usedByAgents: 0,
		canEdit: true,
		canDelete: true,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
	};
}

const SKILLS = [
	skill('s1', 'research-search', 'project'),
	skill('s2', 'study-setup', 'project'),
	skill('s3', 'source-interpretation', 'agent'),
	skill('s4', 'code-review', 'instance'),
];

const renderComponent = createComponentRenderer(AgentSkillPickerModal, {
	global: { stubs: { AgentModal: AgentModalTestStub } },
});

function renderPicker(overrides: Partial<AgentSkillPickerModalData> = {}) {
	const attached = ref<string[]>(['s1']);
	const data: AgentSkillPickerModalData = {
		agentId: 'agent-1',
		projectLabel: 'Darwin',
		attachedIds: () => attached.value,
		onAttach: vi.fn(async (item: SkillListItem) => {
			attached.value = [...attached.value, item.id];
			return true;
		}),
		onDetach: vi.fn((id: string) => {
			attached.value = attached.value.filter((candidate) => candidate !== id);
		}),
		onCreate: vi.fn(),
		onManage: vi.fn(),
		...overrides,
	};
	return { ...renderComponent({ props: { modalName: MODAL_NAME, data } }), data };
}

const rowFor = (rows: HTMLElement[], name: string) => {
	const row = rows.find((candidate) => candidate.textContent?.includes(name));
	if (!row) throw new Error(`No row for ${name}`);
	return row;
};

describe('AgentSkillPickerModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		const uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
		getSkills.mockResolvedValue({ count: SKILLS.length, data: SKILLS });
	});

	it('lists only what the agent may attach, from the attachableTo query', async () => {
		const { findAllByTestId } = renderPicker();

		expect(await findAllByTestId('agent-skill-picker-row')).toHaveLength(4);
		expect(getSkills).toHaveBeenCalledWith(expect.anything(), { attachableTo: 'agent-1' });
	});

	it('counts the skills in each tab and names the project tab', async () => {
		const { findAllByTestId, getByTestId } = renderPicker();
		await findAllByTestId('agent-skill-picker-row');

		const tabs = getByTestId('agent-skill-picker-tabs');
		expect(tabs).toHaveTextContent('All (4)');
		expect(tabs).toHaveTextContent('Darwin (2)');
		expect(tabs).toHaveTextContent('This agent (1)');
		expect(tabs).toHaveTextContent('Global (1)');
	});

	it('filters by search', async () => {
		const { findAllByTestId, getByTestId, getAllByTestId } = renderPicker();
		await findAllByTestId('agent-skill-picker-row');

		await fireEvent.update(getByTestId('agent-skill-picker-search'), 'code');

		expect(getAllByTestId('agent-skill-picker-row')).toHaveLength(1);
		expect(getByTestId('agent-skill-picker-tabs')).toHaveTextContent('All (1)');
	});

	it('marks attached skills and attaches or detaches with the toggle', async () => {
		const { findAllByTestId, data } = renderPicker();
		const rows = await findAllByTestId('agent-skill-picker-row');

		expect(rowFor(rows, 'research-search')).toHaveTextContent('Attached');
		expect(rowFor(rows, 'code-review')).toHaveTextContent('Detached');

		await fireEvent.click(
			within(rowFor(rows, 'code-review')).getByTestId('agent-skill-picker-toggle'),
		);
		await waitFor(() => expect(data.onAttach).toHaveBeenCalledWith(SKILLS[3]));

		await fireEvent.click(
			within(rowFor(rows, 'research-search')).getByTestId('agent-skill-picker-toggle'),
		);
		expect(data.onDetach).toHaveBeenCalledWith('s1');
	});

	it('hands off to create and to Settings, and closes', async () => {
		const { getByTestId, data } = renderPicker();
		const uiStore = mockedStore(useUIStore);

		await fireEvent.click(getByTestId('agent-skill-picker-create'));
		expect(data.onCreate).toHaveBeenCalled();

		await fireEvent.click(getByTestId('agent-skill-picker-manage'));
		expect(data.onManage).toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('says when the agent has nothing to attach', async () => {
		getSkills.mockResolvedValue({ count: 0, data: [] });
		const { findByTestId } = renderPicker();

		expect(await findByTestId('agent-skill-picker-empty')).toHaveTextContent(
			'No skills to attach yet',
		);
	});
});
