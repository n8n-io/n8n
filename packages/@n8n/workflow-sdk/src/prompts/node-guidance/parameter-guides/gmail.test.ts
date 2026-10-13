import { GMAIL_GUIDE } from './gmail';

describe('GMAIL_GUIDE', () => {
	it('names the real Simplify parameter, `simple`, and not `simplify`', () => {
		expect(GMAIL_GUIDE.content).toContain('**simple: false**');
		expect(GMAIL_GUIDE.content).toContain('**simple: true**');
		expect(GMAIL_GUIDE.content).not.toMatch(/\bsimplify\b\s*(:|to\b)/i);
	});

	it('does not give the message output shape as the shape of a thread', () => {
		expect(GMAIL_GUIDE.content).toContain('thread:get');
	});
});
