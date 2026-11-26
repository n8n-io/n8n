import { within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionTypes, type INodeProperties, type INodeTypeDescription } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { MASK } from '@/app/utils/maskSecret';
import type { NodeVersionChange } from '@/features/ndv/shared/ndv.types';
import NodeVersionChangeBanner from './NodeVersionChangeBanner.vue';

const NODE_TYPE = 'n8n-nodes-base.versionedNode';

const describeVersion = (version: number, properties: INodeProperties[]): INodeTypeDescription => ({
	displayName: 'Versioned Node',
	name: NODE_TYPE,
	group: ['transform'],
	description: '',
	version,
	defaults: { name: 'Versioned Node' },
	inputs: ['main'],
	outputs: ['main'],
	properties,
});

const typeV1 = describeVersion(1, [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		default: 'a',
		options: [
			{ name: 'Alpha (old)', value: 'a' },
			{ name: 'Beta (old)', value: 'b' },
		],
	},
	{ displayName: 'Verbose', name: 'verbose', type: 'boolean', default: false },
	{
		displayName: 'Auth',
		name: 'auth',
		type: 'collection',
		default: {},
		options: [
			{ displayName: 'User', name: 'user', type: 'string', default: '' },
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
		],
	},
]);

const typeV2 = describeVersion(2, [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		default: 'b',
		options: [
			{ name: 'Alpha (new)', value: 'a' },
			{ name: 'Beta (new)', value: 'b' },
		],
	},
	{ displayName: 'Verbose', name: 'verbose', type: 'boolean', default: true },
	{ displayName: 'Token', name: 'token', type: 'string', default: '', required: true },
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		default: 'none',
		options: [
			{ name: 'None', value: 'none' },
			{ name: 'Basic Auth', value: 'basicAuth' },
		],
	},
]);
typeV2.credentials = [
	{ name: 'httpBasicAuth', displayOptions: { show: { authentication: ['basicAuth'] } } },
];

const setAside: NodeVersionChange['setAside'] = [
	{ name: 'legacyField', path: ['legacyField'], displayName: 'Legacy Field', value: 'abc' },
	{
		name: 'rules.values[0].kind',
		path: ['rules', 'values', 0, 'kind'],
		displayName: 'Kind',
		value: 'x',
	},
	{
		name: 'rules.values[1].kind',
		path: ['rules', 'values', 1, 'kind'],
		displayName: 'Kind',
		value: 'y',
	},
];

const changedDefaults: NodeVersionChange['changedDefaults'] = [
	{ name: 'mode', displayName: 'Mode', oldDefault: 'a', newDefault: 'b' },
	{ name: 'verbose', displayName: 'Verbose', oldDefault: false, newDefault: true },
];

const RED_HEADLINE = 'Updated to version 2. Set the highlighted parameters below.';
const AUTHENTICATION_HEADLINE = 'Updated to version 2. Set the authentication again.';
const GREEN_HEADLINE = 'Updated to version 2. All parameters are set.';
const CLOSING_LINE = 'This version can also change how the node behaves.';

const main = (node: string, index = 0) => ({ node, type: NodeConnectionTypes.Main, index });

const basicAuth = { httpBasicAuth: { id: '1', name: 'My Basic Auth' } };
const droppedCredentials = ['httpBasicAuth'];
const CREDENTIAL_HINT = 'The credential My Basic Auth is no longer used by this node.';

const renderComponent = createComponentRenderer(NodeVersionChangeBanner);

const renderBanner = (
	change: Partial<NodeVersionChange> = {},
	nodeOverrides: Parameters<typeof createTestNode>[0] = {},
) => {
	const pinia = createTestingPinia({ stubActions: false });
	useNodeTypesStore(pinia).setNodeTypes([typeV1, typeV2]);

	return renderComponent({
		pinia,
		props: {
			node: createTestNode({
				type: NODE_TYPE,
				typeVersion: 2,
				parameters: { token: 'set' },
				...nodeOverrides,
			}),
			nodeType: typeV2,
			change: {
				setAside: [],
				changedDefaults: [],
				removedConnections: [],
				droppedCredentials: [],
				fromVersion: 1,
				...change,
			},
		},
	});
};

