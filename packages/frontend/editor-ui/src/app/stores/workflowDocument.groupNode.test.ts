/**
 * Acceptance test for the group-node read/save round trip.
 *
 * Loads a real user export that mixed both group models — a legacy `nodeGroups`
 * entry that never stamped `parentId`, and a `group` node whose dropped member
 * never got a `parentId` either — and pins that, with the group-node flag on,
 * the read path converts it to the D shape and a save round trip stays coherent.
 *
 * The flag is mocked on here. The legacy (flag-off) path is covered by
 * workflowDocument.store.test.ts, whose group tests run with the flag off.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { computed } from 'vue';
import { GROUP_NODE_TYPE, isGroupNode } from 'n8n-workflow';
import type { IWorkflowDb, INodeUi } from '@/Interface';

// The store reads the flag through this composable at factory time.
vi.mock('@/experiments/groupNode/useGroupNodeExperiment', () => ({
	useGroupNodeExperiment: () => ({ isFeatureEnabled: computed(() => true) }),
}));

const { getNodeTypeMock } = vi.hoisted(() => ({
	getNodeTypeMock: vi.fn().mockReturnValue(null),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: getNodeTypeMock,
		communityNodeType: vi.fn().mockReturnValue(null),
		getAllNodeTypes: vi.fn().mockReturnValue({
			nodeTypes: {},
			init: async () => {},
			getByNameAndVersion: () => undefined,
		}),
	})),
}));

import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import userExport from './__fixtures__/user-d-export.json';

// The fixture is a raw editor export; the store hydrates an IWorkflowDb keyed by
// the document id, so fill the id and the few scalar fields hydrate reads.
function asWorkflowDb(): IWorkflowDb {
	return {
		...(userExport as unknown as IWorkflowDb),
		id: userExport.id,
		active: false,
		isArchived: false,
		createdAt: -1,
		updatedAt: -1,
		versionId: '',
		activeVersionId: null,
	};
}

function nodeByName(nodes: INodeUi[], name: string): INodeUi | undefined {
	return nodes.find((node) => node.name === name);
}

describe('workflowDocument.store group-node round trip', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getNodeTypeMock.mockReturnValue(null);
	});

	it('converts a legacy nodeGroups entry into a group node with parentId members on load', () => {
		const store = useWorkflowDocumentStore(createWorkflowDocumentId(userExport.id));
		store.hydrate(asWorkflowDb());

		const nodes = store.allNodes;

		// A group node exists for the former "Group 1" nodeGroups entry. Its id is
		// carried over from the nodeGroups entry, so old references still resolve.
		const derivedGroupId = '1772dc83-87bf-4dcc-acfa-7ad643f7c20f';
		const derivedGroup = nodes.find((node) => node.id === derivedGroupId);
		expect(derivedGroup).toBeDefined();
		expect(derivedGroup && isGroupNode(derivedGroup)).toBe(true);

		// The two members named by "Group 1" now point at that group.
		expect(nodeByName(nodes, 'Edit Fields')?.parentId).toBe(derivedGroupId);
		expect(nodeByName(nodes, 'Edit Fields1')?.parentId).toBe(derivedGroupId);

		// The pre-existing group node is left as it was (idempotency guard): the
		// only group nodes are the pre-existing one and the newly derived one.
		const groupNodes = nodes.filter(isGroupNode);
		expect(groupNodes.map((node) => node.id).sort()).toEqual(
			[derivedGroupId, '1f44ac84-d73a-4743-83f2-ffd3e861fd9c'].sort(),
		);
	});

	it('save writes both shapes: group nodes in nodes and reverse-derived nodeGroups', () => {
		const store = useWorkflowDocumentStore(createWorkflowDocumentId(userExport.id));
		store.hydrate(asWorkflowDb());

		const data = store.serialize();

		// Group nodes present, members carry parentId.
		const derivedGroupId = '1772dc83-87bf-4dcc-acfa-7ad643f7c20f';
		expect(
			data.nodes.some((node) => node.type === GROUP_NODE_TYPE && node.id === derivedGroupId),
		).toBe(true);
		expect(data.nodes.find((node) => node.name === 'Edit Fields')?.parentId).toBe(derivedGroupId);
		expect(data.nodes.find((node) => node.name === 'Edit Fields1')?.parentId).toBe(derivedGroupId);

		// The reverse-derived nodeGroups match the derived group: same id, same
		// members. (The pre-existing empty group is not expressible in the old
		// format, so it is dropped from nodeGroups — its group node stays.)
		const reversed = data.nodeGroups?.find((group) => group.id === derivedGroupId);
		expect(reversed).toBeDefined();
		expect(reversed?.nodeIds.sort()).toEqual(
			['8262b36b-a436-4679-939d-f0ea401d7601', '8c26d7f0-5756-4d09-95be-3eb58c1a28dd'].sort(),
		);
	});
});
