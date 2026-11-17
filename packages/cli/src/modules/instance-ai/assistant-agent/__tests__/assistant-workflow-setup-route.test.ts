import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { AssistantTurnMemory } from '../../turn-setup/assistant-turn-runtime';
import {
	AssistantWorkflowSetupRoute,
	WORKFLOW_SETUP_INSTRUCTION_REASON,
	workflowIdOfSetupSuspension,
} from '../assistant-workflow-setup-route';
import { createMemory, outcome, routedAt, saveBuild, THREAD_ID } from './workflow-loop-memory';

describe('AssistantWorkflowSetupRoute', () => {
	const logger = mock<Logger>();
	const createRoute = (memory: AssistantTurnMemory) =>
		new AssistantWorkflowSetupRoute(memory, THREAD_ID, logger, { setupPanelEnabled: false });

	it('routes a concluded build that needs setup once, and marks it first', async () => {
		const memory = createMemory();
		await saveBuild(memory, outcome());
		const route = createRoute(memory);

		const instruction = await route.nextInstruction();

		expect(instruction?.reason).toBe(WORKFLOW_SETUP_INSTRUCTION_REASON);
		expect(instruction?.content).toContain('<workflow-setup-required>');
		expect(instruction?.content).toContain('"workflowId": "wf-1"');
		expect(instruction?.content).toContain('`setup_workflow`');
		expect(await routedAt(memory)).toEqual(expect.any(String));
		// A later turn reads the marker, so it does not route the same build again.
		expect(await createRoute(memory).nextInstruction()).toBeUndefined();
	});

	it('sends no instruction when the marker cannot be stored', async () => {
		const memory = createMemory({ rejectRoutedMarker: true });
		await saveBuild(memory, outcome());
		const route = createRoute(memory);

		expect(await route.nextInstruction()).toBeUndefined();
	});

	it.each([
		['setup is not required', { setupRequirement: { status: 'not_required' as const } }],
		['verification has not concluded', { verificationReadiness: { status: 'ready' as const } }],
	])('does not route a build when %s', async (_name, overrides) => {
		const memory = createMemory();
		await saveBuild(memory, outcome(overrides));
		const route = createRoute(memory);

		expect(await route.nextInstruction()).toBeUndefined();
		expect(await routedAt(memory)).toBeUndefined();
	});

	it('marks a build as routed when its setup card suspended the turn', async () => {
		const memory = createMemory();
		await saveBuild(memory, outcome());
		await saveBuild(memory, outcome({ workItemId: 'wi-2', workflowId: 'wf-2' }));
		const route = createRoute(memory);

		route.observeSuspension('setup_workflow', { workflowId: 'wf-1', setupRequests: [] });
		route.observeSuspension('ask_user', { workflowId: 'wf-2' });
		await route.markSuspendedSetupsRouted();

		expect(await routedAt(memory, 'wi-1')).toEqual(expect.any(String));
		expect(await routedAt(memory, 'wi-2')).toBeUndefined();
		// The resumed turn routes only the build whose card never showed.
		const instruction = await createRoute(memory).nextInstruction();
		expect(instruction?.content).toContain('"workflowId": "wf-2"');
	});
	it('marks a build as routed when the setup panel announced its checklist', async () => {
		const memory = createMemory();
		await saveBuild(memory, outcome());

		await createRoute(memory).markWorkflowSetupHandled('wf-1');

		expect(await routedAt(memory)).toEqual(expect.any(String));
		expect(await createRoute(memory).nextInstruction()).toBeUndefined();
	});

	it('releases the claim after a failed marker, so the retry stores it', async () => {
		const memory = createMemory({ rejectRoutedMarkerOnce: true });
		await saveBuild(memory, outcome());
		const route = createRoute(memory);

		await expect(route.markWorkflowSetupHandled('wf-1')).rejects.toThrow();
		await route.markWorkflowSetupHandled('wf-1');

		expect(await routedAt(memory)).toEqual(expect.any(String));
	});

	it('throws when the setup panel marker cannot be stored, so the tool can retry', async () => {
		const memory = createMemory({ rejectRoutedMarker: true });
		await saveBuild(memory, outcome());

		await expect(createRoute(memory).markWorkflowSetupHandled('wf-1')).rejects.toThrow(
			'The workflow setup route was not stored',
		);
	});
});

describe('workflowIdOfSetupSuspension', () => {
	it.each([
		['setup_workflow', { workflowId: 'wf-1', setupRequests: [] }, 'wf-1'],
		['call_tool', { workflowId: 'wf-1', setupRequests: [] }, 'wf-1'],
		['setup_workflow', { workflowId: 'wf-1' }, undefined],
		['ask_user', { workflowId: 'wf-1', setupRequests: [] }, undefined],
		['setup_workflow', undefined, undefined],
	])('reads %s with %j as %s', (toolName, payload, expected) => {
		expect(workflowIdOfSetupSuspension(toolName, payload)).toBe(expected);
	});
});
