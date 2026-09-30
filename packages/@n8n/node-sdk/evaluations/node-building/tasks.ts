import acmeTasks from './tasks/acme-tasks.json';
import githubIssues from './tasks/github-issues.json';
import ledger from './tasks/ledger.json';
import searchly from './tasks/searchly.json';

export type Format = 'old' | 'new';

export const FORMATS: readonly Format[] = ['old', 'new'];

/** Checks on the requests the mock logged for one case. */
export interface RequestExpectation {
	readonly method: string;
	readonly path: string;
	/** Query parameters every served request has. */
	readonly query?: Readonly<Record<string, string>>;
	readonly absentQuery?: readonly string[];
	/** The JSON body every served request has. */
	readonly body?: unknown;
	readonly count?: number;
	readonly pagination?: string;
	/** No page after the one that reached this many items. */
	readonly limit?: number;
	/** The first request gets 429; the next one waits for `Retry-After`. */
	readonly retryAfter429?: boolean;
}

export interface CaseSpec {
	readonly id: string;
	/** `<resource>.<operation>`. */
	readonly operation: string;
	readonly input: Readonly<Record<string, unknown>>;
	readonly expect: {
		readonly items?: readonly unknown[];
		readonly error?: boolean;
		/** Expected items from `gh api --paginate <path>`, compared on `fields`. */
		readonly github?: {
			readonly path: string;
			readonly limit?: number;
			readonly fields: readonly string[];
		};
		readonly requests?: RequestExpectation;
	};
}

export interface TaskSpec {
	readonly id: string;
	readonly node: string;
	readonly credential: {
		readonly name: string;
		readonly properties: readonly string[];
		/** Values with `{{secret}}` (a fresh key per case) or `{{githubToken}}`. */
		readonly data: Readonly<Record<string, string>>;
		readonly secretPrefix?: string;
	};
	readonly prompt: readonly string[];
	readonly cases: readonly CaseSpec[];
}

export const TASKS: readonly TaskSpec[] = [acmeTasks, ledger, searchly, githubIssues];

const FORMAT_PARAGRAPH: Record<Format, readonly string[]> = {
	old: [
		'Format: use the n8n community node format. The project in the current directory was created with `n8n-node new`; read AGENTS.md.',
		'Write a programmatic or a declarative node, and replace the example node.',
		'An operation `<resource>.<operation>` means the node parameters `resource` and `operation` (for example `{{example}}` is `resource` = `{{resource}}`, `operation` = `{{operationName}}`).',
		'Every field is a top-level node parameter with exactly the given name.',
		'Register the node and the credential in `package.json` under `n8n`. `npx n8n-node build` and `npx n8n-node lint` must pass.',
	],
	new: [
		'Format: use @n8n/node-sdk, see AGENTS.md. The project in the current directory was created with `n8n-node-next new`.',
		'`src/index.ts` exports `node`, `actions`, and `credentials`.',
		'An operation `<resource>.<operation>` means the action ID `<node name>.<resource>.<operation>` (for example `{{node}}.{{example}}`).',
		'Every field is an action input field with exactly the given name.',
		'Test actions with `runAction` from `@n8n/node-sdk/testing`. `npx n8n-node-next check` and `npx tsc --noEmit` must pass.',
	],
};

/** The task prompt; only the format paragraph differs between formats. */
export function promptOf(task: TaskSpec, format: Format): string {
	const example = task.cases[0]?.operation ?? '';
	const [resource = '', operationName = ''] = example.split('.');
	const values: Record<string, string> = { example, resource, operationName, node: task.node };
	const paragraph = FORMAT_PARAGRAPH[format]
		.join('\n')
		.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
	return task.prompt.join('\n').replace('{{format}}', paragraph);
}

export function taskById(id: string): TaskSpec {
	const task = TASKS.find((candidate) => candidate.id === id);
	if (!task) throw new Error(`Unknown task ${id}. Tasks: ${TASKS.map(({ id }) => id).join(', ')}`);
	return task;
}
