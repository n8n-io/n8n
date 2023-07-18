import { CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS, CURL_IMPORT_NODES_PROTOCOLS } from '@/constants';

import { useI18n } from './useI18n';
import { useToast } from './useToast';
import { useUIStore } from '@/stores/ui.store';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

export function useImportCurl(
	track: (event: string, data?: ITelemetryTrackProperties) => void,
	modalKey: string,
) {
	const uiStore = useUIStore();
	const { showToast } = useToast();
	const { i18n } = useI18n();

	async function importCurlCommand(curlCommand: string): Promise<boolean> {
		console.log('🚀 ~ file: useImportCurl.ts:18 ~ importCurlCommand ~ curlCommand:', curlCommand);
		if (curlCommand === '') return false;

		try {
			const parameters = await uiStore.getCurlToJson(curlCommand);
			console.log('🚀 ~ file: useImportCurl.ts:23 ~ importCurlCommand ~ parameters:', parameters);
			const url = parameters['parameters.url'];

			const invalidProtocol = CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS.find((p) =>
				url.includes(`${p}://`),
			);

			if (!invalidProtocol) {
				uiStore.setHttpNodeParameters({
					name: modalKey,
					parameters: JSON.stringify(parameters),
				});

				// this.closeDialog();

				sendTelemetry();

				return true;
				// if we have a node that supports the invalid protocol
				// suggest that one
			} else if (CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol]) {
				const useNode = CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol];

				showProtocolErrorWithSupportedNode(invalidProtocol, useNode);
				// we do not have a node that supports the use protocol
			} else {
				showProtocolError(invalidProtocol);
			}
			sendTelemetry({ success: false, invalidProtocol: true, protocol: invalidProtocol });
		} catch (e) {
			console.log('🚀 ~ file: useImportCurl.ts:52 ~ importCurlCommand ~ e:', e);
			showInvalidcURLCommandError();

			sendTelemetry({ success: false, invalidProtocol: false });
			return false;
		} finally {
			uiStore.setCurlCommand({ name: modalKey, command: curlCommand });
			return true;
		}
	}

	function showProtocolErrorWithSupportedNode(protocol: string, node: string): void {
		showToast({
			title: i18n.baseText('importParameter.showError.invalidProtocol1.title', {
				interpolate: {
					node,
				},
			}),
			message: i18n.baseText('importParameter.showError.invalidProtocol.message', {
				interpolate: {
					protocol: protocol.toUpperCase(),
				},
			}),
			type: 'error',
			duration: 0,
		});
	}

	function showProtocolError(protocol: string): void {
		showToast({
			title: i18n.baseText('importParameter.showError.invalidProtocol2.title'),
			message: i18n.baseText('importParameter.showError.invalidProtocol.message', {
				interpolate: {
					protocol,
				},
			}),
			type: 'error',
			duration: 0,
		});
	}

	function showInvalidcURLCommandError(): void {
		showToast({
			title: i18n.baseText('importParameter.showError.invalidCurlCommand.title'),
			message: i18n.baseText('importParameter.showError.invalidCurlCommand.message'),
			type: 'error',
			duration: 0,
		});
	}

	function sendTelemetry(
		data: { success: boolean; invalidProtocol: boolean; protocol?: string } = {
			success: true,
			invalidProtocol: false,
			protocol: '',
		},
	): void {
		// TODO: Fix this
		// track('User imported curl command', {
		// 	success: data.success,
		// 	invalidProtocol: data.invalidProtocol,
		// 	protocol: data.protocol,
		// });
	}

	return {
		importCurlCommand,
	};
}
