import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';

import { VIEWS } from '@/app/constants';

import { useUiExtensionsHost } from './useUiExtensionsHost';

const push = vi.fn();

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useRouter: () => ({ push }),
}));

vi.mock('@n8n/ui-extension-runtime/runtime.iife.js?raw', () => ({ default: '/* runtime */' }));
vi.mock('@n8n/ui-extension-runtime/runtime.css?raw', () => ({ default: '/* css */' }));

describe('useUiExtensionsHost', () => {
	beforeEach(() => {
		createTestingPinia();
		push.mockClear();
	});

	it('loads the runtime once, however often it is asked', async () => {
		const load = vi.fn().mockResolvedValue({ js: 'js', css: 'css' });
		const host = useUiExtensionsHost(load);
		expect(host.runtime.value).toBeNull();

		host.loadRuntime();
		host.loadRuntime();
		await flushPromises();
		host.loadRuntime();
		await flushPromises();

		expect(load).toHaveBeenCalledOnce();
		expect(host.runtime.value).toEqual({ js: 'js', css: 'css' });
	});

	it('loads the runtime again after a failed load', async () => {
		const load = vi
			.fn()
			.mockRejectedValueOnce(new Error('chunk failed'))
			.mockResolvedValue({ js: 'js', css: 'css' });
		const host = useUiExtensionsHost(load);

		host.loadRuntime();
		await flushPromises();
		expect(host.runtime.value).toBeNull();

		host.loadRuntime();
		await flushPromises();

		expect(load).toHaveBeenCalledTimes(2);
		expect(host.runtime.value).toEqual({ js: 'js', css: 'css' });
	});

	it('loads the runtime bundle as strings by default', async () => {
		const host = useUiExtensionsHost();

		host.loadRuntime();
		await flushPromises();

		expect(host.runtime.value).toEqual({ js: '/* runtime */', css: '/* css */' });
	});

	it('opens a run in the executions view', () => {
		useUiExtensionsHost().open({ kind: 'execution', workflowId: 'wf-1', executionId: '7' });

		expect(push).toHaveBeenCalledWith({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { workflowId: 'wf-1', executionId: '7' },
		});
	});

	it('opens a workflow on the canvas', () => {
		useUiExtensionsHost().open({ kind: 'workflow', workflowId: 'wf-2' });

		expect(push).toHaveBeenCalledWith({ name: VIEWS.WORKFLOW, params: { workflowId: 'wf-2' } });
	});

	it('opens an http(s) URL in a new tab without access to the editor', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);

		useUiExtensionsHost().open({ kind: 'url', url: 'https://example.slack.com/archives/C123' });

		expect(open).toHaveBeenCalledWith(
			'https://example.slack.com/archives/C123',
			'_blank',
			'noopener,noreferrer',
		);
		open.mockRestore();
	});

	it('does not open a URL that is not http(s)', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);

		useUiExtensionsHost().open({ kind: 'url', url: 'javascript:alert(1)' });

		expect(open).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		open.mockRestore();
	});
});
