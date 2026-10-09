import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

import {
	getCredentialTypeRestriction,
	getNodeTypeRestriction,
	isNodeTypeRestricted,
	useNodeTypeRestriction,
} from './useNodeTypeRestriction';
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
});
