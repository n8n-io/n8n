import { effectScope } from 'vue';
import { createCRDTProvider, CRDTEngine } from '@n8n/crdt';
import type { CRDTDoc } from '@n8n/crdt';
import {
	useWorkflowDocumentAwareness,
	type WorkflowAwarenessUser,
} from './useWorkflowDocumentAwareness';

const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

const userA: WorkflowAwarenessUser = { id: 'user-a', name: 'Alice', color: '#f00' };
const userB: WorkflowAwarenessUser = { id: 'user-b', name: 'Bob', color: '#00f' };

/** Run the composable inside an effect scope so `onScopeDispose` is honored. */
function inScope<T>(fn: () => T): { result: T; stop: () => void } {
	const scope = effectScope();
	const result = scope.run(fn) as T;
	return { result, stop: () => scope.stop() };
}

describe('useWorkflowDocumentAwareness', () => {
	let doc: CRDTDoc;

	beforeEach(() => {
		doc = provider.createDoc('awareness-doc');
	});

	it('publishes the local user but excludes it from remote states', () => {
		const { result: awarenessApi } = inScope(() =>
			useWorkflowDocumentAwareness({ doc, localUser: userA }),
		);

		expect(doc.getAwareness().getLocalState()).toMatchObject({ user: userA });
		expect(awarenessApi.remoteStates.value.size).toBe(0);
	});

	it('reflects a remote peer in remoteStates', () => {
		const { result: awarenessApi } = inScope(() =>
			useWorkflowDocumentAwareness({ doc, localUser: userA }),
		);

		const peerDoc = provider.createDoc('peer-doc');
		const peerAwareness = peerDoc.getAwareness();
		peerAwareness.setLocalState({ user: userB });
		doc.getAwareness().applyUpdate(peerAwareness.encodeState());

		const remoteUsers = [...awarenessApi.remoteStates.value.values()].map((s) => s.user.id);
		expect(remoteUsers).toContain('user-b');
	});

	it('updates the local cursor and selection fields', () => {
		const { result: awarenessApi } = inScope(() =>
			useWorkflowDocumentAwareness({ doc, localUser: userA }),
		);

		awarenessApi.setCursor({ x: 10, y: 20 });
		awarenessApi.setSelectedNodeIds(['n1', 'n2']);

		expect(doc.getAwareness().getLocalState()).toMatchObject({
			cursor: { x: 10, y: 20 },
			selectedNodeIds: ['n1', 'n2'],
		});
	});

	it('marks the local client offline on scope dispose', () => {
		const { result: awarenessApi, stop } = inScope(() =>
			useWorkflowDocumentAwareness({ doc, localUser: userA }),
		);
		expect(doc.getAwareness().getLocalState()).not.toBeNull();

		stop();

		expect(doc.getAwareness().getLocalState()).toBeNull();
		// Reactive snapshot remains accessible without throwing.
		expect(awarenessApi.remoteStates.value).toBeInstanceOf(Map);
	});

	it('broadcasts the offline state to peers on scope dispose', () => {
		// Skip gracefully in environments without BroadcastChannel.
		if (typeof BroadcastChannel === 'undefined') return;
		const postSpy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
		const { stop } = inScope(() => useWorkflowDocumentAwareness({ doc, localUser: userA }));

		// Ignore anything from setup; we only care about teardown.
		postSpy.mockClear();
		stop();

		// destroy() must broadcast our offline update (setLocalState(null)) while
		// the relay is still subscribed and the channel open — before tearing down.
		expect(postSpy).toHaveBeenCalled();
		postSpy.mockRestore();
	});

	it('broadcasts only local presence changes, not applied remote updates', () => {
		// Skip gracefully in environments without BroadcastChannel.
		if (typeof BroadcastChannel === 'undefined') return;
		{
			const postSpy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
			const { result: awarenessApi } = inScope(() =>
				useWorkflowDocumentAwareness({ doc, localUser: userA }),
			);

			// A local change is broadcast to peers.
			awarenessApi.setCursor({ x: 1, y: 2 });
			expect(postSpy).toHaveBeenCalled();

			postSpy.mockClear();

			// Applying a peer's update fires onUpdate with origin 'remote'; it must
			// NOT be re-broadcast (would echo back and forth across tabs).
			const peerDoc = provider.createDoc('peer-doc');
			const peerAwareness = peerDoc.getAwareness();
			peerAwareness.setLocalState({ user: userB });
			doc.getAwareness().applyUpdate(peerAwareness.encodeState());

			expect(postSpy).not.toHaveBeenCalled();
			postSpy.mockRestore();
		}
	});
});
