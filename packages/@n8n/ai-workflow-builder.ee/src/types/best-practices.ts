import type { WorkflowTechniqueType } from './categorization';

/**
 * Interface for best practices documentation for a specific workflow technique
 */
export interface BestPracticesDocument {
	/** The workflow technique this documentation covers */
	readonly technique: WorkflowTechniqueType;

	/** Version of the documentation */
	readonly version: string;

	/**
	 * Returns the full documentation as a markdown-formatted string
	 */
	getDocumentation(): string;
}
