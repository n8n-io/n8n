import type { AgentApproval } from '@n8n/api-types';

import { actionNeedsApproval } from '../integration-tool-definitions';

describe('actionNeedsApproval', () => {
	const selected = (...tools: string[]): AgentApproval => ({ mode: 'selected', tools });

	it('does not gate any action without an approval config', () => {
		expect(actionNeedsApproval(undefined, 'send_template')).toBe(false);
	});

	it('gates every action except do_not_respond in global mode', () => {
		expect(actionNeedsApproval({ mode: 'global' }, 'send_template')).toBe(true);
		expect(actionNeedsApproval({ mode: 'global' }, 'do_not_respond')).toBe(false);
	});

	it('gates only the selected actions', () => {
		expect(actionNeedsApproval(selected('add_reaction'), 'add_reaction')).toBe(true);
		expect(actionNeedsApproval(selected('add_reaction'), 'send_dm')).toBe(false);
	});

	it('gates send_template when it is selected', () => {
		expect(actionNeedsApproval(selected('send_template'), 'send_template')).toBe(true);
	});

	it('gates send_template when only send_dm is selected', () => {
		expect(actionNeedsApproval(selected('send_dm'), 'send_template')).toBe(true);
	});

	it('does not gate send_dm when only send_template is selected', () => {
		expect(actionNeedsApproval(selected('send_template'), 'send_dm')).toBe(false);
	});
});
