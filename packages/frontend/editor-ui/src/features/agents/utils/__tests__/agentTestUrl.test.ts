import { describe, expect, it } from 'vitest';

import { resolveAgentTestLink } from '../agentTestUrl';

describe('resolveAgentTestLink', () => {
	it('canonicalizes legacy preview links', () => {
		expect(
			resolveAgentTestLink('/projects/project-1/agents/agent-1/preview?continueSessionId=1'),
		).toEqual({
			projectId: 'project-1',
			agentId: 'agent-1',
			href: '/projects/project-1/agents/agent-1?continueSessionId=1&openPreview=true',
		});
	});

	it('accepts canonical same-origin preview links', () => {
		expect(
			resolveAgentTestLink(
				`${window.location.origin}/projects/project-1/agents/agent-1?openPreview=true`,
			),
		).toEqual({
			projectId: 'project-1',
			agentId: 'agent-1',
			href: '/projects/project-1/agents/agent-1?openPreview=true',
		});
	});

	it('preserves encoded path segments in the canonical URL', () => {
		expect(resolveAgentTestLink('/projects/project%2Fone/agents/agent%2Fone/preview')).toEqual({
			projectId: 'project/one',
			agentId: 'agent/one',
			href: '/projects/project%2Fone/agents/agent%2Fone?openPreview=true',
		});
	});

	it('keeps malformed path segments encoded', () => {
		expect(resolveAgentTestLink('/projects/project%XY/agents/agent-1/preview')).toEqual({
			projectId: 'project%XY',
			agentId: 'agent-1',
			href: '/projects/project%XY/agents/agent-1?openPreview=true',
		});
	});

	it.each([
		'/projects/project-1/agents/agent-1',
		'/projects/project-1/agents/agent-1?openPreview=false',
		'projects/project-1/agents/agent-1/preview',
		'./projects/project-1/agents/agent-1/preview',
		'https://example.com/projects/project-1/agents/agent-1?openPreview=true',
	])('rejects non-preview links: %s', (href) => {
		expect(resolveAgentTestLink(href)).toBeUndefined();
	});
});
