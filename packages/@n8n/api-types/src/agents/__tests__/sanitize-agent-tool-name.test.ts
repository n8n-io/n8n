import { sanitizeAgentToolName } from '../sanitize-agent-tool-name';

describe('sanitizeAgentToolName', () => {
	it('leaves valid runtime names unchanged', () => {
		expect(sanitizeAgentToolName('Lookup_Orders')).toBe('Lookup_Orders');
	});

	it('converts workflow display names to runtime-safe names', () => {
		expect(sanitizeAgentToolName('Lookup Orders & Returns')).toBe('lookup-orders-returns');
	});

	it.each(['', '!!!', '🛠️'])('falls back when %j has no valid characters', (name) => {
		expect(sanitizeAgentToolName(name)).toBe('tool');
	});
});
