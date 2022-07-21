import _Vue from "vue";
import {
	ITelemetrySettings,
	ITelemetryTrackProperties,
	IDataObject,
} from 'n8n-workflow';
import { Route } from "vue-router";
import posthog from "posthog-js";

import { POSTHOG_API_KEY, POSTHOG_API_HOST } from "@/constants";

import type { ILogLevel, INodeCreateElement, IRootState } from "@/Interface";
import type { Store } from "vuex";
import type { IUserNodesPanelSession } from "./telemetry.types";

export function TelemetryPlugin(vue: typeof _Vue): void {
	const telemetry = new Telemetry();

	Object.defineProperty(vue, '$telemetry', {
		get() { return telemetry; },
	});
	Object.defineProperty(vue.prototype, '$telemetry', {
		get() { return telemetry; },
	});
}

export class Telemetry {

	private pageEventQueue: Array<{route: Route}>;
	private previousPath: string;
	private store: Store<IRootState> | null;

	private logLevel: string | null = null;

	private get rudderStack() {
		// @ts-ignore
		return window.rudderanalytics;
	}

	private postHogInitialized = false;

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

	init(
		telemetrySettings: ITelemetrySettings,
		{ instanceId, logLevel, userId, store, deploymentType }: {
			instanceId: string;
			logLevel?: ILogLevel;
			userId?: string;
			store: Store<IRootState>;
			deploymentType: string;
	 },
	) {
		if (!telemetrySettings.enabled) return;

		if (logLevel) this.logLevel = logLevel;

		this.store = store; // @TODO: Look into removing store from class

		if (!this.postHogInitialized) {

			/**
			 * @TODO: If initPostHog() is called from inside class/plugin,
			 * self-capture events are not sent and feature flags are not checked,
			 * so calling directly from App.vue for now
			 *
			 * @TODO: After completion, set `disableSessionRecording` to the following check:
			 * `!['desktop_mac', 'desktop_win', 'cloud'].includes(this.deploymentType)`
			 */
			this.initPostHog({ disableSessionRecording: true });

			this.identify(instanceId, userId);
		}

		if (!this.rudderStack && telemetrySettings.config) {
			const logging = this.logLevel === 'debug' ? { logLevel: 'DEBUG' } : {};

			this.initRudderStack(
				telemetrySettings.config.key,
				telemetrySettings.config.url,
				{
					integrations: { All: false },
					loadIntegration: false,
					...logging,
				},
			);
		}

		this.identify(instanceId, userId);

		if (this.rudderStack) {
			this.flushPageEvents();
			this.track('Session started', { session_id: store.getters.sessionId });
		}
	}

	/**
	 * Identify instance and user or only instance with all telemetry services.
	 */
	identify(instanceId: string, userId?: string) {
		const traits = { instance_id: instanceId };

		if (userId) {
			const fullId = [instanceId, userId].join('#');
			if (this.rudderStack) this.rudderStack.identify(fullId, traits);
			if (this.postHogInitialized) posthog.identify(fullId, traits);
			return;
		}

		if (this.rudderStack) {
			this.rudderStack.reset();
			this.rudderStack.identify(undefined, traits);
		}

		if (this.postHogInitialized) {
			posthog.reset();
			posthog.identify(undefined, traits);
		}
	}

	track(event: string, properties?: ITelemetryTrackProperties) {
		if (!this.rudderStack) return;

		const updatedProperties = {
			...properties,
			version_cli: this.store && this.store.getters.versionCli,
		};

		this.rudderStack.track(event, updatedProperties);
	}

	page(route: Route) {
		if (this.rudderStack)	{
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
			this.rudderStack.page(category, pageName, properties);
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
					if(this.userNodesPanelSession.data.nodeFilter.length > 0 && this.userNodesPanelSession.data.nodeFilter !== '') {
						this.track('User entered nodes panel search term', this.generateNodesPanelEvent());
					}
					break;
				case 'nodeCreateList.nodeFilterChanged':
					if((properties.newValue as string).length === 0 && this.userNodesPanelSession.data.nodeFilter.length > 0) {
						this.track('User entered nodes panel search term', this.generateNodesPanelEvent());
					}

					if((properties.newValue as string).length > (properties.oldValue as string || '').length) {
						this.userNodesPanelSession.data.nodeFilter = properties.newValue as string;
						this.userNodesPanelSession.data.resultsNodes = ((properties.filteredNodes || []) as INodeCreateElement[]).map((node: INodeCreateElement) => node.key);
					}
					break;
				case 'nodeCreateList.onCategoryExpanded':
					properties.is_subcategory = false;
					this.track('User viewed node category', properties);
					break;
				case 'nodeCreateList.onSubcategorySelected':
					const selectedProperties = (properties.selected as IDataObject).properties as IDataObject;
					if(selectedProperties && selectedProperties.subcategory) {
						properties.category_name = selectedProperties.subcategory;
					}
					properties.is_subcategory = true;
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

	private initRudderStack(key: string, url: string, options: IDataObject) {
		// @ts-ignore
		window.rudderanalytics = window.rudderanalytics || [];

		this.rudderStack.methods = ["load", "page", "track", "identify", "alias", "group", "ready", "reset", "getAnonymousId", "setAnonymousId"];
		this.rudderStack.factory = (t: any) => { // tslint:disable-line:no-any
			return (...args: any[]) => { // tslint:disable-line:no-any
				const r = Array.prototype.slice.call(args);
				r.unshift(t);
				this.rudderStack.push(r);
				return this.rudderStack;
			};
		};

		for (let t = 0; t < this.rudderStack.methods.length; t++) {
			const r = this.rudderStack.methods[t];
			this.rudderStack[r] = this.rudderStack.factory(r);
		}

		this.rudderStack.loadJS = () => {
			const r = document.createElement("script");
			r.type = "text/javascript";
			r.async = !0;
			r.src = "https://cdn.rudderlabs.com/v1/rudder-analytics.min.js";
			const a = document.getElementsByTagName("script")[0];
			if(a && a.parentNode) {
				a.parentNode.insertBefore(r, a);
			}
		};
		this.rudderStack.loadJS();
		this.rudderStack.load(key, url, options);
	}

	// @TODO: After moving call to init(), set to private
	initPostHog({ disableSessionRecording }: { disableSessionRecording: boolean }) {
		posthog.init(POSTHOG_API_KEY, {
			api_host: POSTHOG_API_HOST,
			autocapture: false, // @TODO: Confirm later if needed for session recording, if so enable
			disable_session_recording: disableSessionRecording,
		});

		// @TODO: After completion, make conditional on `this.logLevel === 'debug'`
		// to prevent debug noise from Rudderstack
		posthog.debug();

		this.postHogInitialized = true;
	}
}
