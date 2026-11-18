import { Config, Env } from '@n8n/config';

@Config
export class WorkflowTestsConfig {
	/** Absolute path to the installed `@n8n/test` package directory. n8n uses it to run workflow tests. Workflow test runs fail when it's unset. */
	@Env('N8N_WORKFLOW_TESTS_PACKAGE_DIR')
	packageDir: string = '';
}
