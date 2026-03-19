import Audit from './commands/audit/index';
import ConfigSetApiKey from './commands/config/set-api-key';
import ConfigSetUrl from './commands/config/set-url';
import ConfigShow from './commands/config/show';
import CredentialCreate from './commands/credential/create';
import CredentialDelete from './commands/credential/delete';
import CredentialGet from './commands/credential/get';
import CredentialList from './commands/credential/list';
import CredentialSchema from './commands/credential/schema';
import CredentialTransfer from './commands/credential/transfer';
import DataTableAddRows from './commands/data-table/add-rows';
import DataTableCreate from './commands/data-table/create';
import DataTableDelete from './commands/data-table/delete';
import DataTableDeleteRows from './commands/data-table/delete-rows';
import DataTableGet from './commands/data-table/get';
import DataTableList from './commands/data-table/list';
import DataTableRows from './commands/data-table/rows';
import DataTableUpdateRows from './commands/data-table/update-rows';
import DataTableUpsertRows from './commands/data-table/upsert-rows';
import ExecutionDelete from './commands/execution/delete';
import ExecutionGet from './commands/execution/get';
import ExecutionList from './commands/execution/list';
import ExecutionRetry from './commands/execution/retry';
import ExecutionStop from './commands/execution/stop';
import Login from './commands/login';
import Logout from './commands/logout';
import ProjectAddMember from './commands/project/add-member';
import ProjectCreate from './commands/project/create';
import ProjectDelete from './commands/project/delete';
import ProjectGet from './commands/project/get';
import ProjectList from './commands/project/list';
import ProjectMembers from './commands/project/members';
import ProjectRemoveMember from './commands/project/remove-member';
import ProjectUpdate from './commands/project/update';
import SkillInstall from './commands/skill/install';
import SourceControlPull from './commands/source-control/pull';
import TagCreate from './commands/tag/create';
import TagDelete from './commands/tag/delete';
import TagList from './commands/tag/list';
import TagUpdate from './commands/tag/update';
import UserGet from './commands/user/get';
import UserList from './commands/user/list';
import VariableCreate from './commands/variable/create';
import VariableDelete from './commands/variable/delete';
import VariableList from './commands/variable/list';
import VariableUpdate from './commands/variable/update';
import WorkflowActivate from './commands/workflow/activate';
import WorkflowCreate from './commands/workflow/create';
import WorkflowDeactivate from './commands/workflow/deactivate';
import WorkflowDelete from './commands/workflow/delete';
import WorkflowGet from './commands/workflow/get';
import WorkflowList from './commands/workflow/list';
import WorkflowTags from './commands/workflow/tags';
import WorkflowTransfer from './commands/workflow/transfer';
import WorkflowUpdate from './commands/workflow/update';

export const commands = {
	login: Login,
	logout: Logout,

	'config:set-url': ConfigSetUrl,
	'config:set-api-key': ConfigSetApiKey,
	'config:show': ConfigShow,

	'workflow:list': WorkflowList,
	'workflow:get': WorkflowGet,
	'workflow:create': WorkflowCreate,
	'workflow:update': WorkflowUpdate,
	'workflow:delete': WorkflowDelete,
	'workflow:activate': WorkflowActivate,
	'workflow:deactivate': WorkflowDeactivate,
	'workflow:tags': WorkflowTags,
	'workflow:transfer': WorkflowTransfer,

	'execution:list': ExecutionList,
	'execution:get': ExecutionGet,
	'execution:retry': ExecutionRetry,
	'execution:stop': ExecutionStop,
	'execution:delete': ExecutionDelete,

	'credential:list': CredentialList,
	'credential:get': CredentialGet,
	'credential:schema': CredentialSchema,
	'credential:create': CredentialCreate,
	'credential:delete': CredentialDelete,
	'credential:transfer': CredentialTransfer,

	'tag:list': TagList,
	'tag:create': TagCreate,
	'tag:update': TagUpdate,
	'tag:delete': TagDelete,

	'project:list': ProjectList,
	'project:get': ProjectGet,
	'project:create': ProjectCreate,
	'project:update': ProjectUpdate,
	'project:delete': ProjectDelete,
	'project:members': ProjectMembers,
	'project:add-member': ProjectAddMember,
	'project:remove-member': ProjectRemoveMember,

	'variable:list': VariableList,
	'variable:create': VariableCreate,
	'variable:update': VariableUpdate,
	'variable:delete': VariableDelete,

	'data-table:list': DataTableList,
	'data-table:get': DataTableGet,
	'data-table:create': DataTableCreate,
	'data-table:delete': DataTableDelete,
	'data-table:rows': DataTableRows,
	'data-table:add-rows': DataTableAddRows,
	'data-table:update-rows': DataTableUpdateRows,
	'data-table:upsert-rows': DataTableUpsertRows,
	'data-table:delete-rows': DataTableDeleteRows,

	'user:list': UserList,
	'user:get': UserGet,

	'skill:install': SkillInstall,

	'source-control:pull': SourceControlPull,

	audit: Audit,
};
