import {
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
} from '../../../../../cli/src/modules/instance-ai/internal-messages';
import { parseRoutingCase, toDiscoveryScenario } from '../../routing/loader';
import {
	buildRoutingTurnMessage,
	createSeededMemory,
	STUB_PROJECT_ID,
	toResourceAttachment,
} from '../routing-context';
import type { RoutingSeed } from '../types';

function seedOf(raw: Record<string, unknown>): RoutingSeed {
	const parsed = parseRoutingCase({
		id: 'route-answer-context',
		bucket: 'answer',
		userMessage: 'What does it do?',
		accepts: ['answer'],
		source: 'synthetic',
		seed: { mode: 'inline', ...raw },
	});
	if (!parsed.success) throw new Error(parsed.issues.join('; '));
	const { seed } = toDiscoveryScenario(parsed.data);
	if (!seed) throw new Error('expected a seed');
	return seed;
}

const seed = seedOf({
	workflows: [{ id: 'wf-context-01', name: 'Order sync', nodes: [], connections: {} }],
	agents: [
		{
			id: 'agent-context-01',
			config: { name: 'Order bot', model: 'anthropic/claude-sonnet-4-5', instructions: 'Help.' },
		},
	],
	messages: [
		{ role: 'user', text: 'Build an order sync.' },
		{ role: 'assistant', text: 'Done: "Order sync" is saved.' },
	],
});

describe('toResourceAttachment', () => {
	it('names the seeded workflow or Agent the way the editor hands it off', () => {
		expect(toResourceAttachment({ workflow: 'wf-context-01' }, seed)).toEqual({
			type: 'workflow',
			id: 'wf-context-01',
			name: 'Order sync',
		});
		expect(toResourceAttachment({ agent: 'agent-context-01' }, seed)).toEqual({
			type: 'agent',
			id: 'agent-context-01',
			name: 'Order bot',
			projectId: STUB_PROJECT_ID,
		});
	});

	it('refuses an attachment the seed does not declare', () => {
		expect(() => toResourceAttachment({ workflow: 'wf-missing-01' }, seed)).toThrow(
			'is not a seeded workflow',
		);
	});
});

describe('buildRoutingTurnMessage', () => {
	it('sends the user message unchanged without an attachment', () => {
		expect(buildRoutingTurnMessage('Hello', undefined)).toBe('Hello');
	});

	it('prepends the thread-context block production builds for the hand-off', () => {
		const attachment = toResourceAttachment({ workflow: 'wf-context-01' }, seed);
		const message = buildRoutingTurnMessage('Change the schedule.', attachment);

		const productionBlock = buildThreadContextBlock([
			buildThreadArtifactsBlock(undefined, [attachment]),
		]);
		expect(message).toBe(`${productionBlock}\n\nChange the schedule.`);
		expect(message.startsWith('<thread-context>\n<thread-artifacts>\n')).toBe(true);
		expect(message).toContain('Workflow "Order sync" (id: `wf-context-01`)');
	});
});

describe('createSeededMemory', () => {
	it('holds the seeded messages as the thread history, in order', async () => {
		const memory = await createSeededMemory('thread-1', 'eval-user', seed.messages);

		const history = await memory.getMessages('thread-1', { resourceId: 'eval-user' });
		expect(history.map((m) => ('role' in m ? m.role : m.type))).toEqual(['user', 'assistant']);
		expect(history.every((m) => m.createdAt instanceof Date)).toBe(true);
		expect(history[1]).toMatchObject({
			content: [{ type: 'text', text: 'Done: "Order sync" is saved.' }],
		});
	});
});
