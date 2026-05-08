import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useInstanceRegistryStore } from '@/features/instanceRegistry/stores/instanceRegistry.store';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import type { WorkflowSettings } from 'n8n-workflow';

type ClusterInstanceSummary = {
	instanceKey: string;
	hostId: string;
	instanceType: 'main' | 'worker' | 'webhook';
	instanceRole: 'leader' | 'follower' | 'unset';
	version: string;
};

type ClusterCheckSummary = {
	check: string;
	status: 'succeeded' | 'failed';
	warnings: string;
};

type DebugInfo = {
	core: {
		n8nVersion: string;
		platform: 'docker (cloud)' | 'docker (self-hosted)' | 'npm';
		nodeJsVersion: string;
		nodeEnv: string | undefined;
		database: 'sqlite' | 'postgres';
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
		binaryMode: 'memory' | 'filesystem' | 's3' | 'database';
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
	/**
	 * Reported only when the instance registry has a snapshot loaded.
	 * Contains no PII — instance keys, hostIds, versions, and cluster role.
	 */
	cluster?: {
		instanceCount: number;
		versions: string;
		instances: ClusterInstanceSummary[];
		checks: ClusterCheckSummary[];
	};
};

export function useDebugInfo() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const instanceRegistryStore = useInstanceRegistryStore();
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
			nodeEnv: settingsStore.nodeEnv,
			database:
				settingsStore.databaseType === 'postgresdb' ? 'postgres' : settingsStore.databaseType,
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

	const clusterInfo = (): DebugInfo['cluster'] => {
		const snapshot = instanceRegistryStore.clusterInfo;
		if (!snapshot) return;

		const instances: ClusterInstanceSummary[] = snapshot.instances.map((i) => ({
			instanceKey: i.instanceKey,
			hostId: i.hostId,
			instanceType: i.instanceType,
			instanceRole: i.instanceRole,
			version: i.version,
		}));

		const versions = [...new Set(instances.map((i) => i.version))].sort();

		const checks: ClusterCheckSummary[] = Object.values(snapshot.checks)
			.map((c) => ({
				check: c.check,
				status: c.status,
				warnings: c.warnings.length > 0 ? c.warnings.map((w) => w.code).join('; ') : '-',
			}))
			.sort((a, b) => a.check.localeCompare(b.check));

		return {
			instanceCount: instances.length,
			versions: versions.join(', '),
			instances,
			checks,
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

		const cluster = clusterInfo();
		if (cluster) debugInfo.cluster = cluster;

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

			for (const [itemKey, itemValue] of Object.entries(section as Record<string, unknown>)) {
				if (Array.isArray(itemValue)) {
					markdown += `- ${itemKey}:\n`;
					for (const entry of itemValue as Array<Record<string, unknown>>) {
						const parts = Object.entries(entry).map(([k, v]) => `${k}: ${v}`);
						markdown += `  - ${parts.join(', ')}\n`;
					}
				} else {
					markdown += `- ${itemKey}: ${itemValue}\n`;
				}
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
