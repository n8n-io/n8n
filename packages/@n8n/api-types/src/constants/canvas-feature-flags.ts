/**
 * Rollout flag for the flexible canvas groups: triggers inside a group, plus
 * groups with several entry and exit nodes. The canvas and the workflow save
 * path both check the group rules, so both read this flag once the rules relax.
 * `N8N_WORKFLOWS_FLEXIBLE_GROUPS_ENABLED` force-enables it for a whole instance.
 */
export const FLEXIBLE_GROUPS_CANVAS_FLAG = '117_flexible_groups_canvas';
