import type { LinkedInstancePushResult } from '@n8n/api-types';
import { screen, within } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { pushResult } from '../../__tests__/linkedInstances.fixtures';
import TransferResultMessage from '../TransferResultMessage.vue';

const renderMessage = createComponentRenderer(TransferResultMessage);

function setup(
	result: LinkedInstancePushResult,
	{ baseUrl = 'https://acme.app.n8n.cloud', publishAsked = false } = {},
) {
	return renderMessage({ props: { result, place: 'Acme Cloud', baseUrl, publishAsked } });
}

describe('TransferResultMessage', () => {
	it.each<[string, Partial<LinkedInstancePushResult>, string]>([
		['the move put the new version live', { published: true }, "It's on in Acme Cloud."],
		[
			'the publish failed and an earlier version stays live',
			{ published: true, publishFailed: true },
			'An earlier version stays on in Acme Cloud.',
		],
		['nothing is live', { published: false, publishFailed: true }, "It's off in Acme Cloud."],
	])('says so when %s', (_label, overrides, text) => {
		setup(pushResult(overrides), { publishAsked: true });

		expect(screen.getByText(text)).toBeVisible();
	});

	it('does not say that the moved version is on when the move did not publish it', () => {
		const warning =
			'The new version is not live, because the source workflow does not publish this version. Publish the workflow to make it live. An earlier version stays live.';
		setup(pushResult({ created: false, published: true, warnings: [warning] }));

		expect(
			screen.getByText(
				'A version of it stays on in Acme Cloud. Open it there to see which version runs.',
			),
		).toBeVisible();
		expect(screen.queryByText("It's on in Acme Cloud.")).not.toBeInTheDocument();
		expect(screen.getByText(warning)).toBeVisible();
	});

	it("says that the copy is off when the move did not publish it and it wasn't on", () => {
		setup(pushResult({ published: false }));

		expect(screen.getByText("It's off in Acme Cloud.")).toBeVisible();
	});

	it('says that the workflow here is off only when the move turned it off', () => {
		const { unmount } = setup(pushResult({ localDeactivated: false }));
		expect(screen.queryByText(/It's off on this computer/)).not.toBeInTheDocument();
		unmount();

		setup(pushResult({ localDeactivated: true }));
		expect(screen.getByText(/It's off on this computer/)).toBeVisible();
	});

	it('lists the node types that the linked instance does not have', () => {
		setup(pushResult({ missingNodeTypes: ['acme.thing@2', 'acme.other@1'] }));

		expect(screen.getByText("Acme Cloud doesn't have these node types:")).toBeVisible();
		const types = within(screen.getByTestId('transfer-result-node-types')).getAllByRole('listitem');
		expect(types.map((item) => item.textContent)).toEqual(['acme.thing@2', 'acme.other@1']);
	});

	it('shows the warnings of the server as plain text', () => {
		const warning = 'Ops <b>team</b> refused it.';
		setup(pushResult({ warnings: [warning] }));

		expect(screen.getByText(warning)).toBeVisible();
		expect(screen.getByTestId('transfer-result-warnings').querySelector('b')).toBeNull();
	});

	it('names a credential without a link when the address of the instance is not http(s)', () => {
		setup(
			pushResult({
				credentialsNeedingSetup: [{ id: 'cred-1', name: 'Gmail', type: 'gmailOAuth2' }],
			}),
			{ baseUrl: 'ftp://acme.example.test' },
		);

		expect(screen.getByText('Gmail')).toBeVisible();
		expect(screen.queryByRole('link', { name: /Set up in Acme Cloud/ })).not.toBeInTheDocument();
	});

	it('offers no link to a copy whose address is not http(s)', () => {
		setup(pushResult({ remoteUrl: 'ftp://acme.example.test/workflow/1' }));

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('tells screen reader users that the link opens a new tab', () => {
		setup(pushResult());

		expect(
			screen.getByRole('link', { name: 'Open in Acme Cloud (opens in a new tab)' }),
		).toHaveAttribute('target', '_blank');
	});
});
