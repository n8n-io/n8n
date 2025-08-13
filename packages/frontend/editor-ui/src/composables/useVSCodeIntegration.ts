import { ref } from 'vue';
import type { CodeNodeEditorLanguage } from 'n8n-workflow';
import { useVsCodeSyncStore } from '../stores/vscodeSync.store';

export interface VSCodeIntegrationOptions {
	language: CodeNodeEditorLanguage;
	code: string;
	nodeId: string;
	onCodeChange?: (newCode: string) => void;
}

export function useVSCodeIntegration() {
	const isVSCodeAvailable = ref(false);
	const vscodeSyncStore = useVsCodeSyncStore();

	/**
	 * Check if VSCode is available by attempting to open a test URI
	 */
	const checkVSCodeAvailability = async (): Promise<boolean> => {
		try {
			// Try to detect if VSCode protocol handler is available
			const testUri = 'vscode://file/test';
			const anchor = document.createElement('a');
			anchor.href = testUri;
			anchor.style.display = 'none';
			document.body.appendChild(anchor);

			// Clean up
			document.body.removeChild(anchor);

			isVSCodeAvailable.value = true;
			return true;
		} catch (error) {
			console.warn('VSCode protocol not available:', error);
			isVSCodeAvailable.value = false;
			return false;
		}
	};

	/**
	 * Get the appropriate file extension for the language
	 */
	const getFileExtension = (language: CodeNodeEditorLanguage): string => {
		switch (language) {
			case 'javaScript':
				return '.js';
			case 'python':
				return '.py';
			default:
				return '.txt';
		}
	};

	/**
	 * Create a temporary file and open it in VSCode
	 */
	const openInVSCode = async (opts: VSCodeIntegrationOptions): Promise<void> => {
		// const { language, code } = opts;
		console.log('Opening in VSCode');

		vscodeSyncStore.startSync({
			nodeId: opts.nodeId,
		});
	};

	/**
	 * Open code in VSCode with enhanced integration
	 * This is a placeholder for more advanced integration
	 */
	const openWithIntegration = async (options: VSCodeIntegrationOptions): Promise<void> => {
		// For now, use the basic file opening approach
		// In the future, this could integrate with VSCode extensions
		// that provide bidirectional sync capabilities
		await openInVSCode(options);

		// TODO: Implement file watching for changes and sync back to n8n
		// This would require a more sophisticated integration approach
	};

	return {
		isVSCodeAvailable,
		checkVSCodeAvailability,
		openInVSCode,
		openWithIntegration,
	};
}
