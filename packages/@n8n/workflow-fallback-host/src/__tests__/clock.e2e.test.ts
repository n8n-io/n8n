/**
 * The run clock of a step over the socket (`CLOCK-OFFSET`, spec 9): the step
 * worker gives each step the offset of its frame. Two steps of one worker
 * keep their own clocks, even when they run at the same time.
 */
import type { StepResponse } from '../protocol';
import { buildHostForTests, startTestHost, TestClient, type TestHost } from './test-client';

const DAY = 86_400_000;
const OFFSET = -DAY;

/** The tolerance of a comparison with the clock of the test process. */
const SLACK_MS = 5_000;

function code(id: string, clockOffsetMs?: number) {
	return {
		id,
		kind: 'code',
		step: `step-${id}`,
		key: `key-${id}`,
		args: { name: `step-${id}`, code: 'return [{ n: Date.now() }];' },
		...(clockOffsetMs === undefined ? {} : { execution: { id: '1', mode: 'test', clockOffsetMs } }),
	};
}

function millis(response: StepResponse): number {
	if (!response.ok) throw new Error(response.error);
	const value = response.result[0]?.n;
	if (typeof value !== 'number') throw new Error('The step gave no time');
	return value;
}

describe('the run clock of a step in a worker', () => {
	let host: TestHost;

	beforeAll(async () => {
		buildHostForTests();
		host = await startTestHost(5_000, { size: 1 });
	}, 120_000);

	afterAll(async () => {
		await host.stop();
	});

	it('gives each step the offset of its frame', async () => {
		const client = await TestClient.connect(host.socketPath);
		try {
			const real = Date.now();
			const [shifted, plain] = await client.sendBatch([code('a', OFFSET), code('b')]);

			expect(Math.abs(millis(shifted) - (real + OFFSET))).toBeLessThan(SLACK_MS);
			expect(millis(plain)).toBeGreaterThanOrEqual(real - SLACK_MS);
			expect(millis(plain)).toBeLessThanOrEqual(Date.now() + SLACK_MS);
		} finally {
			client.close();
		}
	});
});
