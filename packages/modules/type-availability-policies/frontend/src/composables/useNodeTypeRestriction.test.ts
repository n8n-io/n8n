import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

import {
	describeAgentToolRestriction,
	describeRestrictedNodeTypes,
	describeNodeTypeRestriction,
	getCredentialTypeRestriction,
	getNodeTypeRestriction,
	getRestrictionContact,
	isNodeTypeRestricted,
	resolveRestrictionContact,
	useNodeTypeRestriction,
} from './useNodeTypeRestriction';
import { mockPolicyProject } from '../__tests__/mocks';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

type Scope = 'instance' | 'project';

const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';
const VIRUS_TOTAL_NODE = 'n8n-creds-base.virusTotalApi';
const SYSDIG_NODE = 'n8n-creds-base.sysdigApi';

function mockRestrictions(
	nodeTypes: Record<string, Scope>,
	credentialTypes: Record<string, Scope> = {},
): void {
	const store = useTypeAvailabilityPoliciesStore();
	vi.spyOn(store, 'getNodeTypeAvailability').mockImplementation((name) => {
		const scope = nodeTypes[name];
		return scope ? { name, available: false, scope } : { name, available: true };
	});
	vi.spyOn(store, 'getCredentialTypeAvailability').mockImplementation((name) => {
		const scope = credentialTypes[name];
		return scope ? { name, available: false, scope } : { name, available: true };
	});
}

