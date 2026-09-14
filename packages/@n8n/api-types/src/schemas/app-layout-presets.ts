import type { AppLayout } from './app-content.schema';
import type { AppTheme } from './app.schema';

export const APP_LAYOUT_PRESET_IDS = ['top-nav', 'sidebar', 'landing', 'minimal'] as const;

export type AppLayoutPresetId = (typeof APP_LAYOUT_PRESET_IDS)[number];

/** A ready-made layout plus theme an author or the AI starts an App from. */
export type AppLayoutPreset = {
	id: AppLayoutPresetId;
	name: string;
	description: string;
	blocks: AppLayout;
	theme: AppTheme;
};

// The code blocks are TSX for the isolate (`h`/`Fragment` ambient, `ctx.menu`
// items `{ title, path, current, children }`) and use only the `.app-*`
// vocabulary of rendering/styles/app.css, so they need no custom CSS.
const LOGO = '<a class="app-logo" href={\'/apps/\' + ctx.app.namespace}>{ctx.app.name}</a>';

const FLAT_NAV = `<nav class="app-nav">
        <ul>
          {ctx.menu.map((item) => (
            <li>
              <a href={item.path} aria-current={item.current ? 'page' : undefined}>{item.title}</a>
            </li>
          ))}
        </ul>
      </nav>`;

const TOP_NAV_HEADER = `export function render(ctx: PageContext) {
  return (
    <header class="app-header">
      <div class="app-container">
        ${LOGO}
        ${FLAT_NAV}
      </div>
    </header>
  );
}
`;

const LOGO_HEADER = `export function render(ctx: PageContext) {
  return (
    <header class="app-header">
      <div class="app-container">
        ${LOGO}
      </div>
    </header>
  );
}
`;

const SIDEBAR_NAV = `const List = (props: { items: readonly MenuItem[] }) => (
  <ul>
    {props.items.map((item) => (
      <li>
        <a href={item.path} aria-current={item.current ? 'page' : undefined}>{item.title}</a>
        {item.children.length > 0 && <List items={item.children} />}
      </li>
    ))}
  </ul>
);

export function render(ctx: PageContext) {
  return (
    <aside class="app-sidebar">
      <nav class="app-nav">
        <List items={ctx.menu} />
      </nav>
    </aside>
  );
}
`;

const HERO_HEADER = `export function render(ctx: PageContext) {
  return (
    <section class="app-hero">
      <h1>{ctx.app.name}</h1>
      ${FLAT_NAV}
    </section>
  );
}
`;

const FOOTER = `export function render(ctx: PageContext) {
  return (
    <footer class="app-footer">
      <div class="app-container">© {new Date().getFullYear()} {ctx.app.name}</div>
    </footer>
  );
}
`;

const code = (id: string, source: string) => ({ id, type: 'code' as const, data: { source } });
const slot = { id: 'slot', type: 'slot' as const, data: {} };

export const APP_LAYOUT_PRESETS: readonly AppLayoutPreset[] = [
	{
		id: 'top-nav',
		name: 'Top navigation',
		description: 'A sticky header with the app name and the page menu, content below, a footer.',
		blocks: [code('header', TOP_NAV_HEADER), slot, code('footer', FOOTER)],
		theme: {
			colors: {
				primary: '#3b5bdb',
				background: '#f4f6fa',
				surface: '#ffffff',
				text: '#1f2937',
				muted: '#6b7280',
			},
			radius: 'md',
			contentWidth: '72rem',
		},
	},
	{
		id: 'sidebar',
		name: 'Sidebar',
		description: 'A header with the app name, the page menu in a left column, content beside it.',
		blocks: [code('header', LOGO_HEADER), code('nav', SIDEBAR_NAV), slot],
		theme: {
			colors: {
				primary: '#0f766e',
				background: '#f8fafc',
				surface: '#ffffff',
				text: '#0f172a',
				muted: '#64748b',
			},
			radius: 'sm',
			contentWidth: '80rem',
		},
	},
	{
		id: 'landing',
		name: 'Landing',
		description: 'A centered hero with the app name and the page menu, content below, a footer.',
		blocks: [code('header', HERO_HEADER), slot, code('footer', FOOTER)],
		theme: {
			colors: {
				primary: '#c2410c',
				background: '#fffaf5',
				surface: '#ffffff',
				text: '#292524',
				muted: '#78716c',
			},
			radius: 'lg',
			fontFamily: 'Georgia, "Times New Roman", serif',
			contentWidth: '64rem',
		},
	},
	{
		id: 'minimal',
		name: 'Minimal',
		description: 'Content only, centered in a narrow column. No menu.',
		blocks: [slot],
		theme: {
			colors: {
				primary: '#111827',
				background: '#ffffff',
				surface: '#ffffff',
				text: '#111827',
				muted: '#6b7280',
			},
			radius: 'none',
			contentWidth: '48rem',
		},
	},
];
