import type { VNode } from 'vue';

import type { IconName } from '../N8nIcon/icons';

/** The type of a column. It sets how cells show, edit, sort, filter and compare values. */
export type DataGridColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json';

/** A row of the grid. Each column reads one field of the row. */
export type DataGridRow = Record<string, unknown>;

/** An action in the menu of a column header, for example "Delete column". */
export type DataGridColumnAction = {
	id: string;
	label: string;
	icon?: IconName;
	disabled?: boolean;
};

/** A column of the grid. */
export type DataGridColumn<TRow extends DataGridRow = DataGridRow> = {
	/** A unique ID. Events refer to the column by this ID. */
	id: string;
	/** The field of the row that the column shows. */
	field: keyof TRow & string;
	/** The text of the column header. */
	label: string;
	type: DataGridColumnType;
	/** An icon in front of the label. */
	icon?: IconName;
	/** The width in pixels when the grid first shows the column. Users can resize it later. */
	width?: number;
	minWidth?: number;
	maxWidth?: number;
	/** Fills the remaining width, in proportion to other columns with `flex`. */
	flex?: number;
	/** Lets users sort by this column. Default: `true`, `false` for `json` */
	sortable?: boolean;
	/** Lets users filter this column. Default: `true`, `false` for `json` */
	filterable?: boolean;
	/** Lets users edit cells of this column in edit mode. Default: `true`, `false` for `json` */
	editable?: boolean | ((row: TRow) => boolean);
	/** Lets users resize this column. Default: `true` */
	resizable?: boolean;
	/** Keeps the column at the left or right side. Users cannot move it. */
	lock?: 'left' | 'right';
	/** Lets users rename the column in its header in column edit mode. Default: `false` */
	renameable?: boolean;
	/** Actions in the header menu. The menu shows only in column edit mode. */
	actions?: DataGridColumnAction[];
	/** Renders the `cell` slot for all cells of this column, or for the rows where it returns `true`. Default: `false` */
	cellSlot?: boolean | ((row: TRow) => boolean);
	/** Converts a value to the text in the cell. It replaces the default format of the column type. */
	format?: (value: unknown) => string;
	/** CSS classes for the cells of this column. */
	cellClass?: string | ((row: TRow) => string | undefined);
	/** CSS classes for the header of this column. */
	headerClass?: string;
};

export type DataGridSortDirection = 'asc' | 'desc';

/** The sort of the grid. `null` means that the rows are not sorted by a column. */
export type DataGridSort = { field: string; direction: DataGridSortDirection } | null;

export type DataGridFilterOperator =
	| 'contains'
	| 'equals'
	| 'notEqual'
	| 'lessThan'
	| 'lessThanOrEqual'
	| 'greaterThan'
	| 'greaterThanOrEqual'
	| 'between'
	| 'isEmpty'
	| 'notEmpty'
	| 'null'
	| 'notNull'
	| 'true'
	| 'false';

export type DataGridFilterValue = string | number | boolean | Date | null;

/** A filter condition on one column. Conditions on different columns combine with AND. */
export type DataGridFilter =
	| {
			field: string;
			operator: Exclude<DataGridFilterOperator, 'between'>;
			value?: DataGridFilterValue;
			valueTo?: never;
	  }
	| {
			field: string;
			operator: 'between';
			value: DataGridFilterValue;
			/** The upper value of the range. */
			valueTo: DataGridFilterValue;
	  };

/** A change of one cell value. The grid emits it on edit, paste, undo and redo. */
export type DataGridCellEdit = {
	/** The key of the edited row, from the grid's `rowKey`. */
	rowKey: string;
	/** The field of the edited column. */
	field: string;
	/** The value before the change. */
	oldValue: unknown;
	/** The value after the change. */
	newValue: unknown;
};

/** A column dropped at a new position. `toIndex` is an index in the `columns` prop. */
export type DataGridColumnMove = { columnId: string; toIndex: number };

/** A column renamed in its header. */
export type DataGridColumnRename = { columnId: string; label: string };

/** A column action selected in a header menu. */
export type DataGridColumnActionSelect = { columnId: string; actionId: string };

type Handler<T> = (value: T) => void;

/**
 * Sort props. In client mode the grid sorts `rows` and `sort` is the initial sort.
 * In server mode the grid shows `rows` as they are and needs both `sort` and its handler.
 */
export type DataGridSortProps =
	| {
			sortMode?: 'client';
			sort?: DataGridSort;
			'onUpdate:sort'?: Handler<DataGridSort>;
	  }
	| {
			sortMode: 'server';
			sort: DataGridSort;
			'onUpdate:sort': Handler<DataGridSort>;
	  };

/**
 * Filter props. In client mode the grid filters `rows` and `filters` are the initial filters.
 * In server mode the grid shows `rows` as they are and needs both `filters` and their handler.
 */
