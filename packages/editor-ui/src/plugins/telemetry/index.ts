import _Vue from "vue";
import {
	ITelemetrySettings,
	IDataObject,
} from 'n8n-workflow';
import { ILogLevel, INodeCreateElement, IRootState } from "@/Interface";
import { Route } from "vue-router";
import { Store } from "vuex";

declare module 'vue/types/vue' {
	interface Vue {
		$telemetry: Telemetry;
	}
}

export function TelemetryPlugin(vue: typeof _Vue): void {
	const telemetry = new Telemetry();

	Object.defineProperty(vue, '$telemetry', {
		get() { return telemetry; },
	});
	Object.defineProperty(vue.prototype, '$telemetry', {
		get() { return telemetry; },
	});
}

interface IUserNodesPanelSessionData {
	nodeFilter: string;
	resultsNodes: string[];
	filterMode: string;
}

interface IUserNodesPanelSession {
	sessionId: string;
	data: IUserNodesPanelSessionData;
}

class Telemetry {

	private pageEventQueue: Array<{route: Route}>;
	private previousPath: string;
	private store: Store<IRootState> | null;

	private get telemetry() {
		// @ts-ignore
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
		this.store = null;
	}

	init(options: ITelemetrySettings, { instanceId, logLevel, userId, store }: { instanceId: string, logLevel?: ILogLevel, userId?: string, store: Store<IRootState> }) {
		if (options.enabled && !this.telemetry) {
			if(!options.config) {
				return;
			}

			this.store = store;
			const logging = logLevel === 'debug' ? { logLevel: 'DEBUG'} : {};
			this.loadTelemetryLibrary(options.config.key, options.config.url, { integrations: { All: false }, loadIntegration: false, ...logging});
			this.identify(instanceId, userId);
			this.flushPageEvents();
		}
	}

	identify(instanceId: string, userId?: string) {
		const traits = { instance_id: instanceId };
		if (userId) {
			this.telemetry.identify(`${instanceId}#${userId}`, traits);
		}
		else {
			this.telemetry.reset();
			this.telemetry.identify(undefined, traits);
		}
	}

	track(event: string, properties?: IDataObject) {
		if (this.telemetry) {
			this.telemetry.track(event, properties);
		}
	}

	page(route: Route) {
		if (this.telemetry)	{
			if (route.path === this.previousPath) { // avoid duplicate requests query is changed for example on search page
				return;
			}
			this.previousPath = route.path;

			const pageName = route.name;
			let properties: {[key: string]: string} = {};
			if (this.store && route.meta && route.meta.telemetry && typeof route.meta.telemetry.getProperties === 'function') {
				properties = route.meta.telemetry.getProperties(route, this.store);
			}

			const category = (route.meta && route.meta.telemetry && route.meta.telemetry.pageCategory) || 'Editor';
			this.telemetry.page(category, pageName, properties);
		}
		else {
			this.pageEventQueue.push({
				route,
			});
		}
	}

	flushPageEvents() {
		const queue = this.pageEventQueue;
		this.pageEventQueue = [];
		queue.forEach(({route}) => {
			this.page(route);
		});
	}

	trackNodesPanel(event: string, properties: IDataObject = {}) {
		if (this.telemetry) {
			properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
			switch (event) {
				case 'nodeView.createNodeActiveChanged':
					if (properties.createNodeActive !== false) {
						this.resetNodesPanelSession();
						properties.nodes_panel_session_id = this.userNodesPanelSession.sessionId;
						this.telemetry.track('User opened nodes panel', properties);
					}
					break;
				case 'nodeCreateList.selectedTypeChanged':
					this.userNodesPanelSession.data.filterMode = properties.new_filter as string;
					this.telemetry.track('User changed nodes panel filter', properties);
					break;
				case 'nodeCreateList.destroyed':
					if(this.userNodesPanelSession.data.nodeFilter.length > 0 && this.userNodesPanelSession.data.nodeFilter !== '') {
						this.telemetry.track('User entered nodes panel search term', this.generateNodesPanelEvent());
					}
					break;
				case 'nodeCreateList.nodeFilterChanged':
					if((properties.newValue as string).length === 0 && this.userNodesPanelSession.data.nodeFilter.length > 0) {
						this.telemetry.track('User entered nodes panel search term', this.generateNodesPanelEvent());
					}

					if((properties.newValue as string).length > (properties.oldValue as string || '').length) {
						this.userNodesPanelSession.data.nodeFilter = properties.newValue as string;
						this.userNodesPanelSession.data.resultsNodes = ((properties.filteredNodes || []) as INodeCreateElement[]).map((node: INodeCreateElement) => node.key);
					}
					break;
				case 'nodeCreateList.onCategoryExpanded':
					properties.is_subcategory = false;
					this.telemetry.track('User viewed node category', properties);
					break;
				case 'nodeCreateList.onSubcategorySelected':
					const selectedProperties = (properties.selected as IDataObject).properties as IDataObject;
					if(selectedProperties && selectedProperties.subcategory) {
						properties.category_name = selectedProperties.subcategory;
					}
					properties.is_subcategory = true;
					delete properties.selected;
					this.telemetry.track('User viewed node category', properties);
					break;
				case 'nodeView.addNodeButton':
					this.telemetry.track('User added node to workflow canvas', properties);
					break;
				default:
					break;
			}
		}
	}

	private resetNodesPanelSession() {
		this.userNodesPanelSession.sessionId = `nodes_panel_session_${(new Date()).valueOf()}`;
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

	private loadTelemetryLibrary(key: string, url: string, options: IDataObject) {
		// @ts-ignore
		window.rudderanalytics = window.rudderanalytics || [];

		this.telemetry.methods = ["load", "page", "track", "identify", "alias", "group", "ready", "reset", "getAnonymousId", "setAnonymousId"];
		this.telemetry.factory = (t: any) => { // tslint:disable-line:no-any
			return (...args: any[]) => { // tslint:disable-line:no-any
				const r = Array.prototype.slice.call(args);
				r.unshift(t);
				this.telemetry.push(r);
				return this.telemetry;
			};
		};

		for (let t = 0; t < this.telemetry.methods.length; t++) {
			const r = this.telemetry.methods[t];
			this.telemetry[r] = this.telemetry.factory(r);
		}

		this.telemetry.loadJS = () => {
			const r = document.createElement("script");
			r.type = "text/javascript";
			r.async = !0;
			r.src = "https://cdn.rudderlabs.com/v1/rudder-analytics.min.js";
			const a = document.getElementsByTagName("script")[0];
			if(a && a.parentNode) {
				a.parentNode.insertBefore(r, a);
			}
		};
		this.telemetry.loadJS();
		this.telemetry.load(key, url, options);
	}
}