/** The label and the value chips of each row. */
const rowTexts = (bucket: HTMLElement) =>
	within(bucket)
		.getAllByRole('listitem')
		.map((row) => Array.from(row.children, (part) => part.textContent));

describe('NodeVersionChangeBanner', () => {
	it('lists the values that did not carry over and the defaults that changed', () => {
		const { getByTestId } = renderBanner({ setAside, changedDefaults });

		const setAsideBucket = getByTestId('node-version-change-set-aside');
		expect(setAsideBucket.querySelector('summary')).toHaveTextContent("3 values didn't carry over");
		// Two rows share the label "Kind", so a nested row shows its full name.
		expect(rowTexts(setAsideBucket)).toEqual([
			['Legacy Field', 'abc'],
			['rules.values[0].kind', 'x'],
			['rules.values[1].kind', 'y'],
		]);

		const defaultsBucket = getByTestId('node-version-change-defaults');
		expect(defaultsBucket.querySelector('summary')).toHaveTextContent('2 defaults changed');
		// Each option label comes from the description of its own version.
		expect(rowTexts(defaultsBucket)).toEqual([
			['Mode', 'Alpha (old)', '→', 'Beta (new)'],
			['Verbose', 'Off', '→', 'On'],
		]);
	});

	it('shows only the bucket that has entries', () => {
		const { getByTestId, queryByTestId } = renderBanner({
			changedDefaults: changedDefaults.slice(0, 1),
		});

		expect(getByTestId('node-version-change-defaults').querySelector('summary')).toHaveTextContent(
			'1 default changed',
		);
		expect(queryByTestId('node-version-change-set-aside')).not.toBeInTheDocument();
	});

	it('shows no bucket when everything carried over', () => {
		const { getByTestId } = renderBanner();

		const banner = getByTestId('node-version-change-banner');
		expect(banner).toHaveTextContent(GREEN_HEADLINE);
		expect(banner.querySelector('details')).toBeNull();
	});

	it('keeps the buckets and the closing line when all parameters are set', () => {
		const { getByTestId } = renderBanner({ setAside, changedDefaults });

		const banner = getByTestId('node-version-change-banner');
		expect(banner).toHaveTextContent(GREEN_HEADLINE);
		expect(banner).toHaveTextContent(CLOSING_LINE);
		expect(banner.querySelectorAll('details')).toHaveLength(2);
	});

	it('asks for the highlighted parameters while a required parameter is empty', () => {
		const { getByTestId } = renderBanner({}, { parameters: { token: '' } });

		const banner = getByTestId('node-version-change-banner');
		expect(banner).toHaveTextContent(RED_HEADLINE);
		expect(banner).toHaveTextContent(CLOSING_LINE);
	});

	it('still asks for the highlighted parameters on a disabled node', () => {
		const { getByTestId } = renderBanner({}, { parameters: { token: '' }, disabled: true });

		expect(getByTestId('node-version-change-banner')).toHaveTextContent(RED_HEADLINE);
	});

	it('masks a password inside a collection that did not carry over', () => {
		const { getByTestId, queryByText } = renderBanner({
			setAside: [
				{
					name: 'auth',
					path: ['auth'],
					displayName: 'Auth',
					value: { user: 'bob', password: 'hunter2' },
				},
			],
		});

		const bucket = getByTestId('node-version-change-set-aside');
		expect(bucket.querySelector('summary')).toHaveTextContent("1 value didn't carry over");
		expect(rowTexts(bucket)).toEqual([['Auth', `{"user":"bob","password":"${MASK}"}`]]);
		expect(queryByText(/hunter2/)).not.toBeInTheDocument();
	});

	it('masks the old and new default of a password parameter', () => {
		const { getByTestId, queryByText } = renderBanner({
			changedDefaults: [
				{ name: 'password', displayName: 'Password', oldDefault: 'old-key', newDefault: 'new-key' },
			],
		});

		const [row] = rowTexts(getByTestId('node-version-change-defaults'));
		expect(row.filter((text) => text === MASK)).toHaveLength(2);
		expect(queryByText(/-key/)).not.toBeInTheDocument();
	});

	it('masks every value that did not carry over when the old version has no description', () => {
		const { getByTestId, queryByText } = renderBanner({ setAside, fromVersion: 9 });

		expect(rowTexts(getByTestId('node-version-change-set-aside'))).toEqual([
			['Legacy Field', MASK],
			['rules.values[0].kind', MASK],
			['rules.values[1].kind', MASK],
		]);
		expect(queryByText('abc')).not.toBeInTheDocument();
	});

	it('lists a removed connection on the output side', () => {
		const { getByTestId } = renderBanner({
			removedConnections: [[main('Switch', 1), main('Slack')]],
		});

		const bucket = getByTestId('node-version-change-connections');
		expect(bucket.querySelector('summary')).toHaveTextContent('1 connection removed');
		expect(rowTexts(bucket)).toEqual([['Switch', '→', 'Slack']]);
	});

	it('lists a removed connection on the input side', () => {
		const { getByTestId } = renderBanner({
			removedConnections: [
				[main('Set'), main('Merge', 1)],
				[main('Edit'), main('Merge', 2)],
			],
		});

		const bucket = getByTestId('node-version-change-connections');
		expect(bucket.querySelector('summary')).toHaveTextContent('2 connections removed');
		expect(rowTexts(bucket)).toEqual([
			['Set', '→', 'Merge'],
			['Edit', '→', 'Merge'],
		]);
	});

	it('keeps the headline when only connections were removed', () => {
		const { getByTestId } = renderBanner({
			removedConnections: [[main('Switch', 1), main('Slack')]],
		});

		expect(getByTestId('node-version-change-banner')).toHaveTextContent(GREEN_HEADLINE);
		expect(getByTestId('node-version-change-connections')).toBeInTheDocument();
	});

	it('names a credential that the node no longer uses until the node uses it again', async () => {
		const { getByTestId, queryByTestId, rerender } = renderBanner(
			{ droppedCredentials },
			{ credentials: basicAuth },
		);

		const banner = getByTestId('node-version-change-banner');
		expect(getByTestId('node-version-change-unused-credential')).toHaveTextContent(CREDENTIAL_HINT);
		expect(banner).toHaveTextContent(AUTHENTICATION_HEADLINE);

		await rerender({
			node: createTestNode({
				type: NODE_TYPE,
				typeVersion: 2,
				parameters: { token: 'set', authentication: 'basicAuth' },
				credentials: basicAuth,
			}),
		});

		expect(queryByTestId('node-version-change-unused-credential')).not.toBeInTheDocument();
		expect(banner).toHaveTextContent(GREEN_HEADLINE);
	});

	it('shows no credential line when the credential is not on the node', () => {
		const { getByTestId, queryByTestId } = renderBanner({ droppedCredentials });

		expect(queryByTestId('node-version-change-unused-credential')).not.toBeInTheDocument();
		expect(getByTestId('node-version-change-banner')).toHaveTextContent(GREEN_HEADLINE);
	});

	it('asks for the highlighted parameters first when a credential is also unused', () => {
		const { getByTestId } = renderBanner(
			{ droppedCredentials },
			{ parameters: { token: '' }, credentials: basicAuth },
		);

		expect(getByTestId('node-version-change-banner')).toHaveTextContent(RED_HEADLINE);
		expect(getByTestId('node-version-change-unused-credential')).toHaveTextContent(CREDENTIAL_HINT);
	});
});
