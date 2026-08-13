import { SpecHistory } from './history';

describe('SpecHistory', () => {
	it('undoes to the previous spec', () => {
		const h = new SpecHistory();
		h.reset({ a: 1 });
		h.push({ a: 2 });
		expect(h.current()).toEqual({ a: 2 });
		expect(h.undo()).toEqual({ a: 1 });
		expect(h.current()).toEqual({ a: 1 });
	});

	it('caps at 10 specs', () => {
		const h = new SpecHistory();
		h.reset({ n: 0 });
		for (let i = 1; i <= 12; i++) h.push({ n: i });
		expect((h.current() as { n: number }).n).toBe(12);
		for (let i = 0; i < 20; i++) h.undo();
		expect((h.current() as { n: number }).n).toBe(3);
	});
});
