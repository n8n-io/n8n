import _Vue from 'vue';
import { ITelemetrySettings, ITelemetryTrackProperties, IDataObject } from 'n8n-workflow';
import { Route } from 'vue-router';

import type { INodeCreateElement } from '@/Interface';
import type { IUserNodesPanelSession } from './telemetry.types';
import { useSettingsStore } from '@/stores/settings';
import { useRootStore } from '@/stores/n8nRootStore';
import { useTelemetryStore } from '@/stores/telemetry';

export class Telemetry {
	private pageEventQueue: Array<{ route: Route }>;
	private previousPath: string;

	private get rudderStack() {
		return window.rudderanalytics;
	}

	private userNodesPanelSession: IUserNodesPanelSession = {
		sessionId: '',
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
			if (
				route.meta &&
				route.meta.telemetry &&
				typeof route.meta.telemetry.getProperties === 'function'
			) {
				properties = route.meta.telemetry.getProperties(route);
			}

			const category =
				(route.meta && route.meta.telemetry && route.meta.telemetry.pageCategory) || 'Editor';
			this.rudderStack.page(category, pageName!, properties);
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
				case 'nodeCreateList.selectedTypeChanged':
					this.userNodesPanelSession.data.filterMode = properties.new_filter as string;
					this.track('User changed nodes panel filter', properties);
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
					const selectedProperties = (properties.selected as IDataObject).properties as IDataObject;
					if (selectedProperties && selectedProperties.subcategory) {
						properties.category_name = selectedProperties.subcategory;
					}
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

export function TelemetryPlugin(vue: typeof _Vue): void {
	Object.defineProperty(vue, '$telemetry', {
		get() {
			return telemetry;
		},
	});
	Object.defineProperty(vue.prototype, '$telemetry', {
		get() {
			return telemetry;
		},
	});
}
