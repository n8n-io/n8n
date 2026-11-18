import type {
	AgentCatalogModel,
	AgentDto,
	AgentJsonConfig,
	CreateTaskBoardCommentDto,
	CreateTaskBoardFromTemplateDto,
	CreateTaskBoardTaskDto,
	TaskBoardAssigneeInput,
	TaskBoardSummary,
	UpdateTaskBoardTaskDto,
} from '@n8n/api-types';

export type CreateTaskBoardPayload = Pick<CreateTaskBoardFromTemplateDto, 'templateKey' | 'name'>;
export type CreateTaskPayload = Pick<
	CreateTaskBoardTaskDto,
	'title' | 'description' | 'columnId' | 'assignee'
>;
export type UpdateTaskPayload = Pick<
	UpdateTaskBoardTaskDto,
	'title' | 'description' | 'columnId' | 'assignee'
>;
export type CreateCommentPayload = Pick<CreateTaskBoardCommentDto, 'body'>;

/** The address of one board. Every board request needs both ids. */
export type TaskBoardRef = {
	projectId: string;
	boardId: string;
};

/** The address of one task. */
export type TaskRef = TaskBoardRef & {
	taskId: string;
};

/** A board card, with the name of its project for the overview page. */
export type TaskBoardListItem = TaskBoardSummary & {
	projectName: string | null;
};

/** What `pickBoardToOpen` reads to choose a board. */
export type BoardToOpenOptions = {
	projectId: string | undefined;
	lastBoardId: string | null;
};

/** One agent the assignee picker offers. */
export type TaskBoardAgentOption = {
	id: string;
	name: string;
};

/** One person the assignee picker offers. `role` is the project role slug. */
export type TaskBoardPersonOption = {
	id: string;
	name: string;
	role: string;
};

/** The assignee picker value: an encoded assignee, or `UNASSIGNED_VALUE`. */
export type AssigneeValue = string;

export type AssigneeChange = TaskBoardAssigneeInput | null;

/** The fields of one agent that the Team section reads. */
export type TaskBoardAgentDetail = Pick<
	AgentDto,
	'id' | 'name' | 'isArchived' | 'versionId' | 'activeVersionId' | 'config' | 'configHash'
>;

/** Body of `POST /projects/:projectId/agents/v2`. Without `config` the server picks a default model. */
export type CreateAgentPayload = {
	name: string;
	config?: AgentJsonConfig;
};

/** Body of `PUT /projects/:projectId/agents/v2/:agentId/config`. */
export type UpdateAgentConfigPayload = {
	config: AgentJsonConfig;
	baseConfigHash: string | null;
};

/** One provider of the static model catalog of the agents module. */
export type AgentModelCatalogProvider = {
	id: string;
	name: string;
	models: Record<string, AgentCatalogModel>;
};

/** Response of `GET /projects/:projectId/agents/v2/catalog/models`, keyed by provider. */
export type AgentModelCatalog = Record<string, AgentModelCatalogProvider>;

/** One credential of `GET /credentials/for-workflow`. */
export type TaskBoardCredentialOption = {
	id: string;
	name: string;
	type: string;
};

/** Which skills to list: a project's skills, the instance skills, or what an agent can attach. */
export type SkillListScope =
	| { projectId: string }
	| { scope: 'instance' }
	| { attachableTo: string };

/** A model and the credential that pays for it. */
export type AgentModelChoice = {
	model: string;
	credential: string;
};

/** The values of the add and edit agent form. `model` is null for "default model". */
export type AgentFormValues = {
	name: string;
	description: string;
	instructions: string;
	model: AgentModelChoice | null;
	skillIds: string[];
};

/** One agent row of the Team section. */
export type TeamAgent = {
	id: string;
	name: string;
	description: string;
	/** The `provider/model` id, or null when the agent has no model yet. */
	model: string | null;
	skillCount: number;
	isPublished: boolean;
	/** Why the last publish from this page failed. */
	publishError: string | null;
};
