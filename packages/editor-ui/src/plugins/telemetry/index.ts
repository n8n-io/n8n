import type { Plugin } from 'vue';
import type { ITelemetrySettings, ITelemetryTrackProperties, IDataObject } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

import type { INodeCreateElement, IUpdateInformation } from '@/Interface';
import type { IUserNodesPanelSession } from './telemetry.types';
import {
	APPEND_ATTRIBUTION_DEFAULT_PATH,
	MICROSOFT_TEAMS_NODE_TYPE,
	SLACK_NODE_TYPE,
	TELEGRAM_NODE_TYPE,
} from '@/constants';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNDVStore } from '@/stores/ndv.store';
import { usePostHog } from '@/stores/posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTelemetryStore } from '@/stores/telemetry.store';
import { useUIStore } from '@/stores/ui.store';

export class Telemetry {
	private pageEventQueue: Array<{ route: RouteLocation }>;

	private previousPath: string;

	private get rudderStack() {
		return window.rudderanalytics;
	}

	private userNodesPanelSession: IUserNodesPanelSession = {
		pushRef: '',
		data: {
			nodeFilter: '',
			resultsNodes: [],
			filterMode: 'Regular',
		},
	};

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
			config: { key, url },
		} = telemetrySettings;

		const settingsStore = useSettingsStore();
		const rootStore = useRootStore();

		const logLevel = settingsStore.logLevel;

		const logging = logLevel === 'debug' ? { logLevel: 'DEBUG' } : {};

		this.initRudderStack(key, url, {
			integrations: { All: false },
			loadIntegration: false,
			configUrl: 'https://api-rs.n8n.io',
			...logging,
		});
		useTelemetryStore().init(this);

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
			this.rudderStack.identify(
				`${instanceId}#${userId}${projectId ? '#' + projectId : ''}`,
				traits,
			);
		} else {
			this.rudderStack.reset();
		}
	}

	track(
		event: string,
		properties?: ITelemetryTrackProperties,
		options: { withPostHog?: boolean } = {},
	) {
		if (!this.rudderStack) return;

		const updatedProperties = {
			...properties,
			version_cli: useRootStore().versionCli,
		};

		this.rudderStack.track(event, updatedProperties);

		if (options.withPostHog) {
			usePostHog().capture(event, updatedProperties);
		}
	}

	page(route: Route) {
		if (this.rudderStack) {
			if (route.path === this.previousPath) {
				// avoid duplicate requests query is changed for example on search page
				return;
			}
			this.previousPath = route.path;

			const pageName = route.name;
			let properties: { [key: string]: string } = {};
			if (route.meta?.telemetry && typeof route.meta.telemetry.getProperties === 'function') {
				properties = route.meta.telemetry.getProperties(route);
			}

			properties.theme = useUIStore().appliedTheme;

			const category = route.meta?.telemetry?.pageCategory || 'Editor';
			this.rudderStack.page(category, pageName, properties);
		} else {
			this.pageEventQueue.push({
				route,
			});
		}
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
					this.track('Ai code generation finished', properties, { withPostHog: true });
				default:
					break;
			}
		}
	}

	trackNodesPanel(event: string, properties: IDataObject = {}) {
		if (this.rudderStack) {
			properties.nodes_panel_session_id = this.userNodesPanelSession.pushRef;
			switch (event) {
				case 'nodeView.createNodeActiveChanged':
					if (properties.createNodeActive !== false) {
						this.resetNodesPanelSession();
						properties.nodes_panel_session_id = this.userNodesPanelSession.pushRef;
						this.track('User opened nodes panel', properties);
					}
					break;
				case 'nodeCreateList.destroyed':
					if (
						this.userNodesPanelSession.data.nodeFilter.length > 0 &&
						this.userNodesPanelSession.data.nodeFilter !== ''
					) {
						this.track('User entered nodes panel search term', this.generateNodesPanelEvent());
					}
					break;
				case 'nodeCreateList.nodeFilterChanged':
					if (
						(properties.newValue as string).length === 0 &&
						this.userNodesPanelSession.data.nodeFilter.length > 0
					) {
						this.track('User entered nodes panel search term', this.generateNodesPanelEvent());
					}

					if (
						(properties.newValue as string).length > ((properties.oldValue as string) || '').length
					) {
						this.userNodesPanelSession.data.nodeFilter = properties.newValue as string;
						this.userNodesPanelSession.data.resultsNodes = (
							(properties.filteredNodes || []) as INodeCreateElement[]
						).map((node: INodeCreateElement) => node.key);
					}
					break;
				case 'nodeCreateList.onCategoryExpanded':
					properties.is_subcategory = false;
					properties.nodes_panel_session_id = this.userNodesPanelSession.pushRef;
					this.track('User viewed node category', properties);
					break;
				case 'nodeCreateList.onViewActions':
					properties.nodes_panel_session_id = this.userNodesPanelSession.pushRef;
					this.track('User viewed node actions', properties);
					break;
				case 'nodeCreateList.onActionsCustmAPIClicked':
					properties.nodes_panel_session_id = this.userNodesPanelSession.pushRef;
					this.track('User clicked custom API from node actions', properties);
					break;
				case 'nodeCreateList.addAction':
					properties.nodes_panel_session_id = this.userNodesPanelSession.pushRef;
					this.track('User added action', properties);
					break;
				case 'nodeCreateList.onSubcategorySelected':
					properties.category_name = properties.subcategory;
					properties.is_subcategory = true;
					properties.nodes_panel_session_id = this.userNodesPanelSession.pushRef;
					delete properties.selected;
					this.track('User viewed node category', properties);
					break;
				case 'nodeView.addNodeButton':
					this.track('User added node to workflow canvas', properties, { withPostHog: true });
					break;
				case 'nodeView.addSticky':
					this.track('User inserted workflow note', properties);
					break;
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
				this.track(
					'User toggled n8n reference option',
					{
						node: nodeType,
						toValue: change.value,
					},
					{ withPostHog: true },
				);
			}
		}
	}

	private resetNodesPanelSession() {
		this.userNodesPanelSession.pushRef = `nodes_panel_session_${new Date().valueOf()}`;
		this.userNodesPanelSession.data = {
			nodeFilter: '',
			resultsNodes: [],
			filterMode: 'All',
		};
	}

	private generateNodesPanelEvent() {
		return {
			search_string: this.userNodesPanelSession.data.nodeFilter,
			results_count: this.userNodesPanelSession.data.resultsNodes.length,
			filter_mode: this.userNodesPanelSession.data.filterMode,
			nodes_panel_session_id: this.userNodesPanelSession.pushRef,
		};
	}

	private initRudderStack(key: string, url: string, options: IDataObject) {
		window.rudderanalytics = window.rudderanalytics || [];

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
		this.rudderStack.load(key, url, options);
	}
}

export const telemetry = new Telemetry();

export const TelemetryPlugin: Plugin<{}> = {
	install(app) {
		app.config.globalProperties.$telemetry = telemetry;
	},
};
