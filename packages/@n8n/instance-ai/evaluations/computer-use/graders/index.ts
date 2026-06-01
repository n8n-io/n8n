// ---------------------------------------------------------------------------
// Grader registry — dispatches a Grader spec to its concrete implementation.
// ---------------------------------------------------------------------------

import { gradeFileExists, gradeFileMatches, gradeFileNotExists } from './fs';
import { gradeNoSecretLeak } from './security';
import {
	gradeBudget,
	gradeFinalTextMatches,
	gradeMustCallMcpServer,
	gradeMustCallTool,
	gradeMustNotCallMcpServer,
	gradeMustNotCallTool,
	gradeMustNotLoop,
	gradeMustReachUrl,
	gradeToolsMustNotError,
} from './trace';
import type { Grader, GraderResult, ScenarioTrace } from '../types';

export interface GradeContext {
	sandboxDir: string;
	trace: ScenarioTrace;
}

export async function applyGrader(grader: Grader, ctx: GradeContext): Promise<GraderResult> {
	switch (grader.type) {
		case 'trace.mustCallTool':
			return gradeMustCallTool(ctx.trace, grader);
		case 'trace.mustNotCallTool':
			return gradeMustNotCallTool(ctx.trace, grader);
		case 'trace.mustCallMcpServer':
			return gradeMustCallMcpServer(ctx.trace, grader);
		case 'trace.mustNotCallMcpServer':
			return gradeMustNotCallMcpServer(ctx.trace, grader);
		case 'trace.mustNotLoop':
			return gradeMustNotLoop(ctx.trace, grader);
		case 'trace.budget':
			return gradeBudget(ctx.trace, grader);
		case 'trace.finalTextMatches':
			return gradeFinalTextMatches(ctx.trace, grader);
		case 'trace.mustReachUrl':
			return gradeMustReachUrl(ctx.trace, grader);
		case 'trace.toolsMustNotError':
			return gradeToolsMustNotError(ctx.trace, grader);
		case 'fs.fileExists':
			return await gradeFileExists(ctx.sandboxDir, grader);
		case 'fs.fileNotExists':
			return await gradeFileNotExists(ctx.sandboxDir, grader);
		case 'fs.fileMatches':
			return await gradeFileMatches(ctx.sandboxDir, grader);
		case 'security.noSecretLeak':
			return gradeNoSecretLeak(ctx.trace, grader);
	}
}
