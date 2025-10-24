import type { DetectionResult } from './rule.types';

/**
 * Detection report matching the UI structure
 */
export interface DetectionReport {
	generatedAt: Date;
	targetVersion: string;
	currentVersion: string;
	summary: {
		totalIssues: number;
		criticalIssues: number;
	};
	results: DetectionResult[]; // Keep raw results for debugging
}
