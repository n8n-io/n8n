import type { PolicyViolation } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import PolicyViolationList from './PolicyViolationList.vue';

const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';
const TELEGRAM_NODE_TYPE = 'n8n-nodes-base.telegram';
const GITHUB_CREDENTIAL_TYPE = 'githubApi';

function nodeTypeViolation(subject: string, scope: string): PolicyViolation {
	return {
		kind: 'node-type-unavailable',
		checkId: 'node-type-availability',
		message: `Node type "${subject}" is blocked`,
		subject,
		subjectType: 'nodeType',
		scope,
	};
}

const slackOnInstance = nodeTypeViolation(SLACK_NODE_TYPE, 'instance');
const telegramInProject = nodeTypeViolation(TELEGRAM_NODE_TYPE, 'project');

const githubCredentialOnInstance: PolicyViolation = {
	kind: 'credential-type-unavailable',
	checkId: 'credential-type-availability',
	message: `Credential type "${GITHUB_CREDENTIAL_TYPE}" is blocked by an instance policy`,
	subject: GITHUB_CREDENTIAL_TYPE,
	subjectType: 'credentialType',
	scope: 'instance',
};

const renderComponent = createComponentRenderer(PolicyViolationList, {
	props: { violations: [slackOnInstance] },
});

function groupTexts(groups: HTMLElement[]) {
	return groups.map((group) =>
		within(group)
			.getAllByTestId('policy-violation')
			.map((line) => line.textContent?.trim()),
	);
}

describe('PolicyViolationList', () => {
	it('groups the violations under one heading for each scope, instance first', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				violations: [telegramInProject, slackOnInstance, githubCredentialOnInstance],
			},
		});

		expect(getAllByTestId('policy-violation-scope').map((heading) => heading.textContent)).toEqual([
			'Restricted on this instance',
			'Restricted in this project',
		]);
		expect(groupTexts(getAllByTestId('policy-violation-group'))).toEqual([
			[`${SLACK_NODE_TYPE} node`, `${GITHUB_CREDENTIAL_TYPE} credential`],
			[`${TELEGRAM_NODE_TYPE} node`],
		]);
	});

	it('names each type by the display name the host resolved', () => {
		const labels: Record<string, string> = { [SLACK_NODE_TYPE]: 'Slack', githubApi: 'GitHub API' };
		const { getAllByTestId } = renderComponent({
			props: {
				violations: [slackOnInstance, githubCredentialOnInstance],
				labelOf: ({ subject }: PolicyViolation) => (subject ? labels[subject] : undefined),
			},
		});

		expect(getAllByTestId('policy-violation').map((line) => line.textContent?.trim())).toEqual([
			'Slack node',
			'GitHub API credential',
		]);
	});

	it('shows the backend message for an unknown kind, and the raw heading for an unknown scope', () => {
		const deprecated = { ...slackOnInstance, kind: 'node-type-deprecated', scope: 'team' };
		const withoutScope: PolicyViolation = {
			kind: 'workflow-start-denied',
			checkId: 'workflow-start',
			message: 'This project cannot start workflows',
		};
		const { getAllByTestId } = renderComponent({
			props: { violations: [withoutScope, deprecated] },
		});

		expect(getAllByTestId('policy-violation-scope').map((heading) => heading.textContent)).toEqual([
			'team',
		]);
		expect(groupTexts(getAllByTestId('policy-violation-group'))).toEqual([
			[deprecated.message],
			['This project cannot start workflows'],
		]);
	});

	it('lists a repeated violation once', () => {
		const { getAllByTestId } = renderComponent({
			props: { violations: [slackOnInstance, { ...slackOnInstance }] },
		});

		expect(getAllByTestId('policy-violation')).toHaveLength(1);
	});

	it('makes only a jumpable type a link and emits its violation', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: {
				violations: [slackOnInstance, githubCredentialOnInstance, telegramInProject],
				isJumpable: ({ subject }: PolicyViolation) => subject !== TELEGRAM_NODE_TYPE,
			},
		});

		const jumps = getAllByTestId('policy-violation-jump');
		expect(jumps).toHaveLength(2);

		await userEvent.click(jumps[1]);

		expect(emitted().jump).toEqual([[githubCredentialOnInstance]]);
	});
});
