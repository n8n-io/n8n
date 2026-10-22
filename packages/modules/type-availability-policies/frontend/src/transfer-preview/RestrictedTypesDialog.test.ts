import type { PolicyViolation } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

import RestrictedTypesDialog from './RestrictedTypesDialog.vue';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nDialog: {
			name: 'N8nDialog',
			props: ['open', 'header'],
			template: '<div v-if="open"><h2>{{ header }}</h2><slot /></div>',
		},
		N8nDialogDescription: {
			name: 'N8nDialogDescription',
			template: '<p><slot /></p>',
		},
	};
});

const contactAdminModalStub = {
	props: ['open', 'nodeTypeName', 'kind', 'audience'],
	template:
		'<div v-if="open" data-test-id="contact-admin-modal" :data-kind="kind" :data-audience="audience" :data-names="[].concat(nodeTypeName).join(\'|\')" />',
};

function violation(subjectType: string, subject: string): PolicyViolation {
	return {
		kind: `${subjectType}-unavailable`,
		checkId: `${subjectType}-availability`,
		message: `"${subject}" is blocked`,
		subject,
		subjectType,
		scope: 'project',
	};
}

const slack = violation('nodeType', 'n8n-nodes-base.slack');
const github = violation('credentialType', 'githubApi');

const renderComponent = createComponentRenderer(RestrictedTypesDialog, {
	props: {
		open: true,
		violations: [slack],
		projectName: 'Marketing',
		labelOf: () => undefined,
	},
	global: { stubs: { ContactAdminModal: contactAdminModalStub } },
});

const rowTexts = (list: HTMLElement) =>
	Array.from(list.querySelectorAll('li')).map((row) => row.textContent?.trim());

describe('RestrictedTypesDialog', () => {
	it('names the project in the title and description', () => {
		const { getByText } = renderComponent();

		expect(getByText('Restricted in Marketing')).toBeInTheDocument();
		expect(getByText(/Marketing doesn't allow these nodes and credentials/)).toBeInTheDocument();
	});

	it('renders nothing while closed', () => {
		const { queryByTestId } = renderComponent({ props: { open: false } });

		expect(queryByTestId('restricted-types-list')).not.toBeInTheDocument();
	});

	it('words a node row and a credential row by their subject type', () => {
		const { getByTestId } = renderComponent({ props: { violations: [slack, github] } });

		expect(rowTexts(getByTestId('restricted-types-list'))).toEqual([
			'n8n-nodes-base.slack node',
			'githubApi credential',
		]);
	});

	it('names each row by the host label, then the subject, then the message', () => {
		const withoutSubject: PolicyViolation = {
			kind: 'workflow-start-denied',
			checkId: 'workflow-start',
			message: 'Cannot start here',
		};
		const { getByTestId } = renderComponent({
			props: {
				violations: [slack, github, withoutSubject],
				labelOf: ({ subject }: PolicyViolation) =>
					subject === 'n8n-nodes-base.slack' ? 'Slack' : undefined,
			},
		});

		expect(rowTexts(getByTestId('restricted-types-list'))).toEqual([
			'Slack node',
			'githubApi credential',
			'Cannot start here',
		]);
	});

	it('shows only the name for a subject type without row copy', () => {
		const { getByTestId } = renderComponent({
			props: { violations: [violation('somethingElse', 'thing-1')] },
		});

		expect(rowTexts(getByTestId('restricted-types-list'))).toEqual(['thing-1']);
	});

	it('renders the icon slot once for each violation', () => {
		const { getAllByTestId } = renderComponent({
			props: { violations: [slack, github] },
			slots: {
				icon: ({ violation: { subject } }: { violation: PolicyViolation }) =>
					h('i', { 'data-test-id': 'row-icon' }, subject),
			},
		});

		expect(getAllByTestId('row-icon').map((icon) => icon.textContent)).toEqual([
			'n8n-nodes-base.slack',
			'githubApi',
		]);
	});

	describe('contact admin', () => {
		it('stays closed until the footer button is clicked', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('contact-admin-modal')).not.toBeInTheDocument();
		});

		it('opens for the instance admins with the name of every violation', async () => {
			const { getByTestId } = renderComponent({
				props: {
					violations: [slack, github],
					labelOf: ({ subject }: PolicyViolation) =>
						subject === 'n8n-nodes-base.slack' ? 'Slack' : undefined,
				},
			});

			await userEvent.click(getByTestId('restricted-types-contact-admin'));

			const modal = getByTestId('contact-admin-modal');
			expect(modal).toHaveAttribute('data-names', 'Slack|githubApi');
			expect(modal).toHaveAttribute('data-audience', 'instance');
		});

		it.each([
			['only nodes', [slack], 'node'],
			['nodes and credentials', [slack, github], 'node'],
			['only credentials', [github], 'credential'],
		])('uses the %s kind of copy', async (_name, violations, kind) => {
			const { getByTestId } = renderComponent({ props: { violations } });

			await userEvent.click(getByTestId('restricted-types-contact-admin'));

			expect(getByTestId('contact-admin-modal')).toHaveAttribute('data-kind', kind);
		});
	});

	it('closes through the Close button', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('restricted-types-close'));

		expect(emitted()['update:open']).toEqual([[false]]);
	});
});
