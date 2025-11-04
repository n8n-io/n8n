/**
 * No-Op Telemetry Plugin (RudderStack Removed)
 *
 * This file maintains API compatibility with the original telemetry system
 * but removes all external tracking and analytics functionality.
 *
 * All telemetry methods are now no-op (empty) functions.
 */

import type { Plugin } from 'vue';
import type { ITelemetrySettings } from '@n8n/api-types';
import type { ITelemetryTrackProperties, IDataObject } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';

export class Telemetry {
	private pageEventQueue: Array<{ route: RouteLocation }> = [];
	private previousPath = '';

	constructor() {
		console.log('[Telemetry] Using local telemetry (no external tracking)');
	}

	/**
	 * No-op init - RudderStack removed
	 */
	init(
		telemetrySettings: ITelemetrySettings,
		config: {
			instanceId: string;
			userId?: string;
			projectId?: string;
			versionCli: string;
		},
	) {
		// No external telemetry initialization
		console.log('[Telemetry] Telemetry disabled - no data sent to external servers');
	}

	/**
	 * No-op identify - no user tracking
	 */
	identify(instanceId: string, userId?: string, versionCli?: string, projectId?: string) {
		// No user identification or tracking
	}

	/**
	 * No-op track - events not tracked
	 */
	track(event: string, properties?: ITelemetryTrackProperties) {
		// No event tracking
		// For debugging, you can optionally log locally:
		// console.debug('[Telemetry]', event, properties);
	}

	/**
	 * No-op page - page views not tracked
	 */
	page(route: RouteLocation) {
		// No page tracking
	}

	/**
	 * No-op reset
	 */
	reset() {
		// Nothing to reset
	}

	/**
	 * No-op flush
	 */
	flushPageEvents() {
		this.pageEventQueue = [];
	}
}

let telemetryInstance: Telemetry | undefined;

export const useTelemetry = (): Telemetry => {
	if (!telemetryInstance) {
		telemetryInstance = new Telemetry();
	}
	return telemetryInstance;
};

export const TelemetryPlugin: Plugin = {
	install(app) {
		// No-op plugin installation
		console.log('[Telemetry] Telemetry plugin loaded (tracking disabled)');
	},
};
