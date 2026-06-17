export interface EnvironmentVariable {
	id: string;
	key: string;
	value: string;
	project?: { id: string; name: string } | null;
}

export interface CreateEnvironmentVariable {
	key: string;
	value: string;
	projectId?: string | null;
}

export interface UpdateEnvironmentVariable extends CreateEnvironmentVariable {
	id: string;
}
