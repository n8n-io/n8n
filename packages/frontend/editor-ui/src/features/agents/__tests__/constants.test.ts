import { describe, it, expect } from 'vitest';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	PROJECT_AGENTS,
} from '../constants';

describe('Agent constants', () => {
	it('exports all required route names', () => {
		expect(AGENTS_LIST_VIEW).toBe('AgentsListView');
		expect(AGENT_BUILDER_VIEW).toBe('AgentBuilderView');
		expect(AGENT_PREVIEW_VIEW).toBe('AgentPreviewView');
		expect(PROJECT_AGENTS).toBe('ProjectAgents');
	});
});
