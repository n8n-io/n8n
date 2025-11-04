/**
 * Local Telemetry Plugin
 *
 * Sends telemetry events to local n8n API instead of external services.
 * Features:
 * - Batch reporting with 500ms debounce
 * - LocalStorage queue persistence
 * - Automatic retry on failure
 */

import type { Plugin } from 'vue';
import type { ITelemetrySettings } from '@n8n/api-types';
import type { ITelemetryTrackProperties, IDataObject } from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';
import { sendTelemetryEventsBatch } from '@n8n/rest-api-client/api/telemetry';

interface QueuedEvent {
	event_name: string;
	properties?: ITelemetryTrackProperties;
	timestamp: string;
}

const STORAGE_KEY = 'n8n-telemetry-queue';
const BATCH_INTERVAL = 500; // 500ms debounce
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

export class Telemetry {
	private pageEventQueue: Array<{ route: RouteLocation }> = [];
	private previousPath = '';
	private eventQueue: QueuedEvent[] = [];
	private batchTimer: NodeJS.Timeout | null = null;
	private instanceId = '';
	private userId?: string;
	private retryCount = 0;

	constructor() {
		console.log('[Telemetry] Using local telemetry system');
		this.loadQueueFromStorage();
	}

	/**
	 * Initialize telemetry
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
		this.instanceId = config.instanceId;
		this.userId = config.userId;
		console.log('[Telemetry] Initialized with local API endpoint');
	}

	/**
	 * Identify user (no-op for now)
	 */
	identify(instanceId: string, userId?: string, versionCli?: string, projectId?: string) {
		this.instanceId = instanceId;
		this.userId = userId;
	}

	/**
	 * Track event with batch reporting
	 */
	track(event: string, properties?: ITelemetryTrackProperties) {
		// Add to queue
		this.eventQueue.push({
			event_name: event,
			properties: properties || {},
			timestamp: new Date().toISOString(),
		});

		// Limit queue size
		if (this.eventQueue.length > MAX_QUEUE_SIZE) {
			this.eventQueue.shift();
		}

		// Save to LocalStorage
		this.saveQueueToStorage();

		// Schedule batch send with debounce
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
		}

		this.batchTimer = setTimeout(() => {
			void this.flush();
		}, BATCH_INTERVAL);
	}

	/**
	 * Track page view (no-op for now)
	 */
	page(route: RouteLocation) {
		// Could implement page tracking here if needed
		// For now, just track as regular event
		this.track('Page viewed', {
			path: route.path,
			name: route.name as string,
		});
	}

	/**
	 * Reset telemetry
	 */
	reset() {
		this.eventQueue = [];
		this.pageEventQueue = [];
		this.saveQueueToStorage();
	}

	/**
	 * Flush page events
	 */
	flushPageEvents() {
		this.pageEventQueue = [];
	}

	/**
	 * Flush events to server
	 */
	private async flush() {
		if (this.eventQueue.length === 0) return;

		const eventsToSend = [...this.eventQueue];
		this.eventQueue = [];
		this.saveQueueToStorage();

		try {
			// Dynamically import useRootStore to avoid circular dependencies
			const { useRootStore } = await import('@n8n/stores/useRootStore');
			const rootStore = useRootStore();

			await sendTelemetryEventsBatch(rootStore.restApiContext, {
				events: eventsToSend,
			});

			// Reset retry count on success
			this.retryCount = 0;
		} catch (error) {
			console.error('[Telemetry] Failed to send events:', error);

			// Retry logic
			if (this.retryCount < MAX_RETRIES) {
				this.retryCount++;
				// Put events back in queue
				this.eventQueue.unshift(...eventsToSend);
				this.saveQueueToStorage();

				// Retry after exponential backoff
				setTimeout(() => {
					void this.flush();
				}, 1000 * Math.pow(2, this.retryCount));
			} else {
				console.error('[Telemetry] Max retries reached, dropping events');
				this.retryCount = 0;
			}
		}
	}

	/**
	 * Save queue to LocalStorage
	 */
	private saveQueueToStorage() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.eventQueue));
		} catch (error) {
			console.error('[Telemetry] Failed to save queue to storage:', error);
		}
	}

	/**
	 * Load queue from LocalStorage
	 */
	private loadQueueFromStorage() {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				this.eventQueue = JSON.parse(stored);
				// Flush old events on next tick
				setTimeout(() => {
					void this.flush();
				}, 1000);
			}
		} catch (error) {
			console.error('[Telemetry] Failed to load queue from storage:', error);
		}
	}
}

let telemetryInstance: Telemetry | undefined;

export const useTelemetry = (): Telemetry => {
	if (!telemetryInstance) {
		telemetryInstance = new Telemetry();
	}
	return telemetryInstance;
};

// Export singleton instance for direct import
export const telemetry = useTelemetry();

export const TelemetryPlugin: Plugin = {
	install(app) {
		console.log('[Telemetry] Telemetry plugin loaded (local tracking enabled)');
	},
};