describe('useNodeTypeRestriction', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		mockRestrictions({ 'n8n-nodes-base.slack': 'project' });
	});

	it('reports a blocked type with the scope that blocked it', () => {
		const nodeType = ref<string | null>('n8n-nodes-base.set');

		const { isRestricted, restrictionScope } = useNodeTypeRestriction(nodeType);
		expect(isRestricted.value).toBe(false);

		nodeType.value = 'n8n-nodes-base.slack';
		expect(isRestricted.value).toBe(true);
		expect(restrictionScope.value).toBe('project');

		nodeType.value = null;
		expect(isRestricted.value).toBe(false);
	});

	it('answers the plain predicate', () => {
		expect(isNodeTypeRestricted('n8n-nodes-base.slack')).toBe(true);
		expect(isNodeTypeRestricted('n8n-nodes-base.set')).toBe(false);
	});

	it('answers the credential type verdict on its own', () => {
		mockRestrictions({}, { virusTotalApi: 'instance' });

		expect(getCredentialTypeRestriction('virusTotalApi')).toMatchObject({ scope: 'instance' });
		expect(getCredentialTypeRestriction('sysdigApi')).toBeNull();
	});

	describe('a credential-only node', () => {
		it('is restricted when HTTP Request is restricted', () => {
			mockRestrictions({ [HTTP_REQUEST]: 'instance' });

			expect(getNodeTypeRestriction(VIRUS_TOTAL_NODE)).toMatchObject({
				name: HTTP_REQUEST,
				scope: 'instance',
			});
			expect(isNodeTypeRestricted(SYSDIG_NODE)).toBe(true);
		});

		it('is restricted when the credential type it wraps is restricted', () => {
			mockRestrictions({}, { virusTotalApi: 'project' });

			expect(getNodeTypeRestriction(VIRUS_TOTAL_NODE)).toMatchObject({
				name: 'virusTotalApi',
				scope: 'project',
			});
		});

		it('leaves HTTP Request and its siblings available when one credential type is restricted', () => {
			mockRestrictions({}, { virusTotalApi: 'instance' });

			expect(isNodeTypeRestricted(VIRUS_TOTAL_NODE)).toBe(true);
			expect(isNodeTypeRestricted(HTTP_REQUEST)).toBe(false);
			expect(isNodeTypeRestricted(SYSDIG_NODE)).toBe(false);
		});

		it('reports the HTTP Request restriction first when both apply', () => {
			mockRestrictions({ [HTTP_REQUEST]: 'instance' }, { virusTotalApi: 'project' });

			expect(getNodeTypeRestriction(VIRUS_TOTAL_NODE)).toMatchObject({
				name: HTTP_REQUEST,
				scope: 'instance',
			});
		});

		it('follows the composed answer in the reactive helper', () => {
			mockRestrictions({}, { virusTotalApi: 'project' });

			const { isRestricted, restrictionScope } = useNodeTypeRestriction(ref(VIRUS_TOTAL_NODE));

			expect(isRestricted.value).toBe(true);
			expect(restrictionScope.value).toBe('project');
		});
	});

	it('describes an agent tool restriction by scope', () => {
		expect(describeAgentToolRestriction('Slack', { scope: 'instance' })).toBe(
			"Slack is restricted on this instance. The agent can't use it.",
		);
		expect(describeAgentToolRestriction('Slack', { scope: 'project' })).toBe(
			"Slack is restricted in this project. The agent can't use it.",
		);
		expect(describeAgentToolRestriction('Slack', undefined)).toBe(
			"Slack is restricted. The agent can't use it.",
		);
	});

	describe('describeRestrictedNodeTypes', () => {
		it.each([
			['instance' as const, ' on this instance'],
			['project' as const, ' in this project'],
			[undefined, ''],
		])('describes a single restriction with scope %s', (scope, where) => {
			expect(describeRestrictedNodeTypes([{ displayName: 'Slack', scope }])).toBe(
				`An administrator blocked 'Slack'${where}. Contact an instance admin or replace the node to continue.`,
			);
		});

		it('groups several restrictions by scope in a fixed order', () => {
			const text = describeRestrictedNodeTypes([
				{ displayName: 'Custom Node' },
				{ displayName: 'Jira', scope: 'project' },
				{ displayName: 'Slack', scope: 'instance' },
				{ displayName: 'HTTP Request', scope: 'instance' },
			]);

			expect(text).toBe(
				[
					'An administrator blocked these nodes:',
					"Restricted on this instance: 'Slack', 'HTTP Request'.",
					"Restricted in this project: 'Jira'.",
					"Restricted: 'Custom Node'.",
					'Contact an instance admin or replace these nodes to continue.',
				].join('\n'),
			);
		});

		it('points to a project admin when a project admin can lift every restriction', () => {
			mockPolicyProject({ type: 'team' });

			const text = describeRestrictedNodeTypes([
				{ displayName: 'Slack', scope: 'project' },
				{ displayName: 'Jira', scope: 'instance', optInAvailable: true },
			]);

			expect(text.split('\n').at(-1)).toBe(
				'Contact a project admin or replace these nodes to continue.',
			);
		});

		it('skips a scope group with no entries', () => {
			const text = describeRestrictedNodeTypes([
				{ displayName: 'Slack', scope: 'instance' },
				{ displayName: 'Jira', scope: 'instance' },
				{ displayName: 'Custom Node' },
			]);

			expect(text).toBe(
				[
					'An administrator blocked these nodes:',
					"Restricted on this instance: 'Slack', 'Jira'.",
					"Restricted: 'Custom Node'.",
					'Contact an instance admin or replace these nodes to continue.',
				].join('\n'),
			);
		});
	});

	describe('resolveRestrictionContact', () => {
		it.each([
			{ verdict: { scope: 'project' }, projectType: 'team', contact: 'project' },
			{ verdict: { scope: 'instance' }, projectType: 'team', contact: 'instance' },
			{
				verdict: { scope: 'instance', optInAvailable: true },
				projectType: 'team',
				contact: 'optIn',
			},
			{ verdict: { scope: 'project' }, projectType: 'personal', contact: 'instance' },
			{ verdict: { scope: 'project' }, projectType: null, contact: 'instance' },
		] as const)(
			'resolves $verdict in a $projectType project to $contact',
			({ verdict, projectType, contact }) => {
				expect(resolveRestrictionContact(verdict, projectType)).toBe(contact);
			},
		);
	});

	it('uses the loaded project only when the restriction comes from it', () => {
		mockPolicyProject({ id: 'team-project', type: 'team' });

		expect(getRestrictionContact({ scope: 'project' }, 'team-project')).toBe('project');
		expect(getRestrictionContact({ scope: 'project' }, 'other-project')).toBe('instance');
	});

	it('points the next step to a project admin for a project restriction', () => {
		mockPolicyProject({ type: 'team' });

		expect(describeNodeTypeRestriction('Slack', { scope: 'project' }, 'replace')).toBe(
			"An administrator blocked 'Slack' in this project. Contact a project admin or replace the node to continue.",
		);
		expect(describeNodeTypeRestriction('Slack', { scope: 'instance' })).toBe(
			"An administrator blocked 'Slack' on this instance. Contact an instance admin to continue.",
		);
	});

	it('says a project admin can allow a delegated type', () => {
		mockPolicyProject({ type: 'team' });
		const verdict = { scope: 'instance', optInAvailable: true } as const;

		expect(describeNodeTypeRestriction('Slack', verdict)).toBe(
			"An administrator blocked 'Slack' on this instance. A project admin can allow it for this project. Contact one to continue.",
		);
		expect(describeAgentToolRestriction('Slack', verdict)).toBe(
			"Slack needs approval in this project. The agent can't use it until a project admin allows it.",
		);
	});

	it('exposes the opt-in state of the restriction', () => {
		vi.spyOn(useTypeAvailabilityPoliciesStore(), 'getNodeTypeAvailability').mockReturnValue({
			name: 'n8n-nodes-base.slack',
			available: false,
			scope: 'instance',
			optInAvailable: true,
		});

		const { restriction } = useNodeTypeRestriction(ref('n8n-nodes-base.slack'));

		expect(restriction.value?.optInAvailable).toBe(true);
	});
});
