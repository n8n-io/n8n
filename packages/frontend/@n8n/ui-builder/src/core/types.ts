import type { INodeProperties, NodePropertyTypes } from 'n8n-workflow';
import type { Component } from 'vue';

/**
 * Where a component puts children. A component declares its regions; the
 * renderer feeds each one into the Vue slot of the same name, so a component
 * with several regions is a component with several drop points.
 *
 * The conventional single region is called `default`, which is also Vue's
 * default slot, so a component that just writes `<slot />` needs to know
 * nothing about any of this.
 */
export const DEFAULT_REGION = 'default';

export interface UiRegion {
	name: string;
	label: string;
	/**
	 * The icon the outline and inspector show this region with, when the
	 * component has more than one region and each therefore reads as a
	 * pseudo-component in its own right (see `useOutline`'s `flatten`) rather
	 * than as a plain heading above its children. Absent falls back to the
	 * component's own icon, if it has one, so the row still looks like a
	 * component rather than a bare heading.
	 *
	 * A component with only one region is never shown this way regardless of
	 * this field: selecting the node already means selecting its one slot, so a
	 * pseudo row under it would only repeat what the node row says.
	 */
	icon?: string;
}

/** A node's children, split by the region they sit in. */
export type UiTree = Record<string, UiNode[]>;

/**
 * Every node in a UI definition is this same record, all the way down. The
 * renderer maps `type` to a kit component, resolves `props`, and renders each
 * region of `tree` into the matching slot.
 *
 * Children stay inline in the node that owns them rather than in a flat table
 * keyed by region id. A subtree is therefore a document: it can be rendered,
 * moved or copied on its own, and nothing has to be looked up elsewhere.
 */
export interface UiNode {
	id: string;
	type: string;
	props: Record<string, unknown>;
	tree: UiTree;
}

/**
 * The older shape of an interaction prop: one webhook call and nothing else.
 * Still read, never written. `normaliseAction` turns it into a one-step chain.
 */
export interface UiAction {
	url: string;
	method?: UiHttpMethod;
}

/**
 * What a step can call a trigger with. Beyond GET and POST because an API
 * Router endpoint is free to be any of them, and only GET is special: it is the
 * one the browser refuses to give a body.
 */
export type UiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export const HTTP_METHODS: readonly UiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * What an interaction prop holds now: a list of steps run in order.
 *
 * Steps are inline rather than named entries in a registry, so the whole
 * definition stays one tree with nothing beside it, and the same list works for
 * any component's action prop.
 */
export type UiActionStep = UiWebhookStep | UiNotifyStep | UiNavigateStep | UiSetStep;

/**
 * Where a reply used to land, before a `set` step could read `$response`. Read
 * from documents that still hold it, never written: `normaliseAction` turns it
 * into the `set` steps it was always shorthand for.
 */
export type UiResponseBinding = string | Record<string, string>;

/**
 * Call a workflow. What it answers is not placed anywhere by the step itself —
 * it becomes `$response` for the rest of the chain, and a `set` step decides
 * what of it is worth keeping.
 */
export interface UiWebhookStep {
	kind: 'webhook';
	url: string;
	method?: UiHttpMethod;
	/**
	 * The request body, as an expression: `={{ $state.form }}`. Unset sends all
	 * of state; a GET sends none of it either way.
	 */
	request?: string;
	/**
	 * What this call's reply is called for the rest of the chain, as
	 * `$responses.<key>`. A chain that calls more than once needs it: `$response`
	 * alone only ever means the latest, and a `set` step may want either.
	 */
	key?: string;
}

/**
 * Write into state without asking a workflow: keep part of a reply, reset a
 * form, flip a flag.
 */
export interface UiSetStep {
	kind: 'set';
	path: string;
	/** Literal or expression, resolved when the step runs — `$response` included. */
	value?: unknown;
}

/** Show a message. The client's own, unlike the envelope's `toast`. */
export interface UiNotifyStep {
	kind: 'notify';
	/** Literal or expression, resolved when the step runs rather than when the chain starts. */
	message: string;
	type?: UiToast['type'];
}

/** Change the current page. Only means anything inside a frame. */
export interface UiNavigateStep {
	kind: 'navigate';
	/** A page path, or an expression producing one. */
	to: string;
}

/**
 * A chain, and the scope it was fired in. The scope travels with it because a
 * step's expressions are resolved as that step runs: a notify after a webhook
 * should see the state the webhook just merged, and a button inside a repeat
 * needs its own `$item`.
 */
