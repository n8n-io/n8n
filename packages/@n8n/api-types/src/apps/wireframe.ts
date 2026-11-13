import {
	APP_PLAN_SHELL_ID,
	listPlanComponents,
	type AppPlan,
	type AppPlanComponent,
} from '../schemas/app-plan.schema';

/**
 * One renderer for the plan wireframe. The editor shows its HTML before approval, the
 * generated app source embeds the same HTML as placeholders, and a preview-only overlay
 * adds hover info and build progress on top of both.
 */

export interface PlanLinkContext {
	editorUrl?: string;
	projectId?: string;
}

export interface PlanComponentInfo {
	title: string;
	lines: string[];
	status: string;
	link?: { label: string; href: string };
}

// Self-contained on purpose: the overlay script embeds it with `toString()`.
export function describePlanComponent(
	component: AppPlanComponent,
	context: PlanLinkContext,
): PlanComponentInfo {
	const kindName: Record<string, string> = {
		dataTable: 'data table',
		workflow: 'workflow',
		agent: 'agent',
	};
	const lines: string[] = [];
	let link: PlanComponentInfo['link'];
	const linkTo = (resource: { kind: string; name: string; resourceId?: string }) => {
		if (link || !resource.resourceId || !context.editorUrl) return;
		const base = context.editorUrl.replace(/\/$/, '');
		if (resource.kind === 'workflow') {
			link = { label: `Open ${resource.name}`, href: `${base}/workflow/${resource.resourceId}` };
		} else if (resource.kind === 'dataTable' && context.projectId) {
			link = {
				label: `Open ${resource.name}`,
				href: `${base}/projects/${context.projectId}/datatables/${resource.resourceId}`,
			};
		} else if (resource.kind === 'agent' && context.projectId) {
			link = {
				label: `Open ${resource.name}`,
				href: `${base}/projects/${context.projectId}/agents/${resource.resourceId}`,
			};
		}
	};
	const data = component.data;
	if (data) {
		lines.push(
			`Data from ${kindName[data.kind] ?? data.kind} "${data.name}" (${data.status === 'new' ? 'new' : 'existing'})`,
		);
		if (data.fields?.length) lines.push(`Fields: ${data.fields.join(', ')}`);
		if (data.aggregation) lines.push(`Shows: ${data.aggregation}`);
		linkTo(data);
	}
	const action = component.action;
	if (action) {
		lines.push(
			`Runs ${kindName[action.kind] ?? action.kind} "${action.name}" (${action.status === 'new' ? 'new' : 'existing'})`,
		);
		lines.push(action.does);
		linkTo(action);
	}
	if (!data && !action) lines.push('No data or workflow behind this part');
	return { title: component.label, lines, status: component.status ?? 'planned', link };
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/{/g, '&#123;')
		.replace(/}/g, '&#125;');
}

const SKETCH_LINE = '<span class="wf-line"></span>';

function blockBody(component: AppPlanComponent, plan: AppPlan): string {
	const items = (component.items ?? []).map(escapeHtml);
	switch (component.kind) {
		case 'nav': {
			const links = plan.screens
				.map(
					(screen, i) =>
						`<span class="wf-nav-item${i === 0 ? ' active' : ''}" data-plan-screen-link="${screen.id}">${escapeHtml(screen.name)}</span>`,
				)
				.join('');
			return `<span class="wf-logo">${escapeHtml(component.label)}</span><span class="wf-nav-items">${links}</span>`;
		}
		case 'kpi':
			return '<span class="wf-kpi-value">00</span><span class="wf-spark"></span>';
		case 'table': {
			const cols = items.length ? items : ['Column', 'Column', 'Column'];
			const head = cols.map((c) => `<span>${c}</span>`).join('');
			const row = cols.map(() => SKETCH_LINE).join('');
			return `<div class="wf-table" style="--cols:${cols.length}"><div class="wf-tr wf-th">${head}</div>${`<div class="wf-tr">${row}</div>`.repeat(4)}</div>`;
		}
		case 'list': {
			const row = `<div class="wf-li"><span class="wf-dot"></span><span class="wf-li-text">${SKETCH_LINE}${SKETCH_LINE}</span>${items.length ? `<span class="wf-tag">${items[0]}</span>` : ''}</div>`;
			return row.repeat(4);
		}
		case 'chart':
			return (
				'<div class="wf-chart">' +
				[40, 65, 30, 80, 55, 70].map((h) => `<span style="height:${h}%"></span>`).join('') +
				'</div>'
			);
		case 'detail':
			return `<div class="wf-detail">${(items.length ? items : ['Title', 'Body']).map((i) => `<div class="wf-kv"><span class="wf-k">${i}</span>${SKETCH_LINE}</div>`).join('')}</div>`;
		case 'form':
			return `${(items.length ? items : ['Field']).map((i) => `<div class="wf-field"><span class="wf-k">${i}</span><span class="wf-input"></span></div>`).join('')}<span class="wf-btn">Submit</span>`;
		case 'filter':
			return `<div class="wf-pills">${(items.length ? items : ['All', 'Open', 'Done']).map((i, n) => `<span class="wf-pill${n === 0 ? ' active' : ''}">${i}</span>`).join('')}</div>`;
		case 'button':
			return `<span class="wf-btn">${escapeHtml(component.label)}${component.action ? ' <span class="wf-mark">⚡</span>' : ''}</span>`;
		case 'text':
			return SKETCH_LINE.repeat(3);
	}
}

