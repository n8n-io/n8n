// ponytail: throwaway tech-demo survey server, replaces n8n boot on this branch.
// Plain CommonJS on purpose — runs straight from bin/, no build step.
const path = require('path');
const os = require('os');
const express = require('express');

const ADMIN_KEY = process.env.SURVEY_ADMIN_KEY || 'letmein';
const PORT = Number(process.env.N8N_PORT) || 5678;

const DEFAULT_QUESTIONS = [
	'Should we adopt a 4-day work week?',
	'Should all demos be done directly in production?',
	'Should the office get a coffee robot?',
];

// Reuses the n8n database via the same env vars (DB_TYPE, DB_POSTGRESDB_*).
// Tiny adapter: query(sql, params) -> rows, with `?` placeholders in both dialects.
let query;
const isPg = process.env.DB_TYPE === 'postgresdb';
if (isPg) {
	const { Pool } = require('pg');
	const pool = new Pool({
		host: process.env.DB_POSTGRESDB_HOST || 'localhost',
		port: Number(process.env.DB_POSTGRESDB_PORT) || 5432,
		database: process.env.DB_POSTGRESDB_DATABASE || 'n8n',
		user: process.env.DB_POSTGRESDB_USER || 'postgres',
		password: process.env.DB_POSTGRESDB_PASSWORD || '',
	});
	query = async (sql, params = []) => {
		let i = 0;
		const text = sql.replace(/\?/g, () => `$${++i}`);
		return (await pool.query(text, params)).rows;
	};
} else {
	const sqlite3 = require('sqlite3');
	const dbPath = path.join(process.env.N8N_USER_FOLDER || os.homedir(), '.n8n', 'database.sqlite');
	require('fs').mkdirSync(path.dirname(dbPath), { recursive: true });
	const db = new sqlite3.Database(dbPath);
	query = (sql, params = []) =>
		new Promise((resolve, reject) =>
			db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows ?? []))),
		);
}

async function init() {
	await query(
		'CREATE TABLE IF NOT EXISTS survey_config (id INTEGER PRIMARY KEY, questions TEXT NOT NULL, generation INTEGER DEFAULT 0)',
	);
	// existing installs predate the generation column; both dialects lack a portable IF NOT EXISTS
	await query('ALTER TABLE survey_config ADD COLUMN generation INTEGER DEFAULT 0').catch(() => {});
	await query(
		'CREATE TABLE IF NOT EXISTS survey_votes (question_idx INTEGER NOT NULL, score INTEGER NOT NULL)',
	);
	await query(
		'INSERT INTO survey_config (id, questions) VALUES (1, ?) ON CONFLICT (id) DO NOTHING',
		[JSON.stringify(DEFAULT_QUESTIONS)],
	);
}

const app = express();
app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/state', async (_req, res) => {
	const [config] = await query('SELECT questions, generation FROM survey_config WHERE id = 1');
	const questions = JSON.parse(config.questions);
	// counts[questionIdx] = [votes for score 1 .. votes for score 5]
	const counts = questions.map(() => [0, 0, 0, 0, 0]);
	const rows = await query(
		'SELECT question_idx AS q, score AS s, COUNT(*) AS c FROM survey_votes GROUP BY question_idx, score',
	);
	for (const row of rows) {
		if (counts[row.q]) counts[row.q][row.s - 1] = Number(row.c);
	}
	res.json({ questions, counts, gen: config.generation ?? 0 });
});

app.post('/api/vote', async (req, res) => {
	const q = Number(req.body?.q);
	const score = Number(req.body?.score);
	const [config] = await query('SELECT questions FROM survey_config WHERE id = 1');
	const max = JSON.parse(config.questions).length;
	if (
		!Number.isInteger(q) ||
		q < 0 ||
		q >= max ||
		!Number.isInteger(score) ||
		score < 1 ||
		score > 5
	) {
		return res.status(400).json({ error: 'invalid vote' });
	}
	const prev = Number(req.body?.prev);
	if (Number.isInteger(prev) && prev >= 1 && prev <= 5) {
		// reassign: drop one anonymous row matching the client's remembered old vote.
		// ponytail: nothing stops a client lying about `prev` — fine for an anonymous demo poll.
		const rowid = isPg ? 'ctid' : 'rowid';
		await query(
			`DELETE FROM survey_votes WHERE ${rowid} = (SELECT ${rowid} FROM survey_votes WHERE question_idx = ? AND score = ? LIMIT 1)`,
			[q, prev],
		);
	}
	await query('INSERT INTO survey_votes (question_idx, score) VALUES (?, ?)', [q, score]);
	res.json({ ok: true });
});

