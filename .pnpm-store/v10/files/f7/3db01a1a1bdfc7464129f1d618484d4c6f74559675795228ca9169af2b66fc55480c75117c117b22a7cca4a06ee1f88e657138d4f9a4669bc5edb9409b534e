const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/web/taskade.ts
var taskade_exports = {};
require_rolldown_runtime.__export(taskade_exports, { TaskadeProjectLoader: () => TaskadeProjectLoader });
/**
* Class representing a document loader for loading Taskade project. It
* extends the BaseDocumentLoader and implements the TaskadeLoaderParams
* interface. The constructor takes a config object as a parameter, which
* contains the personal access token and project ID.
* @example
* ```typescript
* const loader = new TaskadeProjectLoader({
*   personalAccessToken: "TASKADE_PERSONAL_ACCESS_TOKEN",
*   projectId: "projectId",
* });
* const docs = await loader.load();
* ```
*/
var TaskadeProjectLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	personalAccessToken;
	projectId;
	headers = {};
	constructor({ personalAccessToken = (0, __langchain_core_utils_env.getEnvironmentVariable)("TASKADE_PERSONAL_ACCESS_TOKEN"), projectId }) {
		super();
		this.personalAccessToken = personalAccessToken;
		this.projectId = projectId;
		if (this.personalAccessToken) this.headers = { Authorization: `Bearer ${this.personalAccessToken}` };
	}
	/**
	* Fetches the Taskade project using the Taskade API and returns it as a
	* TaskadeProject object.
	* @returns A Promise that resolves to a TaskadeProject object.
	*/
	async getTaskadeProject() {
		const tasks = [];
		let after = null;
		let hasMoreTasks = true;
		while (hasMoreTasks) {
			const queryParamsString = new URLSearchParams({
				limit: "100",
				...after == null ? {} : { after }
			}).toString();
			const url = `https://www.taskade.com/api/v1/projects/${this.projectId}/tasks?${queryParamsString}`;
			const response = await fetch(url, { headers: this.headers });
			const data = await response.json();
			if (!response.ok) throw new Error(`Unable to get Taskade project: ${response.status} ${JSON.stringify(data)}`);
			if (!data) throw new Error("Unable to get Taskade project");
			if (data.items.length === 0) hasMoreTasks = false;
			else after = data.items[data.items.length - 1].id;
			tasks.push(...data.items);
		}
		return { tasks };
	}
	/**
	* Fetches the Taskade project using the Taskade API, creates a Document instance
	* with the JSON representation of the file as the page content and the
	* API URL as the metadata, and returns it.
	* @returns A Promise that resolves to an array of Document instances.
	*/
	async load() {
		const data = await this.getTaskadeProject();
		const metadata = { projectId: this.projectId };
		const text = data.tasks.map((t) => t.text).join("\n");
		return [new __langchain_core_documents.Document({
			pageContent: text,
			metadata
		})];
	}
};

//#endregion
exports.TaskadeProjectLoader = TaskadeProjectLoader;
Object.defineProperty(exports, 'taskade_exports', {
  enumerable: true,
  get: function () {
    return taskade_exports;
  }
});
//# sourceMappingURL=taskade.cjs.map