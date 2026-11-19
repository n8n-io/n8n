import { renderSkillMermaid } from './skillMermaidRenderer';

describe('renderSkillMermaid', () => {
	it('removes a cancelled render without interrupting another render', async () => {
		const first = new AbortController();
		const second = new AbortController();
		const firstRender = renderSkillMermaid('flowchart LR\n  A --> B', 'default', 800, first.signal);
		const secondRender = renderSkillMermaid('flowchart TD\n  C --> D', 'dark', 900, second.signal);
		const frames = () => [...document.body.querySelectorAll('iframe')];

		try {
			expect(frames().map((frame) => frame.width)).toEqual(['800', '900']);
			first.abort();
			await expect(firstRender).resolves.toBeUndefined();
			expect(frames().map((frame) => frame.width)).toEqual(['900']);
		} finally {
			first.abort();
			second.abort();
			await Promise.all([firstRender, secondRender]);
		}
		expect(frames()).toHaveLength(0);
	});
});
