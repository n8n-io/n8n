import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * DEMO ONLY. DO NOT MERGE. Seeds sample n8n Assistant usage for the usage page
 * in the Assistant settings on a temporary test instance.
 *
 * Adds 250 users of the fictional Acme Corp, their personal projects, 12 team
 * projects with memberships, and 30 days of `assistant_usage_event` rows that
 * end when the instance starts: messages, created resources and the tokens of
 * each turn. Usage grows as the company adopts the Assistant, mostly on
 * workdays during office hours (UTC+1).
 *
 * The users and projects are the same on every run, and an existing one is
 * kept, so the seed also runs on a database that an earlier demo seeded.
 *
 * Nobody can log in as a seeded user: the password hash is of a random
 * password that was thrown away.
 */

const DOMAIN = 'acme-corp.example';
const PASSWORD_HASH = '$2a$10$GbdoY9MZVo3b9Vow5nRJo.tyqLDtsGUNbhtqedK2IUMO.7vI.4tMW';
const OFFSET_HOURS = 1;
const USER_COUNT = 250;
const DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const FIRST_NAMES = [
	'Ada',
	'Aiden',
	'Aisha',
	'Alejandro',
	'Amara',
	'Anna',
	'Arjun',
	'Astrid',
	'Ben',
	'Bianca',
	'Carlos',
	'Chen',
	'Chloe',
	'Daniel',
	'Daria',
	'David',
	'Elena',
	'Emeka',
	'Emma',
	'Erik',
	'Fatima',
	'Felix',
	'Freya',
	'Gabriel',
	'Grace',
	'Hana',
	'Hugo',
	'Ines',
	'Isaac',
	'Ivan',
	'Jakob',
	'James',
	'Jana',
	'Javier',
	'Julia',
	'Kai',
	'Karim',
	'Kenji',
	'Lara',
	'Leo',
	'Lina',
	'Lucas',
	'Maja',
	'Malik',
	'Marek',
	'Maria',
	'Mateo',
	'Mei',
	'Mila',
	'Nadia',
	'Noah',
	'Nora',
	'Olga',
	'Omar',
	'Oscar',
	'Petra',
	'Priya',
	'Rafael',
	'Rosa',
	'Sam',
	'Sara',
	'Sofia',
	'Tariq',
	'Theo',
	'Tomas',
	'Uma',
	'Victor',
	'Wei',
	'Yara',
	'Zoe',
];
const LAST_NAMES = [
	'Adams',
	'Ahmed',
	'Alvarez',
	'Andersen',
	'Bauer',
	'Becker',
	'Brown',
	'Castro',
	'Chen',
	'Costa',
	'Novak',
	'Dvorak',
	'Evans',
	'Fischer',
	'Garcia',
	'Gupta',
	'Hansen',
	'Hoffmann',
	'Horvat',
	'Ito',
	'Jensen',
	'Kim',
	'Kowalski',
	'Kral',
	'Larsen',
	'Lee',
	'Lopez',
	'Martin',
	'Meyer',
	'Moreau',
	'Nakamura',
	'Nguyen',
	'Nielsen',
	'Okafor',
	'Olsen',
	'Patel',
	'Petrov',
	'Popescu',
	'Quinn',
	'Rossi',
	'Santos',
	'Schmidt',
	'Silva',
	'Singh',
	'Svoboda',
	'Tanaka',
	'Taylor',
	'Varga',
	'Wagner',
	'Walker',
	'Weber',
	'Wilson',
	'Wong',
	'Yilmaz',
	'Zhang',
	'Ziegler',
	'Kovac',
	'Murphy',
	'Ortiz',
	'Rahman',
];

/** Name, share of employees, and how quickly the team takes up the Assistant. */
const TEAMS: Array<[string, number, number]> = [
	['Data & Analytics', 0.08, 1.6],
	['IT Operations', 0.1, 1.5],
	['Engineering Platform', 0.09, 1.4],
	['Revenue Operations', 0.06, 1.4],
	['Marketing', 0.12, 1.15],
	['Customer Support', 0.13, 1.1],
	['Product', 0.07, 1.1],
	['Sales', 0.13, 0.85],
	['Finance', 0.07, 0.8],
	['People & HR', 0.06, 0.65],
	['Security', 0.05, 0.7],
	['Legal', 0.04, 0.5],
];

