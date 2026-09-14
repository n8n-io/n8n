import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

export type { WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

/** Load test cases with their file slugs (for LangSmith dataset sync derived IDs). */
export function loadWorkflowTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return loadEvalCasesFromDir(__dirname, filter, exclude);
}
