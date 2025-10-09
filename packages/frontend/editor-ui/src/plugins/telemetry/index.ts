import type { Plugin } from 'vue';
import type { ITelemetrySettings } from '@n8n/api-types';
import type { ITelemetryTrackProperties, IDataObject } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

import type { IUpdateInformation } from '@/Interface';
import type { RudderStack } from './telemetry.types';
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
import { usePostHog } from '@/stores/posthog.store';

export class Telemetry {
	private pageEventQueue: Array<{ route: RouteLocation }>;

	private previousPath: string;

	private get rudderStack(): RudderStack | undefined {
		return window.rudderanalytics;
	}

	constructor() {
		this.pageEventQueue = [];
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
		if (!telemetrySettings.enabled || !telemetrySettings.config || this.rudderStack) return;

		const {
			config: { key, proxy, sourceConfig },
		} = telemetrySettings;

		const settingsStore = useSettingsStore();
		const rootStore = useRootStore();

		const logLevel = settingsStore.logLevel;

		const logging = logLevel === 'debug' ? { logLevel: 'DEBUG' } : {};

		this.initRudderStack(key, proxy, {
			integrations: { All: false },
			loadIntegration: false,
			configUrl: sourceConfig,
			...logging,
		});

		this.identify(instanceId, userId, versionCli, projectId);

		this.flushPageEvents();
		this.track('Session started', { session_id: rootStore.pushRef });
	}

	identify(instanceId: string, userId?: string, versionCli?: string, projectId?: string) {
		const settingsStore = useSettingsStore();
		const traits: { instance_id: string; version_cli?: string; user_cloud_id?: string } = {
			instance_id: instanceId,
			version_cli: versionCli,
		};

		if (settingsStore.isCloudDeployment) {
			traits.user_cloud_id = settingsStore.settings?.n8nMetadata?.userId ?? '';
		}
		if (userId) {
			this.rudderStack?.identify(
				`${instanceId}#${userId}${projectId ? '#' + projectId : ''}`,
				traits,
				{
					context: {
						// provide a fake IP address to instruct RudderStack to not use the user's IP address
						ip: '0.0.0.0',
					},
				},
			);
		} else {
			this.rudderStack?.reset();
		}
	}

	track(event: string, properties?: ITelemetryTrackProperties) {
		if (!this.rudderStack) return;

		const posthogSessionId = window.posthog?.get_session_id?.();

		const updatedProperties = {
			...properties,
			version_cli: useRootStore().versionCli,
			posthog_session_id: posthogSessionId,
		};

		this.rudderStack.track(event, updatedProperties, {
			context: {
				// provide a fake IP address to instruct RudderStack to not use the user's IP address
				ip: '0.0.0.0',
			},
		});

		usePostHog().capture(event, updatedProperties);
	}

	page(route: RouteLocation) {
		if (this.rudderStack) {
			if (route.path === this.previousPath) {
				// avoid duplicate requests query is changed for example on search page
				return;
			}
			this.previousPath = route.path;

			const pageName = String(route.name);
			let properties: Record<string, unknown> = {};
			if (route.meta?.telemetry && typeof route.meta.telemetry.getProperties === 'function') {
				properties = route.meta.telemetry.getProperties(route);
			}

			properties.theme = useUIStore().appliedTheme;

			const category = route.meta?.telemetry?.pageCategory || 'Editor';
			this.rudderStack.page(category, pageName, properties, {
				context: {
					// provide a fake IP address to instruct RudderStack to not use the user's IP address
					ip: '0.0.0.0',
				},
			});
		} else {
			this.pageEventQueue.push({
				route,
			});
		}
	}

	reset() {
		this.rudderStack?.reset();
	}

	flushPageEvents() {
		const queue = this.pageEventQueue;
		this.pageEventQueue = [];
		queue.forEach(({ route }) => {
			this.page(route);
		});
	}

	trackAskAI(event: string, properties: IDataObject = {}) {
		if (this.rudderStack) {
			properties.session_id = useRootStore().pushRef;
			properties.ndv_session_id = useNDVStore().pushRef;

			switch (event) {
				case 'askAi.generationFinished':
					this.track('Ai code generation finished', properties);
				default:
					break;
			}
		}
	}

	trackAiTransform(event: string, properties: IDataObject = {}) {
		if (this.rudderStack) {
			properties.session_id = useRootStore().pushRef;
			properties.ndv_session_id = useNDVStore().pushRef;

			switch (event) {
				case 'generationFinished':
					this.track('Ai Transform code generation finished', properties);
				default:
					break;
			}
		}
	}

	// We currently do not support tracking directly from within node implementation
	// so we are using this method as centralized way to track node parameters changes
	trackNodeParametersValuesChange(nodeType: string, change: IUpdateInformation) {
		if (this.rudderStack) {
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

	private initRudderStack(key: string, proxy: string, options: IDataObject) {
		window.rudderanalytics = window.rudderanalytics || [];
		if (!this.rudderStack) {
			return;
		}

		this.rudderStack.methods = [
			'load',
			'page',
			'track',
			'identify',
			'alias',
			'group',
			'ready',
			'reset',
			'getAnonymousId',
			'setAnonymousId',
		];

		this.rudderStack.factory = (method: string) => {
			return (...args: unknown[]) => {
				if (!this.rudderStack) {
					throw new Error('RudderStack not initialized');
				}

				const argsCopy = [method, ...args];
				this.rudderStack.push(argsCopy);

				return this.rudderStack;
			};
		};

		for (const method of this.rudderStack.methods) {
			this.rudderStack[method] = this.rudderStack.factory(method);
		}

		this.rudderStack.loadJS = () => {
			const script = document.createElement('script');

			script.type = 'text/javascript';
			script.async = !0;
			script.src = 'https://cdn-rs.n8n.io/v1/ra.min.js';

			const element: Element = document.getElementsByTagName('script')[0];

			if (element && element.parentNode) {
				element.parentNode.insertBefore(script, element);
			}
		};

		this.rudderStack.loadJS();
		this.rudderStack.load(key, proxy, options);
	}
}

export const telemetry = new Telemetry();

export const TelemetryPlugin: Plugin = {
	install(app) {
		app.config.globalProperties.$telemetry = telemetry;
	},
};
