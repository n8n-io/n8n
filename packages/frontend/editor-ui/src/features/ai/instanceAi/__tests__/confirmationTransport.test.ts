import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import {
	useConfirmationTransport,
	type ConfirmationSubmit,
	type ConfirmationTransport,
} from '../confirmationTransport';
import { provideThread, type ThreadRuntime } from '../instanceAi.store';

function transportIn(options: { thread?: ThreadRuntime; submit?: ConfirmationSubmit }) {
	let transport!: ConfirmationTransport;
	const Card = defineComponent({
		setup() {
			transport = useConfirmationTransport(() => options.submit);
			return () => null;
		},
	});
	const Host = defineComponent({
		setup() {
			if (options.thread) provideThread(options.thread);
			return () => h(Card);
		},
	});
	mount(Host);
	return transport;
}

function mockThread(confirmed = true) {
	return {
		confirmAction: vi.fn(async () => confirmed),
		resolveConfirmation: vi.fn(),
	} as unknown as ThreadRuntime & {
		confirmAction: ReturnType<typeof vi.fn>;
		resolveConfirmation: ReturnType<typeof vi.fn>;
	};
}

describe('useConfirmationTransport', () => {
	const body = { kind: 'approval', approved: true } as const;

	it('hands the body to the submit callback when there is one', async () => {
		const submit = vi.fn();
		const thread = mockThread();
		const transport = transportIn({ thread, submit });

		await expect(transport.confirm('req-1', body, 'approved')).resolves.toBe(true);

		expect(submit).toHaveBeenCalledWith(body);
		expect(thread.confirmAction).not.toHaveBeenCalled();
	});

	it('confirms through the thread and resolves the card on success', async () => {
		const thread = mockThread();
		const transport = transportIn({ thread });

		await expect(transport.confirm('req-1', body, 'deferred')).resolves.toBe(true);

		expect(thread.confirmAction).toHaveBeenCalledWith('req-1', body);
		expect(thread.resolveConfirmation).toHaveBeenCalledWith('req-1', 'deferred');
	});

	it('leaves the card open when the thread request fails', async () => {
		const thread = mockThread(false);
		const transport = transportIn({ thread });

		await expect(transport.confirm('req-1', body, 'approved')).resolves.toBe(false);

		expect(thread.resolveConfirmation).not.toHaveBeenCalled();
	});

	it('reports a failure without a thread or a callback', async () => {
		const transport = transportIn({});

		expect(transport.thread).toBeUndefined();
		await expect(transport.confirm('req-1', body, 'approved')).resolves.toBe(false);
	});
});
