import { ifIn, type CompletionContext } from '@codemirror/autocomplete';
import { blankCompletions } from './blank.completions';
import { bracketAccessCompletions } from './bracketAccess.completions';
import { datatypeCompletions } from './datatype.completions';
import { dollarCompletions } from './dollar.completions';
import { nonDollarCompletions } from './nonDollar.completions';
import type { Workflow } from 'n8n-workflow';
import type { IExecutionResponse } from '@/Interface';

export function n8nCompletionSources(workflow: Workflow, executionData: IExecutionResponse | null) {
	return [
		blankCompletions,
		bracketAccessCompletions,
		datatypeCompletions,
		(ctx: CompletionContext) => dollarCompletions(ctx, workflow, executionData),
		nonDollarCompletions,
	].map((source) => ({
		autocomplete: ifIn(['Resolvable'], source),
	}));
}
