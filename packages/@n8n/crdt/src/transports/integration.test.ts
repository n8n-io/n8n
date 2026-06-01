import WebSocketMock from 'vitest-websocket-mock';

import { CRDTEngine, createCRDTProvider } from '../index';
import { createSyncProvider } from '../sync/base-sync-provider';
import type { CRDTDoc, CRDTMap } from '../types';
import { MessagePortTransport } from './message-port';
import { WebSocketTransport } from './websocket';

/**
 * Test: Does onUpdate fire for applied remote updates?
 */
describe('onUpdate behavior verification', () => {
	it('should fire onUpdate for local changes', async () => {
		const { createCRDTProvider, CRDTEngine } = await import('../index');
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

		const doc = provider.createDoc('doc1');
		const updates: Uint8Array[] = [];
		doc.onUpdate((update) => {
			updates.push(new Uint8Array(update));
		});

		const map = doc.getMap('data');
		map.set('key', 'value');

		expect(updates.length).toBeGreaterThan(0);
		doc.destroy();
	});

	it('should fire onUpdate when applyUpdate is called', async () => {
		const { createCRDTProvider, CRDTEngine } = await import('../index');
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

		const doc1 = provider.createDoc('doc1');
		const doc2 = provider.createDoc('doc2');

		const doc2Updates: Uint8Array[] = [];
		doc2.onUpdate((update) => {
			doc2Updates.push(new Uint8Array(update));
		});

		// Make change on doc1
		const map1 = doc1.getMap('data');
		map1.set('key', 'value');

		// Encode and apply to doc2
		const state = doc1.encodeState();
		doc2.applyUpdate(state);

		// onUpdate SHOULD fire when applyUpdate is called
		expect(doc2Updates.length).toBeGreaterThan(0);

		doc1.destroy();
		doc2.destroy();
	});

	it('should forward updates via onUpdate to another transport', async () => {
		const { createCRDTProvider, CRDTEngine } = await import('../index');
		const { MockTransport } = await import('../transports');
		const { createSyncProvider } = await import('../sync/base-sync-provider');

		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

		const doc1 = provider.createDoc('doc1');
		const doc2 = provider.createDoc('doc2');

		// Set up mock transports
		const transport1 = new MockTransport();
		const transport2 = new MockTransport();
		MockTransport.link(transport1, transport2);

		// Track updates on doc2
		const doc2Updates: Uint8Array[] = [];
		doc2.onUpdate((update) => {
			doc2Updates.push(new Uint8Array(update));
		});

		// Set up sync providers
		const sync1 = createSyncProvider(doc1, transport1);
		const sync2 = createSyncProvider(doc2, transport2);

		await sync1.start();
		await sync2.start();

		// Make change on doc1
		const map1 = doc1.getMap('data');
		map1.set('key', 'value');

		// doc2 should receive the change
		const map2 = doc2.getMap('data');
		expect(map2.get('key')).toBe('value');

		// doc2's onUpdate should have fired
		// Note: This may include the initial sync + the change
		expect(doc2Updates.length).toBeGreaterThan(0);

		sync1.stop();
		sync2.stop();
		doc1.destroy();
		doc2.destroy();
	});
});

/**
 * Integration test simulating the full n8n sync architecture:
 *
 * ┌─────────────┐      ┌──────────────────────────────┐      ┌────────────┐
 * │     UI      │      │        SharedWorker          │      │   Server   │
 * │   (doc1)    │◄────►│          (doc2)              │◄────►│   (doc3)   │
 * └─────────────┘      └──────────────────────────────┘      └────────────┘
 *                 MessagePort                           WebSocket
 *                 Transport                             Transport
 *
 * Since SharedWorker is not available in Node.js, we simulate it using
 * MessageChannel which provides the same MessagePort API.
 */
