/**
 * Display modes the shell renders itself. A module cannot register a display
 * mode with one of these ids. `html` stays here until it moves into a module.
 */
export const BUILT_IN_DISPLAY_MODES = ['table', 'json', 'binary', 'schema', 'html', 'ai'] as const;
