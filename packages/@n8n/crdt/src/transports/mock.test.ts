import { MockTransport } from './mock';

describe('MockTransport', () => {
	let transportA: MockTransport;
	let transportB: MockTransport;

	beforeEach(() => {
		transportA = new MockTransport();
		transportB = new MockTransport();
		MockTransport.link(transportA, transportB);
	});

	it('should start disconnected', () => {
		expect(transportA.connected).toBe(false);
		expect(transportB.connected).toBe(false);
	});

	it('should connect', async () => {
		await transportA.connect();
		expect(transportA.connected).toBe(true);
	});

	it('should disconnect', async () => {
		await transportA.connect();
		transportA.disconnect();
		expect(transportA.connected).toBe(false);
	});

	it('should throw when sending while disconnected', () => {
		const data = new Uint8Array([1, 2, 3]);
		expect(() => transportA.send(data)).toThrow('Transport not connected');
	});

	it('should deliver data to peer', async () => {
		await transportA.connect();
		await transportB.connect();

		const received: Uint8Array[] = [];
		transportB.onReceive((data) => received.push(data));

		const data = new Uint8Array([1, 2, 3]);
		transportA.send(data);

		expect(received).toHaveLength(1);
		expect(received[0]).toEqual(data);
	});

	it('should support bidirectional communication', async () => {
		await transportA.connect();
		await transportB.connect();

		const receivedA: Uint8Array[] = [];
		const receivedB: Uint8Array[] = [];

		transportA.onReceive((data) => receivedA.push(data));
		transportB.onReceive((data) => receivedB.push(data));

		transportA.send(new Uint8Array([1]));
		transportB.send(new Uint8Array([2]));

		expect(receivedA).toHaveLength(1);
		expect(receivedB).toHaveLength(1);
		expect(receivedA[0]).toEqual(new Uint8Array([2]));
		expect(receivedB[0]).toEqual(new Uint8Array([1]));
	});

	it('should stop receiving after unsubscribe', async () => {
		await transportA.connect();
		await transportB.connect();

		const received: Uint8Array[] = [];
		const unsubscribe = transportB.onReceive((data) => received.push(data));

		transportA.send(new Uint8Array([1]));
		expect(received).toHaveLength(1);

		unsubscribe();

		transportA.send(new Uint8Array([2]));
		expect(received).toHaveLength(1); // No new data
	});
});
