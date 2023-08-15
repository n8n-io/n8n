import type { Plugin } from 'vue';
import type { IDataObject, ITelemetrySettings, ITelemetryTrackProperties } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

import type { INodeCreateElement, IUpdateInformation } from '@/Interface';
import type { IUserNodesPanelSession, RudderStack } from './telemetry.types';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useTelemetryStore } from '@/stores/telemetry.store';
import { SLACK_NODE_TYPE } from '@/constants';

export class Telemetry {
	constructor(
		private rudderStack: RudderStack,
		private userNodesPanelSession: IUserNodesPanelSession = {
			sessionId: '',
			data: {
				nodeFilter: '',
				resultsNodes: [],
				filterMode: 'Regular',
			},
		},
		private pageEventQueue: Array<{ route: RouteLocation }> = [],
		private previousPath: string = '',
	) {}

	init(
		telemetrySettings: ITelemetrySettings,
		{
			instanceId,
			userId,
			versionCli,
		}: {
			instanceId: string;
			userId?: string;
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

		this.identify(instanceId, userId, versionCli);

		this.flushPageEvents();
		this.track('Session started', { session_id: rootStore.sessionId });
	}

	identify(instanceId: string, userId?: string, versionCli?: string) {
		const traits = { instance_id: instanceId, version_cli: versionCli };
		if (userId) {
			this.rudderStack.identify(`${instanceId}#${userId}`, traits);
		} else {
			this.rudderStack.reset();
		}
	}

	track(event: string, properties?: ITelemetryTrackProperties) {
		if (!this.rudderStack) return;

		const updatedProperties = {
			...properties,
			version_cli: useRootStore().versionCli,
		};

		this.rudderStack.track(event, updatedProperties);
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

	trackNodesPanel(event: string, properties: IDataObject = {}) {
		if (this.rudderStack) {
			properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
			switch (event) {
				case 'nodeView.createNodeActiveChanged':
					if (properties.createNodeActive !== false) {
						this.resetNodesPanelSession();
						properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
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
					properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
					this.track('User viewed node category', properties);
					break;
				case 'nodeCreateList.onViewActions':
					properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
					this.track('User viewed node actions', properties);
					break;
				case 'nodeCreateList.onActionsCustmAPIClicked':
					properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
					this.track('User clicked custom API from node actions', properties);
					break;
				case 'nodeCreateList.addAction':
					properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
					this.track('User added action', properties);
					break;
				case 'nodeCreateList.onSubcategorySelected':
					properties.category_name = properties.subcategory;
					properties.is_subcategory = true;
					properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
					delete properties.selected;
					this.track('User viewed node category', properties);
					break;
				case 'nodeView.addNodeButton':
					this.track('User added node to workflow canvas', properties);
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
			switch (nodeType) {
				case SLACK_NODE_TYPE:
					if (change.name === 'parameters.otherOptions.includeLinkToWorkflow') {
						this.track('User toggled n8n reference option');
					}
					break;

				default:
					break;
			}
		}
	}

	private resetNodesPanelSession() {
		this.userNodesPanelSession.sessionId = `nodes_panel_session_${new Date().valueOf()}`;
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
			nodes_panel_session_id: this.userNodesPanelSession.sessionId,
		};
	}

	private initRudderStack(key: string, url: string, options: IDataObject) {
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

		this.rudderStack.load(key, url, options);
	}
}

export const telemetry = new Telemetry(
	window.rudderanalytics ?? {
		identify: () => {},
		reset: () => {},
		track: () => {},
		page: () => {},
		push: () => {},
		load: () => {},
	},
);

export const TelemetryPlugin: Plugin<{}> = {
	install(app) {
		app.config.globalProperties.$telemetry = telemetry;
	},
};
