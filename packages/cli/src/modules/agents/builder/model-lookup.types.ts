export interface ModelChoice {
	name: string;
	value: string;
	catalogModelId?: string;
	/** Pickers list models with a priority first, highest first. Only the AI Gateway reports one. */
	priority?: number;
}