export interface UiActionRequest {
	steps: UiActionStep[];
	scope: UiScope;
}

/** A transient message an action asked the app to show. */
export interface UiToast {
	type?: 'success' | 'error' | 'info';
	message: string;
}

/** Why an action failed, as reported by the workflow itself. */
export interface UiActionError {
	code?: string;
	message: string;
}

/** App state. Plain object; the runtime wraps it in `reactive`. */
export type UiState = Record<string, unknown>;

/** Which page is on screen. `pageId` is the node's, so the renderer need not match paths itself. */
export interface UiRoute {
	path: string;
	params: Record<string, string>;
	pageId?: string;
}

/** One entry of `$pages`: enough to build a navigation control out of components. */
export interface UiPageInfo {
	id: string;
	path: string;
	title: string;
}

/**
 * What an expression can see. `$state` is always there; `$loading`, `$route` and
 * `$pages` are written by the runtime; `$item` and `$index` are bound by an
 * enclosing repeat and absent everywhere else.
 */
export interface UiScope {
	$state: UiState;
	$loading?: Record<string, boolean>;
	$route?: UiRoute;
	$pages?: UiPageInfo[];
	$item?: unknown;
	$index?: number;
	/**
	 * What the chain's last webhook step answered, for the steps after it. Absent
	 * everywhere else: a prop rendering in the canvas has no chain behind it.
	 */
	$response?: unknown;
	/**
	 * Every reply the chain has had so far, by the key its call was given, so a
	 * chain that calls twice can put each answer somewhere different.
	 */
	$responses?: Record<string, unknown>;
}

/**
 * A kit entry. `props` are n8n node-property descriptors so the editor's
 * inspector can be n8n's own parameter inputs pointed at a component instead of
 * a node.
 *
 * Two descriptor types carry meaning for the runtime:
 *   - `action`    the value is a `UiAction`, fired rather than rendered
 *   - `statePath` the value is a dotted path the component writes into
 * Everything else is a value prop: literal, or an n8n expression to resolve.
 */
export interface UiComponentDef {
	type: string;
	label: string;
	component: Component;
	props: UiProperty[];
	/**
	 * An icon shown wherever the outline and inspector name this component,
	 * for the rare def whose type is worth telling apart from an ordinary one
	 * at a glance rather than only by its label.
	 */
	icon?: string;
	/**
	 * The drop points this component offers, in the order the editor should show
	 * them. Absent means the component takes no children at all.
	 */
	regions?: UiRegion[];
	/**
	 * Render the children once per element of this prop, with `$item` and
	 * `$index` bound. The component itself is rendered once, around the lot.
	 * Applies to every region the component has.
	 */
	repeatOver?: string;
	/**
	 * The children of this region are pages, of which exactly one renders: the
	 * one `$route` names. Every other region renders as usual, which is what
	 * keeps a header and a footer on screen while the content swaps.
	 */
	pagedRegion?: string;
	/** Palette section. Cosmetic grouping only. */
	group?: string;
	/**
	 * Pass the renderer's `edit` state in as an `editing` prop. Only components
	 * that decide whether to render at all need this: hiding a subtree in the
	 * canvas would make it unselectable.
	 */
	wantsEditFlag?: boolean;
	/**
	 * Pass a computed `busy` prop: true while a webhook in one of this node's own
	 * action props is in flight. Only components with a loading state of their
	 * own need it, and only they should have to know that `$loading` exists.
	 */
	wantsBusyFlag?: boolean;
	/**
	 * The prop that receives whatever is currently at this component's
	 * `statePath`. An input is one binding, not two: it renders what it writes,
	 * so the author names the place once and the renderer reads it back. A
	 * component whose displayed value could differ from the one it writes would
	 * fight its own typing — every keystroke reverted on the next render.
	 */
	bindsValueTo?: string;
}

export const ACTION_PROP_TYPE = 'action';
export const STATE_PATH_PROP_TYPE = 'statePath';
/** A page path, picked from the pages the document holds rather than typed. */
export const ROUTE_PROP_TYPE = 'route';

/** n8n's own kinds, plus the three this format adds. */
export type UiPropertyType =
	| NodePropertyTypes
	| typeof ACTION_PROP_TYPE
	| typeof STATE_PATH_PROP_TYPE
	| typeof ROUTE_PROP_TYPE;

export type UiProperty = Omit<INodeProperties, 'type'> & { type: UiPropertyType };
