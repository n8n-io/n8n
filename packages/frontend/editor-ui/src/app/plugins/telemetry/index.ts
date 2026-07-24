import type { Plugin } from 'vue';
import type { ITelemetrySettings } from '@n8n/api-types';
import type { InferTelemetryProps, TelemetryEventDef } from '@n8n/telemetry';
import { POSTHOG_EVENTS_BLACKLIST } from '@n8n/telemetry';
import type { ITelemetryTrackProperties, IDataObject } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

import type { IUpdateInformation } from '@/Interface';
import type { RudderStack } from './telemetry.types';
import {
	APPEND_ATTRIBUTION_DEFAULT_PATH,
	MICROSOFT_TEAMS_NODE_TYPE,
	SLACK_NODE_TYPE,
	TELEGRAM_NODE_TYPE,
} from '@/app/constants';
import {
	setTelemetry,
	TelemetryKey,
	type Telemetry,
	type TelemetryIdentifyOptions,
} from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { usePostHog } from '@/app/stores/posthog.store';

const POSTHOG_BLACKLISTED_EVENT_NAMES = new Set(
	POSTHOG_EVENTS_BLACKLIST.map((blacklisted) => blacklisted.name),
);

// `Telemetry` is the shared contract; consumers annotate with it. The concrete
// implementation below is registered as the app's instance at bootstrap.
export type { Telemetry, TelemetryIdentifyOptions } from '@n8n/composables/useTelemetry';

export class TelemetryService implements Telemetry {
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
			userRole,
		}: TelemetryIdentifyOptions & { versionCli: string },
	) {
		if (!telemetrySettings.enabled || !telemetrySettings.config || this.rudderStack) return;

		const {
			config: { key, proxy, sourceConfig },
		} = telemetrySettings;

		const rootStore = useRootStore();

		this.initRudderStack(key, proxy, {
			integrations: { All: false },
			loadIntegration: false,
			configUrl: sourceConfig,
		});

		this.identify({ instanceId, userId, versionCli, projectId, userRole });

		this.flushPageEvents();
		this.track('Session started', { session_id: rootStore.pushRef });
	}

	identify({ instanceId, userId, versionCli, projectId, userRole }: TelemetryIdentifyOptions) {
		const settingsStore = useSettingsStore();
		const traits: {
			instance_id: string;
			version_cli?: string;
			user_cloud_id?: string;
			user_role?: string;
		} = {
			instance_id: instanceId,
			version_cli: versionCli,
			user_role: userRole,
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

	track<T extends TelemetryEventDef>(event: T, properties: InferTelemetryProps<T>): void;
	track(event: string, properties?: ITelemetryTrackProperties): void;
	track(event: string | TelemetryEventDef, properties?: ITelemetryTrackProperties) {
		const eventName = typeof event === 'string' ? event : event.name;

		if (typeof event !== 'string') {
			const validationError = event.getValidationError(properties);
			if (validationError) console.warn(validationError);
		}

		if (!this.rudderStack) return;

		const posthogSessionId = window.posthog?.get_session_id?.();

		const updatedProperties = {
			...properties,
			version_cli: useRootStore().versionCli,
			posthog_session_id: posthogSessionId,
		};

		this.rudderStack.track(eventName, updatedProperties, {
			context: {
				// provide a fake IP address to instruct RudderStack to not use the user's IP address
				ip: '0.0.0.0',
			},
		});

		if (!POSTHOG_BLACKLISTED_EVENT_NAMES.has(eventName)) {
			usePostHog().capture(eventName, updatedProperties);
		}
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

	trackAskAI(event: string, ndvPushRef: string, properties: IDataObject = {}) {
		if (this.rudderStack) {
			properties.session_id = useRootStore().pushRef;
			properties.ndv_session_id = ndvPushRef;

			switch (event) {
				case 'askAi.generationFinished':
					this.track('Ai code generation finished', properties);
				default:
					break;
			}
		}
	}

	trackAiTransform(event: string, ndvPushRef: string, properties: IDataObject = {}) {
		if (this.rudderStack) {
			properties.session_id = useRootStore().pushRef;
			properties.ndv_session_id = ndvPushRef;

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

			// Advanced HITL (one-tap approval) opt-in toggles, tracked per node.
			const advancedHitlPathMap: { [key: string]: string } = {
				[SLACK_NODE_TYPE]: 'parameters.captureResponder',
				[TELEGRAM_NODE_TYPE]: 'parameters.chatApproval',
			};
			if (change.name === advancedHitlPathMap[nodeType] && change.value === true) {
				this.track('User enabled advanced HITL', { node_type: nodeType });
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

export const telemetry = new TelemetryService();

// Register the instance so package-side `useTelemetry` (@n8n/composables) can
// resolve it from any context, including outside of component setup.
setTelemetry(telemetry);

export const TelemetryPlugin: Plugin = {
	install(app) {
		app.config.globalProperties.$telemetry = telemetry;
		app.provide(TelemetryKey, telemetry);
	},
};
