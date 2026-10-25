import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import { provideThread, type ThreadRuntime } from '../../instanceAi.store';
import DomainAccessApproval from '../DomainAccessApproval.vue';

const domainProps = { requestId: 'req-1', url: 'https://example.com/a', host: 'example.com' };

describe('DomainAccessApproval', () => {
	it('sends the decision through the submit prop when one is given', async () => {
		const submit = vi.fn();
		const render = createComponentRenderer(DomainAccessApproval, { pinia: createTestingPinia() });

		const { getByTestId } = render({ props: { ...domainProps, submit } });
		await fireEvent.click(getByTestId('domain-access-allow-once'));

		expect(submit).toHaveBeenCalledWith({
			kind: 'domainAccessApprove',
			domainAccessAction: 'allow_once',
		});
	});

	it('confirms through the thread without a submit prop', async () => {
		const thread = {
			confirmAction: vi.fn(async () => true),
			resolveConfirmation: vi.fn(),
		} as unknown as ThreadRuntime;
		const Host = defineComponent({
			setup() {
				provideThread(thread);
				return () => h(DomainAccessApproval, domainProps);
			},
		});
		const render = createComponentRenderer(Host, { pinia: createTestingPinia() });

		const { getByTestId } = render();
		await fireEvent.click(getByTestId('domain-access-allow-once'));

		expect(thread.resolveConfirmation).toHaveBeenCalledWith('req-1', 'approved');
		expect(thread.confirmAction).toHaveBeenCalledWith('req-1', {
			kind: 'domainAccessApprove',
			domainAccessAction: 'allow_once',
		});
	});
});
