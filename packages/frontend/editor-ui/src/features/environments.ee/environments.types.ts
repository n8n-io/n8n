export interface EnvironmentVariable {
	id: string;
	key: string;
	value: string;
	project?: { id: string; name: string } | null;
}
