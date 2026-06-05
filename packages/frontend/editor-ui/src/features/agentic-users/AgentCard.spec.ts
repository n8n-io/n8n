import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import AgentCard from './AgentCard.vue';
import type { AgentNode } from './agents.types';

const renderComponent = createComponentRenderer(AgentCard);

function createAgent(overrides: Partial<AgentNode> = {}): AgentNode {
	return {
		id: 'agent-1',
		firstName: 'TestAgent',
		lastName: '',
		email: 'test@n8n.local',
		role: 'QA',
		avatar: { type: 'initials' as const, value: 'TA' },
		status: 'idle',
		position: { x: 0, y: 0 },
		zoneId: null,
		workflowCount: 3,
		tasksCompleted: 12,
		lastActive: '2m ago',
		resourceUsage: 0.3,
		...overrides,
	};
}

describe('AgentCard', () => {
	function render(agentOverrides: Partial<AgentNode> = {}, props: Record<string, unknown> = {}) {
		const pinia = createTestingPinia();
		const agent = createAgent(agentOverrides);
		return renderComponent({
			pinia,
			props: {
				agent,
				selected: false,
				zoneColor: null,
				...props,
			},
		});
	}

	function getCard(result: ReturnType<typeof render>) {
		return result.getByRole('button', { name: /Agent/ });
	}

	describe('status glow animations', () => {
		it('should apply activeGlow class when agent status is active', () => {
			const result = render({ status: 'active' });
			expect(getCard(result).className).toContain('activeGlow');
		});

		it('should apply busyGlow class when agent status is busy', () => {
			const result = render({ status: 'busy' });
			expect(getCard(result).className).toContain('busyGlow');
		});

		it('should not apply glow classes when agent status is idle', () => {
			const result = render({ status: 'idle' });
			const className = getCard(result).className;
			expect(className).not.toContain('activeGlow');
			expect(className).not.toContain('busyGlow');
		});
	});

	describe('status badge', () => {
		it('should show Active badge for active agents', () => {
			const { getByText } = render({ status: 'active' });
			expect(getByText('Active')).toBeInTheDocument();
		});

		it('should show Busy badge for busy agents', () => {
			const { getByText } = render({ status: 'busy' });
			expect(getByText('Busy')).toBeInTheDocument();
		});

		it('should show Idle badge for idle agents', () => {
			const { getByText } = render({ status: 'idle' });
			expect(getByText('Idle')).toBeInTheDocument();
		});
	});

	describe('zone accent', () => {
		it('should show zone accent when zoneColor is provided', () => {
			const { container } = render({}, { zoneColor: 'var(--color--primary)' });
			const accent = container.querySelector('[class*="zoneAccent"]');
			expect(accent).toBeInTheDocument();
		});

		it('should not show zone accent when zoneColor is null', () => {
			const { container } = render({}, { zoneColor: null });
			const accent = container.querySelector('[class*="zoneAccent"]');
			expect(accent).not.toBeInTheDocument();
		});
	});

	describe('selected state', () => {
		it('should apply selected class when selected', () => {
			const result = render({}, { selected: true });
			expect(getCard(result).className).toContain('selected');
		});

		it('should not apply selected class when not selected', () => {
			const result = render({}, { selected: false });
			expect(getCard(result).className).not.toContain('selected');
		});
	});

	describe('agent info', () => {
		it('should display agent name', () => {
			const { getByText } = render({ firstName: 'DocBot' });
			expect(getByText('DocBot')).toBeInTheDocument();
		});

		it('should display agent role', () => {
			const { getByText } = render({ role: 'Documentation' });
			expect(getByText('Documentation')).toBeInTheDocument();
		});

		it('should display workflow count', () => {
			const { getByText } = render({ workflowCount: 5 });
			expect(getByText('5')).toBeInTheDocument();
		});

		it('should display resource usage percentage', () => {
			const { getByText } = render({ resourceUsage: 0.65 });
			expect(getByText('65%')).toBeInTheDocument();
		});
	});
});