describe('Integration: UI ↔ SharedWorker ↔ Server', () => {
	describe.each([CRDTEngine.yjs])('Engine: %s', (engine) => {
		let server: WebSocketMock;

		// UI side (browser tab)
		let uiDoc: CRDTDoc;
		let uiMap: CRDTMap<unknown>;
		let uiTransport: MessagePortTransport;

		// SharedWorker side (simulated)
		let workerDoc: CRDTDoc;
		let workerMap: CRDTMap<unknown>;
		let workerToUiTransport: MessagePortTransport;
		let workerToServerTransport: WebSocketTransport;

		// Server side (simulated via WebSocketMock)
		let serverDoc: CRDTDoc;
		let serverMap: CRDTMap<unknown>;

		beforeEach(() => {
			// Set up WebSocket mock server
			server = new WebSocketMock('ws://localhost:1234');

			const provider = createCRDTProvider({ engine });

			// Create docs for each layer
			uiDoc = provider.createDoc('ui-doc');
			workerDoc = provider.createDoc('worker-doc');
			serverDoc = provider.createDoc('server-doc');

			uiMap = uiDoc.getMap('workflow');
			workerMap = workerDoc.getMap('workflow');
			serverMap = serverDoc.getMap('workflow');

			// Set up MessageChannel to simulate UI ↔ SharedWorker communication
			const channel = new MessageChannel();
			uiTransport = new MessagePortTransport(channel.port1);
			workerToUiTransport = new MessagePortTransport(channel.port2);

			// Set up WebSocket transport for Worker ↔ Server
			workerToServerTransport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: false,
			});
		});

		afterEach(() => {
			uiTransport.disconnect();
			workerToUiTransport.disconnect();
			workerToServerTransport.disconnect();

			uiDoc.destroy();
			workerDoc.destroy();
			serverDoc.destroy();

			try {
				WebSocketMock.clean();
			} catch {
				// Ignore cleanup errors
			}
		});

		it('should sync data from UI through SharedWorker to Server', async () => {
			// Track updates on workerDoc BEFORE anything else
			const workerUpdates: Uint8Array[] = [];
			const unsubWorkerUpdate = workerDoc.onUpdate((update) => {
				workerUpdates.push(new Uint8Array(update));
				// Forward to server if connected
				if (workerToServerTransport.connected) {
					workerToServerTransport.send(new Uint8Array(update));
				}
			});

			// Set up sync providers for UI ↔ Worker
			const uiSync = createSyncProvider(uiDoc, uiTransport);
			const workerToUiSync = createSyncProvider(workerDoc, workerToUiTransport);

			// Start UI ↔ Worker sync
			await uiTransport.connect();
			await workerToUiTransport.connect();
			await uiSync.start();
			await workerToUiSync.start();

			// Connect worker to server
			await workerToServerTransport.connect();
			await server.connected;

			// Make a change in UI
			uiMap.set('name', 'My Workflow');

			// Wait for MessagePort propagation (async in Node.js)
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify worker received the update via SyncProvider
			expect(workerMap.get('name')).toBe('My Workflow');

			// Verify workerDoc.onUpdate fired (includes initial sync + our change)
			expect(workerUpdates.length).toBeGreaterThan(0);

			// The issue: workerToServerTransport.send() was likely called BEFORE
			// the websocket was connected (during initial sync)
			// Let's check if we got any updates AFTER server connected
			// by looking at the websocket mock

			// Use a race with timeout to check for message
			const messagePromise = server.nextMessage;
			const timeoutPromise = new Promise<'timeout'>((resolve) =>
				setTimeout(() => resolve('timeout'), 200),
			);
			const result = await Promise.race([messagePromise, timeoutPromise]);

			if (result === 'timeout') {
				throw new Error(`No WebSocket message received. Worker updates: ${workerUpdates.length}`);
			}

			// The message can be Uint8Array or ArrayBuffer depending on how vitest-websocket-mock handles it
			const updateData =
				result instanceof Uint8Array ? result : new Uint8Array(result as ArrayBuffer);

			// Apply to server doc
			serverDoc.applyUpdate(updateData);

			// Verify server has the data
			expect(serverMap.get('name')).toBe('My Workflow');

			// Cleanup
			unsubWorkerUpdate();
			uiSync.stop();
			workerToUiSync.stop();
		});

		it('should sync data from Server through SharedWorker to UI', async () => {
			// Set up sync providers
			const uiSync = createSyncProvider(uiDoc, uiTransport);
			const workerToUiSync = createSyncProvider(workerDoc, workerToUiTransport);

			// Start UI ↔ Worker sync
			await uiTransport.connect();
			await workerToUiTransport.connect();
			await uiSync.start();
			await workerToUiSync.start();

			// Connect worker to server
			await workerToServerTransport.connect();
			await server.connected;

			// Worker receives from server and applies to workerDoc
			workerToServerTransport.onReceive((data) => {
				workerDoc.applyUpdate(data);
			});

			// Server makes a change and sends to worker
			serverMap.set('serverValue', 'from-server');
			const serverUpdate = serverDoc.encodeState();
			server.send(serverUpdate.buffer);

			// Wait for propagation
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify worker received the update
			expect(workerMap.get('serverValue')).toBe('from-server');

			// Verify UI received the update (through worker)
			expect(uiMap.get('serverValue')).toBe('from-server');

			// Cleanup
			uiSync.stop();
			workerToUiSync.stop();
		});

		it('should handle bidirectional sync across all layers', async () => {
			// Track worker updates BEFORE starting sync
			const unsubWorkerUpdate = workerDoc.onUpdate((update) => {
				if (workerToServerTransport.connected) {
					workerToServerTransport.send(new Uint8Array(update));
				}
			});

			// Set up sync providers for UI ↔ Worker
			const uiSync = createSyncProvider(uiDoc, uiTransport);
			const workerToUiSync = createSyncProvider(workerDoc, workerToUiTransport);

			// Start UI ↔ Worker sync
			await uiTransport.connect();
			await workerToUiTransport.connect();
			await uiSync.start();
			await workerToUiSync.start();

			// Connect worker to server
			await workerToServerTransport.connect();
			await server.connected;

			// Server → Worker: receive from server and apply to workerDoc
			const unsubServerReceive = workerToServerTransport.onReceive((data) => {
				workerDoc.applyUpdate(data);
			});

			// UI makes a change
			uiMap.set('uiChange', 'from-ui');

			// Wait for UI → Worker propagation
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(workerMap.get('uiChange')).toBe('from-ui');

			// Wait for Worker → Server via nextMessage
			const message = await server.nextMessage;
			const updateData =
				message instanceof Uint8Array ? message : new Uint8Array(message as ArrayBuffer);
			serverDoc.applyUpdate(updateData);

			expect(serverMap.get('uiChange')).toBe('from-ui');

			// Server makes a change
			serverMap.set('serverChange', 'from-server');
			const serverUpdate = serverDoc.encodeState();
			server.send(serverUpdate.buffer);

			// Wait for Server → Worker → UI propagation
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(workerMap.get('serverChange')).toBe('from-server');
			expect(uiMap.get('serverChange')).toBe('from-server');

			// Cleanup
			unsubWorkerUpdate();
			unsubServerReceive();
			uiSync.stop();
			workerToUiSync.stop();
		});

		it('should sync initial state to new UI tab via SharedWorker', async () => {
			// This test verifies that when a second UI tab connects to a SharedWorker,
			// it receives the current state from the worker via initial sync.
			// Note: Real-time relay of updates between tabs requires additional
			// infrastructure beyond basic SyncProvider.

			const provider = createCRDTProvider({ engine });

			// First, set up UI1 ↔ Worker and make a change
			const ui1Sync = createSyncProvider(uiDoc, uiTransport);
			const workerToUi1Sync = createSyncProvider(workerDoc, workerToUiTransport);

			await uiTransport.connect();
			await workerToUiTransport.connect();
			await ui1Sync.start();
			await workerToUi1Sync.start();

			// UI1 makes a change
			uiMap.set('existingData', 'from-tab1');

			// Wait for sync to worker
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(workerMap.get('existingData')).toBe('from-tab1');

			// Now UI2 connects - it should receive existing state via initial sync
			const ui2Doc = provider.createDoc('ui2-doc');
			const ui2Map = ui2Doc.getMap('workflow');

			const channel2 = new MessageChannel();
			const ui2Transport = new MessagePortTransport(channel2.port1);
			const workerToUi2Transport = new MessagePortTransport(channel2.port2);

			await ui2Transport.connect();
			await workerToUi2Transport.connect();

			const ui2Sync = createSyncProvider(ui2Doc, ui2Transport);
			const workerToUi2Sync = createSyncProvider(workerDoc, workerToUi2Transport);

			await ui2Sync.start();
			await workerToUi2Sync.start();

			// Wait for initial sync
			await new Promise((resolve) => setTimeout(resolve, 100));

			// UI2 should have received the existing data via initial state sync
			expect(ui2Map.get('existingData')).toBe('from-tab1');

			// Cleanup
			ui1Sync.stop();
			ui2Sync.stop();
			workerToUi1Sync.stop();
			workerToUi2Sync.stop();
			ui2Transport.disconnect();
			workerToUi2Transport.disconnect();
			ui2Doc.destroy();
		});

		it('should continue local sync when server disconnects', async () => {
			// Set up sync providers
			const uiSync = createSyncProvider(uiDoc, uiTransport);
			const workerToUiSync = createSyncProvider(workerDoc, workerToUiTransport);
			const workerToServerSync = createSyncProvider(workerDoc, workerToServerTransport);

			// Start all connections
			await uiTransport.connect();
			await workerToUiTransport.connect();
			await uiSync.start();
			await workerToUiSync.start();

			await workerToServerTransport.connect();
			await server.connected;
			await workerToServerSync.start();

			// Verify initial sync works
			uiMap.set('beforeDisconnect', 'value1');
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(workerMap.get('beforeDisconnect')).toBe('value1');

			// Disconnect server
			WebSocketMock.clean();

			// UI ↔ Worker sync should still work
			uiMap.set('afterDisconnect', 'value2');
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(workerMap.get('afterDisconnect')).toBe('value2');

			// Cleanup
			uiSync.stop();
			workerToUiSync.stop();
			workerToServerSync.stop();
		});
	});
});
