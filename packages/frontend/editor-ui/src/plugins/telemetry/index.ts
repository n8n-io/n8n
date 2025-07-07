import type { Plugin } from 'vue';
import type { ITelemetrySettings } from '@n8n/api-types';
import type { ITelemetryTrackProperties, IDataObject } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

import type { IUpdateInformation } from '@/Interface';
import {
	APPEND_ATTRIBUTION_DEFAULT_PATH,
	MICROSOFT_TEAMS_NODE_TYPE,
	SLACK_NODE_TYPE,
	TELEGRAM_NODE_TYPE,
} from '@/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useNDVStore } from '@/stores/ndv.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import * as telemetryApi from '@n8n/rest-api-client/api/telemetry';

export class Telemetry {
	private previousPath: string;

	constructor() {
		this.previousPath = '';
	}

	init(
		telemetrySettings: ITelemetrySettings,
		{
			instanceId,
			userId,
			projectId,
			versionCli,
		}: {
			instanceId: string;
			userId?: string;
			projectId?: string;
			versionCli: string;
		},
	) {
		if (!telemetrySettings.enabled || !telemetrySettings.config) return;

		const rootStore = useRootStore();

		this.identify(instanceId, userId, versionCli, projectId);

		this.track('Session started', { session_id: rootStore.pushRef });
	}

	identify(instanceId: string, userId?: string, versionCli?: string, projectId?: string) {
		const settingsStore = useSettingsStore();
		const rootStore = useRootStore();
		const traits: { instance_id: string; version_cli?: string; user_cloud_id?: string } = {
			instance_id: instanceId,
			version_cli: versionCli,
		};

		if (settingsStore.isCloudDeployment) {
			traits.user_cloud_id = settingsStore.settings?.n8nMetadata?.userId ?? '';
		}

		if (userId) {
			telemetryApi.identify(
				rootStore.restApiContext,
				`${instanceId}#${userId}${projectId ? '#' + projectId : ''}`,
				traits,
			);
		}
	}

	track(event: string, properties?: ITelemetryTrackProperties) {
		const rootStore = useRootStore();

		const updatedProperties = {
			...properties,
			version_cli: useRootStore().versionCli,
		};

		telemetryApi.track(rootStore.restApiContext, event, updatedProperties);
	}

	page(route: RouteLocation) {
		if (route.path === this.previousPath) {
			// avoid duplicate requests query is changed for example on search page
			return;
		}

		const rootStore = useRootStore();

		this.previousPath = route.path;

		const pageName = String(route.name);
		let properties: Record<string, unknown> = {};
		if (route.meta?.telemetry && typeof route.meta.telemetry.getProperties === 'function') {
			properties = route.meta.telemetry.getProperties(route);
		}

		properties.theme = useUIStore().appliedTheme;

		const category = route.meta?.telemetry?.pageCategory || 'Editor';
		telemetryApi.page(rootStore.restApiContext, category, pageName, properties);
	}

	trackAskAI(event: string, properties: IDataObject = {}) {
		properties.session_id = useRootStore().pushRef;
		properties.ndv_session_id = useNDVStore().pushRef;

		switch (event) {
			case 'askAi.generationFinished':
				this.track('Ai code generation finished', properties);
			default:
				break;
		}
	}

	trackAiTransform(event: string, properties: IDataObject = {}) {
		properties.session_id = useRootStore().pushRef;
		properties.ndv_session_id = useNDVStore().pushRef;

		switch (event) {
			case 'generationFinished':
				this.track('Ai Transform code generation finished', properties);
			default:
				break;
		}
	}

	// We currently do not support tracking directly from within node implementation
	// so we are using this method as centralized way to track node parameters changes
	trackNodeParametersValuesChange(nodeType: string, change: IUpdateInformation) {
		const changeNameMap: { [key: string]: string } = {
			[SLACK_NODE_TYPE]: 'parameters.otherOptions.includeLinkToWorkflow',
			[MICROSOFT_TEAMS_NODE_TYPE]: 'parameters.options.includeLinkToWorkflow',
			[TELEGRAM_NODE_TYPE]: 'parameters.additionalFields.appendAttribution',
		};
		const changeName = changeNameMap[nodeType] || APPEND_ATTRIBUTION_DEFAULT_PATH;
		if (change.name === changeName) {
			this.track('User toggled n8n reference option', {
				node: nodeType,
				toValue: change.value,
			});
		}
	}
}

export const telemetry = new Telemetry();

export const TelemetryPlugin: Plugin = {
	install(app) {
		app.config.globalProperties.$telemetry = telemetry;
	},
};
