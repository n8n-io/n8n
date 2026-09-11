# App components (`app/components`)

An App has one shared **components module**: TSX source stored on the App
(`App.components`, `update-app` with `components`). Every code block of the
App imports from it:

```tsx
import { Card, Badge } from 'app/components';
```

Use it for the pieces that repeat across pages: cards, badges, empty states,
section headers, table cells. Keep page-specific markup in the page's code
block.

## Contract

- The module is compiled like a code block (TSX, JSX to `h`/`Fragment`) and
  evaluated once per render in the same isolate as the block.
- **Exports only.** Export functions (and constants). A component is a function
  that receives `{ ...props, children }` and returns JSX. Anything you do not
  export is invisible to the blocks.
- **No imports.** The module cannot import anything, not even `app/components`
  itself. `ctx` is not available; components receive data as props.
- `app/components` is the only importable name. Any other `import` in a code
  block fails with `blocked: only app/components can be imported`.
- Types: the same globals as a code block (`Renderable`, `Html`, `h`, `raw`).
  Type the `children` prop as `Renderable`.
- Size limit: 50,000 characters.

## Escaping

The same rules as JSX in a code block: text children and attribute values are
escaped, nested JSX (`Html`) is inserted as-is, `raw(html)` marks trusted HTML.
A component that receives a string prop and renders `{props.title}` is safe by
default. Never build HTML with string concatenation inside a component; return
JSX.

## Errors

- Components that do not compile: every code block of the page renders empty
  and the render error is reported under the key `components` (Layout panel,
  Preview callout, `preview-page`). Fix the module, not the blocks.
- `publish` refuses an App whose components do not compile (400,
  `This app's components do not compile; fix them before publishing: <reason>`).
- A block that imports `app/components` when the App has none fails with
  `This app has no components yet`.

## Example

`update-app` `components`:

```tsx
export function Card(props: { title: string; children?: Renderable }) {
	return (
		<section class="app-card">
			<h2>{props.title}</h2>
			{props.children}
		</section>
	);
}

export function Badge(props: { tone?: 'ok' | 'warn'; children?: Renderable }) {
	return <span class={'app-badge app-badge--' + (props.tone ?? 'ok')}>{props.children}</span>;
}
```

A page code block:

```tsx
import { Card, Badge } from 'app/components';

export async function render(ctx: PageContext) {
	const orders = await ctx.dataTables.get('orders');
	const { data } = await orders.getManyRowsAndCount({ take: 5 });
	return (
		<Card title="Latest orders">
			<ul>
				{data.map((row) => (
					<li>
						{row.customer} <Badge tone={row.paid ? 'ok' : 'warn'}>{row.paid ? 'paid' : 'open'}</Badge>
					</li>
				))}
			</ul>
		</Card>
	);
}
```

## Workflow

1. Write or update the module with `update-app` (`components`).
2. Import from `app/components` in the code blocks that need it.
3. Check the render with `preview-page`; a `components` error means the module
   itself failed.
