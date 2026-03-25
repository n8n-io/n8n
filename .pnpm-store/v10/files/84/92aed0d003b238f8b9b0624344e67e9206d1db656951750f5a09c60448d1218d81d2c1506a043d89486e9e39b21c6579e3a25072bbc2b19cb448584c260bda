import { __export } from "../../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/jira.ts
var jira_exports = {};
__export(jira_exports, {
	JiraDocumentConverter: () => JiraDocumentConverter,
	JiraProjectLoader: () => JiraProjectLoader,
	adfToText: () => adfToText,
	formatJiraDescriptionAsJSON: () => formatJiraDescriptionAsJSON,
	formatJiraDescriptionAsText: () => formatJiraDescriptionAsText
});
function adfToText(adf) {
	if (!adf || !adf.content) return "";
	const recur = (node) => {
		if (node.text) return node.text;
		if (node.content) return node.content.map(recur).join("");
		return "";
	};
	return recur(adf).trim();
}
const formatJiraDescriptionAsJSON = (adfContent) => {
	if (!adfContent) return null;
	const traverseNode = (node) => {
		if (typeof node === "string") return {
			type: "text",
			text: node
		};
		const result = { type: node.type || "unknown" };
		if (node.text) result.text = node.text;
		if (node.attrs) result.attrs = node.attrs;
		if (node.content) result.content = node.content.map(traverseNode);
		return result;
	};
	return traverseNode(adfContent);
};
const formatJiraDescriptionAsText = (adfContent) => {
	if (!adfContent) return "";
	const traverseNode = (node) => {
		if (node.text) return node.text;
		if (node.content) return node.content.map(traverseNode).join("");
		return "";
	};
	return traverseNode(adfContent).trim();
};
/**
* Class responsible for converting Jira issues to Document objects
*/
var JiraDocumentConverter = class {
	host;
	projectKey;
	formatter;
	constructor({ host, projectKey, formatter }) {
		this.host = host;
		this.projectKey = projectKey;
		this.formatter = formatter ?? formatJiraDescriptionAsText;
	}
	convertToDocuments(issues) {
		return issues.map((issue) => this.documentFromIssue(issue));
	}
	documentFromIssue(issue) {
		return new Document({
			pageContent: this.formatIssueInfo({
				issue,
				host: this.host
			}),
			metadata: {
				id: issue.id,
				host: this.host,
				projectKey: this.projectKey,
				created: issue.fields.created
			}
		});
	}
	formatIssueInfo({ issue, host }) {
		let text = `Issue: ${this.formatMainIssueInfoText({
			issue,
			host
		})}\n`;
		text += `Project: ${issue.fields.project.name} (${issue.fields.project.key}, ID ${issue.fields.project.id})\n`;
		text += `Status: ${issue.fields.status.name}\n`;
		text += `Priority: ${issue.fields.priority.name}\n`;
		text += `Type: ${issue.fields.issuetype.name}\n`;
		text += `Creator: ${issue.fields.creator?.displayName}\n`;
		if (issue.fields.labels && issue.fields.labels.length > 0) text += `Labels: ${issue.fields.labels.join(", ")}\n`;
		text += `Created: ${issue.fields.created}\n`;
		text += `Updated: ${issue.fields.updated}\n`;
		if (issue.fields.reporter) text += `Reporter: ${issue.fields.reporter.displayName}\n`;
		text += `Assignee: ${issue.fields.assignee?.displayName ?? "Unassigned"}\n`;
		if (issue.fields.duedate) text += `Due Date: ${issue.fields.duedate}\n`;
		if (issue.fields.timeestimate) text += `Time Estimate: ${issue.fields.timeestimate}\n`;
		if (issue.fields.timespent) text += `Time Spent: ${issue.fields.timespent}\n`;
		if (issue.fields.resolutiondate) text += `Resolution Date: ${issue.fields.resolutiondate}\n`;
		if (issue.fields.description) {
			const formattedDescription = this.formatter(issue.fields.description, issue);
			const descText = typeof formattedDescription === "string" ? formattedDescription : JSON.stringify(formattedDescription, null, 2);
			text += `Description: ${descText}\n`;
		}
		if (issue.fields.progress?.percent) text += `Progress: ${issue.fields.progress.percent}%\n`;
		if (issue.fields.parent) text += `Parent Issue: ${this.formatMainIssueInfoText({
			issue: issue.fields.parent,
			host
		})}\n`;
		if (issue.fields.subtasks?.length > 0) {
			text += `Subtasks:\n`;
			issue.fields.subtasks.forEach((subtask) => {
				text += `  - ${this.formatMainIssueInfoText({
					issue: subtask,
					host
				})}\n`;
			});
		}
		if (issue.fields.issuelinks?.length > 0) {
			text += `Issue Links:\n`;
			issue.fields.issuelinks.forEach((link) => {
				text += `  - ${link.type.name}\n`;
				if (link.inwardIssue) text += `    - ${this.formatMainIssueInfoText({
					issue: link.inwardIssue,
					host
				})}\n`;
				if (link.outwardIssue) text += `    - ${this.formatMainIssueInfoText({
					issue: link.outwardIssue,
					host
				})}\n`;
			});
		}
		return text;
	}
	getLinkToIssue({ issueKey, host }) {
		return `${host}/browse/${issueKey}`;
	}
	formatMainIssueInfoText({ issue, host }) {
		const link = this.getLinkToIssue({
			issueKey: issue.key,
			host
		});
		const text = `${issue.key} (ID ${issue.id}) - ${issue.fields.summary} (${link})`;
		return text;
	}
};
/**
* Class representing a document loader for loading pages from Confluence.
*/
var JiraProjectLoader = class extends BaseDocumentLoader {
	accessToken;
	host;
	projectKey;
	username;
	limitPerRequest;
	createdAfter;
	filterFn;
	documentConverter;
	personalAccessToken;
	constructor({ host, projectKey, username, accessToken, limitPerRequest = 100, createdAfter, personalAccessToken, filterFn, descriptionFormatter: formatter }) {
		super();
		this.host = host;
		this.projectKey = projectKey;
		this.username = username;
		this.accessToken = accessToken;
		this.limitPerRequest = limitPerRequest;
		this.createdAfter = createdAfter;
		this.documentConverter = new JiraDocumentConverter({
			host,
			projectKey,
			formatter
		});
		this.personalAccessToken = personalAccessToken;
		this.filterFn = filterFn;
	}
	buildAuthorizationHeader() {
		if (this.personalAccessToken) return `Bearer ${this.personalAccessToken}`;
		return `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString("base64")}`;
	}
	async load() {
		try {
			const allJiraIssues = await this.loadAsIssues();
			const filtered = allJiraIssues.filter((issue) => {
				if (this.filterFn) return this.filterFn(issue);
				return true;
			});
			return this.documentConverter.convertToDocuments(filtered);
		} catch (error) {
			console.error("Error:", error);
			return [];
		}
	}
	async loadAsIssues() {
		const allIssues = [];
		for await (const issues of this.fetchIssues()) allIssues.push(...issues);
		return allIssues;
	}
	toJiraDateString(date) {
		if (!date) return void 0;
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const dayOfMonth = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${dayOfMonth}`;
	}
	async *fetchIssues() {
		const authorizationHeader = this.buildAuthorizationHeader();
		const url = `${this.host}/rest/api/3/search/jql`;
		const createdAfterAsString = this.toJiraDateString(this.createdAfter);
		let nextPageToken;
		while (true) {
			const jqlParts = [`project = ${this.projectKey}`, ...createdAfterAsString ? [`created >= "${createdAfterAsString}"`] : []];
			const params = new URLSearchParams({
				jql: `${jqlParts.join(" AND ")} ORDER BY created ASC, key ASC`,
				maxResults: `${this.limitPerRequest}`,
				fields: "*all"
			});
			if (nextPageToken) params.set("nextPageToken", nextPageToken);
			const response = await fetch(`${url}?${params}`, { headers: {
				Authorization: authorizationHeader,
				Accept: "application/json"
			} });
			const data = await response.json();
			if (data.issues?.length) yield data.issues;
			if (data.isLast === true) break;
			if (!data.nextPageToken) throw new Error("Expected nextPageToken but none returned");
			nextPageToken = data.nextPageToken;
		}
	}
};

//#endregion
export { JiraDocumentConverter, JiraProjectLoader, adfToText, formatJiraDescriptionAsJSON, formatJiraDescriptionAsText, jira_exports };
//# sourceMappingURL=jira.js.map