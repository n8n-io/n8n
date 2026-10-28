import type { PolicyViolation } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

import RestrictedTypesDialog from './RestrictedTypesDialog.vue';

const mocks = vi.hoisted(() => ({ getProject: vi.fn() }));

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getProject: mocks.getProject,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost', pushRef: 'test' } }),
}));

const flushPromises = async () => await new Promise((resolve) => setTimeout(resolve));

const DESTINATION = { id: 'project-dest', name: 'Marketing', type: 'team', relations: [] };

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
	props: ['open', 'nodeTypeName', 'kind', 'audience', 'project'],
	template:
		'<div v-if="open" data-test-id="contact-admin-modal" :data-kind="kind" :data-audience="audience" :data-project="project?.id" :data-names="[].concat(nodeTypeName).join(\'|\')" />',
};

const restrictedNodePopoverStub = {
	props: ['nodeTypeName', 'restriction', 'kind', 'projectType'],
	emits: ['contactAdmin'],
	template:
		'<button data-test-id="row-popover" :data-scope="restriction?.scope" :data-project-type="projectType" @click="$emit(\'contactAdmin\', \'project\')" />',
};

function violation(
	subjectType: string,
	subject: string,
	scope: 'instance' | 'project' = 'project',
): PolicyViolation {
	return {
		kind: `${subjectType}-unavailable`,
		checkId: `${subjectType}-availability`,
		message: `"${subject}" is blocked`,
		subject,
		subjectType,
		scope,
	};
}

const slack = violation('nodeType', 'n8n-nodes-base.slack');
const github = violation('credentialType', 'githubApi');

const renderComponent = createComponentRenderer(RestrictedTypesDialog, {
	props: {
		open: true,
		violations: [slack],
		projectId: DESTINATION.id,
		projectName: 'Marketing',
		labelOf: () => undefined,
	},
	global: {
		stubs: {
			ContactAdminModal: contactAdminModalStub,
			RestrictedNodePopover: restrictedNodePopoverStub,
		},
	},
});

const rowTexts = (list: HTMLElement) =>
	Array.from(list.querySelectorAll('li')).map((row) => row.textContent?.trim());

describe('RestrictedTypesDialog', () => {
	beforeEach(() => {
		mocks.getProject.mockReset().mockResolvedValue(DESTINATION);
	});

	it('names the project in the title and description', () => {
		const { getByText } = renderComponent();

		expect(getByText('Restricted in Marketing')).toBeInTheDocument();
		expect(getByText(/Marketing doesn't allow these nodes and credentials/)).toBeInTheDocument();
	});

	it('words each row by subject type, named by the host label, the subject, then the message', () => {
		const withoutSubject: PolicyViolation = {
			kind: 'workflow-start-denied',
			checkId: 'workflow-start',
			message: 'Cannot start here',
		};
		const { getByTestId } = renderComponent({
			props: {
				violations: [slack, github, violation('somethingElse', 'thing-1'), withoutSubject],
				labelOf: ({ subject }: PolicyViolation) =>
					subject === 'n8n-nodes-base.slack' ? 'Slack' : undefined,
			},
		});

		expect(rowTexts(getByTestId('restricted-types-list'))).toEqual([
			'Slack node',
			'githubApi credential',
			'thing-1',
			'Cannot start here',
		]);
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
		it('opens for the destination project admins when the project blocks every type', async () => {
			const { getByTestId } = renderComponent({
				props: {
					violations: [slack, github],
					labelOf: ({ subject }: PolicyViolation) =>
						subject === 'n8n-nodes-base.slack' ? 'Slack' : undefined,
				},
			});
			await flushPromises();

			expect(getByTestId('restricted-types-contact-admin')).toHaveTextContent(
				'Contact project admin',
			);
			await userEvent.click(getByTestId('restricted-types-contact-admin'));

			const modal = getByTestId('contact-admin-modal');
			expect(modal).toHaveAttribute('data-names', 'Slack|githubApi');
			expect(modal).toHaveAttribute('data-audience', 'project');
			expect(modal).toHaveAttribute('data-project', DESTINATION.id);
			expect(mocks.getProject).toHaveBeenCalledWith(expect.anything(), DESTINATION.id);
		});

		it('opens for the instance admins when the instance blocks one of the types', async () => {
			const { getByTestId } = renderComponent({
				props: { violations: [slack, violation('credentialType', 'githubApi', 'instance')] },
			});
			await flushPromises();

			expect(getByTestId('restricted-types-contact-admin')).toHaveTextContent(
				'Contact instance admin',
			);
			await userEvent.click(getByTestId('restricted-types-contact-admin'));

			expect(getByTestId('contact-admin-modal')).toHaveAttribute('data-audience', 'instance');
		});

		it('falls back to the instance admins when the destination does not load', async () => {
			mocks.getProject.mockRejectedValue(new Error('Forbidden'));
			const { getByTestId } = renderComponent();
			await flushPromises();

			expect(getByTestId('restricted-types-contact-admin')).toHaveTextContent(
				'Contact instance admin',
			);
		});

		it('explains each row by its own scope, judged against the destination', async () => {
			const { getAllByTestId } = renderComponent({
				props: { violations: [slack, violation('credentialType', 'githubApi', 'instance')] },
			});
			await flushPromises();

			const popovers = getAllByTestId('row-popover');
			expect(popovers.map((popover) => popover.dataset.scope)).toEqual(['project', 'instance']);
			expect(popovers[0]).toHaveAttribute('data-project-type', 'team');
		});

		it('writes only about the row whose popover asks for contact', async () => {
			const { getAllByTestId, getByTestId } = renderComponent({
				props: { violations: [slack, github] },
			});
			await flushPromises();

			await userEvent.click(getAllByTestId('row-popover')[1]);

			const modal = getByTestId('contact-admin-modal');
			expect(modal).toHaveAttribute('data-names', 'githubApi');
			expect(modal).toHaveAttribute('data-kind', 'credential');
			expect(modal).toHaveAttribute('data-audience', 'project');
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