export interface WireframeRenderOptions {
	/** Adds `v-pre` to each block so the HTML is a valid Vue template. */
	vue?: boolean;
}

/** One planned block. Its root carries `data-plan-id`. */
export function renderWireframeBlock(
	component: AppPlanComponent,
	plan: AppPlan,
	options: WireframeRenderOptions = {},
): string {
	const markers = [
		component.data ? '<span class="wf-mark" title="Data">▤</span>' : '',
		component.action ? '<span class="wf-mark" title="Workflow">⚡</span>' : '',
	].join('');
	const showLabel = component.kind !== 'button' && component.kind !== 'nav';
	const showHead = component.kind !== 'button' && (showLabel || markers);
	return [
		`<div class="wf-block wf-k-${component.kind}" data-plan-id="${component.id}" data-plan-kind="${component.kind}"`,
		component.kind === 'nav' ? '' : ` style="grid-column: span ${component.span ?? 12}"`,
		options.vue ? ' v-pre' : '',
		'>',
		showHead
			? `<div class="wf-head">${showLabel ? `<span class="wf-label">${escapeHtml(component.label)}</span>` : ''}${markers}</div>`
			: '',
		`<div class="wf-body">${blockBody(component, plan)}</div>`,
		'</div>',
	].join('');
}

/** The whole app as wireframe markup: shell, nav and every screen (the first one visible). */
export function renderWireframeBody(plan: AppPlan, options: WireframeRenderOptions = {}): string {
	const nav = plan.nav ? renderWireframeBlock(plan.nav, plan, options) : '';
	const screens = plan.screens
		.map((screen, i) => {
			const main = screen.components
				.filter((c) => c.region !== 'aside')
				.map((c) => renderWireframeBlock(c, plan, options))
				.join('\n      ');
			const aside = screen.components
				.filter((c) => c.region === 'aside')
				.map((c) => renderWireframeBlock(c, plan, options))
				.join('\n      ');
			return [
				`  <section class="wf-screen" data-plan-screen="${screen.id}"${i === 0 ? '' : ' hidden'}>`,
				`    <h1 class="wf-screen-title">${escapeHtml(screen.name)}</h1>`,
				'    <div class="wf-columns">',
				`      <div class="wf-grid">\n      ${main}\n      </div>`,
				aside ? `      <aside class="wf-aside">\n      ${aside}\n      </aside>` : '',
				'    </div>',
				'  </section>',
			]
				.filter(Boolean)
				.join('\n');
		})
		.join('\n');
	return [
		`<div class="wf-app wf-layout-${plan.layout ?? 'topbar'}" data-plan-id="${APP_PLAN_SHELL_ID}">`,
		nav ? `  <div class="wf-nav-slot">${nav}</div>` : '',
		'  <div class="wf-content">',
		screens,
		'  </div>',
		'</div>',
	]
		.filter(Boolean)
		.join('\n');
}

export const WIREFRAME_FONT_URL =
	'https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap';

