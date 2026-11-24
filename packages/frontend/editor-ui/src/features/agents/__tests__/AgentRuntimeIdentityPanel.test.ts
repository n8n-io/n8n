import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { configure, fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeIdentityStatus } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CONFIRM } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import AgentRuntimeIdentityPanel from '../components/AgentRuntimeIdentityPanel.vue';

configure({ testIdAttribute: 'data-testid' });

const getAgentRuntimeIdentity = vi.hoisted(() => vi.fn());
const updateAgentRuntimeIdentity = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());

vi.mock('../composables/useAgentApi', () => ({
	getAgentRuntimeIdentity,
	updateAgentRuntimeIdentity,
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

const status = (overrides: Partial<AgentRuntimeIdentityStatus> = {}) => ({
	available: true,
	actsAsServiceAccount: true,
	disabled: false,
	...overrides,
});

const renderComponent = createComponentRenderer(AgentRuntimeIdentityPanel, {
	props: { projectId: 'project-1', agentId: 'agent-1' },
});

function setProjectScopes(scopes: string[]) {
	const projectsStore = useProjectsStore();
	projectsStore.myProjects = [
		{ id: 'project-1', name: 'Team', type: 'team', role: 'project:admin', scopes },
	] as never;
}

describe('AgentRuntimeIdentityPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
	});

	it('stays hidden when runtime identity is off', async () => {
		getAgentRuntimeIdentity.mockResolvedValue(status({ available: false }));

		const { queryByTestId } = renderComponent();
		await flushPromises();

		expect(queryByTestId('agent-runtime-identity-panel')).not.toBeInTheDocument();
	});

	it('lets a project admin disable the agent after a confirmation', async () => {
		setProjectScopes(['project:manageMembers']);
		getAgentRuntimeIdentity.mockResolvedValue(status());
		updateAgentRuntimeIdentity.mockResolvedValue(status({ disabled: true }));
		confirm.mockResolvedValue(MODAL_CONFIRM);

		const { getByTestId, findByTestId } = renderComponent();
		await flushPromises();
		await fireEvent.click(getByTestId('agent-disable-toggle'));
		await flushPromises();

		expect(confirm).toHaveBeenCalled();
		expect(updateAgentRuntimeIdentity).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agent-1',
			true,
		);
		expect(await findByTestId('agent-disabled-callout')).toBeInTheDocument();
	});

	it('does not let a project member change the status', async () => {
		setProjectScopes(['agent:update']);
		getAgentRuntimeIdentity.mockResolvedValue(status());

		const { getByTestId } = renderComponent();
		await flushPromises();
		await fireEvent.click(getByTestId('agent-disable-toggle'));
		await flushPromises();

		expect(updateAgentRuntimeIdentity).not.toHaveBeenCalled();
	});

	it('says that an agent in a personal project keeps the access of its owner', async () => {
		getAgentRuntimeIdentity.mockResolvedValue(status({ actsAsServiceAccount: false }));

		const { findByTestId } = renderComponent();

		expect(await findByTestId('agent-runtime-identity-personal-hint')).toBeInTheDocument();
	});
});
