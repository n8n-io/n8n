import { render } from '@testing-library/vue';

import CanvasThinkingPill from './CanvasThinkingPill.vue';

describe('CanvasThinkingPill', () => {
	it('renders canvas thinking pill correctly', () => {
		const { container } = render(CanvasThinkingPill, {});
		expect(container).toMatchSnapshot();
	});
});
