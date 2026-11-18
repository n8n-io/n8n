import type { TaskBoardTemplateKey } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

/** Route names. A module owns its names; `assertUniqueRouteNames` guards them. */
export const TASK_BOARDS_VIEW = 'TaskBoardsView';
export const PROJECT_TASK_BOARDS_VIEW = 'ProjectTaskBoardsView';
/** The board itself, which the sidebar calls "Issues". */
export const TASK_BOARD_VIEW = 'TaskBoardView';
export const TASK_BOARD_INBOX_VIEW = 'TaskBoardInboxView';
export const TASK_BOARD_TEAM_VIEW = 'TaskBoardTeamView';
export const TASK_BOARD_SETTINGS_VIEW = 'TaskBoardSettingsView';

/** The pages of one board. A switch to another board keeps the page. */
export const TASK_BOARD_PAGE_VIEWS = [
	TASK_BOARD_VIEW,
	TASK_BOARD_INBOX_VIEW,
	TASK_BOARD_TEAM_VIEW,
	TASK_BOARD_SETTINGS_VIEW,
];

/** Holds the id of the board that the user opened last. */
export const LAST_BOARD_STORAGE_KEY = 'N8N_TASK_BOARD_LAST_BOARD';

/** The value of the "New board" entry of the board select. */
export const NEW_BOARD_VALUE = 'new-board';

/** The query parameter that holds the task open in the side panel. */
export const TASK_QUERY_PARAM = 'task';

/** The drag data type of a task card. A column accepts only a drag that carries it. */
export const TASK_DRAG_TYPE = 'application/x-n8n-task-board-task';

/** The board and the open task reload at this interval while they are on screen. */
export const TASK_BOARD_POLL_INTERVAL_MS = 5000;

/** The value of the "Unassigned" option. The select does not accept an empty value. */
export const UNASSIGNED_VALUE = 'unassigned';

/** The agents list endpoint pages its results. One page covers the agents of a demo project. */
export const AGENTS_PAGE_LIMIT = 250;

export type TaskBoardTemplateOption = {
	key: TaskBoardTemplateKey;
	icon: IconName;
};

/** Board templates the "New board" dialog offers. The i18n keys derive from `key`. */
export const TASK_BOARD_TEMPLATES: TaskBoardTemplateOption[] = [{ key: 'agent-dev', icon: 'bot' }];
