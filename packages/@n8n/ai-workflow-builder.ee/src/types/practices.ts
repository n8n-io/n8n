import type { WorkflowTechniqueType } from './categorization';

export interface TechniqueBestPractice {
	version: string;
	technique: WorkflowTechniqueType;
	sections: Section[];
}

export type GuidelineCategory =
	| 'workflow_design'
	| 'error_handling'
	| 'security_compliance'
	| 'performance'
	| 'looping_pagination'
	| 'data_handling'
	| 'observability'
	| 'other';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Section {
	name: string;
	guidelines?: Guideline[];
	nodeRecommendations?: NodeRecommendation[];
}

export interface Guideline {
	text: string;
	category: GuidelineCategory;
	priority: Priority;
}

export interface NodeRecommendation {
	name: string;
	purpose: string;
	/** Any warnings to provide the agent about this node */
	pitfalls?: string[];
}
