import type { Telemetry } from '.';

export interface IUserNodesPanelSession {
	sessionId: string;
	data: IUserNodesPanelSessionData;
}

interface IUserNodesPanelSessionData {
	nodeFilter: string;
	resultsNodes: string[];
	filterMode: string;
}

declare module 'vue/types/vue' {
	interface Vue {
		$telemetry: Telemetry;
	}
}
