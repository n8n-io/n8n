import { buildThreadArtifactsContext } from '../threadArtifacts';
import type { ResourceEntry } from '../useResourceRegistry';

function entry(
	overrides: Partial<ResourceEntry> & Pick<ResourceEntry, 'type' | 'id'>,
): ResourceEntry {
	return { name: 'Untitled', ...overrides };
}

describe('buildThreadArtifactsContext', () => {
	it('returns undefined when there are no previewable artifacts', () => {
		expect(buildThreadArtifactsContext([])).toBeUndefined();
		expect(
			buildThreadArtifactsContext([entry({ type: 'credential', id: 'cred-1', name: 'Slack' })]),
		).toBeUndefined();
	});

	it('indexes workflows, agents and data tables and marks the focused tab', () => {
		expect(
			buildThreadArtifactsContext(
				[
					entry({ type: 'workflow', id: 'wf-1', name: 'WhatsApp FAQ Auto-Responder' }),
					entry({ type: 'data-table', id: 'dt-1', name: 'FAQ', projectId: 'proj-1' }),
					entry({
						type: 'agent',
						id: 'agent-1',
						name: 'New Agent',
						projectId: 'proj-1',
						pending: true,
					}),
				],
				'wf-1',
			),
		).toEqual({
			artifacts: [
				{ type: 'workflow', id: 'wf-1', name: 'WhatsApp FAQ Auto-Responder' },
				{ type: 'data-table', id: 'dt-1', name: 'FAQ', projectId: 'proj-1' },
				{
					type: 'agent',
					id: 'agent-1',
					name: 'New Agent',
					projectId: 'proj-1',
					pending: true,
				},
			],
			activeId: 'wf-1',
		});
	});

	it('keeps the newest tabs and the focused one when over the cap', () => {
		const entries = Array.from({ length: 25 }, (_, index) =>
			entry({ type: 'workflow', id: `wf-${index}`, name: `Workflow ${index}` }),
		);

		const result = buildThreadArtifactsContext(entries, 'wf-0');

		expect(result?.artifacts).toHaveLength(20);
		expect(result?.artifacts[0]?.id).toBe('wf-0');
		expect(result?.artifacts.at(-1)?.id).toBe('wf-24');
		expect(result?.artifacts.some((artifact) => artifact.id === 'wf-5')).toBe(false);
		expect(result?.activeId).toBe('wf-0');
	});

	it('omits activeId when it does not match a tab', () => {
		expect(
			buildThreadArtifactsContext([entry({ type: 'workflow', id: 'wf-1', name: 'A' })], 'other'),
		).toEqual({
			artifacts: [{ type: 'workflow', id: 'wf-1', name: 'A' }],
		});
	});
});
