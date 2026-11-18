import { toActivitySnapshot } from './activity.source';
import { DEMO_ENTITIES } from './demo.source';
import { demoActivity } from './demo-activity';

describe('toActivitySnapshot', () => {
	it('keys the activity by workflow entity key', () => {
		const snapshot = toActivitySnapshot({
			windowSeconds: 60,
			generatedAt: '2026-11-18T10:00:00.000Z',
			workflows: [
				{
					workflowId: 'w1',
					running: 2,
					started: 5,
					succeeded: 3,
					failed: 1,
					startedPerSecond: [1, 2, 2],
					lastEventAt: '2026-11-18T09:59:59.000Z',
				},
			],
		});

		expect(snapshot.windowSeconds).toBe(60);
		expect(snapshot.byKey.get('workflow:w1')).toEqual({
			running: 2,
			started: 5,
			succeeded: 3,
			failed: 1,
			startedPerSecond: [1, 2, 2],
			lastEventAt: Date.parse('2026-11-18T09:59:59.000Z'),
		});
	});
});

describe('demoActivity', () => {
	it('only gives activity to known entities, with consistent counts', () => {
		const keys = new Set(DEMO_ENTITIES.map((entity) => entity.key));
		const snapshot = demoActivity(DEMO_ENTITIES, Date.now(), () => 0.3);

		expect(snapshot.byKey.size).toBeGreaterThan(0);
		for (const [key, activity] of snapshot.byKey) {
			expect(keys.has(key)).toBe(true);
			expect(activity.succeeded + activity.failed).toBe(activity.started);
			expect(activity.startedPerSecond).toHaveLength(snapshot.windowSeconds);
			expect(activity.started).toBe(activity.startedPerSecond.reduce((a, b) => a + b, 0));
		}
	});

	it('leaves idle entities without activity', () => {
		const idle = DEMO_ENTITIES.filter((entity) => entity.metrics.executionCount === 0);
		const snapshot = demoActivity(idle, Date.now(), () => 0.5);

		expect(snapshot.byKey.size).toBe(0);
	});

	it('changes the rate over time, so speed changes are visible', () => {
		const busiest = DEMO_ENTITIES.filter((entity) => entity.metrics.executionCount >= 8_000);
		const now = Date.parse('2026-11-18T10:00:00.000Z');
		const rateAt = (time: number) =>
			busiest.map((entity) =>
				demoActivity(busiest, time, () => 0)
					.byKey.get(entity.key)
					?.startedPerSecond.slice(-5)
					.reduce((a, b) => a + b, 0),
			);

		expect(rateAt(now)).not.toEqual(rateAt(now + 20_000));
	});
});
