export interface ModelChoice {
	name: string;
	value: string;
	/** Pickers list models with a priority first, highest first. Only the AI Gateway reports one. */
	priority?: number;
	/** The model a Microsoft Foundry deployment serves, for example `gpt-4.1`. */
	servedModel?: string;
}
