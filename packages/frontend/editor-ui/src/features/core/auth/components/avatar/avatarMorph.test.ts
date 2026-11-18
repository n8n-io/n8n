import { render } from '@testing-library/vue';
import { defineComponent, h, nextTick, ref, withDirectives } from 'vue';

import { vShortestTurn } from './avatarMorph';

const rotation = (el: Element) => el.querySelector('path')?.getAttribute('transform');

async function renderShape(initial: string) {
	const transform = ref(initial);
	const Shape = defineComponent({
		setup: () => () =>
			withDirectives(h('svg', [h('path', { transform: transform.value })]), [[vShortestTurn]]),
	});
	const { container } = render(Shape);
	const turn = async (next: string) => {
		transform.value = next;
		await nextTick();
		return rotation(container);
	};
	return { turn, shown: () => rotation(container) };
}

describe('vShortestTurn', () => {
	it('leaves the first arrangement as written', async () => {
		const { shown } = await renderShape('translate(3 -2) rotate(340 40 40) scale(1.3)');

		expect(shown()).toBe('translate(3 -2) rotate(340 40 40) scale(1.3)');
	});

	it('turns the short way round to the next angle', async () => {
		const { turn } = await renderShape('translate(0 0) rotate(20 40 40) scale(1.2)');

		// 340 is 320 degrees on from 20, but only 40 back.
		expect(await turn('translate(1 1) rotate(340 40 40) scale(1.4)')).toBe(
			'translate(1 1) rotate(-20 40 40) scale(1.4)',
		);
		// Measured from where it is now (-20), 100 is 120 on; nothing to rewrite.
		expect(await turn('translate(0 0) rotate(100 40 40) scale(1.2)')).toBe(
			'translate(0 0) rotate(100 40 40) scale(1.2)',
		);
		// The renderer's angles can run negative too; -300 is 40 on from 100.
		expect(await turn('translate(0 0) rotate(-300 40 40) scale(1.2)')).toBe(
			'translate(0 0) rotate(60 40 40) scale(1.2)',
		);
	});

	it('leaves other attribute changes alone', async () => {
		const { turn } = await renderShape('translate(0 0) rotate(20 40 40)');

		expect(await turn('translate(5 5) rotate(20 40 40)')).toBe('translate(5 5) rotate(20 40 40)');
	});
});
