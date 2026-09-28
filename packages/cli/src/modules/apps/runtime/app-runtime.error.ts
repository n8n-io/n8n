import { UserError } from 'n8n-workflow';

type AppRuntimeErrorCode =
	| 'app_not_found'
	| 'binding_not_found'
	| 'workflow_not_found'
	| 'workflow_not_published'
	| 'workflow_incompatible'
	| 'workflow_not_callable'
	| 'table_not_found'
	| 'agent_not_found'
	| 'agent_not_published'
	| 'run_in_progress'
	| 'permission_denied'
	| 'invalid_input'
	| 'forbidden_origin'
	| 'payload_too_large'
	| 'too_many_requests';

/** One rejected input field: where and which check failed, nothing about the expected shape. */
interface AppRuntimeInputIssue {
	path: string[];
	code: string;
}

/** A refused runtime API call; the browser gets `{ code, message, issues? }` with `status`. */
export class AppRuntimeError extends UserError {
	constructor(
		readonly status: number,
		readonly code: AppRuntimeErrorCode,
		message: string,
		readonly issues?: AppRuntimeInputIssue[],
	) {
		super(message);
	}
}
