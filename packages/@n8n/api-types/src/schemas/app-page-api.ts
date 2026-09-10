/**
 * Ambient TypeScript declarations for the code an App page's `code` block may
 * contain. One text, three consumers: the editor's type checker loads it as a
 * virtual `.d.ts`, the AI Assistant reads it through `apps(action="code-api")`,
 * and the server implements it.
 *
 * Kept as a string so the package can ship it without a copy step; a test
 * compiles it to prove it is valid TypeScript.
 */
export const APP_PAGE_API_FILE_NAME = 'app-page-api.d.ts';

export const appPageApiTypes = `// Ambient types for App page code blocks.
// A code block is TSX: JSX compiles to h()/Fragment (classic runtime) and renders to HTML.
export {};

declare global {
	/** HTML produced by JSX or raw(); inserted into the page without escaping. */
	interface Html {
		readonly __html: string;
		toString(): string;
	}
	/**
	 * What render() and JSX children may be. A string returned from render() is raw HTML;
	 * a string inside JSX is escaped. Numbers become text; booleans, null and undefined
	 * render nothing; arrays render each entry in order.
	 */
	type Renderable = Html | string | number | boolean | null | undefined | readonly Renderable[];
	type JsxProps = Record<string, unknown> & { children?: Renderable };
	/** JSX factory. Escapes text children and attribute values; drops unsafe URL attributes. */
	function h(
		tag: string | ((props: JsxProps) => Renderable),
		props: JsxProps | null,
		...children: Renderable[]
	): Html;
	/** <>...</> renders its children with no wrapping element. */
	const Fragment: (props: { children?: Renderable }) => Html;
	/** Trusted HTML you already escaped or produced yourself; JSX inserts it as-is. */
	function raw(html: string): Html;
	namespace JSX {
		type Element = Html;
		interface IntrinsicElements {
			[tag: string]: Record<string, unknown>;
		}
		interface ElementChildrenAttribute {
			children: {};
		}
	}

	/** One row of a data table. System columns are \`id\`, \`createdAt\`, \`updatedAt\`. */
	type DataTableValue = string | number | boolean | Date | null;
	type DataTableRow = Record<string, DataTableValue>;
	type DataTableRowResult = DataTableRow & { id: number; createdAt: Date; updatedAt: Date };
	type DataTableColumn = {
		id: string;
		name: string;
		type: 'string' | 'number' | 'boolean' | 'date';
		index: number;
	};
	type DataTableFilter = {
		type: 'and' | 'or';
		filters: Array<{
			columnName: string;
			condition: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
			value: DataTableValue;
		}>;
	};

	/** A data table of this App's project. */
	interface DataTableHandle {
		readonly id: string;
		readonly name: string;
		getColumns(): Promise<DataTableColumn[]>;
		getManyRowsAndCount(options?: {
			filter?: DataTableFilter;
			sortBy?: [string, 'ASC' | 'DESC'];
			take?: number;
			skip?: number;
		}): Promise<{ count: number; data: DataTableRowResult[] }>;
		insertRows(rows: DataTableRow[]): Promise<DataTableRowResult[]>;
		updateRows(options: { filter: DataTableFilter; data: DataTableRow }): Promise<DataTableRowResult[]>;
		upsertRow(options: { filter: DataTableFilter; data: DataTableRow }): Promise<DataTableRowResult[]>;
		deleteRows(options: { filter: DataTableFilter }): Promise<DataTableRowResult[]>;
	}

	interface DataTablesApi {
		/** All data tables of this App's project. */
		list(): Promise<Array<{ id: string; name: string }>>;
		/** By id or exact name. Throws when the table is not in this App's project. */
		get(idOrName: string): Promise<DataTableHandle>;
	}

	type WorkflowSummary = {
		id: string;
		name: string;
		published: boolean;
		triggerType: 'executeWorkflow' | 'form' | 'other';
	};
	type FormField = {
		fieldLabel: string;
		fieldName?: string;
		fieldType?: string;
		requiredField?: boolean;
		placeholder?: string;
		defaultValue?: string;
		fieldOptions?: { values: Array<{ option: string }> };
		multiselect?: boolean;
	};
	type WorkflowRunResult =
		| { status: 'success'; executionId: string; data: unknown }
		| { status: 'error'; executionId?: string; error: string };

	interface WorkflowsApi {
		/** Workflows of this App's project. */
		list(): Promise<WorkflowSummary[]>;
		/** Runs the published version of a workflow that starts with an Execute Workflow Trigger. */
		execute(workflowId: string, input?: Record<string, unknown>): Promise<WorkflowRunResult>;
		/** Fields of the Form Trigger of a published workflow; an empty list when it has none. */
		getForm(workflowId: string): Promise<{ title: string; description?: string; fields: FormField[] }>;
		/** Submits form data to a published workflow that starts with a Form Trigger. */
		submitForm(workflowId: string, fields: Record<string, unknown>): Promise<WorkflowRunResult>;
	}

	interface CredentialsApi {
		/**
		 * Decrypted data of a credential of this App's project, by name.
		 * Stays on the server: never put it into the HTML you return.
		 */
		get(name: string): Promise<Record<string, unknown>>;
	}

	/** One entry of the App's page tree, as a menu shows it. */
	type MenuItem = { title: string; path: string; current: boolean; children: MenuItem[] };

	interface PageContext {
		readonly app: { id: string; name: string; namespace: string; projectId: string };
		readonly page: { id: string; route: string; path: string };
		/** Values captured by \`:param\` segments of the URL. */
		readonly params: Readonly<Record<string, string>>;
		readonly query: Readonly<Record<string, string>>;
		/** Signed-in n8n user viewing the page, or null on a public visit. */
		readonly viewer: { id: string; email: string } | null;
		/** The page tree with absolute paths, the current page marked; pages behind an unresolved \`:param\` are left out. Render your own menu from it. */
		readonly menu: readonly MenuItem[];
		readonly dataTables: DataTablesApi;
		readonly workflows: WorkflowsApi;
		readonly credentials: CredentialsApi;
		/**
		 * URL an HTML form or fetch can POST to, to run one of this block's \`actions\`. The served
		 * page's script adds the Authorization header to forms and fetches inside the app; a plain
		 * form post without that script is not authenticated.
		 */
		actionUrl(name: string): string;
		/** Server-side HTTP. Private and loopback addresses are blocked. 10 s timeout, 5 MB response cap. */
		fetch(
			url: string,
			init?: { method?: string; headers?: Record<string, string>; body?: string },
		): Promise<{
			status: number;
			headers: Record<string, string>;
			text(): Promise<string>;
			json(): Promise<unknown>;
		}>;
		log(...args: unknown[]): void;
	}

	interface ActionContext extends PageContext {
		/** Form body or JSON body of the POST. Strings when it came from an HTML form. */
		readonly input: Readonly<Record<string, unknown>>;
	}

	type ActionResult =
		/** Path within this App to redirect to; the default is back to the page. */
		| { redirect: string }
		/** Returned as 200 JSON, for fetch() callers. */
		| { data: unknown }
		/** Returned as 400 JSON; shown to the visitor when the request came from a form. */
		| { error: string };

	/** What a code block's module exports. */
	interface CodeBlockModule {
		render(ctx: PageContext): Promise<Renderable> | Renderable;
		actions?: Record<string, (ctx: ActionContext) => Promise<ActionResult> | ActionResult>;
	}
}
`;
