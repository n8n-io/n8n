import {
	ModuleRegistry,
	ClientSideRowModelModule,
	TextEditorModule,
	LargeTextEditorModule,
	ColumnAutoSizeModule,
	CheckboxEditorModule,
	NumberEditorModule,
	RowSelectionModule,
	RenderApiModule,
	DateEditorModule,
	ClientSideRowModelApiModule,
	ValidationModule,
	UndoRedoEditModule,
	CellStyleModule,
	ScrollApiModule,
	PinnedRowModule,
	ColumnApiModule,
	TextFilterModule,
	NumberFilterModule,
	DateFilterModule,
	EventApiModule,
} from 'ag-grid-community';

let modulesRegistered = false;

export const registerAgGridModulesOnce = () => {
	if (modulesRegistered) return;
	ModuleRegistry.registerModules([
		ValidationModule,
		ClientSideRowModelModule,
		TextEditorModule,
		LargeTextEditorModule,
		ColumnAutoSizeModule,
		CheckboxEditorModule,
		NumberEditorModule,
		RowSelectionModule,
		RenderApiModule,
		DateEditorModule,
		ClientSideRowModelApiModule,
		UndoRedoEditModule,
		CellStyleModule,
		PinnedRowModule,
		ScrollApiModule,
		ColumnApiModule,
		TextFilterModule,
		NumberFilterModule,
		DateFilterModule,
		EventApiModule,
	]);
	modulesRegistered = true;
};
