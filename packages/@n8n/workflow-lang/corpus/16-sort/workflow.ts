/** Sorting: default order by UTF-16 strings, stable comparator sort, reverse. */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Person {
	name: string;
	age: number;
}

export default workflow({
	triggers: [webhook<{ people: Person[] }>({ path: 'sort' })],
	async run(ctx, trigger) {
		const numbers = [10, 9, 1, 100, -5, 25, 2];
		const defaultSorted = numbers.slice().sort();
		const numeric = numbers.slice().sort((a, b) => a - b);
		const words = ['éclair', 'Zebra', 'apple', '😀', 'ﬀ', 'Apple', 'zebra'];
		const wordSorted = words.slice().sort();
		const withUndefined = [3, undefined, 1, undefined, 2].sort();
		const people = trigger.body.people.slice();
		const byAge = people.sort((a, b) => a.age - b.age);
		const sameRef = byAge === people;
		const byNameDesc = trigger.body.people
			.slice()
			.sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0))
			.map((p) => p.name);
		const mixed = [true, null, 'b', 2, 'a', 10, false].sort();
		const reversed = [1, 2, 3].reverse();
		const res = await ctx.http<{ scores: number[] }>({
			name: 'Scores',
			method: 'GET',
			url: 'https://api.example.com/scores',
		});
		const top = res.body.scores.sort((a, b) => b - a).slice(0, 3);
		return {
			defaultSorted,
			numeric,
			wordSorted,
			withUndefined,
			byAge: byAge.map((p) => `${p.name}:${p.age}`),
			sameRef,
			byNameDesc,
			mixed,
			reversed,
			top,
		};
	},
});
