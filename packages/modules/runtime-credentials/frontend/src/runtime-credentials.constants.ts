export const RUNTIME_CREDENTIALS_MODULE_ID = 'runtime-credentials';

export const RUNTIME_INPUTS_SETTINGS_VIEW = 'RuntimeInputsSettingsView';
export const RUNTIME_INPUTS_PROJECT_VIEW = 'RuntimeInputsProjectView';

/** Credential resolvers have `order: 30`. This puts the page right after them. */
export const RUNTIME_INPUTS_SETTINGS_ORDER = 35;

/** The icon of the "Provided at run time" badge, so the sidebar and the badge match. */
export const RUNTIME_INPUTS_SETTINGS_ICON = 'arrow-down-to-line';

export const RUNTIME_INPUTS_MANAGE_SCOPE = 'securitySettings:manage';
/** Project admins manage the request-fed credential type policy with this scope. */
export const RUNTIME_INPUTS_PROJECT_SCOPE = 'credentialTypePolicy:manageRequestFed';
