import {
	CellStyleModule,
	CheckboxEditorModule,
	ClientSideRowModelApiModule,
	ClientSideRowModelModule,
	ColumnApiModule,
	ColumnAutoSizeModule,
	CustomEditorModule,
	DateEditorModule,
	DateFilterModule,
	EventApiModule,
	iconSetAlpine,
	LargeTextEditorModule,
	ModuleRegistry,
	NumberEditorModule,
	NumberFilterModule,
	PaginationModule,
	PinnedRowModule,
	RenderApiModule,
	RowSelectionModule,
	ScrollApiModule,
	TextEditorModule,
	TextFilterModule,
	themeQuartz,
	ValidationModule,
} from 'ag-grid-community';

let modulesRegistered = false;

export const registerAgGridModules = () => {
	if (modulesRegistered) return;
	ModuleRegistry.registerModules([
		ValidationModule,
		ClientSideRowModelModule,
		ClientSideRowModelApiModule,
		TextEditorModule,
		LargeTextEditorModule,
		NumberEditorModule,
		DateEditorModule,
		CheckboxEditorModule,
		CustomEditorModule,
		TextFilterModule,
		NumberFilterModule,
		DateFilterModule,
		ColumnAutoSizeModule,
		ColumnApiModule,
		RowSelectionModule,
		PaginationModule,
		PinnedRowModule,
		RenderApiModule,
		ScrollApiModule,
		CellStyleModule,
		EventApiModule,
	]);
	modulesRegistered = true;
};

export const dataGridTheme = themeQuartz.withPart(iconSetAlpine).withParams({
	columnBorder: true,
	rowBorder: true,
	rowVerticalPaddingScale: 0.8,
	sidePanelBorder: true,
	wrapperBorder: true,
	headerColumnBorder: { color: 'var(--color--foreground)' },
	headerColumnBorderHeight: '100%',
	headerColumnResizeHandleColor: 'var(--color--foreground)',
	checkboxUncheckedBackgroundColor: 'var(--color--background--light-1)',
	checkboxCheckedBackgroundColor: 'var(--color--primary)',
});

export const DATA_GRID_ROW_HEIGHT = 33;
export const DATA_GRID_HEADER_HEIGHT = 36;
export const DATA_GRID_DEFAULT_COLUMN_WIDTH = 250;
export const DATA_GRID_APPEND_COLUMN_ID = '__n8n_data_grid_append__';
export const DATA_GRID_APPEND_COLUMN_MIN_WIDTH = 50;
export const DATA_GRID_SELECTION_COLUMN_ID = 'ag-Grid-SelectionColumn';
