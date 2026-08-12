import picocolors from 'picocolors';

import { detectPackageManager } from './package-manager';

type ExecCommandType = 'cli' | 'script';

export async function getExecCommand(type: ExecCommandType = 'cli'): Promise<string> {
	const packageManager = (await detectPackageManager()) ?? 'npm';

	if (type === 'script') {
		return packageManager === 'npm' ? 'npm run' : packageManager;
	}

	return packageManager === 'npm' ? 'npx' : packageManager;
}

export function formatCommand(command: string): string {
	return picocolors.cyan(command);
}

export async function suggestCloudSupportCommand(action: 'enable' | 'disable'): Promise<string> {
	const execCommand = await getExecCommand('cli');
	return formatCommand(`${execCommand} n8n-node cloud-support ${action}`);
}

export async function suggestLintCommand(): Promise<string> {
	const execCommand = await getExecCommand('script');
	return formatCommand(`${execCommand} lint`);
}
