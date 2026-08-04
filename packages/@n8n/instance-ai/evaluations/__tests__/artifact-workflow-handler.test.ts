import type { InstanceAiMessage } from '@n8n/api-types';
import type { Mock } from 'vitest';

import { ALL_CHECKS } from '../binaryChecks/checks';
import type { N8nClient } from '../clients/n8n-client';
import { agentHandler } from '../harness/artifacts/agent-handler';
import { configEvalHandler } from '../harness/artifacts/config-eval-handler';
import { getHandler, ARTIFACT_HANDLERS } from '../harness/artifacts/registry';
import { workflowHandler } from '../harness/artifacts/workflow-handler';
import { buildWorkflowContextBlock } from '../harness/workflow-context';
import { extractWorkflowIdsFromMessages } from '../outcome/workflow-discovery';
import type { ArtifactType } from '../types';
import { agentNode, assistantMessage, workflow } from './fixtures';

describe('workflowHandler', () => {
	it('declares its type, execution mode, and the canonical check suite', () => {
		expect(workflowHandler.type).toBe('workflow');
		expect(workflowHandler.runsExecutionScenarios).toBe(true);
		expect(workflowHandler.binaryChecks).toBe(ALL_CHECKS);
	});

	it('discover() matches extractWorkflowIdsFromMessages exactly', () => {
		const messages: InstanceAiMessage[] = [
			assistantMessage(
				agentNode({
					targetResource: { type: 'workflow', id: 'wf-from-target-resource' },
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'build-workflow',
							args: {},
							result: { workflowId: 'wf-from-tool-call' },
							isLoading: false,
						},
					],
					children: [
						agentNode({
							agentId: 'agent-2',
							toolCalls: [
								{
									toolCallId: 'tc-2',
									toolName: 'submit-workflow',
									args: {},
									result: { id: 'wf-from-child' },
									isLoading: false,
								},
							],
						}),
					],
				}),
			),
		];

		const expectedIds = extractWorkflowIdsFromMessages(messages);
		expect(expectedIds.length).toBeGreaterThan(0);

		const refs = workflowHandler.discover({ messages, artifactRefs: [] });
		expect(refs.map((r) => r.id)).toEqual(expectedIds);
		for (const ref of refs) {
			expect(ref.type).toBe('workflow');
		}
	});

	it('fetch() delegates to client.getWorkflow with the ref id', async () => {
		const wf = workflow('abc');
		const getWorkflow: Mock = vi.fn().mockResolvedValue(wf);
		const client = { getWorkflow } as unknown as N8nClient;

		const result = await workflowHandler.fetch({ type: 'workflow', id: 'abc' }, client);

		expect(result).toBe(wf);
		expect(getWorkflow).toHaveBeenCalledWith('abc');
	});

	it('renderArtifact() matches buildWorkflowContextBlock exactly', () => {
		const wf = workflow('render-me');
		expect(workflowHandler.renderArtifact(wf)).toBe(buildWorkflowContextBlock(wf));
	});
});

describe('artifact registry', () => {
	it('resolves the workflow handler by type', () => {
		expect(getHandler('workflow')).toBe(workflowHandler);
		expect(ARTIFACT_HANDLERS).toContain(workflowHandler);
	});

	it('resolves the agent and config-eval handlers by type', () => {
		expect(getHandler('agent')).toBe(agentHandler);
		expect(getHandler('config-eval')).toBe(configEvalHandler);
	});

	it('throws for an unregistered artifact type', () => {
		expect(() => getHandler('bogus' as ArtifactType)).toThrow();
	});
});