app.post('/api/admin', async (req, res) => {
	const { key, questions, reset } = req.body ?? {};
	if (key !== ADMIN_KEY) return res.status(403).json({ error: 'wrong key' });
	if (Array.isArray(questions)) {
		const clean = questions.map((s) => String(s).trim()).filter(Boolean);
		if (!clean.length) return res.status(400).json({ error: 'need at least one question' });
		// generation bump tells browsers to forget their local "already voted" state
		await query(
			'UPDATE survey_config SET questions = ?, generation = generation + 1 WHERE id = 1',
			[JSON.stringify(clean)],
		);
		await query('DELETE FROM survey_votes'); // question indexes shift, old votes are meaningless
	} else if (reset) {
		await query('UPDATE survey_config SET generation = generation + 1 WHERE id = 1');
		await query('DELETE FROM survey_votes');
	}
	res.json({ ok: true });
});

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Survey</title>
<style>
	body { font-family: system-ui, sans-serif; background: #f5f4fa; margin: 0; color: #333; }
	.wrap { max-width: 640px; margin: 40px auto; padding: 0 16px; }
	h1 { color: #ff6d5a; }
	.card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
	.q { font-weight: 600; margin-bottom: 12px; }
	.opts { display: flex; gap: 8px; }
	.opt { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px 4px; cursor: pointer; text-align: center; font: inherit;
		--fill: 0%; background: linear-gradient(to top, #ffcfc7 var(--fill), #fafafa var(--fill)); }
	.opt:hover { border-color: #ff6d5a; }
	.opt.mine { border-color: #ff6d5a; box-shadow: inset 0 0 0 1px #ff6d5a; }
	.opt .n { display: block; font-size: 20px; font-weight: 700; min-height: 24px; }
	.opt .label { display: block; font-size: 11px; color: #888; min-height: 14px; }
	.scale { display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: 6px; }
</style></head>
<body><div class="wrap"><h1>Quick survey</h1><p>Pick an option &mdash; live counts appear once you've voted. Click another option to change your vote.</p><div id="qs"></div></div>
<script>
const qs = document.getElementById('qs');
let gen = 0;
function voteKey(i) { return 'survey-vote-' + gen + '-' + i; }
function myVote(i) { return localStorage.getItem(voteKey(i)); }
async function vote(i, score) {
	const prev = Number(myVote(i)) || undefined;
	if (prev === score) return;
	localStorage.setItem(voteKey(i), score);
	await fetch('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: i, score, prev }) });
	refresh();
}
async function refresh() {
	const { questions, counts, gen: g } = await (await fetch('/api/state')).json();
	gen = g;
	const sig = g + ':' + JSON.stringify(questions);
	if (sig !== qs.dataset.sig) {
		// questions changed or votes were reset -> rebuild and forget stale local votes
		if (qs.dataset.sig) Object.keys(localStorage).filter(k => k.startsWith('survey-vote-')).forEach(k => localStorage.removeItem(k));
		qs.dataset.sig = sig;
		qs.innerHTML = '';
		questions.forEach((text, i) => {
			const card = document.createElement('div');
			card.className = 'card';
			const q = document.createElement('div');
			q.className = 'q';
			q.textContent = (i + 1) + '. ' + text;
			card.appendChild(q);
			const opts = document.createElement('div');
			opts.className = 'opts';
			for (let s = 1; s <= 5; s++) {
				const b = document.createElement('button');
				b.className = 'opt';
				b.id = 'opt-' + i + '-' + s;
				b.innerHTML = '<span class="n"></span><span class="label">' + ['Against', 'Skeptic', 'Neutral', 'Optimistic', 'In Favor'][s - 1] + '</span>';
				b.onclick = () => vote(i, s);
				opts.appendChild(b);
			}
			card.appendChild(opts);
			qs.appendChild(card);
		});
	}
	questions.forEach((_, i) => {
		const voted = !!myVote(i);
		const total = counts[i].reduce((a, b) => a + b, 0);
		for (let s = 1; s <= 5; s++) {
			const b = document.getElementById('opt-' + i + '-' + s);
			// counts and bars stay hidden until this browser has voted
			b.querySelector('.n').textContent = voted ? counts[i][s - 1] : '';
			const pct = voted && total ? Math.round((counts[i][s - 1] / total) * 100) : 0;
			b.style.setProperty('--fill', pct + '%');
			b.classList.toggle('mine', myVote(i) === String(s));
		}
	});
}
refresh();
setInterval(refresh, 2000);
</script></body></html>`;

const ADMIN_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>Survey admin</title>
<style>
	body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; }
	textarea { width: 100%; height: 140px; font: inherit; }
	input, button { font: inherit; padding: 6px 12px; margin: 4px 4px 4px 0; }
	#msg { color: #ff6d5a; }
</style></head>
<body><h1>Survey admin</h1>
<p>Admin key: <input id="key" type="password"></p>
<p>Questions (one per line — saving <b>resets all votes</b>):</p>
<textarea id="questions"></textarea><br>
<button onclick="save()">Save questions + reset votes</button>
<button onclick="resetVotes()">Reset votes only</button>
<p id="msg"></p>
<script>
const msg = (t) => document.getElementById('msg').textContent = t;
async function post(body) {
	body.key = document.getElementById('key').value;
	const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
	msg(r.ok ? 'Done.' : 'Failed: ' + (await r.json()).error);
}
const save = () => post({ questions: document.getElementById('questions').value.split('\\n') });
const resetVotes = () => post({ reset: true });
fetch('/api/state').then(r => r.json()).then(({ questions }) => document.getElementById('questions').value = questions.join('\\n'));
</script></body></html>`;

app.get('/', (_req, res) => res.type('html').send(PAGE));
app.get('/admin', (_req, res) => res.type('html').send(ADMIN_PAGE));

init()
	.then(() =>
		app.listen(PORT, () =>
			console.log(`Survey demo running on http://localhost:${PORT} (admin: /admin)`),
		),
	)
	.catch((err) => {
		console.error('Survey server failed to start:', err);
		process.exit(1);
	});
