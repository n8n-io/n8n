import { app, dialog } from 'electron';

/** Asks the local user to approve the target instance before the gateway connects to it. */
export async function confirmConnect(url: string, connectedUrl: string | null): Promise<boolean> {
	const origin = new URL(url).origin;
	const replaceNote = connectedUrl
		? `\n\nThis ends the current connection to ${connectedUrl}.`
		: '';

	// Tray-only app: without focus the dialog can open behind the browser.
	app.focus({ steal: true });
	const { response } = await dialog.showMessageBox({
		type: 'warning',
		title: 'n8n Gateway',
		message: `Connect n8n Gateway to ${origin}?`,
		detail: `This n8n instance will be able to use the tools you enabled on this computer. Only continue if you started this connection from n8n.${replaceNote}`,
		buttons: ['Connect', 'Cancel'],
		defaultId: 1,
		cancelId: 1,
		noLink: true,
	});
	return response === 0;
}
