import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { CompareVersion } from '../../composables/useCompareData';
import CompareHeader from './CompareHeader.vue';

const version = (
	overrides: Partial<CompareVersion> & Pick<CompareVersion, 'index'>,
): CompareVersion => ({
	testRunId: `run-${overrides.index}`,
	workflowVersionId: `v${overrides.index}`,
	letter: String.fromCharCode(65 + overrides.index),
	label: `v${overrides.index}`,
	status: 'completed',
	avgScore: 0.8,
	...overrides,
});

const renderComponent = createComponentRenderer(CompareHeader);

describe('CompareHeader', () => {
	it('renders the collection name and one chip per version', () => {
		const { container, getByText } = renderComponent({
			props: {
				collectionName: 'Tone tuning experiment',
				versions: [version({ index: 0 }), version({ index: 1 })],
				bestVersionIndex: 1,
			},
		});

		expect(getByText('Tone tuning experiment')).toBeTruthy();
		expect(container.querySelectorAll('[data-test-id="compare-header-version"]')).toHaveLength(2);
	});

	it('flags the best version once', () => {
		const { getAllByText } = renderComponent({
			props: {
				collectionName: 'Exp',
				versions: [version({ index: 0 }), version({ index: 1 }), version({ index: 2 })],
				bestVersionIndex: 2,
			},
		});

		expect(getAllByText('★ best')).toHaveLength(1);
	});

	it('shows the running badge while a version is still in flight', () => {
		const { container } = renderComponent({
			props: {
				collectionName: 'Exp',
				versions: [version({ index: 0, status: 'running', avgScore: null })],
				bestVersionIndex: null,
			},
		});

		expect(container.textContent).toContain('Running');
	});
});
