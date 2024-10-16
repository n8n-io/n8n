import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { WorkflowSettings } from 'n8n-workflow';

type DebugInfo = {
	core: {
		n8nVersion: string;
		platform: 'docker (cloud)' | 'docker (self-hosted)' | 'npm';
		nodeJsVersion: string;
		database: 'sqlite' | 'mysql' | 'mariadb' | 'postgres';
		executionMode: 'regular' | 'scaling';
		license: 'community' | 'enterprise (production)' | 'enterprise (sandbox)';
		consumerId: string;
		concurrency: number;
	};
	storage: {
		success: WorkflowSettings.SaveDataExecution;
		error: WorkflowSettings.SaveDataExecution;
		progress: boolean;
		manual: boolean;
		binaryMode: 'memory' | 'filesystem' | 's3';
	};
	pruning:
		| {
				enabled: false;
		  }
		| {
				enabled: true;
				maxAge: `${number} hours`;
				maxCount: `${number} executions`;
		  };
	/**
	 * Reported only if insecure settings are found.
	 */
	security?: {
		secureCookie?: boolean;
		blockFileAccessToN8nFiles?: boolean;
	};
};

export function useDebugInfo() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();

	const coreInfo = () => {
		return {
			n8nVersion: rootStore.versionCli,
			platform:
				settingsStore.isDocker && settingsStore.deploymentType === 'cloud'
					? 'docker (cloud)'
					: settingsStore.isDocker
						? 'docker (self-hosted)'
						: 'npm',
			nodeJsVersion: settingsStore.nodeJsVersion,
			database:
				settingsStore.databaseType === 'postgresdb'
					? 'postgres'
					: settingsStore.databaseType === 'mysqldb'
						? 'mysql'
						: settingsStore.databaseType,
			executionMode: settingsStore.isQueueModeEnabled ? 'scaling' : 'regular',
			concurrency: settingsStore.settings.concurrency,
			license: settingsStore.isCommunityPlan
				? 'community'
				: settingsStore.settings.license.environment === 'production'
					? 'enterprise (production)'
					: 'enterprise (sandbox)',
			consumerId: settingsStore.consumerId,
		} as const;
	};

	const storageInfo = (): DebugInfo['storage'] => {
		return {
			success: settingsStore.saveDataSuccessExecution,
			error: settingsStore.saveDataErrorExecution,
			progress: settingsStore.saveDataProgressExecution,
			manual: settingsStore.saveManualExecutions,
			binaryMode:
				settingsStore.binaryDataMode === 'default' ? 'memory' : settingsStore.binaryDataMode,
		};
	};

	const pruningInfo = () => {
		if (!settingsStore.pruning.isEnabled) return { enabled: false } as const;

		return {
			enabled: true,
			maxAge: `${settingsStore.pruning.maxAge} hours`,
			maxCount: `${settingsStore.pruning.maxCount} executions`,
		} as const;
	};

	const securityInfo = () => {
		const info: DebugInfo['security'] = {};

		if (!settingsStore.security.blockFileAccessToN8nFiles) info.blockFileAccessToN8nFiles = false;
		if (!settingsStore.security.secureCookie) info.secureCookie = false;

		if (Object.keys(info).length === 0) return;

		return info;
	};

	const gatherDebugInfo = () => {
		const debugInfo: DebugInfo = {
			core: coreInfo(),
			storage: storageInfo(),
			pruning: pruningInfo(),
		};

		const security = securityInfo();

		if (security) debugInfo.security = security;

		return debugInfo;
	};

	const toMarkdown = (debugInfo: DebugInfo): string => {
		let markdown = '# Debug info\n\n';

		for (const sectionKey in debugInfo) {
			markdown += `## ${sectionKey}\n\n`;

			const section = debugInfo[sectionKey as keyof DebugInfo];

			if (!section) continue;

			for (const itemKey in section) {
				const itemValue = section[itemKey as keyof typeof section];
				markdown += `- ${itemKey}: ${itemValue}\n`;
			}

			markdown += '\n';
		}

		return markdown;
	};

	const appendTimestamp = (markdown: string) => {
		return `${markdown}Generated at: ${new Date().toISOString()}`;
	};

	const generateDebugInfo = () => {
		return appendTimestamp(toMarkdown(gatherDebugInfo()));
	};

	return {
		generateDebugInfo,
	};
}
