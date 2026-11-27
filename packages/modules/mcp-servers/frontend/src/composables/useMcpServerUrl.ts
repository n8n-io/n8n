import type { McpServerResponse } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

/** The server URL is `<instance>/mcp-servers/<slug>`. The slug never changes, so the URL never changes. */
export function useMcpServerUrl() {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const toast = useToast();
	const { copy } = useClipboard();

	function serverUrl(slug: string) {
		return `${rootStore.urlBaseEditor.replace(/\/+$/, '')}/mcp-servers/${slug}`;
	}

	/** "Copy URL" is the way to share a server until the share flow exists. The toast says who can connect. */
	async function copyServerUrl(server: Pick<McpServerResponse, 'slug' | 'project'>) {
		await copy(serverUrl(server.slug));
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mcpServers.copyUrl.toast.title'),
			message:
				server.project.type === 'personal'
					? i18n.baseText('mcpServers.copyUrl.toast.personalProject')
					: i18n.baseText('mcpServers.copyUrl.toast.teamProject', {
							interpolate: { project: server.project.name },
						}),
		});
	}

	return { serverUrl, copyServerUrl };
}
