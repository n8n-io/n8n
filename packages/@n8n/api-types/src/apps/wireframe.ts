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

export interface PlanResourceInfo {
	kind: string;
	/** `data table`, `workflow` or `agent`. */
	kindLabel: string;
	name: string;
	isNew: boolean;
}

export interface PlanComponentInfo {
	title: string;
	kind: string;
	status: 'planned' | 'building' | 'built';
	/** The part has a detailed version with sample data. */
	detailed: boolean;
	fidelity?: 'mid' | 'high';
	/** Names of the other states of a detailed part. */
	states: string[];
	data?: PlanResourceInfo & { fields: string[]; shows?: string };
	action?: PlanResourceInfo & { does: string };
	link?: { label: string; href: string };
	/** The same content as plain lines. */
	lines: string[];
}

// Self-contained on purpose: the overlay script embeds it with `toString()`.
export function describePlanComponent(
	component: AppPlanComponent,
	context: PlanLinkContext,
): PlanComponentInfo {
	const kindLabels: Record<string, string> = {
		dataTable: 'data table',
		workflow: 'workflow',
		agent: 'agent',
	};
	const resource = (r: { kind: string; name: string; status: string }) => ({
		kind: r.kind,
		kindLabel: kindLabels[r.kind] ?? r.kind,
		name: r.name,
		isNew: r.status === 'new',
	});
	let link: PlanComponentInfo['link'];
	const linkTo = (r: { kind: string; name: string; resourceId?: string }) => {
		if (link || !r.resourceId || !context.editorUrl) return;
		const base = context.editorUrl.replace(/\/$/, '');
		const paths: Record<string, string | undefined> = {
			workflow: `/workflow/${r.resourceId}`,
			dataTable: context.projectId
				? `/projects/${context.projectId}/datatables/${r.resourceId}`
				: undefined,
			agent: context.projectId
				? `/projects/${context.projectId}/agents/${r.resourceId}`
				: undefined,
		};
		const path = paths[r.kind];
		if (path) link = { label: `Open ${r.name}`, href: `${base}${path}` };
	};

	const lines: string[] = [];
	const info: PlanComponentInfo = {
		title: component.label,
		kind: component.kind,
		status: component.status ?? 'planned',
		detailed: component.detail !== undefined,
		fidelity: component.detail ? (component.detail.fidelity ?? 'mid') : undefined,
		states: component.detail?.states?.map((state) => state.name) ?? [],
		lines,
	};
	if (component.data) {
		const data = component.data;
		info.data = { ...resource(data), fields: data.fields ?? [], shows: data.aggregation };
		lines.push(
			`Data from ${info.data.kindLabel} "${data.name}" (${info.data.isNew ? 'new' : 'existing'})`,
		);
		if (data.fields?.length) lines.push(`Fields: ${data.fields.join(', ')}`);
		if (data.aggregation) lines.push(`Shows: ${data.aggregation}`);
		linkTo(data);
	}
	if (component.action) {
		const action = component.action;
		info.action = { ...resource(action), does: action.does };
		lines.push(
			`Runs ${info.action.kindLabel} "${action.name}" (${info.action.isNew ? 'new' : 'existing'})`,
		);
		lines.push(action.does);
		linkTo(action);
	}
	if (!component.data && !component.action) lines.push('No data or workflow behind this part');
	info.link = link;
	return info;
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
const SPARKLINE =
	'<svg class="wf-spark" viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M0 18 L15 15 L30 17 L45 10 L60 12 L75 5 L100 8"/></svg>';
const LINE_A = 'M0 80 L40 70 L80 74 L120 50 L160 56 L200 30 L240 36 L300 20';
const LINE_B = 'M0 90 L40 86 L80 80 L120 82 L160 70 L200 72 L240 60 L300 64';
const LINE_C = 'M0 60 L40 64 L80 50 L120 58 L160 44 L200 50 L240 46 L300 40';

function blockBody(component: AppPlanComponent, plan: AppPlan): string {
	const items = (component.items ?? []).map(escapeHtml);
	switch (component.kind) {
		case 'nav': {
			const links = plan.screens
				.filter((screen) => !screen.path?.includes(':'))
				.map(
					(screen, i) =>
						`<span class="wf-nav-item${i === 0 ? ' active' : ''}" data-plan-screen-link="${screen.id}">${escapeHtml(screen.name)}</span>`,
				)
				.join('');
			return `<span class="wf-logo">${escapeHtml(component.label)}</span><span class="wf-nav-items">${links}</span>`;
		}
		case 'kpi': {
			const tile = (label: string) =>
				`<div class="wf-kpi">${label ? `<span class="wf-k">${label}</span>` : ''}<span class="wf-kpi-value">00</span><span class="wf-kpi-delta">▲ 0 (0%)</span>${SPARKLINE}</div>`;
			return items.length ? `<div class="wf-kpis">${items.map(tile).join('')}</div>` : tile('');
		}
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
		case 'chart': {
			const legend = items.length
				? `<div class="wf-legend">${items.map((i, n) => `<span><i class="wf-swatch wf-s${n % 3}"></i>${i}</span>`).join('')}</div>`
				: '';
			if (component.variant === 'bar') {
				return `${legend}<div class="wf-chart">${[40, 65, 30, 80, 55, 70].map((h) => `<span style="height:${h}%"></span>`).join('')}</div>`;
			}
			if (component.variant === 'pie') {
				return `<div class="wf-pie-wrap"><svg class="wf-pie" viewBox="0 0 42 42"><circle r="15.9" cx="21" cy="21" class="wf-pie-a"/><circle r="15.9" cx="21" cy="21" class="wf-pie-b" stroke-dasharray="35 65"/></svg>${legend}</div>`;
			}
			const series = Math.max(1, Math.min(items.length, 3));
			const paths = [LINE_A, LINE_B, LINE_C]
				.slice(0, series)
				.map((d, n) => `<path d="${d}" class="wf-s${n}"/>`)
				.join('');
			return `${legend}<svg class="wf-linechart" viewBox="0 0 300 100" preserveAspectRatio="none"><path d="M0 99H300M0 0V100" class="wf-axis"/>${paths}</svg>`;
		}
		case 'detail':
			return `<div class="wf-detail">${(items.length ? items : ['Title', 'Body']).map((i) => `<div class="wf-kv"><span class="wf-k">${i}</span>${SKETCH_LINE}</div>`).join('')}</div>`;
		case 'form':
			return `${(items.length ? items : ['Field']).map((i) => `<div class="wf-field"><span class="wf-k">${i}</span><span class="wf-input"></span></div>`).join('')}<span class="wf-btn">Submit</span>`;
		case 'filter':
			if (component.variant === 'pills') {
				return `<div class="wf-pills">${(items.length ? items : ['All', 'Open', 'Done']).map((i, n) => `<span class="wf-pill${n === 0 ? ' active' : ''}">${i}</span>`).join('')}</div>`;
			}
			return `<div class="wf-selects">${(items.length ? items : ['Filter']).map((i) => `<div class="wf-field"><span class="wf-k">${i}</span><span class="wf-input wf-select">All</span></div>`).join('')}</div>`;
		case 'button':
			return `<span class="wf-btn">${escapeHtml(component.label)}${component.action ? ' <span class="wf-mark">⚡</span>' : ''}</span>`;
		case 'text':
			return SKETCH_LINE.repeat(3);
	}
}

export interface WireframeRenderOptions {
	/** Adds `v-pre` to each block so the HTML is a valid Vue template. */
	vue?: boolean;
	/** The app theme. `both` follows the color scheme of the browser. Defaults to `both`. */
	theme?: 'light' | 'dark' | 'both';
}

/** One planned block. Its root carries `data-plan-id`. */
/** Detail HTML without scripts, frames, event handlers or `javascript:` URLs. */
export function sanitizeDetailHtml(html: string): string {
	return html
		.replace(/<(script|style|iframe|object|embed|template)\b[\s\S]*?<\/\1\s*>/gi, '')
		.replace(/<\/?(script|style|iframe|object|embed|template|link|meta|base)\b[^>]*>/gi, '')
		.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
		.replace(/(href|src|action|formaction)\s*=\s*("|')?\s*javascript:[^"'\s>]*("|')?/gi, '$1="#"');
}

/** Base styles inside the shadow root of a detailed part. */
const DETAIL_BASE_CSS =
	':host{display:block;position:relative}' +
	'.wf-sample{position:absolute;top:-9px;right:12px;z-index:2;padding:1px 7px;border-radius:999px;background:#fff4e5;' +
	'color:#b25e00;font:600 10px/16px system-ui,sans-serif;pointer-events:none}' +
	'.wf-hifi-body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-weight:400}' +
	'.wf-states-radio{position:absolute;opacity:0;pointer-events:none}' +
	'.wf-states{position:absolute;top:-11px;left:10px;z-index:2;display:flex;gap:2px;padding:2px;border-radius:999px;' +
	'background:var(--wf-panel,#fff);border:1px solid var(--wf-line-soft,#d6d6d2);font:500 10.5px/16px system-ui,sans-serif}' +
	'.wf-states label{padding:0 8px;border-radius:999px;color:var(--wf-ink-soft,#6f6f6f);cursor:pointer}' +
	'.wf-state{display:none}';

/**
 * The content of the shadow root of a detailed part: its own styles, the sample
 * data tag and the sanitized markup. The shadow root keeps the app styles out and
 * the detail styles in.
 */
export function detailShadowContent(component: AppPlanComponent): string {
	if (!component.detail) return '';
	// CSS never needs `<`, so dropping it keeps the text from closing the style element.
	const css = (component.detail.css ?? '').replace(/</g, '');
	// Mid fidelity stays in grays, also when the markup brings colors. The custom property
	// comes from the host block and inverts the grays in a dark theme.
	const mid =
		component.detail.fidelity !== 'high'
			? '.wf-hifi-body{filter:var(--wf-mid-filter,grayscale(1))}'
			: '';
	const states = [
		{ name: 'With data', html: component.detail.html },
		...(component.detail.states ?? []),
	];
	if (states.length === 1) {
		return `<style>${DETAIL_BASE_CSS}${css}${mid}</style><span class="wf-sample">Sample data</span><div class="wf-hifi-body">${sanitizeDetailHtml(component.detail.html)}</div><slot></slot>`;
	}
	// A CSS-only switcher: it works in the sandboxed plan view and in the app without scripts.
	const switcher = states
		.map(
			(_, n) =>
				`#wf-s${n}:checked~.wf-hifi-body .wf-s${n}{display:block}#wf-s${n}:checked~.wf-states label[for=wf-s${n}]{background:var(--wf-ink,#2b2b2b);color:var(--wf-panel,#fff)}`,
		)
		.join('');
	return [
		`<style>${DETAIL_BASE_CSS}${css}${mid}${switcher}</style>`,
		states
			.map(
				(_, n) =>
					`<input class="wf-states-radio" type="radio" name="wf-state" id="wf-s${n}"${n === 0 ? ' checked' : ''}>`,
			)
			.join(''),
		`<div class="wf-states">${states.map((state, n) => `<label for="wf-s${n}">${escapeHtml(state.name)}</label>`).join('')}</div>`,
		'<span class="wf-sample">Sample data</span>',
		`<div class="wf-hifi-body">${states.map((state, n) => `<div class="wf-state wf-s${n}">${sanitizeDetailHtml(state.html)}</div>`).join('')}</div>`,
		'<slot></slot>',
	].join('');
}

/**
 * A module for the generated app: the shadow content of each detailed part and a
 * function that attaches it to the empty placeholder elements, also after Vue re-renders.
 */
export function renderDetailModule(plan: AppPlan): string {
	const details: Record<string, string> = {};
	for (const c of listPlanComponents(plan)) if (c.detail) details[c.id] = detailShadowContent(c);
	return [
		'// Detailed parts of the plan, with sample data. Remove a part when you build it.',
		`export const details = ${JSON.stringify(details, null, 2)};`,
		'',
		'export function mountPlanDetails() {',
		'\tconst attach = () => {',
		"\t\tfor (const host of document.querySelectorAll('.wf-hifi[data-plan-id]')) {",
		"\t\t\tconst content = details[host.getAttribute('data-plan-id')];",
		"\t\t\tif (content && !host.shadowRoot) host.attachShadow({ mode: 'open' }).innerHTML = content;",
		'\t\t}',
		'\t};',
		'\tattach();',
		'\tnew MutationObserver(attach).observe(document.body, { childList: true, subtree: true });',
		'}',
		'',
	].join('\n');
}

/** Parts placed inside `component`, rendered as its footer. */
function renderChildren(
	component: AppPlanComponent,
	plan: AppPlan,
	options: WireframeRenderOptions,
): string {
	const children = listPlanComponents(plan).filter((c) => c.inside === component.id);
	return children.length
		? `<div class="wf-inside">${children.map((c) => renderWireframeBlock(c, plan, options)).join('')}</div>`
		: '';
}

export function renderWireframeBlock(
	component: AppPlanComponent,
	plan: AppPlan,
	options: WireframeRenderOptions = {},
): string {
	if (component.detail) {
		// In the app the host stays empty: `mountPlanDetails()` attaches the content.
		return [
			`<div class="wf-block wf-hifi wf-k-${component.kind} wf-theme-${options.theme ?? 'both'}" data-plan-id="${component.id}" data-plan-kind="${component.kind}"`,
			component.kind === 'nav' ? '' : ` style="grid-column: span ${component.span ?? 12}"`,
			component.opens ? ` data-plan-opens="${component.opens}"` : '',
			options.vue ? ' v-pre>' : '>',
			options.vue
				? ''
				: `<template shadowrootmode="open">${detailShadowContent(component)}</template>`,
			renderChildren(component, plan, options),
			'</div>',
		].join('');
	}
	const markers = [
		component.data ? '<span class="wf-mark" title="Data">▤</span>' : '',
		component.action ? '<span class="wf-mark" title="Workflow">⚡</span>' : '',
		component.opens ? '<span class="wf-mark" title="Opens a page">↗</span>' : '',
	].join('');
	const showLabel = component.kind !== 'button' && component.kind !== 'nav';
	const showHead = component.kind !== 'button' && (showLabel || markers);
	return [
		`<div class="wf-block wf-k-${component.kind} wf-theme-${options.theme ?? 'both'}" data-plan-id="${component.id}" data-plan-kind="${component.kind}"`,
		component.kind === 'nav' ? '' : ` style="grid-column: span ${component.span ?? 12}"`,
		component.opens ? ` data-plan-opens="${component.opens}"` : '',
		options.vue ? ' v-pre' : '',
		'>',
		showHead
			? `<div class="wf-head">${showLabel ? `<span class="wf-label">${escapeHtml(component.label)}</span>` : ''}${markers}</div>`
			: '',
		`<div class="wf-body">${blockBody(component, plan)}</div>`,
		renderChildren(component, plan, options),
		'</div>',
	].join('');
}

/** The whole app as wireframe markup: shell, nav and every screen (the first one visible). */
export function renderWireframeBody(plan: AppPlan, options: WireframeRenderOptions = {}): string {
	const nav = plan.nav ? renderWireframeBlock(plan.nav, plan, options) : '';
	const screens = plan.screens
		.map((screen, i) => {
			const head = `    <div class="wf-screen-head">${
				screen.path?.includes(':') && plan.screens[0].id !== screen.id
					? `<span class="wf-back" data-plan-screen-link="${plan.screens[0].id}">← ${escapeHtml(plan.screens[0].name)}</span>`
					: ''
			}<h1 class="wf-screen-title">${escapeHtml(screen.name)}</h1>${
				screen.path ? `<span class="wf-path">${escapeHtml(screen.path)}</span>` : ''
			}</div>`;
			if (screen.rows?.length) {
				const byId = new Map(screen.components.map((c) => [c.id, c]));
				const placed = new Set(
					screen.rows.flatMap((row) => row.columns.flatMap((col) => col.parts)),
				);
				// Parts the rows forget still show, in a last full-width row.
				const rest = screen.components
					.filter((c) => !c.inside && !placed.has(c.id))
					.map((c) => c.id);
				const rows = [...screen.rows, ...(rest.length ? [{ columns: [{ parts: rest }] }] : [])];
				const body = rows
					.map((row) => {
						const widths = row.columns
							.map((col) => `${'width' in col && col.width ? col.width : 1}fr`)
							.join(' ');
						const columns = row.columns
							.map((col) => {
								const parts = col.parts
									.map((id) => byId.get(id))
									.filter((c): c is AppPlanComponent => c !== undefined && !c.inside)
									.map((c) => renderWireframeBlock(c, plan, options))
									.join('\n');
								return `<div class="wf-col">${parts}</div>`;
							})
							.join('\n');
						return `      <div class="wf-row" style="grid-template-columns: ${widths}">\n${columns}\n      </div>`;
					})
					.join('\n');
				return [
					`  <section class="wf-screen" data-plan-screen="${screen.id}"${i === 0 ? '' : ' hidden'}>`,
					head,
					`    <div class="wf-rows">\n${body}\n    </div>`,
					'  </section>',
				].join('\n');
			}
			const main = screen.components
				.filter((c) => c.region !== 'aside' && !c.inside)
				.map((c) => renderWireframeBlock(c, plan, options))
				.join('\n      ');
			const aside = screen.components
				.filter((c) => c.region === 'aside' && !c.inside)
				.map((c) => renderWireframeBlock(c, plan, options))
				.join('\n      ');
			return [
				`  <section class="wf-screen" data-plan-screen="${screen.id}"${i === 0 ? '' : ' hidden'}>`,
				head,
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
		`<div class="wf-app wf-layout-${plan.layout ?? 'topbar'} wf-theme-${options.theme ?? 'both'}" data-plan-id="${APP_PLAN_SHELL_ID}">`,
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
  --wf-mid-filter: grayscale(1);
  --wf-font: 'Kalam', 'Segoe Print', 'Comic Sans MS', cursive;
}
@media (prefers-color-scheme: dark) { .wf-theme-both {
  --wf-ink: #ececea; --wf-ink-soft: #a9a9a6; --wf-ink-faint: #6f6f6c;
  --wf-paper: #1c1c1b; --wf-panel: #252524; --wf-line: #ececea; --wf-line-soft: #4a4a48; --wf-wash: #30302e;
  --wf-mid-filter: grayscale(1) invert(0.86) hue-rotate(180deg); } }
.wf-theme-dark {
  --wf-ink: #ececea; --wf-ink-soft: #a9a9a6; --wf-ink-faint: #6f6f6c;
  --wf-paper: #1c1c1b; --wf-panel: #252524; --wf-line: #ececea; --wf-line-soft: #4a4a48; --wf-wash: #30302e;
  --wf-mid-filter: grayscale(1) invert(0.86) hue-rotate(180deg); }
.wf-app { font-family: var(--wf-font); font-weight: 300; font-size: 13px; color: var(--wf-ink); background: var(--wf-paper);
  min-height: 100vh; display: flex; flex-direction: column; }
.wf-app.wf-layout-sidebar { flex-direction: row; }
.wf-app *, .wf-block * { box-sizing: border-box; }
.wf-content { flex: 1; padding: 20px 24px 40px; min-width: 0; }
.wf-screen-head { display: flex; align-items: baseline; gap: 10px; margin: 0 0 14px; flex-wrap: wrap; }
.wf-screen-title { font-family: var(--wf-font); font-size: 20px; font-weight: 400; margin: 0; }
.wf-path { font: 11px ui-monospace, Menlo, monospace; color: var(--wf-ink-soft); border: 1px solid var(--wf-line-soft); border-radius: 6px; padding: 1px 6px; }
.wf-back { flex-basis: 100%; font-size: 12px; color: var(--wf-ink-soft); cursor: pointer; }
[data-plan-opens] { cursor: pointer; }
.wf-pages { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 16px; border-bottom: 1px dashed #c9c9c9;
  background: #f4f4f1; font: 12px system-ui, sans-serif; color: #6f6f6f; }
.wf-pages b { font-weight: 600; margin-right: 4px; }
.wf-page { padding: 3px 10px; border-radius: 999px; border: 1px solid #d6d6d2; background: #fff; cursor: pointer; color: #2b2b2b; }
.wf-page.active { background: #2b2b2b; color: #fff; border-color: #2b2b2b; }
.wf-page code { font: 11px ui-monospace, Menlo, monospace; opacity: .7; margin-left: 4px; }
.wf-columns { display: flex; gap: 14px; align-items: flex-start; }
.wf-rows { display: flex; flex-direction: column; gap: 14px; }
.wf-row { display: grid; gap: 14px; align-items: start; }
.wf-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
@media (max-width: 720px) { .wf-row { grid-template-columns: 1fr !important; } }
.wf-inside { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1.5px dashed var(--wf-line-soft); }
.wf-hifi > .wf-inside { margin: 0; padding: 10px 14px; }
.wf-inside > .wf-block { box-shadow: none; }
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
.wf-block.wf-hifi { position: relative; padding: 0; background: transparent; border: 1.5px dashed var(--wf-line-soft);
  box-shadow: none; overflow: visible; }
.wf-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.wf-kpis .wf-kpi { border: 1.5px solid var(--wf-line-soft); border-radius: 8px; padding: 8px 10px; }
.wf-kpi-value { display: block; font-size: 28px; font-weight: 700; color: var(--wf-ink-faint); line-height: 1.2; }
.wf-kpi-delta { display: block; font-size: 11px; color: var(--wf-ink-soft); }
.wf-spark { display: block; width: 100%; height: 22px; margin-top: 4px; }
.wf-spark path, .wf-linechart path { fill: none; stroke: var(--wf-ink-faint); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.wf-linechart { display: block; width: 100%; height: 130px; }
.wf-linechart .wf-axis { stroke: var(--wf-line); stroke-width: 2; }
.wf-linechart .wf-s1 { stroke-dasharray: 6 4; }
.wf-linechart .wf-s2 { stroke-dasharray: 2 4; }
.wf-legend { display: flex; gap: 12px; justify-content: flex-end; font-size: 11px; color: var(--wf-ink-soft); margin-bottom: 4px; }
.wf-swatch { display: inline-block; width: 14px; height: 0; border-top: 2px solid var(--wf-ink-faint); margin-right: 4px; vertical-align: middle; }
.wf-swatch.wf-s1 { border-top-style: dashed; } .wf-swatch.wf-s2 { border-top-style: dotted; }
.wf-pie-wrap { display: flex; align-items: center; gap: 16px; }
.wf-pie { width: 110px; height: 110px; transform: rotate(-90deg); }
.wf-pie circle { fill: none; stroke-width: 8; }
.wf-pie-a { stroke: var(--wf-wash); } .wf-pie-b { stroke: var(--wf-ink-faint); }
.wf-selects { display: flex; flex-wrap: wrap; gap: 10px; }
.wf-selects .wf-field { flex: 1 1 120px; margin: 0; }
.wf-select { display: flex; align-items: center; padding: 0 8px; font-size: 11px; color: var(--wf-ink-faint); }
.wf-select::after { content: '▾'; margin-left: auto; }
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

/** Styles of the preview overlay: hover card, highlight, progress bar, shimmer on the block in progress. */
export const PLAN_OVERLAY_CSS = `
.plan-ov-tip { position: fixed; z-index: 2147483646; width: 288px; box-sizing: border-box; border-radius: 12px;
  background: #fff; color: #1f2328; border: 1px solid rgba(15, 23, 42, .08);
  box-shadow: 0 12px 32px -8px rgba(15, 23, 42, .28), 0 2px 6px rgba(15, 23, 42, .08);
  font: 12px/1.45 -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif; overflow: hidden;
  animation: plan-ov-in .14s ease-out; }
@keyframes plan-ov-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.plan-ov-tip * { box-sizing: border-box; }
.plan-ov-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; padding: 10px 12px 8px; }
.plan-ov-kind { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center;
  background: #fff1ee; color: #ea4b30; font-size: 13px; }
.plan-ov-title { flex: 1 1 120px; min-width: 0; font-weight: 600; font-size: 13px; line-height: 1.3; }
.plan-ov-st { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 500; background: #f1f3f5; color: #57606a; }
.plan-ov-st::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.plan-ov-st.building { background: #fff4e5; color: #b25e00; }
.plan-ov-st.building::before { animation: plan-ov-pulse 1s ease-in-out infinite; }
.plan-ov-st.built { background: #e8f6ee; color: #1f7a45; }
@keyframes plan-ov-pulse { 50% { opacity: .25; } }
.plan-ov-sec { padding: 8px 12px; border-top: 1px solid #eef0f2; }
.plan-ov-label { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #8b949e; margin-bottom: 4px; }
.plan-ov-res { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.plan-ov-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; padding: 2px 8px; border-radius: 6px;
  background: #f6f8fa; border: 1px solid #e5e8eb; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plan-ov-new { font-size: 10.5px; font-weight: 600; color: #7c3aed; background: #f3edff; border-radius: 4px; padding: 1px 5px; }
.plan-ov-fields { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.plan-ov-field { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: #57606a; background: #f6f8fa; border-radius: 4px; padding: 1px 5px; }
.plan-ov-text { margin-top: 6px; color: #424a53; }
.plan-ov-empty { padding: 0 12px 10px; color: #8b949e; }
.plan-ov-foot { padding: 8px 12px; border-top: 1px solid #eef0f2; background: #fafbfc; }
.plan-ov-st.detailed { background: #f3edff; color: #6d28d9; }
.plan-ov-detail { width: 100%; padding: 6px 10px; border: 1px solid #f3c4bb; border-radius: 8px; background: #fff6f4;
  color: #c2361d; font: 600 12px system-ui, sans-serif; cursor: pointer; }
.plan-ov-detail:hover:not([disabled]) { background: #ffece8; }
.plan-ov-detail[disabled] { opacity: .6; cursor: default; }
.plan-ov-secondary { margin-top: 6px; border-color: #e5e8eb; background: #fff; color: #424a53; }
.plan-ov-secondary:hover:not([disabled]) { background: #f6f8fa; }
.plan-ov-tip.pinned { box-shadow: 0 0 0 2px #ff6d5a, 0 12px 32px -8px rgba(15, 23, 42, .28); }
.plan-ov-go { margin-left: auto; padding: 2px 8px; border: 1px solid #e5e8eb; border-radius: 6px; background: #fff;
  color: #ea4b30; font: 600 11px system-ui, sans-serif; cursor: pointer; }
.plan-ov-go:hover { background: #fff6f4; }
.plan-ov-foot a { color: #ea4b30; font-weight: 500; text-decoration: none; }
.plan-ov-foot a:hover { text-decoration: underline; }
.plan-ov-hl { position: fixed; z-index: 2147483645; pointer-events: none; border-radius: 10px;
  box-shadow: 0 0 0 2px #ff6d5a, 0 0 0 6px rgba(255, 109, 90, .16); background: rgba(255, 109, 90, .04);
  transition: all .12s ease-out; }
.plan-ov-tag { position: absolute; left: -2px; top: -22px; padding: 2px 8px; border-radius: 6px 6px 6px 0;
  background: #ff6d5a; color: #fff; font: 600 11px/16px system-ui, sans-serif; white-space: nowrap; }
.plan-ov-selecting [data-plan-id] { cursor: crosshair; }
.plan-ov-selected { outline: 2px solid #ff6d5a !important; outline-offset: 2px; }
.plan-ov-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483644; display: flex; align-items: center; gap: 10px;
  padding: 5px 12px; background: rgba(255,255,255,.94); border-bottom: 1px solid #e3e3e3; color: #333; font: 12px system-ui, sans-serif; }
.plan-ov-bar .track { flex: 0 0 140px; height: 5px; border-radius: 3px; background: #eee; overflow: hidden; }
.plan-ov-bar .fill { display: block; height: 100%; background: #ff6d5a; transition: width .4s; }
.plan-ov-bar.done .fill { background: #2e7d4f; }
.plan-ov-building { position: relative; overflow: hidden; }
.plan-ov-building::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 20%, rgba(255,109,90,.18) 50%, transparent 80%); background-size: 200% 100%;
  animation: plan-ov-shimmer 1.4s linear infinite; }
@keyframes plan-ov-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media (prefers-color-scheme: dark) {
  .plan-ov-tip { background: #232325; color: #e6e6e8; border-color: rgba(255, 255, 255, .1);
    box-shadow: 0 12px 32px -8px rgba(0, 0, 0, .6), 0 2px 6px rgba(0, 0, 0, .4); }
  .plan-ov-tip.pinned { box-shadow: 0 0 0 2px #ff6d5a, 0 12px 32px -8px rgba(0, 0, 0, .6); }
  .plan-ov-kind { background: rgba(255, 109, 90, .16); color: #ff8a78; }
  .plan-ov-st { background: #2f2f32; color: #a9adb3; }
  .plan-ov-st.building { background: rgba(255, 170, 60, .14); color: #ffb35c; }
  .plan-ov-st.built { background: rgba(60, 190, 110, .14); color: #6fd39a; }
  .plan-ov-st.detailed { background: rgba(150, 110, 255, .16); color: #b9a0ff; }
  .plan-ov-sec, .plan-ov-foot { border-top-color: #333336; }
  .plan-ov-foot { background: #1d1d1f; }
  .plan-ov-chip, .plan-ov-field { background: #2c2c2f; border-color: #3a3a3d; color: #d0d0d4; }
  .plan-ov-new { background: rgba(150, 110, 255, .16); color: #b9a0ff; }
  .plan-ov-text { color: #c4c6ca; }
  .plan-ov-detail { background: rgba(255, 109, 90, .12); border-color: rgba(255, 109, 90, .4); color: #ff8a78; }
  .plan-ov-detail:hover:not([disabled]) { background: rgba(255, 109, 90, .2); }
  .plan-ov-secondary, .plan-ov-go { background: #2c2c2f; border-color: #3a3a3d; color: #d0d0d4; }
  .plan-ov-secondary:hover:not([disabled]), .plan-ov-go:hover { background: #343437; }
  .plan-ov-go, .plan-ov-foot a { color: #ff8a78; }
  .plan-ov-bar { background: rgba(30, 30, 32, .94); border-bottom-color: #333336; color: #ddd; }
  .plan-ov-bar .track { background: #3a3a3d; }
}
`;

export interface PlanOverlayConfig {
	/** The plan itself, or a URL that serves it (e.g. `plan.json` in the app). */
	plan?: AppPlan;
	planUrl?: string;
	editorUrl?: string;
	projectId?: string;
	/**
	 * `true` draws a progress bar on the page. `parent` posts the progress to the
	 * parent page instead, which shows it in its own chrome.
	 */
	progress?: boolean | 'parent';
	/** Lets the parent page turn on block selection with `postMessage`. */
	selectable?: boolean;
}

/** `postMessage` source of the plan overlay. */
export const PLAN_OVERLAY_MESSAGE_SOURCE = 'n8n-app-plan';

/** Progress the overlay posts to the parent page when `progress` is `parent`. */
export interface PlanOverlayProgress {
	built: number;
	total: number;
	/** Label of the step in progress, or of the next step. */
	current?: string;
	/** The pages of the plan, and the one on screen. */
	pages?: Array<{ id: string; name: string; path?: string }>;
	page?: string;
}

/** Runs in the page. Self-contained: it is embedded with `toString()`. */
export function planOverlayMain(
	describe: typeof describePlanComponent,
	css: string,
	config: PlanOverlayConfig,
): void {
	const doc = document;
	const source = 'n8n-app-plan';
	const style = doc.createElement('style');
	style.textContent = css;
	doc.head.append(style);

	const kindIcons: Record<string, string> = {
		nav: '☰',
		kpi: '#',
		table: '▦',
		list: '≣',
		chart: '📈',
		detail: '▤',
		form: '✎',
		filter: '⏷',
		button: '⚡',
		text: '¶',
		shell: '▢',
	};
	let byId: Record<string, AppPlanComponent> = {};
	let screens: Record<string, { name: string; path?: string }> = {};
	// `opens` may name a part instead of a screen; it then means the screen of that part.
	let screenOfPart: Record<string, string> = {};
	let pinned = false;
	// The preview follows the build to the page of the announced part, until the user picks a page.
	let follow = true;
	let screenList: Array<{ id: string; name: string; path?: string }> = [];
	let switchTimer = 0;
	let order: string[] = [];
	// The step the builder announced. Without it, the next unbuilt step counts as current.
	let buildingId: string | null = null;
	let tip: HTMLElement | null = null;
	let ring: HTMLElement | null = null;
	let tipFor: Element | null = null;
	let hideTimer = 0;

	function el(tag: string, className?: string, text?: string): HTMLElement {
		const node = doc.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined) node.textContent = text;
		return node;
	}

	function index(plan: AppPlan) {
		byId = {};
		const all = [...(plan.nav ? [plan.nav] : []), ...plan.screens.flatMap((s) => s.components)];
		all.forEach((c) => (byId[c.id] = c));
		screens = {};
		plan.screens.forEach((sc) => (screens[sc.id] = { name: sc.name, path: sc.path }));
		screenList = plan.screens.map((sc) => ({ id: sc.id, name: sc.name, path: sc.path }));
		screenOfPart = {};
		plan.screens.forEach((sc) => sc.components.forEach((c) => (screenOfPart[c.id] = sc.id)));
		order = plan.buildOrder?.length ? plan.buildOrder : ['shell', ...all.map((c) => c.id)];
	}

	function isBuilt(id: string): boolean {
		if (id === 'shell') {
			const shell = doc.querySelector('[data-plan-id="shell"]');
			return !shell || !shell.classList.contains('wf-app');
		}
		const node = doc.querySelector(`[data-plan-id="${id}"]`);
		return !!node && !node.classList.contains('wf-block');
	}

	function currentId(): string | undefined {
		if (buildingId && !isBuilt(buildingId)) return buildingId;
		return config.progress ? order.find((id) => !isBuilt(id)) : undefined;
	}

	function screenFor(id: string): string | undefined {
		return screens[id] ? id : screenOfPart[id];
	}

	function pathPattern(path: string): RegExp {
		return new RegExp(`^${path.replace(/:[^/]+/g, '[^/]+').replace(/\/$/, '')}/?$`);
	}

	/** The page on screen: a visible wireframe section, or the page whose path matches the URL. */
	function currentPage(): string | undefined {
		const visible = doc.querySelector('[data-plan-screen]:not([hidden])');
		if (visible) return visible.getAttribute('data-plan-screen') ?? undefined;
		const here = window.location.pathname;
		return (
			screenList.find((sc) => sc.path && !sc.path.includes(':') && pathPattern(sc.path).test(here))
				?.id ??
			screenList.find((sc) => sc.path && pathPattern(sc.path).test(here))?.id ??
			screenList[0]?.id
		);
	}

	/** Shows a page: its wireframe section if there is one, or its path through the app router. */
	function goToPage(requested: string) {
		const id = screenFor(requested);
		if (!id || id === currentPage()) return;
		if (doc.querySelector(`[data-plan-screen="${id}"]`)) {
			showScreen(id);
		} else {
			const path = screens[id]?.path ?? '/';
			window.history.pushState({}, '', path.replace(/:[^/]+/g, 'sample'));
			window.dispatchEvent(new PopStateEvent('popstate'));
		}
		window.setTimeout(renderProgress, 60);
	}

	function hideTip() {
		pinned = false;
		window.clearTimeout(switchTimer);
		tip?.remove();
		ring?.remove();
		tip = null;
		ring = null;
		tipFor = null;
	}

	function section(label: string): HTMLElement {
		const sec = el('div', 'plan-ov-sec');
		sec.append(el('div', 'plan-ov-label', label));
		return sec;
	}

	function resourceRow(r: { kindLabel: string; name: string; isNew: boolean }): HTMLElement {
		const row = el('div', 'plan-ov-res');
		row.append(
			el(
				'span',
				'plan-ov-chip',
				`${r.kindLabel === 'data table' ? '▦' : r.kindLabel === 'agent' ? '✦' : '⚡'} ${r.name}`,
			),
		);
		if (r.isNew) row.append(el('span', 'plan-ov-new', 'NEW'));
		return row;
	}

	function showTip(target: Element, id: string) {
		if (tipFor === target) return;
		hideTip();
		const comp: AppPlanComponent = byId[id] ?? {
			id: 'shell',
			kind: 'text',
			label: 'Layout and theme',
		};
		const status = isBuilt(id) ? 'built' : currentId() === id ? 'building' : 'planned';
		const info = describe(
			{ ...comp, status },
			{ editorUrl: config.editorUrl, projectId: config.projectId },
		);

		tip = el('div', 'plan-ov-tip');
		const head = el('div', 'plan-ov-head');
		head.append(
			el('span', 'plan-ov-kind', kindIcons[id === 'shell' ? 'shell' : info.kind] ?? '▢'),
			el('span', 'plan-ov-title', info.title),
		);
		if (info.detailed && !isBuilt(id)) {
			head.append(
				el('span', 'plan-ov-st detailed', info.fidelity === 'high' ? 'High detail' : 'Mid detail'),
			);
		}
		// Once every part is built, the card only shows what the part is connected to.
		if (!order.every(isBuilt)) {
			head.append(
				el(
					'span',
					`plan-ov-st ${info.status}`,
					info.status === 'building' ? 'Building' : info.status === 'built' ? 'Built' : 'Planned',
				),
			);
		}
		tip.append(head);
		if (info.data) {
			const sec = section('Data');
			sec.append(resourceRow(info.data));
			if (info.data.fields.length) {
				const fields = el('div', 'plan-ov-fields');
				info.data.fields.forEach((f) => fields.append(el('span', 'plan-ov-field', f)));
				sec.append(fields);
			}
			if (info.data.shows) sec.append(el('div', 'plan-ov-text', info.data.shows));
			tip.append(sec);
		}
		if (info.action) {
			const sec = section('On click');
			sec.append(resourceRow(info.action), el('div', 'plan-ov-text', info.action.does));
			tip.append(sec);
		}
		if (comp.opens) {
			const targetId = screenFor(comp.opens);
			const target = targetId ? screens[targetId] : undefined;
			const sec = section('Opens page');
			const row = el('div', 'plan-ov-res');
			row.append(el('span', 'plan-ov-chip', `↗ ${target?.name ?? comp.opens}`));
			if (target?.path) row.append(el('span', 'plan-ov-field', target.path));
			if (targetId) {
				const go = el('button', 'plan-ov-go', 'Go to page →');
				go.setAttribute('type', 'button');
				go.addEventListener('click', () => {
					hideTip();
					showScreen(targetId);
				});
				row.append(go);
			}
			sec.append(row);
			tip.append(sec);
		}
		if (!info.data && !info.action && !comp.opens)
			tip.append(el('div', 'plan-ov-empty', 'Layout only. No data or workflow behind this part.'));
		if (config.selectable && id !== 'shell') {
			const foot = el('div', 'plan-ov-foot');
			// Each click goes one level deeper: sketch, then structure and content, then the finished look.
			const level = info.detailed ? 'high' : 'mid';
			const label = !info.detailed
				? '✨ Add detail'
				: info.fidelity === 'high'
					? '✨ Redo the detail'
					: '✨ Add colors and style';
			const button = el('button', 'plan-ov-detail', label);
			button.setAttribute('type', 'button');
			button.addEventListener('click', () => {
				window.parent.postMessage({ source, type: 'detail', planId: id, level }, '*');
				button.textContent = 'Asked the Assistant…';
				button.setAttribute('disabled', '');
			});
			foot.append(button);
			if (info.detailed) {
				const statesButton = el(
					'button',
					'plan-ov-detail plan-ov-secondary',
					info.states.length
						? `◐ Redo the states (${info.states.join(', ')})`
						: '◐ Add states: empty, loading, error',
				);
				statesButton.setAttribute('type', 'button');
				statesButton.addEventListener('click', () => {
					window.parent.postMessage({ source, type: 'detail', planId: id, level: 'states' }, '*');
					statesButton.textContent = 'Asked the Assistant…';
					statesButton.setAttribute('disabled', '');
				});
				foot.append(statesButton);
			}
			tip.append(foot);
		}
		if (info.link) {
			const foot = el('div', 'plan-ov-foot');
			const a = el('a', undefined, `${info.link.label} ↗`);
			a.setAttribute('href', info.link.href);
			a.setAttribute('target', '_blank');
			a.setAttribute('rel', 'noopener');
			foot.append(a);
			tip.append(foot);
		}
		tip.addEventListener('mouseenter', () => {
			window.clearTimeout(hideTimer);
			window.clearTimeout(switchTimer);
		});
		tip.addEventListener('mouseleave', () => {
			if (!pinned) hideTimer = window.setTimeout(hideTip, 400);
		});

		const r = target.getBoundingClientRect();
		ring = el('div', 'plan-ov-hl');
		ring.style.cssText = `left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px;`;
		ring.append(el('span', 'plan-ov-tag', info.title));
		doc.body.append(ring, tip);
		const below = r.bottom + 10;
		const top =
			below + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 30 : below;
		tip.style.top = `${Math.max(6, top)}px`;
		tip.style.left = `${Math.min(Math.max(6, r.left), window.innerWidth - tip.offsetWidth - 6)}px`;
		tipFor = target;
	}

	// Hover intent: an open card waits a moment before it switches to another part, so the
	// pointer can cross other parts on its way to the card. A click pins the card.
	doc.addEventListener('mouseover', (event) => {
		const target = event.target instanceof Element ? event.target : null;
		if (!target || pinned) return;
		if (tip?.contains(target)) {
			window.clearTimeout(switchTimer);
			window.clearTimeout(hideTimer);
			return;
		}
		const node = target.closest('[data-plan-id]');
		const id = node?.getAttribute('data-plan-id');
		window.clearTimeout(switchTimer);
		if (node && id && byId[id]) {
			window.clearTimeout(hideTimer);
			if (!tip) showTip(node, id);
			else if (tipFor !== node) switchTimer = window.setTimeout(() => showTip(node, id), 400);
		} else if (tip) {
			window.clearTimeout(hideTimer);
			hideTimer = window.setTimeout(hideTip, 400);
		}
	});
	// No mouseover fires once the pointer leaves the frame, so hide the card here.
	doc.documentElement.addEventListener('mouseleave', () => {
		window.clearTimeout(switchTimer);
		if (tip && !pinned) hideTimer = window.setTimeout(hideTip, 400);
	});
	doc.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') hideTip();
	});
	window.addEventListener('scroll', hideTip, true);

	// Screen switching in the wireframe: nav links, the page strip, back links and parts that open a page.
	// A built nav or list brings its own routing.
	function showScreen(requested: string) {
		const id = screenFor(requested);
		if (!id) return;
		doc.querySelectorAll('[data-plan-screen]').forEach((s) => {
			(s as HTMLElement).hidden = s.getAttribute('data-plan-screen') !== id;
		});
		doc.querySelectorAll('[data-plan-screen-link]').forEach((l) => {
			l.classList.toggle('active', l.getAttribute('data-plan-screen-link') === id);
		});
		window.scrollTo(0, 0);
	}
	doc.addEventListener('click', (event) => {
		if (selecting || !(event.target instanceof Element)) return;
		const link = event.target.closest('[data-plan-screen-link]');
		if (
			link &&
			(link.closest('.wf-block') || link.closest('.wf-pages') || link.classList.contains('wf-back'))
		) {
			showScreen(link.getAttribute('data-plan-screen-link') ?? '');
			return;
		}
		if (tip?.contains(event.target)) return;
		const node = event.target.closest('[data-plan-id]');
		const id = node?.getAttribute('data-plan-id');
		if (node && id && byId[id]) {
			showTip(node, id);
			pinned = true;
			tip?.classList.add('pinned');
		} else {
			hideTip();
		}
	});

	let selecting = false;
	window.addEventListener('message', (event) => {
		if (event.source !== window.parent) return;
		const data: unknown = event.data;
		if (typeof data !== 'object' || data === null || !('source' in data) || data.source !== source)
			return;
		const type = 'type' in data ? data.type : undefined;
		if (type === 'building') {
			const id = 'planId' in data && typeof data.planId === 'string' ? data.planId : null;
			if (id !== buildingId) follow = true;
			buildingId = id;
			const page = id && id !== 'shell' ? screenFor(id) : undefined;
			if (follow && page) goToPage(page);
			renderProgress();
		} else if (type === 'page') {
			follow = false;
			if ('pageId' in data && typeof data.pageId === 'string') goToPage(data.pageId);
		} else if (config.selectable && (type === 'select:enable' || type === 'select:disable')) {
			selecting = type === 'select:enable';
			doc.documentElement.classList.toggle('plan-ov-selecting', selecting);
		} else if (config.selectable && type === 'select:clear') {
			doc
				.querySelectorAll('.plan-ov-selected')
				.forEach((n) => n.classList.remove('plan-ov-selected'));
		}
	});
	if (config.selectable) {
		doc.addEventListener(
			'click',
			(event) => {
				if (!selecting) return;
				const node =
					event.target instanceof Element ? event.target.closest('[data-plan-id]') : null;
				const id = node?.getAttribute('data-plan-id');
				if (!node || !id) return;
				event.preventDefault();
				event.stopPropagation();
				node.classList.add('plan-ov-selected');
				selecting = false;
				doc.documentElement.classList.remove('plan-ov-selecting');
				window.parent.postMessage({ source, type: 'selected', planId: id }, '*');
			},
			true,
		);
	}

	let bar: HTMLElement | null = null;
	function renderProgress() {
		if (!order.length) return;
		const built = order.filter(isBuilt).length;
		const current = currentId();
		const name = (id: string) => (id === 'shell' ? 'Layout and theme' : (byId[id]?.label ?? id));
		doc
			.querySelectorAll('.plan-ov-building')
			.forEach((n) => n.classList.remove('plan-ov-building'));
		if (current && current !== 'shell') {
			doc.querySelector(`[data-plan-id="${current}"]`)?.classList.add('plan-ov-building');
		}
		if (config.progress === 'parent') {
			window.parent.postMessage(
				{
					source,
					type: 'progress',
					built,
					total: order.length,
					...(current ? { current: name(current) } : {}),
					...(screenList.length > 1 ? { pages: screenList, page: currentPage() } : {}),
				},
				'*',
			);
			return;
		}
		if (!config.progress) return;
		if (!bar) {
			bar = el('div', 'plan-ov-bar');
			doc.body.append(bar);
			doc.body.style.paddingTop = '28px';
		}
		bar.className = `plan-ov-bar${current ? '' : ' done'}`;
		bar.innerHTML = '';
		const track = el('span', 'track');
		const fill = el('span', 'fill');
		fill.style.width = `${Math.round((built / order.length) * 100)}%`;
		track.append(fill);
		bar.append(
			track,
			el(
				'span',
				undefined,
				current
					? `${built} of ${order.length} built · Building: ${name(current)}`
					: `All ${order.length} parts built`,
			),
		);
	}

	function start(plan: AppPlan) {
		index(plan);
		renderProgress();
		// The app may render after this script runs, so recount when the DOM changes.
		let pending = 0;
		new MutationObserver(() => {
			window.clearTimeout(pending);
			pending = window.setTimeout(renderProgress, 30);
		}).observe(doc.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class', 'hidden'],
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
	options: Pick<WireframeRenderOptions, 'theme'> = {},
): string {
	return [
		'<!doctype html><html><head><meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		`<link rel="stylesheet" href="${WIREFRAME_FONT_URL}">`,
		`<style>html,body{margin:0}${WIREFRAME_CSS}</style>`,
		'</head><body>',
		plan.screens.length > 1
			? `<nav class="wf-pages"><b>Pages</b>${plan.screens
					.map(
						(screen, i) =>
							`<span class="wf-page${i === 0 ? ' active' : ''}" data-plan-screen-link="${screen.id}">${escapeHtml(screen.name)}${screen.path ? `<code>${escapeHtml(screen.path)}</code>` : ''}</span>`,
					)
					.join('')}</nav>`
			: '',
		renderWireframeBody(plan, options),
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