/** Shell styles (the paper look) and block styles. Block styles stay after the shell is built. */
export const WIREFRAME_CSS = `
.wf-app, .wf-block {
  --wf-ink: #2b2b2b; --wf-ink-soft: #6f6f6f; --wf-ink-faint: #a8a8a8;
  --wf-paper: #fbfbf9; --wf-panel: #ffffff; --wf-line: #2b2b2b; --wf-line-soft: #c9c9c9; --wf-wash: #f0efeb;
  --wf-font: 'Kalam', 'Segoe Print', 'Comic Sans MS', cursive;
}
@media (prefers-color-scheme: dark) { .wf-app, .wf-block {
  --wf-ink: #ececea; --wf-ink-soft: #a9a9a6; --wf-ink-faint: #6f6f6c;
  --wf-paper: #1c1c1b; --wf-panel: #252524; --wf-line: #ececea; --wf-line-soft: #4a4a48; --wf-wash: #30302e; } }
.wf-app { font-family: var(--wf-font); font-weight: 300; font-size: 13px; color: var(--wf-ink); background: var(--wf-paper);
  min-height: 100vh; display: flex; flex-direction: column; }
.wf-app.wf-layout-sidebar { flex-direction: row; }
.wf-app *, .wf-block * { box-sizing: border-box; }
.wf-content { flex: 1; padding: 20px 24px 40px; min-width: 0; }
.wf-screen-title { font-family: var(--wf-font); font-size: 20px; font-weight: 400; margin: 0 0 14px; }
.wf-columns { display: flex; gap: 14px; align-items: flex-start; }
.wf-grid { flex: 1; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 14px; align-items: start; }
.wf-aside { width: 32%; display: flex; flex-direction: column; gap: 14px; }
.wf-block { font-family: var(--wf-font); font-weight: 300; font-size: 13px; color: var(--wf-ink); background: var(--wf-panel);
  border: 2px solid var(--wf-line); border-radius: 10px; box-shadow: 4px 4px 0 var(--wf-wash); padding: 10px 12px; min-width: 0; }
.wf-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.wf-label { font-weight: 400; font-size: 14px; flex: 1; }
.wf-mark { font-size: 11px; color: var(--wf-ink-soft); border: 1.5px solid var(--wf-line-soft); border-radius: 6px; padding: 0 4px; }
.wf-line { display: block; height: 8px; border-radius: 4px; background: var(--wf-wash); margin: 5px 0; }
.wf-k-nav { border-radius: 0; border-width: 0 0 2px; box-shadow: none; display: flex; align-items: center; gap: 18px; padding: 12px 24px; }
.wf-k-nav .wf-body { display: flex; align-items: center; gap: 18px; flex: 1; }
.wf-layout-sidebar .wf-k-nav { border-width: 0 2px 0 0; flex-direction: column; align-items: stretch; width: 200px; min-height: 100vh; }
.wf-layout-sidebar .wf-k-nav .wf-body, .wf-layout-sidebar .wf-nav-items { flex-direction: column; align-items: stretch; }
.wf-logo { font-weight: 700; font-size: 16px; }
.wf-nav-items { display: flex; gap: 6px; }
.wf-nav-item { padding: 3px 10px; border-radius: 999px; cursor: pointer; color: var(--wf-ink-soft); }
.wf-nav-item.active { background: var(--wf-wash); color: var(--wf-ink); font-weight: 400; }
.wf-kpi-value { display: block; font-size: 28px; font-weight: 700; color: var(--wf-ink-faint); }
.wf-spark { display: block; height: 14px; margin-top: 4px; border-bottom: 2px dashed var(--wf-line-soft); }
.wf-table { display: grid; }
.wf-tr { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 10px; padding: 6px 0; border-bottom: 1.5px solid var(--wf-line-soft); }
.wf-th { font-weight: 400; color: var(--wf-ink-soft); border-bottom: 2px solid var(--wf-line); }
.wf-li { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1.5px solid var(--wf-line-soft); }
.wf-dot { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--wf-line-soft); flex: none; }
.wf-li-text { flex: 1; }
.wf-tag { font-size: 11px; border: 1.5px solid var(--wf-line-soft); border-radius: 999px; padding: 0 8px; color: var(--wf-ink-soft); }
.wf-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; border-left: 2px solid var(--wf-line); border-bottom: 2px solid var(--wf-line); padding: 0 8px; }
.wf-chart span { flex: 1; background: var(--wf-wash); border: 1.5px solid var(--wf-line-soft); border-bottom: 0; border-radius: 4px 4px 0 0; }
.wf-kv, .wf-field { margin: 6px 0; }
.wf-k { display: block; font-size: 11px; color: var(--wf-ink-soft); }
.wf-input { display: block; height: 28px; border: 1.5px solid var(--wf-line-soft); border-radius: 7px; }
.wf-btn { display: inline-block; border: 2px solid var(--wf-line); border-radius: 8px; padding: 4px 14px; font-weight: 400; }
.wf-k-button { border: 0; box-shadow: none; padding: 0; background: transparent; }
.wf-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.wf-pill { border: 1.5px solid var(--wf-line-soft); border-radius: 999px; padding: 1px 10px; color: var(--wf-ink-soft); }
.wf-pill.active { background: var(--wf-wash); color: var(--wf-ink); }
`;

