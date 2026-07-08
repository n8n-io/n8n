// ---------------------------------------------------------------------------
// Resolve per-artifact verdicts for a test case after a build. Walks every
// non-workflow handler in the registry (workflow is graded via the existing
// scenario/expectation path and is never handled here), discovers artifacts
// from the captured messages, and judges expected ones against the case's
// artifactExpectations. Pure(ish) core — unit-testable independent of the
// runner, which just wires messages/testCase/client/logger through.
// ---------------------------------------------------------------------------

import type { InstanceAiMessage } from '@n8n/api-types';

import { ARTIFACT_HANDLERS } from './registry';
import { runAssertionJudge } from '../../build-expectations/assertion-judge';
import type { N8nClient } from '../../clients/n8n-client';
import type { ArtifactType, ArtifactVerdict, WorkflowTestCase } from '../../types';
import type { EvalLogger } from '../logger';

export async function resolveArtifactResults(args: {
	messages: InstanceAiMessage[];
	testCase: WorkflowTestCase;
	client: N8nClient;
	logger: EvalLogger;
}): Promise<ArtifactVerdict[]> {
	const { messages, testCase, client, logger } = args;
	const expected = new Set<ArtifactType>(testCase.expectedArtifacts ?? ['workflow']);
	const verdicts: ArtifactVerdict[] = [];

	for (const handler of ARTIFACT_HANDLERS) {
		// Workflow is execution-graded (scored via the scenario/expectation path), not here.
		// The literal check (vs runsExecutionScenarios) also narrows the type for the index below.
		if (handler.type === 'workflow') continue;

		const refs = handler.discover({ messages });
		if (refs.length === 0) continue;

		if (!expected.has(handler.type)) {
			for (const ref of refs) {
				verdicts.push({
					type: handler.type,
					id: ref.id,
					pass: false,
					unexpected: true,
					reason: `unexpected ${handler.type} artifact produced (not in expectedArtifacts)`,
				});
			}
			continue;
		}

		const assertions = testCase.artifactExpectations?.[handler.type] ?? [];
		for (const ref of refs) {
			try {
				const fetched = await handler.fetch(ref, client);
				const rendered = handler.renderArtifact(fetched);
				const expectationResults = await runAssertionJudge(rendered, assertions);
				const measured = expectationResults.filter((r) => !r.incomplete);
				const pass = measured.length > 0 && measured.every((r) => r.pass);
				verdicts.push({
					type: handler.type,
					id: ref.id,
					pass,
					expectationResults,
					...(measured.length === 0 ? { incomplete: true } : {}),
				});
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				logger.warn(`  Artifact fetch/judge failed for ${handler.type} ${ref.id}: ${message}`);
				// Discovery already found the ref (the artifact exists), so a fetch/judge
				// failure is an infra issue, not a bad artifact — mark incomplete so it's
				// excluded from the pass-rate denominator (same convention as the
				// dead-judge branch above).
				verdicts.push({
					type: handler.type,
					id: ref.id,
					pass: false,
					incomplete: true,
					reason: `fetch/judge error: ${message}`,
				});
			}
		}
	}

	for (const type of expected) {
		if (type === 'workflow') continue;
		if (verdicts.some((v) => v.type === type)) continue;
		verdicts.push({
			type,
			id: '(none)',
			pass: false,
			reason: `expected ${type} artifact was not produced`,
		});
	}

	return verdicts;
}