type Intent = 'question' | 'build-workflow' | 'edit-workflow' | 'data-table' | 'agent' | 'other';

const INTENTS: Array<[Intent, number]> = [
	['question', 0.16],
	['build-workflow', 0.38],
	['edit-workflow', 0.22],
	['data-table', 0.11],
	['agent', 0.07],
	['other', 0.06],
];

type CreatedType = 'workflow-created' | 'agent-created' | 'data-table-created';

interface Person {
	id: string;
	personal: string;
	teams: string[];
	adoptionDay: number | undefined;
	intensity: number;
	habit: number;
}

/** A seeded random generator, so every instance gets the same company. */
function createRandom(seed: number) {
	let state = seed;
	const next = () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const gauss = (mean: number, deviation: number) =>
		mean + deviation * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
	return {
		next,
		gauss,
		uniform: (min: number, max: number) => min + (max - min) * next(),
		int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
		pick: <T>(items: T[]) => items[Math.floor(next() * items.length)],
		weighted: <T>(options: Array<[T, number]>) => {
			let roll = next() * options.reduce((sum, [, weight]) => sum + weight, 0);
			for (const [value, weight] of options) {
				roll -= weight;
				if (roll <= 0) return value;
			}
			return options[options.length - 1][0];
		},
		poisson: (mean: number) => {
			const limit = Math.exp(-mean);
			let k = 0;
			let p = 1;
			for (;;) {
				p *= next();
				if (p <= limit) return k;
				k++;
			}
		},
		exponential: (mean: number) => -mean * Math.log(1 - next()),
		id: (prefix = '', length = 16) => {
			const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			let value = prefix;
			while (value.length < length) value += alphabet[Math.floor(next() * alphabet.length)];
			return value;
		},
		uuid: () => {
			const hex = Array.from({ length: 32 }, () => Math.floor(next() * 16).toString(16));
			hex[12] = '4';
			hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
			const s = hex.join('');
			return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
		},
	};
}

function sqlTime(ms: number) {
	return new Date(ms).toISOString().replace('T', ' ').replace('Z', '');
}

/** Midnight of a local calendar day, in UTC milliseconds. */
function localMidnight(dayStart: number) {
	return dayStart - OFFSET_HOURS * 60 * 60 * 1000;
}

/** Share of employees who have started to use the Assistant by `day` (0..DAYS-1). */
function adoptionShare(day: number) {
	return 0.05 + 0.72 / (1 + Math.exp(-(day - 15) / 4.2));
}

