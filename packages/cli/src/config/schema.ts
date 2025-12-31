import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export const schema = {
	executions: {
		mode: {
			doc: 'If it should run executions directly or via queue',
			format: ['regular', 'queue'] as const,
			default: 'regular',
			env: 'EXECUTIONS_MODE',
		},

		// A Workflow times out and gets canceled after this time (seconds).
		// If the workflow is executed in the main process a soft timeout
		// is executed (takes effect after the current node finishes).
		// If a workflow is running in its own process is a soft timeout
		// tried first, before killing the process after waiting for an
		// additional fifth of the given timeout duration.
		//
		// To deactivate timeout set it to -1
		//
		// Timeout is currently not activated by default which will change
		// in a future version.
		timeout: {
			doc: 'Max run time (seconds) before stopping the workflow execution',
			format: Number,
			default: -1,
			env: 'EXECUTIONS_TIMEOUT',
		},
		maxTimeout: {
			doc: 'Max execution time (seconds) that can be set for a workflow individually',
			format: Number,
			default: 3600,
			env: 'EXECUTIONS_TIMEOUT_MAX',
		},

		// If a workflow executes all the data gets saved by default. This
		// could be a problem when a workflow gets executed a lot and processes
		// a lot of data. To not exceed the database's capacity it is possible to
		// prune the database regularly or to not save the execution at all.
		// Depending on if the execution did succeed or error a different
		// save behaviour can be set.
		saveDataOnError: {
			doc: 'What workflow execution data to save on error',
			format: ['all', 'none'] as const,
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_ERROR',
		},
		saveDataOnSuccess: {
			doc: 'What workflow execution data to save on success',
			format: ['all', 'none'] as const,
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_SUCCESS',
		},
		saveExecutionProgress: {
			doc: 'Whether or not to save progress for each node executed',
			format: Boolean,
			default: false,
			env: 'EXECUTIONS_DATA_SAVE_ON_PROGRESS',
		},

		// If the executions of workflows which got started via the editor
		// should be saved. By default they will not be saved as this runs
		// are normally only for testing and debugging. This setting can
		// also be overwritten on a per workflow basis in the workflow settings
		// in the editor.
		saveDataManualExecutions: {
			doc: 'Save data of executions when started manually via editor',
			format: Boolean,
			default: true,
			env: 'EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS',
		},
	},

	userManagement: {
		/**
		 * @important Do not remove until after cloud hooks are updated to stop using convict config.
		 */
		isInstanceOwnerSetUp: {
			// n8n loads this setting from DB on startup
			doc: "Whether the instance owner's account has been set up",
			format: Boolean,
			default: false,
		},

		authenticationMethod: {
			doc: 'How to authenticate users (e.g. "email", "ldap", "saml")',
			format: ['email', 'ldap', 'saml'] as const,
			default: 'email',
		},
	},

	/**
	 * @important Do not remove until after cloud hooks are updated to stop using convict config.
	 */
	endpoints: {
		rest: {
			format: String,
			default: Container.get(GlobalConfig).endpoints.rest,
		},
	},

	/**
	 * @important Do not remove until after cloud hooks are updated to stop using convict config.
	 */
	ai: {
		enabled: {
			format: Boolean,
			default: Container.get(GlobalConfig).ai.enabled,
		},
	},
};
