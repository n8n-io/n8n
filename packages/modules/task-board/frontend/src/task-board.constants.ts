import type { TaskBoardSeverity, TaskBoardTemplateKey } from '@n8n/api-types';
import type { BadgeVariant, IconName } from '@n8n/design-system';

/** Route names. A module owns its names; `assertUniqueRouteNames` guards them. */
export const TASK_BOARDS_VIEW = 'TaskBoardsView';
export const PROJECT_TASK_BOARDS_VIEW = 'ProjectTaskBoardsView';
/** The board itself, which the sidebar calls "Issues". */
export const TASK_BOARD_VIEW = 'TaskBoardView';
export const TASK_BOARD_INBOX_VIEW = 'TaskBoardInboxView';
export const TASK_BOARD_TEAM_VIEW = 'TaskBoardTeamView';
export const TASK_BOARD_SETTINGS_VIEW = 'TaskBoardSettingsView';
/** One task on its own page, below its board. */
export const TASK_BOARD_TASK_VIEW = 'TaskBoardTaskView';

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

/** The value of the "No severity" option. The select does not accept an empty value. */
export const NO_SEVERITY_VALUE = 'none';

/** The badge color of each severity, from calm to loud. */
export const SEVERITY_BADGE_VARIANTS: Record<TaskBoardSeverity, BadgeVariant> = {
	low: 'subtle',
	medium: 'info',
	high: 'warning',
	critical: 'danger',
};

/** A card shows this many tags. A counter stands for the rest. */
export const CARD_TAG_LIMIT = 3;

/** The tags input offers this many tags of the board. */
export const TAG_SUGGESTION_LIMIT = 8;

/** The agents list endpoint pages its results. One page covers the agents of a demo project. */
export const AGENTS_PAGE_LIMIT = 250;

export type TaskBoardTemplateOption = {
	key: TaskBoardTemplateKey;
	icon: IconName;
};

/** Board templates the "New board" dialog offers. The i18n keys derive from `key`. */
export const TASK_BOARD_TEMPLATES: TaskBoardTemplateOption[] = [{ key: 'agent-dev', icon: 'bot' }];

export type UpcomingTaskBoardTemplateKey = 'customer-support' | 'content-pipeline';

/** Templates that the dialog shows as "Coming soon". The backend does not know them yet. */
export const UPCOMING_TASK_BOARD_TEMPLATES: Array<{
	key: UpcomingTaskBoardTemplateKey;
	icon: IconName;
}> = [
	{ key: 'customer-support', icon: 'life-buoy' },
	{ key: 'content-pipeline', icon: 'file-text' },
];
