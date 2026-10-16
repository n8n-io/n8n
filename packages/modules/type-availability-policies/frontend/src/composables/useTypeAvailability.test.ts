import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';

import { useTypeAvailability } from './useTypeAvailability';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const SLACK_NODE = 'n8n-nodes-base.slack';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';
const VIRUS_TOTAL_NODE = 'n8n-creds-base.virusTotalApi';
const VIRUS_TOTAL_CREDENTIAL = 'virusTotalApi';

describe('useTypeAvailability', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('loading the project', () => {
		it('fetches the project immediately and again when the ref changes', async () => {
			const store = useTypeAvailabilityPoliciesStore();
			const fetchForProject = vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);
			const projectId = ref('project-a');

			useTypeAvailability(projectId);
			expect(fetchForProject).toHaveBeenCalledTimes(1);
			expect(fetchForProject).toHaveBeenCalledWith('project-a');

			projectId.value = 'project-b';
			await nextTick();

			expect(fetchForProject).toHaveBeenCalledTimes(2);
			expect(fetchForProject).toHaveBeenLastCalledWith('project-b');
		});

		it('fetches a getter-based project id and refetches when it changes', async () => {
			const store = useTypeAvailabilityPoliciesStore();
			const fetchForProject = vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);
			const source = ref('project-a');

			useTypeAvailability(() => source.value);
			expect(fetchForProject).toHaveBeenCalledWith('project-a');

			source.value = 'project-b';
			await nextTick();

			expect(fetchForProject).toHaveBeenLastCalledWith('project-b');
		});

		it.each([null, undefined, ''])('does not fetch when the project id is %j', (value) => {
			const store = useTypeAvailabilityPoliciesStore();
			const fetchForProject = vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);

			useTypeAvailability(ref(value));

			expect(fetchForProject).not.toHaveBeenCalled();
		});
	});

	describe('nodeTypeRestriction', () => {
		it('passes the explicit project id through to the store getter', () => {
			const store = useTypeAvailabilityPoliciesStore();
			vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);
			const getNodeTypeAvailability = vi
				.spyOn(store, 'getNodeTypeAvailability')
				.mockReturnValue({ name: SLACK_NODE, available: false, scope: 'project' });

			const { nodeTypeRestriction } = useTypeAvailability(ref('project-a'));
			const restriction = nodeTypeRestriction(SLACK_NODE);

			expect(getNodeTypeAvailability).toHaveBeenCalledWith(SLACK_NODE, 'project-a');
			expect(restriction).toMatchObject({ scope: 'project' });
		});

		it('returns null and skips the store lookup without a project id', () => {
			const store = useTypeAvailabilityPoliciesStore();
			vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);
			const getNodeTypeAvailability = vi.spyOn(store, 'getNodeTypeAvailability');

			const { nodeTypeRestriction } = useTypeAvailability(ref(null));

			expect(nodeTypeRestriction(SLACK_NODE)).toBeNull();
			expect(getNodeTypeAvailability).not.toHaveBeenCalled();
		});

		it('composes the credential-only node answer from the credential type it wraps', () => {
			const store = useTypeAvailabilityPoliciesStore();
			vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);
			vi.spyOn(store, 'getNodeTypeAvailability').mockReturnValue({
				name: HTTP_REQUEST,
				available: true,
			});
			const getCredentialTypeAvailability = vi
				.spyOn(store, 'getCredentialTypeAvailability')
				.mockImplementation((name) =>
					name === VIRUS_TOTAL_CREDENTIAL
						? { name, available: false, scope: 'instance' }
						: { name, available: true },
				);

			const { nodeTypeRestriction } = useTypeAvailability(ref('project-a'));

			expect(nodeTypeRestriction(VIRUS_TOTAL_NODE)).toMatchObject({
				name: VIRUS_TOTAL_CREDENTIAL,
				scope: 'instance',
			});
			expect(getCredentialTypeAvailability).toHaveBeenCalledWith(
				VIRUS_TOTAL_CREDENTIAL,
				'project-a',
			);
		});
	});

	describe('credentialTypeRestriction', () => {
		it('passes the explicit project id through to the store getter', () => {
			const store = useTypeAvailabilityPoliciesStore();
			vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);
			const getCredentialTypeAvailability = vi
				.spyOn(store, 'getCredentialTypeAvailability')
				.mockReturnValue({ name: VIRUS_TOTAL_CREDENTIAL, available: false, scope: 'instance' });

			const { credentialTypeRestriction } = useTypeAvailability(ref('project-a'));
			const restriction = credentialTypeRestriction(VIRUS_TOTAL_CREDENTIAL);

			expect(getCredentialTypeAvailability).toHaveBeenCalledWith(
				VIRUS_TOTAL_CREDENTIAL,
				'project-a',
			);
			expect(restriction).toMatchObject({ scope: 'instance' });
		});

		it('returns null and skips the store lookup without a project id', () => {
			const store = useTypeAvailabilityPoliciesStore();
			vi.spyOn(store, 'fetchForProject').mockResolvedValue(undefined);
			const getCredentialTypeAvailability = vi.spyOn(store, 'getCredentialTypeAvailability');

			const { credentialTypeRestriction } = useTypeAvailability(ref(undefined));

			expect(credentialTypeRestriction(VIRUS_TOTAL_CREDENTIAL)).toBeNull();
			expect(getCredentialTypeAvailability).not.toHaveBeenCalled();
		});
	});
});
