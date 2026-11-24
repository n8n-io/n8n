import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import ProjectAgentAccessSection from './ProjectAgentAccessSection.vue';

const api = vi.hoisted(() => ({
	getProjectAgentAccess: vi.fn(),
	getProjectAgentAccessCandidates: vi.fn(),
	addProjectAgentAccess: vi.fn(),
	removeProjectAgentAccess: vi.fn(),
}));

vi.mock('../projects.api', () => api);

const ownAgent = {
	serviceAccountId: 'account-own',
	name: 'Support Agent',
	homeProject: { id: 'project-1', name: 'Support' },
};
const otherAgent = {
	serviceAccountId: 'account-other',
	name: 'Sales Agent',
	homeProject: { id: 'project-2', name: 'Sales' },
};

const renderComponent = createComponentRenderer(ProjectAgentAccessSection);

describe('ProjectAgentAccessSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		api.getProjectAgentAccessCandidates.mockResolvedValue([]);
	});

	it('lists the agents and lets an admin remove only an agent of another project', async () => {
		api.getProjectAgentAccess.mockResolvedValue([ownAgent, otherAgent]);

		const { getAllByTestId, getByText } = renderComponent({
			props: { projectId: 'project-1', canManage: true },
		});
		await flushPromises();

		expect(getAllByTestId('project-agent-access-row')).toHaveLength(2);
		expect(getByText('Agent in Sales')).toBeInTheDocument();
		const removeButtons = getAllByTestId('project-agent-access-remove');
		expect(removeButtons).toHaveLength(1);

		api.getProjectAgentAccess.mockResolvedValue([ownAgent]);
		await fireEvent.click(removeButtons[0]);
		await flushPromises();

		expect(api.removeProjectAgentAccess).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'account-other',
		);
		expect(getAllByTestId('project-agent-access-row')).toHaveLength(1);
	});

	it('shows no picker and no remove action to a member', async () => {
		api.getProjectAgentAccess.mockResolvedValue([ownAgent, otherAgent]);

		const { queryByTestId, queryAllByTestId } = renderComponent({
			props: { projectId: 'project-1', canManage: false },
		});
		await flushPromises();

		expect(queryByTestId('project-agent-access-select')).not.toBeInTheDocument();
		expect(queryAllByTestId('project-agent-access-remove')).toHaveLength(0);
		expect(api.getProjectAgentAccessCandidates).not.toHaveBeenCalled();
	});
});
