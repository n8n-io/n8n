import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import type { WorkflowSettings } from 'n8n-workflow';

type DebugInfo = {
	core: {
		n8nVersion: string;
		platform: 'docker (cloud)' | 'docker (self-hosted)' | 'npm';
		nodeJsVersion: string;
		database: 'sqlite' | 'mysql' | 'mariadb' | 'postgres';
		executionMode: 'regular' | 'scaling (single-main)' | 'scaling (multi-main)';
		license: 'community' | 'enterprise (production)' | 'enterprise (sandbox)';
		consumerId?: string;
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
	client: {
		userAgent: string;
		isTouchDevice: boolean;
	};
};

export function useDebugInfo() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const { isTouchDevice, userAgent } = useDeviceSupport();

	const coreInfo = (skipSensitive?: boolean) => {
		const info = {
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
			executionMode: settingsStore.isQueueModeEnabled
				? settingsStore.isMultiMain
					? 'scaling (multi-main)'
					: 'scaling (single-main)'
				: 'regular',
			concurrency: settingsStore.settings.concurrency,
			license:
				settingsStore.isCommunityPlan || !settingsStore.settings.license
					? 'community'
					: settingsStore.settings.license.environment === 'production'
						? 'enterprise (production)'
						: 'enterprise (sandbox)',
		} as const;

		if (!skipSensitive) {
			return {
				...info,
				consumerId: !skipSensitive ? settingsStore.consumerId : undefined,
			};
		}

		return info;
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
		if (!settingsStore.pruning?.isEnabled) return { enabled: false } as const;

		return {
			enabled: true,
			maxAge: `${settingsStore.pruning?.maxAge} hours`,
			maxCount: `${settingsStore.pruning?.maxCount} executions`,
		} as const;
	};

	const securityInfo = () => {
		const info: DebugInfo['security'] = {};

		if (!settingsStore.security.blockFileAccessToN8nFiles) info.blockFileAccessToN8nFiles = false;
		if (!settingsStore.security.secureCookie) info.secureCookie = false;

		if (Object.keys(info).length === 0) return;

		return info;
	};

	const client = (): DebugInfo['client'] => {
		return {
			userAgent,
			isTouchDevice,
		};
	};

	const gatherDebugInfo = (skipSensitive?: boolean) => {
		const debugInfo: DebugInfo = {
			core: coreInfo(skipSensitive),
			storage: storageInfo(),
			pruning: pruningInfo(),
			client: client(),
		};

		const security = securityInfo();

		if (security) debugInfo.security = security;

		return debugInfo;
	};

	const toMarkdown = (
		debugInfo: DebugInfo,
		{ secondaryHeader }: { secondaryHeader?: boolean },
	): string => {
		const extraLevel = secondaryHeader ? '#' : '';
		let markdown = `${extraLevel}# Debug info\n\n`;

		for (const sectionKey in debugInfo) {
			markdown += `${extraLevel}## ${sectionKey}\n\n`;

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

	const generateDebugInfo = ({
		skipSensitive,
		secondaryHeader,
	}: { skipSensitive?: boolean; secondaryHeader?: boolean } = {}) => {
		return appendTimestamp(toMarkdown(gatherDebugInfo(skipSensitive), { secondaryHeader }));
	};

	return {
		generateDebugInfo,
	};
}
