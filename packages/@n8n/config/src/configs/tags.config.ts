import { Config, Env } from '../decorators';

@Config
export class TagsConfig {
	/** When true, workflow tags are disabled (no tagging UI or filtering by tag). */
	@Env('N8N_WORKFLOW_TAGS_DISABLED')
	disabled: boolean = false;
}
