import type { LintSource } from '@codemirror/lint';
import { typescriptWorkerFacet } from './facet';

export const typescriptLintSource: LintSource = async (view) => {
	const { worker } = view.state.facet(typescriptWorkerFacet);
	const docLength = view.state.doc.length;

	return (await worker.getDiagnostics()).filter((diag) => {
		return diag.from < docLength && diag.to <= docLength && diag.from >= 0;
	});
};
