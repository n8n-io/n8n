import {
	encodeFrame,
	FrameDecoder,
	parseRequest,
	ProtocolError,
	type StepRequest,
} from '../protocol';

const request = (id: string): StepRequest => ({
	id,
	kind: 'code',
	step: 's',
	key: `k-${id}`,
	args: { name: 's', code: 'return []' },
});

const decodeAll = (bodies: Buffer[]) => bodies.map((body) => parseRequest(body));

describe('encodeFrame', () => {
	it('writes a little-endian length before the JSON body', () => {
		const frame = encodeFrame({ a: 'é' });
		const body = Buffer.from('{"a":"é"}', 'utf8');
		expect(frame.readUInt32LE(0)).toBe(body.length);
		expect(frame.subarray(4).equals(body)).toBe(true);
	});
});

describe('FrameDecoder', () => {
	it('decodes one whole frame', () => {
		const decoder = new FrameDecoder();
		expect(decodeAll(decoder.push(encodeFrame(request('1'))))).toEqual([request('1')]);
		expect(decoder.pendingBytes).toBe(0);
	});

	it('decodes many frames from one read', () => {
		const decoder = new FrameDecoder();
		const read = Buffer.concat([encodeFrame(request('1')), encodeFrame(request('2'))]);
		expect(decodeAll(decoder.push(read))).toEqual([request('1'), request('2')]);
	});

	it('decodes a frame that arrives one byte at a time', () => {
		const decoder = new FrameDecoder();
		const frame = encodeFrame(request('1'));
		const bodies: Buffer[] = [];
		for (const byte of frame) bodies.push(...decoder.push(Buffer.from([byte])));
		expect(decodeAll(bodies)).toEqual([request('1')]);
	});

	it('decodes frames split at arbitrary points', () => {
		const stream = Buffer.concat(['1', '2', '3', '4'].map((id) => encodeFrame(request(id))));
		for (let size = 1; size <= stream.length; size += 7) {
			const decoder = new FrameDecoder();
			const bodies: Buffer[] = [];
			for (let at = 0; at < stream.length; at += size) {
				bodies.push(...decoder.push(stream.subarray(at, at + size)));
			}
			expect(decodeAll(bodies).map((r) => r.id)).toEqual(['1', '2', '3', '4']);
			expect(decoder.pendingBytes).toBe(0);
		}
	});

	it('keeps a partial frame until the rest arrives', () => {
		const decoder = new FrameDecoder();
		const frame = encodeFrame(request('1'));
		const second = encodeFrame(request('2'));
		expect(decoder.push(Buffer.concat([frame, second.subarray(0, 3)]))).toHaveLength(1);
		expect(decoder.pendingBytes).toBe(3);
		expect(decodeAll(decoder.push(second.subarray(3)))).toEqual([request('2')]);
	});

	it('decodes an empty body', () => {
		const decoder = new FrameDecoder();
		const bodies = decoder.push(Buffer.from([0, 0, 0, 0]));
		expect(bodies).toHaveLength(1);
		expect(bodies[0].length).toBe(0);
	});

	it('rejects a frame larger than the limit', () => {
		const decoder = new FrameDecoder(10);
		expect(() => decoder.push(encodeFrame({ long: 'x'.repeat(20) }))).toThrow(ProtocolError);
	});
});

describe('parseRequest', () => {
	const body = (value: unknown) => Buffer.from(JSON.stringify(value));

	it('rejects text that is not JSON', () => {
		expect(() => parseRequest(Buffer.from('{'))).toThrow('Request is not valid JSON');
	});

	it('rejects a request without an id', () => {
		expect(() => parseRequest(body({ kind: 'code' }))).toThrow('no string "id"');
	});

	it('keeps the id of a request with a bad kind', () => {
		try {
			parseRequest(body({ ...request('7'), kind: 'http' }));
			expect.fail('parseRequest did not throw');
		} catch (error) {
			expect(error).toBeInstanceOf(ProtocolError);
			expect((error as ProtocolError).requestId).toBe('7');
		}
	});

	it('rejects args that are not an object', () => {
		expect(() => parseRequest(body({ ...request('1'), args: [] }))).toThrow('"args"');
	});
});
