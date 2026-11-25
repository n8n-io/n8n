import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import RestrictedMenuItemMarker from './RestrictedMenuItemMarker.vue';

const popoverProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./RestrictedNodePopover.vue', async () => {
	const { defineComponent: define, h: hyper } = await import('vue');
	return {
		default: define({
			props: ['nodeTypeName', 'restriction', 'kind', 'anchor', 'side', 'markerSize'],
			emits: ['contactAdmin'],
			setup(props, { emit }) {
				return () => {
					popoverProps.current = { ...props };
					return hyper('button', {
						'data-test-id': 'popover-action',
						onClick: () => emit('contactAdmin', 'project'),
					});
				};
			},
		}),
	};
});

type MarkerProps = InstanceType<typeof RestrictedMenuItemMarker>['$props'];

function renderInRow(props: MarkerProps, onRowClick = vi.fn()) {
	const Row = defineComponent({
		render: () =>
			h('div', { role: 'menuitem', 'data-test-id': 'row', onClick: onRowClick }, [
				h(RestrictedMenuItemMarker, props),
			]),
	});
	return render(Row);
}

describe('RestrictedMenuItemMarker', () => {
	it('anchors the popover to its menu row and forwards the contact-admin request', async () => {
		const onContactAdmin = vi.fn();
		renderInRow({
			kind: 'credential',
			nodeTypeName: 'Anthropic credentials',
			restriction: { scope: 'instance' },
			onContactAdmin,
		});

		await vi.waitFor(() => {
			expect(popoverProps.current).toMatchObject({
				kind: 'credential',
				side: 'right',
				markerSize: 'xsmall',
				nodeTypeName: 'Anthropic credentials',
				restriction: { scope: 'instance' },
				anchor: screen.getByTestId('row'),
			});
		});

		await userEvent.click(screen.getByTestId('popover-action'));

		expect(onContactAdmin).toHaveBeenCalledExactlyOnceWith('project');
	});

	it('defaults to a node type', () => {
		renderInRow({ nodeTypeName: 'Wikipedia', restriction: { scope: 'instance' } });

		expect(popoverProps.current.kind).toBe('node');
	});

	it('does not select the row when the lock is clicked', async () => {
		const onRowClick = vi.fn();
		renderInRow(
			{ nodeTypeName: 'Wikipedia', restriction: { scope: 'instance' }, onContactAdmin: vi.fn() },
			onRowClick,
		);

		await userEvent.click(screen.getByTestId('popover-action'));

		expect(onRowClick).not.toHaveBeenCalled();
	});
});