export type DataGridFilterProps =
	| {
			filterMode?: 'client';
			filters?: DataGridFilter[];
			'onUpdate:filters'?: Handler<DataGridFilter[]>;
	  }
	| {
			filterMode: 'server';
			filters: DataGridFilter[];
			'onUpdate:filters': Handler<DataGridFilter[]>;
	  };

/**
 * Pagination props. In client mode the grid pages `rows`. In server mode `rows` are the
 * rows of the current page, and the grid needs the page state, `total` and the handlers.
 * With `'none'` the grid shows all rows and no page controls.
 */
export type DataGridPaginationProps =
	| {
			paginationMode?: 'client';
			page?: number;
			itemsPerPage?: number;
			total?: never;
			'onUpdate:page'?: Handler<number>;
			'onUpdate:itemsPerPage'?: Handler<number>;
	  }
	| {
			paginationMode: 'server';
			page: number;
			itemsPerPage: number;
			/** The number of rows on all pages. */
			total: number;
			'onUpdate:page': Handler<number>;
			'onUpdate:itemsPerPage': Handler<number>;
	  }
	| {
			paginationMode: 'none';
			page?: never;
			itemsPerPage?: never;
			total?: never;
			'onUpdate:page'?: never;
			'onUpdate:itemsPerPage'?: never;
	  };

export type DataGridBaseProps<TRow extends DataGridRow> = {
	/** The rows to show. In server pagination mode, the rows of the current page. */
	rows: TRow[];
	/** The columns, in display order. */
	columns: Array<DataGridColumn<TRow>>;
	/** A stable, unique key for each row. */
	rowKey: (keyof TRow & string) | ((row: TRow) => string);
	/** Shows the loading state and hides the empty state. Default: `false` */
	loading?: boolean;
	/** Turns on edit mode for cells: edit, paste, undo and delete selected rows. Default: `false` */
	editable?: boolean;
	/** Turns on edit mode for columns: move, rename and column actions. Default: `false` */
	columnsEditable?: boolean;
	/** Shows a checkbox column for row selection. Default: `false` */
	selectable?: boolean;
	/** Keeps the checkbox column visible but stops users from selecting rows. Default: `false` */
	selectionDisabled?: boolean;
	/** The keys of the selected rows. The grid keeps its own selection if this is not set. */
	selectedKeys?: string[];
	'onUpdate:selectedKeys'?: Handler<string[]>;
	/** Options for the page size selector. Default: `[10, 20, 50]` */
	pageSizes?: number[];
};

export type DataGridProps<TRow extends DataGridRow = DataGridRow> = DataGridBaseProps<TRow> &
	DataGridSortProps &
	DataGridFilterProps &
	DataGridPaginationProps;

export type DataGridEmits = {
	/** A cell value changes. The grid does not change `rows`. Update `rows` to accept the edit. */
	cellEdit: [edit: DataGridCellEdit];
	/** A column is dropped at a new position. Update `columns` to accept the move. */
	columnMove: [move: DataGridColumnMove];
	/** A column is renamed. Update the `label` in `columns` to accept the rename. */
	columnRename: [rename: DataGridColumnRename];
	columnAction: [action: DataGridColumnActionSelect];
	/** The user presses Delete or Backspace while rows are selected in edit mode. */
	deleteSelected: [keys: string[]];
	/** The grid is set up and shows its columns. */
	gridReady: [];
	/** The grid shows rows for the first time. It does not fire while there are no rows. */
	firstDataRendered: [];
};

export type DataGridColumnHeaderOptions = {
	dataGridColumn: Pick<DataGridColumn, 'icon' | 'renameable' | 'actions'>;
	isColumnsEditable: () => boolean;
	onRename: (columnId: string, label: string) => void;
	onAction: (columnId: string, actionId: string) => void;
	onSort: (columnId: string, direction: DataGridSortDirection | null) => void;
};

export type DataGridCellSlotProps<TRow extends DataGridRow = DataGridRow> = {
	row: TRow;
	column: DataGridColumn<TRow>;
	value: unknown;
	formattedValue: string;
};

export type DataGridSlots<TRow extends DataGridRow = DataGridRow> = {
	/** Custom cell content, for columns with `cellSlot`. */
	cell?: (props: DataGridCellSlotProps<TRow>) => VNode[];
	/** Content of a fixed last column header, for example an "add column" button. */
	'header-append'?: () => VNode[];
	/** A row below the data rows, for example an "add row" button. */
	'footer-row'?: () => VNode[];
	/** Content when there are no rows. */
	empty?: () => VNode[];
};

export type DataGridExposed = {
	/** Scrolls to a cell and focuses it. Without `field`, it uses the first editable column. */
	focusCell: (rowKey: string, field?: string, options?: { edit?: boolean }) => void;
};
