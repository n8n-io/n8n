import {
	TextEditorDocument,
	findDivergenceContext,
	formatTextWithLineNumbers,
} from '@n8n/ai-utilities/text-editor';

const WORKFLOW_FILE_PATH = '/workflow.js';

export { findDivergenceContext };
export { formatTextWithLineNumbers as formatCodeWithLineNumbers };

/**
 * Manages the virtual workflow code file used by the code builder agent.
 */
export class TextEditorHandler extends TextEditorDocument {
	constructor() {
		super({
			supportedPath: WORKFLOW_FILE_PATH,
			createInvalidPathMessage: () =>
				'Cannot create multiple workflows. You can only extend the existing workflow at /workflow.js.',
			fileNotFoundMessage: 'No workflow code exists yet. Use create first.',
		});
	}

	getWorkflowCode(): string | null {
		return this.getText();
	}

	setWorkflowCode(code: string): void {
		this.setText(code);
	}

	hasWorkflowCode(): boolean {
		return this.hasText();
	}

	clearWorkflowCode(): void {
		this.clearText();
	}
}
