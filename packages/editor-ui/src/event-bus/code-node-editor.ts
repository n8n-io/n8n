import { createEventBus } from 'n8n-design-system/utils';

export type ErrorLineNumberEvent = number | 'final';

export interface CodeNodeEditorEventBusEvents {
	/** Event that a diff have been applied to the code node editor */
	codeDiffApplied: never;

	/** Command to highlight a specific line in the code node editor */
	'error-line-number': ErrorLineNumberEvent;
}

export const codeNodeEditorEventBus = createEventBus<CodeNodeEditorEventBusEvents>();
