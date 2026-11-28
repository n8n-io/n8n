import type { McpServerResponse } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { MCP_SERVER_SHARE_PATH } from '../mcp-servers.constants';

/** The server URL is `<instance>/mcp-servers/<slug>`. The slug never changes, so the URL never changes. */
export function useMcpServerUrl() {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const toast = useToast();
	const { copy } = useClipboard();

	const editorBase = () => rootStore.urlBaseEditor.replace(/\/+$/, '');

	function serverUrl(slug: string) {
		return `${editorBase()}/mcp-servers/${slug}`;
	}

	/** The page that tells a colleague how to add the server to an AI client. */
	function shareUrl(slug: string) {
		return `${editorBase()}${MCP_SERVER_SHARE_PATH}/${slug}`;
	}

	/** Each toast says who can connect, so the builder knows who can use the link. */
	async function copyServerUrl(server: Pick<McpServerResponse, 'slug' | 'project'>) {
		await copy(serverUrl(server.slug));
		showCopied(server, 'mcpServers.copyUrl.toast.title');
	}

	async function copyShareLink(server: Pick<McpServerResponse, 'slug' | 'project'>) {
		await copy(shareUrl(server.slug));
		showCopied(server, 'mcpServers.copyShareLink.toast.title');
	}

	function showCopied(
		server: Pick<McpServerResponse, 'project'>,
		title: 'mcpServers.copyUrl.toast.title' | 'mcpServers.copyShareLink.toast.title',
	) {
		toast.showMessage({
			type: 'success',
			title: i18n.baseText(title),
			message:
				server.project.type === 'personal'
					? i18n.baseText('mcpServers.copyUrl.toast.personalProject')
					: i18n.baseText('mcpServers.copyUrl.toast.teamProject', {
							interpolate: { project: server.project.name },
						}),
		});
	}

	return { serverUrl, shareUrl, copyServerUrl, copyShareLink };
}
