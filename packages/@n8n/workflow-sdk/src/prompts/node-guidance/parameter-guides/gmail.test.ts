import { GMAIL_GUIDE } from './gmail';

describe('GMAIL_GUIDE', () => {
	it('names the real Simplify parameter, `simple`', () => {
		expect(GMAIL_GUIDE.content).toContain('**simple: false**');
		expect(GMAIL_GUIDE.content).toContain('**simple: true**');
		expect(GMAIL_GUIDE.content).not.toMatch(/\bsimplify\b\s*(:|to\b)/i);
	});

	it('names the sender field of both output shapes', () => {
		expect(GMAIL_GUIDE.content).toContain('$json.From');
		expect(GMAIL_GUIDE.content).toContain('$json.from.value[0].address');
	});

	it('does not tell the builder to always turn Simplify off', () => {
		expect(GMAIL_GUIDE.content).not.toContain('ALWAYS set');
		expect(GMAIL_GUIDE.content).toContain('only when');
	});
});
