import type { MaybeRef } from 'vue';
import { unref } from 'vue';
import { CURL_IMPORT_NODES_PROTOCOLS, CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@/composables/useI18n';
import { importCurlEventBus } from '@/event-bus';
import type { BaseTextKey } from '@/plugins/i18n';

export function useImportCurlCommand(options?: {
	onImportSuccess?: () => void;
	onImportFailure?: (data: { invalidProtocol: boolean; protocol?: string }) => void;
	onAfterImport?: () => void;
	i18n?: {
		invalidCurCommand: {
			title: string;
			message: string;
		};
	};
}) {
	const uiStore = useUIStore();
	const toast = useToast();
	const i18n = useI18n();

	const translationStrings = {
		invalidCurCommand: {
			title: 'importCurlParameter.showError.invalidCurlCommand.title',
			message: 'importCurlParameter.showError.invalidCurlCommand.message',
		},
		...options?.i18n,
	};

	async function importCurlCommand(curlCommandRef: MaybeRef<string>): Promise<void> {
		const curlCommand = unref(curlCommandRef);
		if (curlCommand === '') return;

		try {
			const parameters = await uiStore.getCurlToJson(curlCommand);
			const url = parameters['parameters.url'];

			const invalidProtocol = CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS.find((p) =>
				url.includes(`${p}://`),
			);

			if (!invalidProtocol) {
				importCurlEventBus.emit('setHttpNodeParameters', parameters);

				options?.onImportSuccess?.();

				return;
				// if we have a node that supports the invalid protocol
				// suggest that one
			} else if (CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol]) {
				const useNode = CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol];

				showProtocolErrorWithSupportedNode(invalidProtocol, useNode);
				// we do not have a node that supports the use protocol
			} else {
				showProtocolError(invalidProtocol);
			}

			options?.onImportFailure?.({
				invalidProtocol: true,
				protocol: invalidProtocol,
			});
		} catch (e) {
			showInvalidcURLCommandError();

			options?.onImportFailure?.({
				invalidProtocol: false,
			});
		} finally {
			options?.onAfterImport?.();
		}
	}

	function showProtocolErrorWithSupportedNode(protocol: string, node: string): void {
		toast.showToast({
			title: i18n.baseText('importCurlParameter.showError.invalidProtocol1.title', {
				interpolate: {
					node,
				},
			}),
			message: i18n.baseText('importCurlParameter.showError.invalidProtocol.message', {
				interpolate: {
					protocol: protocol.toUpperCase(),
				},
			}),
			type: 'error',
			duration: 0,
		});
	}

	function showProtocolError(protocol: string): void {
		toast.showToast({
			title: i18n.baseText('importCurlParameter.showError.invalidProtocol2.title'),
			message: i18n.baseText('importCurlParameter.showError.invalidProtocol.message', {
				interpolate: {
					protocol,
				},
			}),
			type: 'error',
			duration: 0,
		});
	}

	function showInvalidcURLCommandError(): void {
		toast.showToast({
			title: i18n.baseText(translationStrings.invalidCurCommand.title as BaseTextKey),
			message: i18n.baseText(translationStrings.invalidCurCommand.message as BaseTextKey),
			type: 'error',
			duration: 0,
		});
	}

	return {
		importCurlCommand,
	};
}
