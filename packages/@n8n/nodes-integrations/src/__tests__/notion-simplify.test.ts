import { simplifyObjects } from 'n8n-nodes-base/dist/nodes/Notion/shared/GenericFunctions';

import { CHANGE_CASE_RUNS, snakeCase } from '../nodes/notion/simplify';

/** The simplified key of a property as the v3 node gives it, which uses change-case v5. */
function v3KeyOf(name: string) {
	const [simplified = {}] = simplifyObjects(
		[
			{
				object: 'page',
				id: 'p',
				url: 'u',
				parent: { type: 'data_source_id' },
				properties: {
					TitleProbe: { type: 'title', title: [] },
					[name]: { type: 'number', ['number']: 7 },
				},
			},
		],
		false,
		3,
	);
	return Object.keys(simplified).find((key) => simplified[key] === 7);
}

const changeCaseClassOf = (code: number) => {
	if (code >= 0xd800 && code <= 0xdfff) return 'N';
	const char = String.fromCodePoint(code);
	if (/\p{Lu}/u.test(char)) return 'U';
	if (/\p{Ll}/u.test(char)) return 'L';
	return /[^\p{L}\d]/iu.test(char) || /\d/.test(char) ? 'N' : 'O';
};

function runsOfNode() {
	const runs = Array.from({ length: 0x110000 }, (_, code) => changeCaseClassOf(code)).reduce<
		Array<{ kind: string; length: number }>
	>((all, kind) => {
		const last = all.at(-1);
		if (last?.kind === kind) last.length += 1;
		else all.push({ kind, length: 1 });
		return all;
	}, []);
	return runs
		.filter((run, index) => !(run.kind === 'N' && index === runs.length - 1))
		.map(({ kind, length }) => `${kind}${length.toString(36)}`)
		.join('');
}

const NAMES = [
	'Name',
	'Status',
	'Story Points',
	'Due Date',
	'  Leading and trailing  ',
	'snake_case',
	'kebab-case',
	'HTTPStatus',
	'iOSVersion',
	'PDFFile',
	'Version2Release',
	'abc12Def',
	'A1B2',
	'Q4 2026 Goals',
	'ID',
	'Prix (€)',
	'naïve',
	'café',
	'Prénom',
	'Pre\u0301nom',
	'Mädchen',
	'ÜberSicht',
	'ÜBER',
	'Köln',
	'Straße',
	'STRASSE',
	'ẞ',
	'名前',
	'期限日 Deadline',
	'タスク名',
	'작업 상태',
	'ЗадачаИмя',
	'ΌνομαΧρήστη',
	'اسم المهمة',
	'שם',
	'नाम',
	'ชื่อ',
	'📅 Due',
	'🔥Priority',
	'👩‍💻 Owner',
	'⭐️⭐️',
	'𝐍𝐚𝐦𝐞𝐅𝐢𝐫𝐬𝐭',
	'ǅungla',
	'a\u0345b',
	'Ⅻ Roman',
	'ⓐⒶ',
	'ĸA',
	'٣ Arabic-Indic',
	'',
	'---',
];

describe('notion snakeCase', () => {
	it.each(NAMES)('keys %j like the v3 node', (name) => {
		expect(`property_${snakeCase(name)}`).toBe(v3KeyOf(name));
	});

	// The runs are Unicode data: another Unicode version of Node gives other classes.
	describe.runIf(process.versions.unicode === '17.0')('in Unicode 17.0', () => {
		it('CHANGE_CASE_RUNS are the change-case v5 classes of each code point', () => {
			expect(CHANGE_CASE_RUNS).toBe(runsOfNode());
		});

		it('keys the first and the last code point of each run like the v3 node', () => {
			const edges = [...CHANGE_CASE_RUNS.matchAll(/[NULO]([\da-z]+)/g)]
				.map(([, length = '']) => parseInt(length, 36))
				.reduce<number[]>((ends, length) => [...ends, (ends.at(-1) ?? 0) + length], [])
				.flatMap((end, index, ends) => [ends[index - 1] ?? 0, end - 1])
				.filter((code) => code < 0xd800 || code > 0xdfff)
				.map((code) => String.fromCodePoint(code));
			const names = edges.flatMap((char) => [`a${char}`, `${char}A`, `A${char}b`, `AB${char}`]);
			const mismatches = names.filter((name) => `property_${snakeCase(name)}` !== v3KeyOf(name));
			expect(mismatches).toEqual([]);
		});
	});
});
