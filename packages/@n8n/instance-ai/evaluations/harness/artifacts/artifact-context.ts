// ---------------------------------------------------------------------------
// Render non-workflow artifacts (agent, config-eval) into judge context.
//
// Walks every non-workflow handler in the registry (workflow is rendered
// separately via buildWorkflowContextBlock), discovers artifacts from the
// captured messages, fetches + renders the found ones, and emits one section
// per type with a "(no <type> produced)" fallback — mirroring the workflow
// block's "(no workflow built)". Authors then assert existence, absence and
// content through ordinary outcome expectations; there is no separate artifact
// judge or scoring path.
// ---------------------------------------------------------------------------

import { ARTIFACT_HANDLERS } from './registry';
import type { N8nClient } from '../../clients/n8n-client';
import type { ArtifactRef } from '../../types';
import type { EvalLogger } from '../logger';

/** Section heading per non-workflow artifact type. */
const SECTION_TITLES: Record<string, string> = {
	agent: 'Agent',
	'config-eval': 'Config-eval',
};

/**
 * Build the rendered agent/config-eval context block appended to the judge prompt.
 * Returns `undefined` when there are no non-workflow handlers to render (nothing to add).
 */
export async function resolveArtifactContext(args: {
	artifactRefs: ArtifactRef[];
	client: N8nClient;
	logger: EvalLogger;
}): Promise<string | undefined> {
	const { artifactRefs, client, logger } = args;
	const sections: string[] = [];

	for (const handler of ARTIFACT_HANDLERS) {
		// Workflow is rendered separately (buildWorkflowContextBlock) and graded via scenarios.
		if (handler.type === 'workflow') continue;

		const title = SECTION_TITLES[handler.type] ?? handler.type;
		const refs = handler.discover({ artifactRefs });
		if (refs.length === 0) {
			sections.push(`## ${title}\n\n(no ${handler.type} produced)`);
			continue;
		}

		const rendered: string[] = [];
		for (const ref of refs) {
			try {
				const fetched = await handler.fetch(ref, client);
				rendered.push(handler.renderArtifact(fetched));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				logger.warn(`  Artifact fetch failed for ${handler.type} ${ref.id}: ${message}`);
				// Discovery found the artifact but it couldn't be fetched — surface that instead
				// of the "(no … produced)" fallback so the judge doesn't read it as absent.
				rendered.push(`(${handler.type} produced but could not be rendered: ${message})`);
			}
		}
		sections.push(`## ${title}\n\n${rendered.join('\n\n')}`);
	}

	return sections.length > 0 ? sections.join('\n\n') : undefined;
}
