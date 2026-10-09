const pageSize = 50;
const statusElement = document.getElementById('status');
const workflows = document.getElementById('workflows');
const table = document.querySelector('table');
const refresh = document.getElementById('refresh');
const previous = document.getElementById('previous');
const next = document.getElementById('next');
const page = document.getElementById('page');
let skip = 0;

async function getJson(url) {
	const response = await fetch(url);
	if (response.status === 401) {
		window.location.assign('/workflow-portal/login');
		throw new Error('Unauthorized');
	}
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return await response.json();
}

const messages = await getJson('/workflow-portal/assets/messages.json');
const text = (key) => messages[`workflowPortal.${key}`];
document.title = text('title');
for (const element of document.querySelectorAll('[data-i18n]')) {
	element.textContent = text(element.dataset.i18n);
}

async function loadWorkflows() {
	refresh.disabled = previous.disabled = next.disabled = true;
	statusElement.textContent = text('loading');
	try {
		const result = await getJson(`/workflow-portal/workflows?skip=${skip}&take=${pageSize}`);
		workflows.replaceChildren();
		for (const workflow of result.data) {
			const row = document.createElement('tr');
			for (const value of [
				workflow.id,
				workflow.name,
				text(workflow.published ? 'published' : 'draft'),
				workflow.updatedAt
					? new Date(workflow.updatedAt).toLocaleString('en-US', {
							dateStyle: 'medium',
							timeStyle: 'short',
							hour12: false,
						})
					: '',
			]) {
				const cell = document.createElement('td');
				cell.textContent = value;
				row.append(cell);
			}
			workflows.append(row);
		}
		table.hidden = result.data.length === 0;
		statusElement.textContent = result.data.length ? '' : text('empty');
		page.textContent = text('page')
			.replace('{page}', String(Math.floor(skip / pageSize) + 1))
			.replace('{pages}', String(Math.max(1, Math.ceil(result.count / pageSize))));
		previous.disabled = skip === 0;
		next.disabled = skip + pageSize >= result.count;
	} catch {
		statusElement.textContent = text('error');
	} finally {
		refresh.disabled = false;
	}
}

refresh.addEventListener('click', () => {
	skip = 0;
	void loadWorkflows();
});
previous.addEventListener('click', () => {
	skip = Math.max(0, skip - pageSize);
	void loadWorkflows();
});
next.addEventListener('click', () => {
	skip += pageSize;
	void loadWorkflows();
});
await loadWorkflows();
