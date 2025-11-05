import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
	TelemetryEventDto,
	TelemetryStatsOverview,
	TelemetryTopEvent,
	TelemetryActiveUserStat,
} from '@n8n/api-types';

export type TopEvent = TelemetryTopEvent;
export type ActiveUserStats = TelemetryActiveUserStat[];

interface EventFilters {
	eventName?: string;
	userId?: string;
	source?: 'frontend' | 'backend';
	startDate?: string;
	endDate?: string;
}

interface PaginationState {
	page: number;
	limit: number;
	total: number;
}

export const useTelemetryStore = defineStore('telemetry', () => {
	// State
	const events = ref<TelemetryEventDto[]>([]);
	const overview = ref<TelemetryStatsOverview | null>(null);
	const topEvents = ref<TopEvent[]>([]);
	const activeUsersData = ref<ActiveUserStats | null>(null);
	const loading = ref(false);
	const filters = ref<EventFilters>({});
	const pagination = ref<PaginationState>({
		page: 1,
		limit: 50,
		total: 0,
	});

	// Computed
	const hasFilters = computed(() => {
		return Object.keys(filters.value).length > 0;
	});

	const totalPages = computed(() => {
		return Math.ceil(pagination.value.total / pagination.value.limit);
	});

	// Actions
	async function fetchEvents(reset = false) {
		if (reset) {
			pagination.value.page = 1;
		}

		loading.value = true;
		try {
			const params = new URLSearchParams({
				page: String(pagination.value.page),
				limit: String(pagination.value.limit),
				...filters.value,
			});

			const response = await fetch(`/rest/telemetry/events?${params}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch events: ${response.statusText}`);
			}

			const data = await response.json();
			events.value = data.events || [];
			pagination.value.total = data.total || 0;
		} catch (error) {
			console.error('[Telemetry] Failed to fetch events:', error);
			events.value = [];
		} finally {
			loading.value = false;
		}
	}

	async function fetchOverview(days = 30) {
		loading.value = true;
		try {
			const params = new URLSearchParams({ days: String(days) });
			const response = await fetch(`/rest/telemetry/stats/overview?${params}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch overview: ${response.statusText}`);
			}

			overview.value = await response.json();
		} catch (error) {
			console.error('[Telemetry] Failed to fetch overview:', error);
			overview.value = null;
		} finally {
			loading.value = false;
		}
	}

	async function fetchTopEvents(limit = 10, days = 30) {
		loading.value = true;
		try {
			const params = new URLSearchParams({
				limit: String(limit),
				days: String(days),
			});
			const response = await fetch(`/rest/telemetry/stats/top-events?${params}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch top events: ${response.statusText}`);
			}

			const data = await response.json();
			topEvents.value = data.events || [];
		} catch (error) {
			console.error('[Telemetry] Failed to fetch top events:', error);
			topEvents.value = [];
		} finally {
			loading.value = false;
		}
	}

	async function fetchActiveUsers(days = 30) {
		loading.value = true;
		try {
			const params = new URLSearchParams({ days: String(days) });
			const response = await fetch(`/rest/telemetry/stats/active-users?${params}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch active users: ${response.statusText}`);
			}

			const data = await response.json();
			activeUsersData.value = data.stats || [];
		} catch (error) {
			console.error('[Telemetry] Failed to fetch active users:', error);
			activeUsersData.value = null;
		} finally {
			loading.value = false;
		}
	}

	async function exportEvents(format: 'csv' | 'json' = 'csv') {
		try {
			const params = new URLSearchParams({
				format,
				...filters.value,
			});

			const response = await fetch(`/rest/telemetry/export?${params}`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(`Export failed: ${response.statusText}`);
			}

			// 下载文件
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `telemetry-events-${new Date().toISOString()}.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('[Telemetry] Export failed:', error);
			throw error;
		}
	}

	function setFilters(newFilters: EventFilters) {
		filters.value = { ...newFilters };
	}

	function clearFilters() {
		filters.value = {};
	}

	function setPage(page: number) {
		pagination.value.page = page;
	}

	function setLimit(limit: number) {
		pagination.value.limit = limit;
		pagination.value.page = 1; // Reset to first page
	}

	function reset() {
		events.value = [];
		overview.value = null;
		topEvents.value = [];
		activeUsersData.value = null;
		filters.value = {};
		pagination.value = {
			page: 1,
			limit: 50,
			total: 0,
		};
	}

	return {
		// State
		events,
		overview,
		topEvents,
		activeUsersData,
		loading,
		filters,
		pagination,

		// Computed
		hasFilters,
		totalPages,

		// Actions
		fetchEvents,
		fetchOverview,
		fetchTopEvents,
		fetchActiveUsers,
		exportEvents,
		setFilters,
		clearFilters,
		setPage,
		setLimit,
		reset,
	};
});
