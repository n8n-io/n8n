import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';

import WorkflowToolConfigContent from '../components/WorkflowToolConfigContent.vue';
import type { WorkflowToolRef } from '../types';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => key,
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const renderComponent = createComponentRenderer(WorkflowToolConfigContent);

function createRef(overrides: Partial<WorkflowToolRef> = {}): WorkflowToolRef {
	return {
		type: 'workflow',
		workflow: 'workflow-1',
		name: 'My workflow tool',
		description: 'Does something useful',
		...overrides,
	} as WorkflowToolRef;
}

describe('WorkflowToolConfigContent', () => {
	it('emits valid=true when both name and description are set', () => {
		const { emitted } = renderComponent({ props: { initialRef: createRef() } });

		const validEmissions = emitted('update:valid') as boolean[][];
		expect(validEmissions.at(-1)?.[0]).toBe(true);
	});

	it('emits valid=false when the description is empty', () => {
		const { emitted } = renderComponent({
			props: { initialRef: createRef({ description: '' }) },
		});

		const validEmissions = emitted('update:valid') as boolean[][];
		expect(validEmissions.at(-1)?.[0]).toBe(false);
	});

	it('emits valid=false for a whitespace-only description', () => {
		const { emitted } = renderComponent({
			props: { initialRef: createRef({ description: '   ' }) },
		});

		const validEmissions = emitted('update:valid') as boolean[][];
		expect(validEmissions.at(-1)?.[0]).toBe(false);
	});

	it('emits valid=false when the name is empty', () => {
		const { emitted } = renderComponent({
			props: { initialRef: createRef({ name: '', workflow: '' }) },
		});

		const validEmissions = emitted('update:valid') as boolean[][];
		expect(validEmissions.at(-1)?.[0]).toBe(false);
	});

	it('emits valid=true once an empty description is filled in', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: { initialRef: createRef({ description: '' }) },
		});

		await fireEvent.update(getByTestId('agent-workflow-tool-description'), 'Now described');

		await waitFor(() => {
			const validEmissions = emitted('update:valid') as boolean[][];
			expect(validEmissions.at(-1)?.[0]).toBe(true);
		});
	});
});
