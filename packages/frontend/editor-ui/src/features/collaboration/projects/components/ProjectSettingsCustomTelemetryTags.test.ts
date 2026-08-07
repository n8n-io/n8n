import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ProjectSettingsCustomTelemetryTags from './ProjectSettingsCustomTelemetryTags.vue';
import { createComponentRenderer } from '@/__tests__/render';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nInput: {
			name: 'N8nInput',
			inheritAttrs: false,
			props: ['modelValue', 'placeholder', 'ariaLabel'],
			emits: ['update:modelValue', 'blur'],
			template: `
				<div v-bind="$attrs">
					<input
						:value="modelValue"
						:placeholder="placeholder"
						:aria-label="ariaLabel"
						@input="$emit('update:modelValue', $event.target.value)"
						@blur="$emit('blur')"
					/>
				</div>
			`,
		},
	};
});

type Tag = { key: string; value: string };

const renderComponent = createComponentRenderer(ProjectSettingsCustomTelemetryTags);

describe('ProjectSettingsCustomTelemetryTags', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('renders only the add button when modelValue is empty', () => {
			renderComponent({ props: { modelValue: [] } });

			expect(screen.queryByTestId('project-telemetry-tag-key')).not.toBeInTheDocument();
			expect(screen.getByTestId('project-telemetry-tag-add')).toBeInTheDocument();
		});

		it('renders tag rows when modelValue has items', () => {
			renderComponent({ props: { modelValue: [{ key: 'env', value: 'prod' }] } });

			expect(screen.getByTestId('project-telemetry-tag-key')).toBeInTheDocument();
			expect(screen.getByTestId('project-telemetry-tag-value')).toBeInTheDocument();
			expect(screen.getByTestId('project-telemetry-tag-remove')).toBeInTheDocument();
		});
	});

	describe('Emits', () => {
		it('emits update:modelValue with new empty tag appended on add', async () => {
			const tags: Tag[] = [{ key: 'env', value: 'prod' }];
			const { emitted } = renderComponent({ props: { modelValue: tags } });

			await userEvent.setup().click(screen.getByTestId('project-telemetry-tag-add'));

			expect(emitted()['update:modelValue'][0]).toEqual([
				[
					{ key: 'env', value: 'prod' },
					{ key: '', value: '' },
				],
			]);
		});

		it('emits update:modelValue without removed tag on remove', async () => {
			const tags: Tag[] = [
				{ key: 'env', value: 'prod' },
				{ key: 'region', value: 'us-east' },
			];
			const { emitted } = renderComponent({ props: { modelValue: tags } });

			await userEvent.setup().click(screen.getAllByTestId('project-telemetry-tag-remove')[0]);

			expect(emitted()['update:modelValue'][0]).toEqual([[{ key: 'region', value: 'us-east' }]]);
		});

		it('emits update:modelValue with updated key on key input', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: [{ key: '', value: 'prod' }] },
			});

			const keyInput = screen.getByTestId('project-telemetry-tag-key').querySelector('input')!;
			await userEvent.setup().type(keyInput, 'e');

			const emissions = emitted()['update:modelValue'] as Tag[][];
			expect(emissions[emissions.length - 1]).toEqual([[{ key: 'e', value: 'prod' }]]);
		});

		it('emits update:modelValue with updated value on value input', async () => {
			const { emitted } = renderComponent({
				props: { modelValue: [{ key: 'env', value: '' }] },
			});

			const valueInput = screen.getByTestId('project-telemetry-tag-value').querySelector('input')!;
			await userEvent.setup().type(valueInput, 'p');

			const emissions = emitted()['update:modelValue'] as Tag[][];
			expect(emissions[emissions.length - 1]).toEqual([[{ key: 'env', value: 'p' }]]);
		});
	});
});
