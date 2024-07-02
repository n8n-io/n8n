// @TODO: Fix lint exceptions

import type { Diagnostic } from '@codemirror/lint';
import type { EditorState } from '@codemirror/state';
import { tsProjectField } from './typescript-project-field';
import type ts from 'typescript';

export const tsDiagnostics = async (state: EditorState): Promise<Diagnostic[]> => {
	const rawDiagnostics = await state.field(tsProjectField).getDiagnostics();

	return rawDiagnostics.map((diagnostic) => {
		if (diagnostic.relatedInformation) {
			diagnostic.relatedInformation.forEach((r) => {
				// eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-base-to-string
				diagnostic.messageText += '\n\n' + r.file?.fileName + ': ' + r.messageText;
			});
		}

		return {
			from: diagnostic.start,
			to: diagnostic.start + diagnostic.length,
			severity: toSeverity(diagnostic),
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			message: diagnostic.messageText.toString(),
		};
	});
};

const TS_SEVERITY = {
	warning: 0,
	error: 1,
} as const;

function toSeverity(diagnostic: ts.Diagnostic) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
	return diagnostic.category === TS_SEVERITY.error
		? 'error'
		: // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
			diagnostic.category === TS_SEVERITY.warning
			? 'warning'
			: 'info';
}
