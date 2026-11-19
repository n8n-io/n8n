import { waitAllPromises } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { ref } from 'vue';

import { useTaskBoardTeam } from './useTaskBoardTeam';
import { provideProjectScopes, withSetup } from '../../__tests__/fixtures';
import { useActiveTaskBoard } from '../../composables/useActiveTaskBoard';
import { addTaskBoardAgent, createAgent, fetchAgent, publishAgent } from '../../task-board.api';
import type { AgentFormValues, TaskBoardAgentDetail } from '../../task-board.types';

vi.mock('../../task-board.api');
vi.mock('../../composables/useActiveTaskBoard');

const boardRef = { projectId: 'p1', boardId: 'b1' };
const values: AgentFormValues = {
	name: 'QA',
	description: '',
	instructions: '',
	model: { model: 'anthropic/claude', credential: 'c1' },
	skillIds: [],
};
const agentDetail = (id: string) =>
	({ id, name: id, config: null, activeVersionId: null }) as TaskBoardAgentDetail;

function setup() {
	const settingsStore = useSettingsStore();
	settingsStore.settings = { ...settingsStore.settings, activeModules: ['agents'] };
	provideProjectScopes(['agent:create', 'agent:update', 'agent:publish']);
	const load = vi.fn();
	const refreshBoard = vi.fn();
	vi.mocked(useActiveTaskBoard).mockReturnValue({
		boardRef: () => boardRef,
		refreshBoard,
		assignees: { agents: ref([{ id: 'a1', name: 'Dev' }]), people: ref([]), load },
	} as unknown as ReturnType<typeof useActiveTaskBoard>);
	vi.mocked(fetchAgent).mockImplementation(async (_context, _projectId, id) => agentDetail(id));
	return { team: withSetup(() => useTaskBoardTeam()), load, refreshBoard };
}

describe('useTaskBoardTeam', () => {
	beforeEach(() => vi.resetAllMocks());

	it('shows the agents of the board', async () => {
		const { team } = setup();
		await waitAllPromises();

		expect(team.agents.value.map((agent) => agent.id)).toEqual(['a1']);
	});

	it('puts a new agent on the board and loads the board again', async () => {
		const { team, load, refreshBoard } = setup();
		vi.mocked(createAgent).mockResolvedValue(agentDetail('a2'));
		team.openAddDialog();

		await team.submitDialog(values);

		expect(addTaskBoardAgent).toHaveBeenCalledWith(expect.anything(), boardRef, 'a2');
		expect(publishAgent).toHaveBeenCalledWith(expect.anything(), 'p1', 'a2');
		expect(load).toHaveBeenCalled();
		expect(refreshBoard).toHaveBeenCalled();
		expect(team.dialogOpen.value).toBe(false);
	});

	it('keeps the dialog open when the agent cannot join the board', async () => {
		const { team } = setup();
		vi.mocked(createAgent).mockResolvedValue(agentDetail('a2'));
		vi.mocked(addTaskBoardAgent).mockRejectedValue(new Error('failed'));
		team.openAddDialog();

		await team.submitDialog(values);

		expect(publishAgent).not.toHaveBeenCalled();
		expect(team.dialogOpen.value).toBe(true);
	});
});