/** Styles of the preview overlay: hover card, progress bar, shimmer on the block in progress. */
export const PLAN_OVERLAY_CSS = `
.plan-ov-tip { position: fixed; z-index: 2147483646; max-width: 300px; padding: 8px 10px; border-radius: 8px;
  background: #1f1f1f; color: #fff; font: 12px/1.45 system-ui, sans-serif; box-shadow: 0 6px 20px rgba(0,0,0,.25); pointer-events: auto; }
.plan-ov-tip b { display: block; font-size: 12.5px; margin-bottom: 2px; }
.plan-ov-tip .st { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 999px; background: #444; font-size: 10.5px; font-weight: 500; }
.plan-ov-tip .st.built { background: #2e7d4f; } .plan-ov-tip .st.building { background: #b26b00; }
.plan-ov-tip a { color: #ffb4a8; }
.plan-ov-hl { outline: 2px dashed #ff6d5a !important; outline-offset: 2px; }
.plan-ov-selecting [data-plan-id] { cursor: crosshair; }
.plan-ov-selected { outline: 2px solid #ff6d5a !important; outline-offset: 2px; }
.plan-ov-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483645; display: flex; align-items: center; gap: 10px;
  padding: 5px 12px; background: rgba(255,255,255,.94); border-bottom: 1px solid #e3e3e3; color: #333; font: 12px system-ui, sans-serif; backdrop-filter: blur(4px); }
.plan-ov-bar .track { flex: 0 0 140px; height: 5px; border-radius: 3px; background: #eee; overflow: hidden; }
.plan-ov-bar .fill { height: 100%; background: #ff6d5a; transition: width .4s; }
.plan-ov-bar.done .fill { background: #2e7d4f; }
.plan-ov-building { position: relative; overflow: hidden; }
.plan-ov-building::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 20%, rgba(255,109,90,.18) 50%, transparent 80%); background-size: 200% 100%;
  animation: plan-ov-shimmer 1.4s linear infinite; }
@keyframes plan-ov-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
`;

export interface PlanOverlayConfig {
	/** The plan itself, or a URL that serves it (e.g. `plan.json` in the app). */
	plan?: AppPlan;
	planUrl?: string;
	editorUrl?: string;
	projectId?: string;
	/** Shows the build progress bar. */
	progress?: boolean;
	/** Lets the parent page turn on block selection with `postMessage`. */
	selectable?: boolean;
}

/** `postMessage` source of the plan overlay. */
export const PLAN_OVERLAY_MESSAGE_SOURCE = 'n8n-app-plan';

