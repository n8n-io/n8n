import { render } from '@testing-library/vue';

import N8nCanvasThinkingPill from './CanvasThinkingPill.vue';

describe('N8nCanvasThinkingPill', () => {
	it('renders canvas thinking pill correctly', () => {
		const { container } = render(N8nCanvasThinkingPill, {});
		expect(container).toMatchSnapshot();
	});
});
