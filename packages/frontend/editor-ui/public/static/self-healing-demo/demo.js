// Standalone controls for this demo branch. All mutations use the signed-in n8n session.
const el = (id) => document.getElementById(id);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const originalOrder = { orderId: 'ORDER-1042', quantity: 3, unitPrice: 49.5 };
const alternateOrder = { orderId: 'ORDER-2048', quantity: 2, unitPrice: 17.25 };
let state = null;
let storageKey;
let busy = false;
let refreshing = false;
let signedIn = false;

async function api(path, body) {
	// Reuse the browser identifier created by the editor login.
	const browserId = localStorage.getItem('n8n-browserId');
	const response = await fetch(`/rest${path}`, {
		method: body === undefined ? 'GET' : 'POST',
		signal: AbortSignal.timeout(30000),
		headers: {
			'Content-Type': 'application/json',
			...(browserId ? { 'browser-id': browserId } : {}),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	if (response.status === 401) {
		signedIn = false;
		el('login').classList.remove('hidden');
		throw new Error('Sign in to n8n, then reload this page.');
	}
	const data = await response.json();
	if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
	return data.data ?? data;
}

function save() {
	localStorage.setItem(storageKey, JSON.stringify(state));
}
function notice(text = '') {
	el('notice').textContent = text;
	el('notice').classList.toggle('hidden', !text);
}
function link(id, path) {
	el(id).classList.toggle('hidden', !path);
	if (path) el(id).href = path;
}
function badge(id, text, type = '') {
	el(id).textContent = text;
	el(id).className = `tag ${type}`;
}
const workflowPath = () => `/workflows/${encodeURIComponent(state.workflowId)}`;
const demoPath = () =>
	`/projects/${encodeURIComponent(state.projectId)}${workflowPath()}/self-healing-demo`;

function render() {
	const investigation = state?.investigation;
	const running = investigation && !investigation.finishedAt;
	el('new-demo').disabled = !signedIn || busy || running;
	el('send-order').disabled = !signedIn || busy || running || !state?.ready;
	el('send-alternate').disabled = busy || !state?.published;
	el('investigate').disabled = busy || !state?.failureExecutionId || Boolean(investigation);
	el('workflow-name').textContent = state?.name || 'Start with a new demo';
	if (!state) return;
	el('workflow-caption').textContent = state.published
		? 'The repair is published. Replay both orders to check the result.'
		: state.ready
			? 'Published workflow · Deliberately broken total expression'
			: 'Preparing the published workflow…';
	link('workflow-link', `/workflow/${encodeURIComponent(state.workflowId)}`);
	link(
		'failure-link',
		state.failureExecutionId
			? `/workflow/${encodeURIComponent(state.workflowId)}/executions/${encodeURIComponent(state.failureExecutionId)}`
			: null,
	);
	link(
		'report-link',
		investigation?.resultId
			? `/inbox/assistant-results/${encodeURIComponent(investigation.resultId)}?${new URLSearchParams({ projectId: state.projectId, workflowId: state.workflowId })}`
			: null,
	);
	const last = state.requests.at(-1);
	el('request').textContent = JSON.stringify(last?.input || originalOrder, null, 2);
	el('request-label').textContent = last?.alternate ? 'Different order' : 'Original order';
	el('response-block').classList.toggle('hidden', !last);
	if (last) {
		badge('http-status', `HTTP ${last.httpStatus}`, last.matchesExpected ? 'success' : 'error');
		el('response').textContent = JSON.stringify(last.output, null, 2);
		el('response-label').textContent = last.matchesExpected
			? 'Response · Expected total verified ✓'
			: 'Response';
	} else badge('http-status', 'Ready to send');
	el('activity').classList.add('hidden');
	el('summary').textContent = investigation?.summary || '';
	el('send-order').textContent = state.published ? 'Replay original order' : 'Send order';
	el('investigate').textContent = running
		? 'Investigating…'
		: investigation
			? 'Investigation started'
			: 'Start investigation';
	if (investigation) {
		const elapsed = Math.round(
			((investigation.finishedAt ? Date.parse(investigation.finishedAt) : Date.now()) -
				Date.parse(investigation.startedAt)) /
				1000,
		);
		badge(
			'investigation-status',
			state.published
				? 'Published'
				: investigation.outcome === 'fix_ready'
					? 'Fix ready'
					: running
						? 'Running'
						: 'Finished',
			state.published || investigation.outcome === 'fix_ready' ? 'success' : 'running',
		);
		el('progress').textContent =
			`${elapsed}s elapsed. ${running ? 'The model is investigating and testing the repair.' : investigation.resultId ? 'Open the report to review the result.' : 'No report was saved. Check the instance logs.'}`;
	} else {
		badge('investigation-status', 'Not started');
		el('progress').textContent = state.failureExecutionId
			? 'The failure is saved. Start the investigation when ready.'
			: 'Send an order to create a failure.';
	}
}

function fixture() {
	const webhookPath = `self-healing-demo-${crypto.randomUUID()}`;
	const setNode = (name, assignments, x, notes) => ({
		id: crypto.randomUUID(),
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [x, 280],
		notes,
		notesInFlow: true,
		parameters: {
			assignments: {
				assignments: assignments.map(([name, type, value]) => ({
					id: crypto.randomUUID(),
					name,
					type,
					value,
				})),
			},
			options: {},
		},
	});
	return {
		webhookPath,
		workflow: {
			name: `Order processing demo ${new Date().toISOString()}`,
			nodes: [
				{
					id: crypto.randomUUID(),
					webhookId: crypto.randomUUID(),
					name: 'Incoming Order',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [160, 280],
					parameters: {
						httpMethod: 'POST',
						path: webhookPath,
						responseMode: 'lastNode',
						responseData: 'firstEntryJson',
						options: {},
					},
				},
				setNode(
					'Prepare Order',
					[
						['orderId', 'string', '={{ $json.body.orderId }}'],
						['quantity', 'number', '={{ $json.body.quantity }}'],
						['unitPrice', 'number', '={{ $json.body.unitPrice }}'],
					],
					440,
					'Read orderId, quantity, and unitPrice from the incoming order. Preserve their values.',
				),
				setNode(
					'Calculate Total',
					[
						['orderId', 'string', '={{ $json.orderId }}'],
						['quantity', 'number', '={{ $json.quantity }}'],
						['total', 'number', '={{ $json.quantity * $json.unitPrice + }}'],
					],
					720,
					'Return the order ID and quantity. Calculate total as quantity multiplied by unitPrice.',
				),
			],
			connections: {
				'Incoming Order': { main: [[{ node: 'Prepare Order', type: 'main', index: 0 }]] },
				'Prepare Order': { main: [[{ node: 'Calculate Total', type: 'main', index: 0 }]] },
			},
			settings: {
				executionOrder: 'v1',
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
			},
		},
	};
}

async function prepare() {
	const demo = fixture();
	const created = await api('/workflows', demo.workflow);
	const workflow = await api(`/workflows/${encodeURIComponent(created.id)}`);
	const projectId = workflow.shared.find((share) => share.role === 'workflow:owner')?.projectId;
	if (!projectId) throw new Error('Could not find the workflow project.');
	state = {
		workflowId: workflow.id,
		projectId,
		name: workflow.name,
		versionId: workflow.versionId,
		webhookPath: demo.webhookPath,
		requests: [],
		ready: false,
	};
	save();
	render();
	await api(`${workflowPath()}/activate`, { versionId: workflow.versionId });
	for (let i = 0; i < 60; i++) {
		const publication = await api(`${workflowPath()}/publication-status`);
		if (publication.status === 'published') {
			state.ready = true;
			save();
			return;
		}
		if (['failed', 'partial'].includes(publication.status))
			throw new Error('Workflow publication failed. Open the workflow to check it.');
		await pause(500);
	}
	throw new Error('Publication is taking longer than expected. Open the workflow to check it.');
}

async function sendOrder(alternate) {
	const input = alternate ? alternateOrder : originalOrder;
	const filter = new URLSearchParams({
		filter: JSON.stringify({ workflowId: state.workflowId }),
		limit: '20',
	});
	const before = new Set((await api(`/executions?${filter}`)).results.map((row) => row.id));
	const response = await fetch(`/webhook/${encodeURIComponent(state.webhookPath)}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
		signal: AbortSignal.timeout(120000),
	});
	const text = await response.text();
	let output;
	try {
		output = JSON.parse(text);
	} catch {
		output = text;
	}
	const matchesExpected =
		response.ok &&
		output?.orderId === input.orderId &&
		output?.quantity === input.quantity &&
		output?.total === input.quantity * input.unitPrice;
	const record = { input, alternate, output, httpStatus: response.status, matchesExpected };
	state.requests.push(record);
	save();
	for (let i = 0; i < 30; i++) {
		const execution = (await api(`/executions?${filter}`)).results.find(
			(row) => !before.has(row.id) && ['error', 'success'].includes(row.status),
		);
		if (execution) {
			record.executionId = execution.id;
			if (execution.status === 'error' && !state.investigation)
				state.failureExecutionId = execution.id;
			save();
			return;
		}
		await pause(500);
	}
	throw new Error('The request finished, but its saved execution was not found.');
}

async function investigate() {
	const started = await api(`${demoPath()}/investigations`, {
		executionId: state.failureExecutionId,
	});
	if (started.kind !== 'investigation')
		throw new Error('This workflow already has a proposed fix. Open Inbox to review it.');
	state.investigation = {
		id: started.investigationId,
		startedAt: new Date().toISOString(),
		finishedAt: null,
	};
	save();
}

async function refresh() {
	if (!signedIn || !state || busy || refreshing) return;
	refreshing = true;
	try {
		if (state.investigation) {
			Object.assign(
				state.investigation,
				await api(`${demoPath()}/investigations/${encodeURIComponent(state.investigation.id)}`),
			);
			if (state.investigation.resultId) {
				const detail = await api(
					`/projects/${encodeURIComponent(state.projectId)}${workflowPath()}/self-healing-results/${encodeURIComponent(state.investigation.resultId)}`,
				);
				state.investigation.summary = detail.summary;
				state.investigation.outcome = detail.outcome;
			}
			const workflow = await api(workflowPath());
			state.published = Boolean(
				workflow.activeVersionId && workflow.activeVersionId !== state.versionId,
			);
		}
		save();
		render();
	} catch (error) {
		notice(error.message);
	} finally {
		refreshing = false;
	}
}

async function action(name) {
	if (busy || !signedIn) return;
	busy = true;
	notice();
	render();
	try {
		while (refreshing) await pause(50);
		if (name === 'prepare-repair') await prepare();
		else if (name === 'send-order') await sendOrder(false);
		else if (name === 'send-alternate') await sendOrder(true);
		else if (name === 'investigate') await investigate();
	} catch (error) {
		notice(error.message);
	} finally {
		busy = false;
		render();
	}
}

document
	.querySelectorAll('[data-action]')
	.forEach((button) => button.addEventListener('click', () => action(button.dataset.action)));
render();
try {
	const user = await api('/login');
	signedIn = true;
	storageKey = `self-healing-demo:${user.id}`;
	try {
		state = JSON.parse(localStorage.getItem(storageKey));
	} catch {
		state = null;
	}
	render();
	await refresh();
	setInterval(refresh, 2500);
} catch (error) {
	notice(error.message);
}
