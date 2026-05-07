export interface MultiMainStrategy {
	init(): Promise<void>;
	shutdown(): Promise<void>;
	checkLeader(): Promise<void>;
	fetchLeaderKey(): Promise<string | null>;
}
