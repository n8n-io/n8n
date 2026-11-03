/** A variable as the editor reads it from `/variables`. */
export interface EnvironmentVariable {
	id: string;
	key: string;
	value: string;
	project?: { id: string; name: string } | null;
}

/** The editor input for a new variable. A `null` or absent `projectId` creates a global variable. */
export interface CreateEnvironmentVariable {
	key: string;
	value: string;
	projectId?: string | null;
}
