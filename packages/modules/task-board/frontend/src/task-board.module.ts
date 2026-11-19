import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { i18n } from '@n8n/i18n';

import {
	PROJECT_TASK_BOARDS_VIEW,
	TASK_BOARD_INBOX_VIEW,
	TASK_BOARD_SETTINGS_VIEW,
	TASK_BOARD_TASK_VIEW,
	TASK_BOARD_TEAM_VIEW,
	TASK_BOARD_VIEW,
	TASK_BOARDS_VIEW,
} from './task-board.constants';

const TasksShellView = async () => await import('./views/TasksShellView/TasksShellView.vue');
const TaskBoardView = async () => await import('./views/TaskBoardView/TaskBoardView.vue');
const TaskView = async () => await import('./views/TaskView/TaskView.vue');
const TaskInboxView = async () => await import('./views/TaskInboxView/TaskInboxView.vue');
const TaskTeamView = async () => await import('./views/TaskTeamView/TaskTeamView.vue');
const TaskBoardSettingsView = async () =>
	await import('./views/TaskBoardSettingsView/TaskBoardSettingsView.vue');

// 'custom' runs the module availability check: the routes resolve only when the backend
// module is on (`N8N_ENABLED_MODULES=task-board`).
const middleware = (): Array<'authenticated' | 'custom'> => ['authenticated', 'custom'];

// The Tasks area renders its own sidebar. 'auth' is the shell layout that has no sidebar.
const shellMeta = () => ({ layout: 'auth', middleware: middleware() });

export const TaskBoardModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'task-board',
	name: 'Task Board',
	description: 'Boards of tasks that people and agents own. Workflows run the automation.',
	icon: 'list-checks',
	routes: [
		// The two routes without a board open the board that the user opened last.
		{
			name: TASK_BOARDS_VIEW,
			path: '/home/tasks',
			component: TasksShellView,
			meta: shellMeta(),
		},
		{
			name: PROJECT_TASK_BOARDS_VIEW,
			path: 'tasks',
			component: TasksShellView,
			meta: { projectRoute: true, ...shellMeta() },
		},
		{
			path: 'tasks/:boardId',
			component: TasksShellView,
			meta: { projectRoute: true, ...shellMeta() },
			children: [
				{ name: TASK_BOARD_VIEW, path: '', component: TaskBoardView },
				{ name: TASK_BOARD_TASK_VIEW, path: 'task/:taskId', component: TaskView },
				{ name: TASK_BOARD_INBOX_VIEW, path: 'inbox', component: TaskInboxView },
				{ name: TASK_BOARD_TEAM_VIEW, path: 'team', component: TaskTeamView },
				{ name: TASK_BOARD_SETTINGS_VIEW, path: 'settings', component: TaskBoardSettingsView },
			],
		},
	],
	projectTabs: {
		overview: [
			{
				// A getter: the label is read when the tab renders, after the locale loads.
				get label() {
					return i18n.baseText('taskBoard.tab');
				},
				value: TASK_BOARDS_VIEW,
				insertAfter: VIEWS.WORKFLOWS,
				to: { name: TASK_BOARDS_VIEW },
			},
		],
		project: [
			{
				get label() {
					return i18n.baseText('taskBoard.tab');
				},
				value: PROJECT_TASK_BOARDS_VIEW,
				insertAfter: VIEWS.PROJECTS_WORKFLOWS,
				dynamicRoute: { name: PROJECT_TASK_BOARDS_VIEW, includeProjectId: true },
			},
		],
	},
});
