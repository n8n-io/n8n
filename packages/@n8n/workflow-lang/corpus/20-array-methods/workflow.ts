/** Higher-order array methods (prelude), other array methods, operators and library functions. */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Line {
	sku: string;
	qty: number;
	price: number;
	tags: string[];
}

export default workflow({
	triggers: [webhook<{ lines: Line[] }>({ path: 'arrays' })],
	async run(ctx, trigger) {
		const lines = trigger.body.lines;
		const totals = lines.map((l) => l.qty * l.price);
		const sum = totals.reduce((a, b) => a + b);
		const big = lines.filter((l, i) => l.qty > 1 && i < 10).map((l) => l.sku);
		const anyFree = lines.some((l) => l.price === 0);
		const allTagged = lines.every((l) => l.tags.length > 0);
		const firstCheap = lines.find((l) => l.price < 5)?.sku;
		const idx = lines.findIndex((l) => l.sku === 'C');
		const tags = lines.flatMap((l) => l.tags);
		const nested = [[1, 2], [3], [], [4, [5]]].flat();
		const seen: Record<string, number> = {};
		lines.forEach((l, i) => {
			seen[l.sku] = i;
		});
		const stack = [1, 2, 3];
		stack.push(4, 5);
		const popped = stack.pop();
		const shifted = stack.shift();
		stack.unshift(0);
		let counter = 0;
		const post = counter++;
		const pre = ++counter;
		counter *= 10;
		counter -= 1;
		counter /= 2;
		counter **= 2;
		counter %= 7;
		const misc = {
			at: [stack.at(-1), stack.at(10)],
			concat: stack.concat([9], 10),
			join: stack.join('-'),
			includes: [
				stack.includes(2),
				[Number('x')].includes(Number('y')),
				[Number('x')].indexOf(Number('y')),
			],
			slice: stack.slice(1, -1),
			typeofs: [
				typeof 1,
				typeof 'a',
				typeof undefined,
				typeof null,
				typeof {},
				typeof [],
				typeof sum,
				typeof (() => 1),
			],
			isArray: [Array.isArray(stack), Array.isArray('x')],
			bool: [Boolean(''), Boolean('0'), !!lines.length, String(null), String([1, [2, 3]])],
			cmp: [1 < 2, '10' < '9', null == undefined, null === undefined, stack[0] !== stack[1]],
		};
		await ctx.http({
			name: 'Report',
			method: 'POST',
			url: 'https://api.example.com',
			body: { sum, tags },
		});
		return {
			totals,
			sum,
			big,
			anyFree,
			allTagged,
			firstCheap,
			idx,
			tags,
			nested,
			seen,
			stack,
			popped,
			shifted,
			post,
			pre,
			counter,
			misc,
		};
	},
});