/** Runs in the page. Self-contained: it is embedded with `toString()`. */
export function planOverlayMain(
	describe: typeof describePlanComponent,
	css: string,
	config: PlanOverlayConfig,
): void {
	const doc = document;
	const style = doc.createElement('style');
	style.textContent = css;
	doc.head.append(style);

	let byId: Record<string, AppPlanComponent> = {};
	let order: string[] = [];
	let tip: HTMLElement | null = null;
	let tipFor: Element | null = null;
	let hideTimer = 0;

	function index(plan: AppPlan) {
		byId = {};
		const all = [...(plan.nav ? [plan.nav] : []), ...plan.screens.flatMap((s) => s.components)];
		all.forEach((c) => (byId[c.id] = c));
		order = plan.buildOrder?.length ? plan.buildOrder : ['shell', ...all.map((c) => c.id)];
	}

	function isBuilt(id: string): boolean {
		if (id === 'shell') {
			const shell = doc.querySelector('[data-plan-id="shell"]');
			return !shell || !shell.classList.contains('wf-app');
		}
		const el = doc.querySelector(`[data-plan-id="${id}"]`);
		return !!el && !el.classList.contains('wf-block');
	}

	function hideTip() {
		tip?.remove();
		tip = null;
		tipFor?.classList.remove('plan-ov-hl');
		tipFor = null;
	}

	function showTip(el: Element, comp: AppPlanComponent) {
		if (tipFor === el) return;
		hideTip();
		const status = isBuilt(comp.id) ? 'built' : (comp.status ?? 'planned');
		const info = describe(
			{ ...comp, status },
			{ editorUrl: config.editorUrl, projectId: config.projectId },
		);
		tip = doc.createElement('div');
		tip.className = 'plan-ov-tip';
		const title = doc.createElement('b');
		title.textContent = info.title;
		const st = doc.createElement('span');
		st.className = `st ${info.status}`;
		st.textContent = info.status;
		title.append(st);
		tip.append(title);
		info.lines.forEach((line) => {
			const div = doc.createElement('div');
			div.textContent = line;
			tip!.append(div);
		});
		if (info.link) {
			const a = doc.createElement('a');
			a.href = info.link.href;
			a.target = '_blank';
			a.rel = 'noopener';
			a.textContent = `${info.link.label} ↗`;
			tip.append(a);
		}
		tip.addEventListener('mouseenter', () => window.clearTimeout(hideTimer));
		tip.addEventListener('mouseleave', hideTip);
		doc.body.append(tip);
		const r = el.getBoundingClientRect();
		const top =
			r.bottom + 6 + tip.offsetHeight > window.innerHeight
				? r.top - tip.offsetHeight - 6
				: r.bottom + 6;
		tip.style.top = `${Math.max(4, top)}px`;
		tip.style.left = `${Math.min(Math.max(4, r.left), window.innerWidth - tip.offsetWidth - 4)}px`;
		el.classList.add('plan-ov-hl');
		tipFor = el;
	}

	doc.addEventListener('mouseover', (event) => {
		const target = event.target instanceof Element ? event.target : null;
		if (!target || tip?.contains(target)) return;
		const el = target.closest('[data-plan-id]');
		const comp = el ? byId[el.getAttribute('data-plan-id') ?? ''] : undefined;
		if (el && comp) {
			window.clearTimeout(hideTimer);
			showTip(el, comp);
		} else if (tip) {
			window.clearTimeout(hideTimer);
			hideTimer = window.setTimeout(hideTip, 250);
		}
	});

	// Screen switching for wireframe navs (built navs bring their own routing).
	doc.addEventListener('click', (event) => {
		const link =
			event.target instanceof Element ? event.target.closest('[data-plan-screen-link]') : null;
		if (!link || !link.closest('.wf-block')) return;
		const id = link.getAttribute('data-plan-screen-link');
		doc.querySelectorAll('[data-plan-screen]').forEach((s) => {
			(s as HTMLElement).hidden = s.getAttribute('data-plan-screen') !== id;
		});
		doc.querySelectorAll('[data-plan-screen-link]').forEach((l) => {
			l.classList.toggle('active', l === link);
		});
	});

	// Selection for comments: the parent turns it on, a click on a block reports its plan id.
	let selecting = false;
	if (config.selectable) {
		const source = 'n8n-app-plan';
		window.addEventListener('message', (event) => {
			if (event.source !== window.parent) return;
			const data: unknown = event.data;
			if (
				typeof data !== 'object' ||
				data === null ||
				!('source' in data) ||
				data.source !== source
			)
				return;
			const type = 'type' in data ? data.type : undefined;
			if (type === 'select:enable' || type === 'select:disable') {
				selecting = type === 'select:enable';
				doc.documentElement.classList.toggle('plan-ov-selecting', selecting);
			} else if (type === 'select:clear') {
				doc
					.querySelectorAll('.plan-ov-selected')
					.forEach((el) => el.classList.remove('plan-ov-selected'));
			}
		});
		doc.addEventListener(
			'click',
			(event) => {
				if (!selecting) return;
				const el = event.target instanceof Element ? event.target.closest('[data-plan-id]') : null;
				const id = el?.getAttribute('data-plan-id');
				if (!el || !id) return;
				event.preventDefault();
				event.stopPropagation();
				el.classList.add('plan-ov-selected');
				selecting = false;
				doc.documentElement.classList.remove('plan-ov-selecting');
				window.parent.postMessage({ source, type: 'selected', planId: id }, '*');
			},
			true,
		);
	}

	let bar: HTMLElement | null = null;
	function renderProgress() {
		if (!config.progress || !order.length) return;
		const built = order.filter(isBuilt);
		const next = order.find((id) => !isBuilt(id));
		if (!bar) {
			bar = doc.createElement('div');
			bar.className = 'plan-ov-bar';
			doc.body.append(bar);
			doc.body.style.paddingTop = '28px';
		}
		const name = (id: string) => (id === 'shell' ? 'Layout and theme' : (byId[id]?.label ?? id));
		bar.className = `plan-ov-bar${next ? '' : ' done'}`;
		bar.innerHTML = '';
		const track = doc.createElement('span');
		track.className = 'track';
		const fill = doc.createElement('span');
		fill.className = 'fill';
		fill.style.display = 'block';
		fill.style.width = `${Math.round((built.length / order.length) * 100)}%`;
		track.append(fill);
		const text = doc.createElement('span');
		text.textContent = next
			? `${built.length} of ${order.length} built · Building: ${name(next)}`
			: `All ${order.length} parts built`;
		bar.append(track, text);
		doc
			.querySelectorAll('.plan-ov-building')
			.forEach((el) => el.classList.remove('plan-ov-building'));
		if (next && next !== 'shell') {
			doc.querySelector(`[data-plan-id="${next}"]`)?.classList.add('plan-ov-building');
		}
	}

	function start(plan: AppPlan) {
		index(plan);
		renderProgress();
		// The app may render after this script runs, so recount when the DOM changes.
		let pending = 0;
		new MutationObserver(() => {
			window.cancelAnimationFrame(pending);
			pending = window.requestAnimationFrame(renderProgress);
		}).observe(doc.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class'],
		});
	}

	if (config.plan) {
		start(config.plan);
	} else if (config.planUrl) {
		fetch(config.planUrl, { cache: 'no-store' })
			.then(async (res) => (res.ok ? ((await res.json()) as AppPlan) : null))
			.then((plan) => plan && start(plan))
			.catch(() => {});
	}
}

