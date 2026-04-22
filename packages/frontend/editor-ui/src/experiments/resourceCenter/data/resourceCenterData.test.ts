import { describe, expect, it } from 'vitest';

import { learnContent } from './resourceCenterData';

describe('resourceCenterData', () => {
	it('includes the Claude workflow builder video in learn content', () => {
		expect(learnContent).toContainEqual({
			type: 'video',
			videoId: 'OCO3aq3G0mk',
			title: 'Get Claude to build workflows',
			description: 'Build workflow from Claude directly in n8n using MCP and skills',
		});
	});
});
