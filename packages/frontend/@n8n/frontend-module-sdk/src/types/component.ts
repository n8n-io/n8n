import type { WorkflowReviewVersionSnapshot } from '@n8n/api-types';
import type { DatatableColumn } from '@n8n/design-system';

/**
 * UI a module renders but does not own.
 *
 * Each id names one shell-hosted component with a fixed contract. The union is
 * closed on purpose: this is not a generic slot system, and adding an id is a
 * reviewed change to the module contract, not a local decision.
 *
 * `project-filter` — a project picker. The project list, the permissions that
 * decide between local and remote search, and the search itself all live in
 * `features/collaboration/projects`, which sits above the module layer. A module
 * that needs to filter by project renders this instead of importing any of it.
 * `workflow-diff` renders plain workflow snapshots with the editor canvas.
 * `promotion-changes` lists what a promotion review changes. It loads the changes itself, so
 * the module needs no knowledge of the promotion types.
 * `project-header` is the overview/project page header with the project tabs, which a
 * resource list page renders above its list.
 * `insights-summary` is the weekly insights summary of the overview pages. It loads the summary
 * itself and renders nothing when insights are not available to the user.
 * `resources-list-layout` is the shared resource list page (search, sort, pagination, empty
 * state). It takes the props and slots of the shell's `ResourcesListLayout`.
 */
export type ModuleComponentSlot =
	| 'project-filter'
	| 'workflow-diff'
	| 'promotion-changes'
	| 'project-header'
	| 'insights-summary'
	| 'resources-list-layout';

/**
 * The `v-model` value of the `project-filter` slot. `null` means "all projects".
 *
 * Deliberately narrow: `id` is all a consumer needs, and the host keeps the full
 * project object. A consumer writes only `null` (to clear); every non-null value
 * originates in the host.
 */
export type SlotProjectSelection = { id: string } | null;

/** Plain snapshots keep the editor canvas types inside the shell. */
export type SlotWorkflowDiffSnapshot = Pick<
	WorkflowReviewVersionSnapshot,
	'nodes' | 'connections'
> &
	Partial<Pick<WorkflowReviewVersionSnapshot, 'versionId' | 'createdAt' | 'nodeGroups'>>;

export type SlotWorkflowDiffProps = {
	workflowId: string;
	workflowName: string;
	sourceSnapshot?: SlotWorkflowDiffSnapshot;
	targetSnapshot?: SlotWorkflowDiffSnapshot;
	sourceLabel?: string;
	targetLabel?: string;
	showFullscreenButton?: boolean;
	canvasIdPrefix?: string;
	hideTitle?: boolean;
};

export type SlotPromotionChangesProps = {
	reviewId: string;
};

/**
 * What the `promotion-changes` slot shows, emitted as `state`. Approve sends the head commit of
 * the changes that the reviewer saw, so it waits for `ready`.
 */
export type PromotionChangesState =
	| { status: 'loading' }
	| { status: 'ready'; headCommitSha: string }
	| { status: 'unavailable' };

/** The create action shown as the main button of the `project-header` slot. */
export type SlotProjectHeaderMainButton =
	| 'workflow'
	| 'credential'
	| 'dataTable'
	| 'variable'
	| 'agent';

export type SlotProjectHeaderProps = {
	hasActiveCallouts?: boolean;
	mainButton?: SlotProjectHeaderMainButton;
};

/** The search and filter values of the `resources-list-layout` slot. */
export type SlotResourcesListFilters = {
	search: string;
	homeProject: string;
	[key: string]: boolean | string | string[];
};

/** The list whose page size and sort the `resources-list-layout` slot persists. */
export type SlotResourcesListTabKey = 'workflows' | 'credentials' | 'dataTable' | 'agents' | 'apps';

export type SlotResourcesListLayoutProps<ResourceType> = {
	resourceKey: string;
	displayName?: (resource: ResourceType) => string;
	resources: ResourceType[];
	disabled: boolean;
	initialize?: () => Promise<void>;
	filters?: SlotResourcesListFilters;
	additionalFiltersHandler?: (
		resource: ResourceType,
		filters: SlotResourcesListFilters,
		matches: boolean,
	) => boolean;
	shareable?: boolean;
	sortFns?: Record<string, (a: ResourceType, b: ResourceType) => number>;
	sortOptions?: string[];
	type?: 'datatable' | 'list-full' | 'list-paginated';
	typeProps: { itemSize: number } | { columns: DatatableColumn[] };
	loading: boolean;
	customPageSize?: number;
	availablePageSizeOptions?: number[];
	totalItems?: number;
	resourcesRefreshing?: boolean;
	// Set to true if sorting and filtering is done outside of the component
	dontPerformSortingAndFiltering?: boolean;
	hasEmptyState?: boolean;
	uiConfig?: { searchEnabled: boolean; showFiltersDropdown: boolean; sortEnabled: boolean };
	tabKey?: SlotResourcesListTabKey;
	persistKeyExclusions?: string[];
};
