// Explicit tool names from the Linear MCP tools/list. Exact match only.
export const LINEAR_READ_TOOLS: ReadonlySet<string> = new Set([
	'extract_images', 'get_agent_skill', 'get_attachment', 'get_diff', 'get_diff_threads',
	'get_document', 'get_initiative', 'get_issue', 'get_issue_status', 'get_milestone',
	'get_notifications', 'get_project', 'get_release', 'get_release_note', 'get_status_updates',
	'get_team', 'get_template', 'get_triage_responsibility', 'get_user', 'get_workspace',
	'list_agent_skills', 'list_comments', 'list_custom_views', 'list_customer_needs',
	'list_customers', 'list_cycles', 'list_diffs', 'list_documents', 'list_initiative_labels',
	'list_initiatives', 'list_issue_labels', 'list_issue_statuses', 'list_issues',
	'list_milestones', 'list_project_labels', 'list_projects', 'list_release_notes',
	'list_release_pipelines', 'list_releases', 'list_teams', 'list_templates', 'list_users',
	'search_documentation', 'whoami',
]);

export const LINEAR_WRITE_TOOLS: ReadonlySet<string> = new Set([
	'create_attachment', 'create_attachment_from_upload', 'create_initiative_label',
	'create_issue_label', 'delete_attachment', 'delete_comment', 'delete_customer',
	'delete_customer_need', 'delete_diff_comment', 'delete_status_update', 'mark_notification',
	'merge_diff', 'prepare_attachment_upload', 'prepare_file_upload', 'resolve_diff_thread',
	'restore_initiative_label', 'restore_issue_label', 'restore_project_label',
	'retire_initiative_label', 'retire_issue_label', 'retire_project_label', 'save_comment',
	'save_customer', 'save_customer_need', 'save_diff_comment', 'save_document', 'save_initiative',
	'save_initiative_label', 'save_issue', 'save_issue_label', 'save_milestone', 'save_project',
	'save_project_label', 'save_release', 'save_release_note', 'save_status_update', 'share_issue',
	'submit_diff_review', 'unshare_issue', 'update_diff',
]);