export class SeedAssistantUsageDemo1795856429298 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const random = createRandom(20261118);
		const now = Date.now();
		// The local calendar day of today, as UTC midnight of that date.
		const today = Math.floor((now + OFFSET_HOURS * 60 * 60 * 1000) / DAY_MS) * DAY_MS;
		const firstDay = today - (DAYS - 1) * DAY_MS;

		const userTable = escape.tableName('user');
		const projectTable = escape.tableName('project');
		const relationTable = escape.tableName('project_relation');
		const eventTable = escape.tableName('assistant_usage_event');

		const insert = async (sql: string, rows: unknown[][], batch = 100) => {
			for (let index = 0; index < rows.length; index += batch) {
				const chunk = rows.slice(index, index + batch);
				const placeholders = chunk.map((row) => `(${row.map(() => '?').join(', ')})`).join(', ');
				await queryRunner.query(`${sql} VALUES ${placeholders}`, chunk.flat());
			}
		};

		// Team projects.
		const teams: string[] = [];
		const projectRows: unknown[][] = [];
		TEAMS.forEach(([name], index) => {
			const id = random.id(`seedT${String(index).padStart(2, '0')}`);
			const created = sqlTime(now - random.int(120, 500) * DAY_MS);
			projectRows.push([id, name, 'team', created, created, `${name} team at Acme Corp`, null]);
			teams.push(id);
		});

		// People, with a personal project and one or two teams each.
		const userRows: unknown[][] = [];
		const relationRows: unknown[][] = [];
		const people: Person[] = [];
		const usedEmails = new Set<string>();
		const teamShares = TEAMS.map(([, share], index): [number, number] => [index, share]);
		for (let index = 0; index < USER_COUNT; index++) {
			const first = random.pick(FIRST_NAMES);
			const last = random.pick(LAST_NAMES);
			const localPart = `${first}.${last}`.toLowerCase();
			let email = `${localPart}@${DOMAIN}`;
			for (let suffix = 2; usedEmails.has(email); suffix++)
				email = `${localPart}${suffix}@${DOMAIN}`;
			usedEmails.add(email);

			const id = random.uuid();
			const created = sqlTime(now - random.int(45, 700) * DAY_MS - random.int(0, 1440) * 60_000);
			const role = index < 6 ? 'global:admin' : 'global:member';
			userRows.push([
				id,
				email,
				first,
				last,
				PASSWORD_HASH,
				role,
				'person',
				'{"userActivated":true}',
				created,
				created,
			]);

			const personal = random.id('seedP');
			projectRows.push([
				personal,
				`${first} ${last} <${email}>`,
				'personal',
				created,
				created,
				null,
				id,
			]);
			relationRows.push([personal, id, 'project:personalOwner', created, created]);

			const teamIndexes = [random.weighted(teamShares)];
			if (random.next() < 0.3) {
				const second = random.weighted(teamShares);
				if (!teamIndexes.includes(second)) teamIndexes.push(second);
			}
			teamIndexes.forEach((teamIndex, position) => {
				const projectRole =
					position === 0 && random.next() < 0.12 ? 'project:admin' : 'project:editor';
				relationRows.push([teams[teamIndex], id, projectRole, created, created]);
			});

			// A threshold on the adoption curve: high-affinity teams cross it earlier.
			const threshold = random.next() ** TEAMS[teamIndexes[0]][2];
			let adoptionDay: number | undefined;
			for (let day = 0; day < DAYS; day++) {
				if (adoptionShare(day) >= threshold) {
					adoptionDay = day;
					break;
				}
			}
			people.push({
				id,
				personal,
				teams: teamIndexes.map((teamIndex) => teams[teamIndex]),
				adoptionDay,
				// Conversations on an active workday. A few power users have many.
				intensity: Math.min(6, Math.exp(random.gauss(Math.log(0.9), 0.65))),
				habit: random.uniform(0.35, 0.85),
			});
		}

		// Usage: one row for each message, one for each created resource, and the tokens of each
		// turn and of the title call of each conversation.
		const messageRows: unknown[][] = [];
		const tokenRows: unknown[][] = [];
		const createdRows: unknown[][] = [];
		const lastUsed = new Map<string, number>();
		for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
			const dayStart = firstDay + dayIndex * DAY_MS;
			const weekday = new Date(dayStart).getUTCDay();
			const weekend = weekday === 0 || weekday === 6;
			// People find more uses for the Assistant over time.
			const growth = 0.7 + (0.55 * dayIndex) / (DAYS - 1);
			for (const person of people) {
				if (person.adoptionDay === undefined || dayIndex < person.adoptionDay) continue;
				// New users try it a few times before it becomes a habit.
				const ramp = Math.min(1, 0.55 + 0.1 * (dayIndex - person.adoptionDay));
				if (random.next() > person.habit * ramp * (weekend ? 0.06 : 1)) continue;

				const conversations = Math.max(1, random.poisson(person.intensity * growth));
				for (let c = 0; c < conversations; c++) {
					const threadId = `seed-${random.uuid()}`;
					const projectId =
						person.teams.length && random.next() < 0.6
							? random.pick(person.teams)
							: person.personal;
					const intent = random.weighted(INTENTS);
					const messageCount = 1 + random.poisson(intent === 'question' ? 1 : 3.2);

					let hour: number;
					if (weekend) hour = random.uniform(9, 21);
					else if (random.next() < 0.55) hour = random.gauss(10.4, 1.2);
					else hour = random.gauss(14.6, 1.5);
					hour = Math.min(Math.max(hour, 7.4), 20.5);
					let moment = localMidnight(dayStart) + hour * 60 * 60 * 1000 + random.int(0, 59) * 1000;

					const turnTimes: number[] = [];
					for (let m = 0; m < messageCount && moment <= now; m++) {
						turnTimes.push(moment);
						moment += 20_000 + random.exponential(150_000);
					}
					if (!turnTimes.length) continue;
					turnTimes.forEach((time, turnIndex) => {
						messageRows.push(['message', person.id, threadId, projectId, null, sqlTime(time)]);
						// The prompt grows with each turn, and most of it comes from the cache after the first.
						const prompt = 14_000 + turnIndex * 6_500;
						tokenRows.push([
							'token-usage',
							person.id,
							threadId,
							projectId,
							'anthropic/claude-sonnet-4-5',
							prompt + random.int(0, 5_000),
							random.int(250, 1_550),
							turnIndex === 0 ? 0 : Math.floor(prompt * 0.85),
							turnIndex === 0 ? 12_000 : random.int(2_500, 4_500),
							sqlTime(Math.min(time + random.int(15, 90) * 1000, now)),
						]);
					});
					tokenRows.push([
						'token-usage',
						person.id,
						threadId,
						projectId,
						'anthropic/claude-haiku-4-5',
						random.int(600, 800),
						random.int(12, 24),
						0,
						0,
						sqlTime(turnTimes[0]),
					]);
					const last = turnTimes[turnTimes.length - 1];
					lastUsed.set(person.id, Math.max(lastUsed.get(person.id) ?? last, last));

					const created: CreatedType[] = [];
					if (intent === 'build-workflow') {
						if (random.next() < 0.85) created.push('workflow-created');
						if (random.next() < 0.2) created.push('workflow-created');
						if (random.next() < 0.12) created.push('data-table-created');
					} else if (intent === 'data-table' && random.next() < 0.5) {
						created.push('data-table-created');
					} else if (intent === 'agent') {
						if (random.next() < 0.55) created.push('agent-created');
						if (random.next() < 0.25) created.push('workflow-created');
					}
					for (const type of created) {
						const time = Math.min(random.pick(turnTimes) + random.int(30, 120) * 1000, now);
						createdRows.push([type, person.id, threadId, projectId, random.id(), sqlTime(time)]);
					}
				}
			}
		}

		await insert(
			`INSERT OR IGNORE INTO ${projectTable} (id, name, type, createdAt, updatedAt, description, creatorId)`,
			projectRows,
		);
		await insert(
			`INSERT OR IGNORE INTO ${userTable} (id, email, firstName, lastName, password, roleSlug, kind, settings, createdAt, updatedAt)`,
			userRows,
		);
		await insert(
			`INSERT OR IGNORE INTO ${relationTable} (projectId, userId, role, createdAt, updatedAt)`,
			relationRows,
		);
		await insert(
			`INSERT INTO ${eventTable} (type, userId, threadId, projectId, resourceId, createdAt)`,
			messageRows,
		);
		await insert(
			`INSERT OR IGNORE INTO ${eventTable} (type, userId, threadId, projectId, resourceId, createdAt)`,
			createdRows,
		);
		await insert(
			`INSERT INTO ${eventTable} (type, userId, threadId, projectId, model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, createdAt)`,
			tokenRows,
		);
		for (const [userId, time] of lastUsed) {
			const localDate = new Date(time + OFFSET_HOURS * 60 * 60 * 1000).toISOString().slice(0, 10);
			await queryRunner.query(`UPDATE ${userTable} SET lastActiveAt = ? WHERE id = ?`, [
				localDate,
				userId,
			]);
		}
	}
}
