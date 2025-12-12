'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ALL_ROLE_MAPS =
	exports.WORKFLOW_SHARING_SCOPE_MAP =
	exports.CREDENTIALS_SHARING_SCOPE_MAP =
	exports.PROJECT_SCOPE_MAP =
	exports.GLOBAL_SCOPE_MAP =
		void 0;
const credential_sharing_scopes_ee_1 = require('./scopes/credential-sharing-scopes.ee');
const global_scopes_ee_1 = require('./scopes/global-scopes.ee');
const project_scopes_ee_1 = require('./scopes/project-scopes.ee');
const workflow_sharing_scopes_ee_1 = require('./scopes/workflow-sharing-scopes.ee');
exports.GLOBAL_SCOPE_MAP = {
	'global:owner': global_scopes_ee_1.GLOBAL_OWNER_SCOPES,
	'global:admin': global_scopes_ee_1.GLOBAL_ADMIN_SCOPES,
	'global:member': global_scopes_ee_1.GLOBAL_MEMBER_SCOPES,
};
exports.PROJECT_SCOPE_MAP = {
	'project:admin': project_scopes_ee_1.REGULAR_PROJECT_ADMIN_SCOPES,
	'project:personalOwner': project_scopes_ee_1.PERSONAL_PROJECT_OWNER_SCOPES,
	'project:editor': project_scopes_ee_1.PROJECT_EDITOR_SCOPES,
	'project:viewer': project_scopes_ee_1.PROJECT_VIEWER_SCOPES,
};
exports.CREDENTIALS_SHARING_SCOPE_MAP = {
	'credential:owner': credential_sharing_scopes_ee_1.CREDENTIALS_SHARING_OWNER_SCOPES,
	'credential:user': credential_sharing_scopes_ee_1.CREDENTIALS_SHARING_USER_SCOPES,
};
exports.WORKFLOW_SHARING_SCOPE_MAP = {
	'workflow:owner': workflow_sharing_scopes_ee_1.WORKFLOW_SHARING_OWNER_SCOPES,
	'workflow:editor': workflow_sharing_scopes_ee_1.WORKFLOW_SHARING_EDITOR_SCOPES,
};
exports.ALL_ROLE_MAPS = {
	global: exports.GLOBAL_SCOPE_MAP,
	project: exports.PROJECT_SCOPE_MAP,
	credential: exports.CREDENTIALS_SHARING_SCOPE_MAP,
	workflow: exports.WORKFLOW_SHARING_SCOPE_MAP,
};
//# sourceMappingURL=role-maps.ee.js.map