/** The overlay as an inline script (`<script>` content, without the tag). */
export function planOverlayScript(config: PlanOverlayConfig): string {
	const json = JSON.stringify(config).replace(/</g, '\\u003c');
	const css = JSON.stringify(PLAN_OVERLAY_CSS);
	return `(${planOverlayMain.toString()})(${describePlanComponent.toString()}, ${css}, ${json});`;
}

/** A full HTML document of the wireframe, for an iframe `srcdoc` or an MCP App. */
export function renderWireframeDocument(
	plan: AppPlan,
	overlay: Omit<PlanOverlayConfig, 'plan' | 'planUrl'> = {},
): string {
	return [
		'<!doctype html><html><head><meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		`<link rel="stylesheet" href="${WIREFRAME_FONT_URL}">`,
		`<style>html,body{margin:0}${WIREFRAME_CSS}</style>`,
		'</head><body>',
		renderWireframeBody(plan),
		`<script>${planOverlayScript({ ...overlay, plan })}</script>`,
		'</body></html>',
	].join('\n');
}

/** Component ids in build order, with the shell first. */
export function planBuildOrder(plan: AppPlan): string[] {
	return plan.buildOrder?.length
		? plan.buildOrder
		: [APP_PLAN_SHELL_ID, ...listPlanComponents(plan).map((c) => c.id)];
}
