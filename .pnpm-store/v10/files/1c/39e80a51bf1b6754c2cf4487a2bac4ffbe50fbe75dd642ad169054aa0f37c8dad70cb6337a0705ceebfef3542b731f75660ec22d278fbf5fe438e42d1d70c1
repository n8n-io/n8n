import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/jira.d.ts
type JiraStatusCategory = {
  self: string;
  id: number;
  key: string;
  colorName: string;
  name: string;
};
type JiraStatus = {
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  id: string;
  statusCategory: JiraStatusCategory;
};
type JiraUser = {
  accountId: string;
  accountType: string;
  active: boolean;
  avatarUrls: {
    "16x16": string;
    "24x24": string;
    "32x32": string;
    "48x48": string;
  };
  displayName: string;
  emailAddress: string;
  self: string;
  timeZone: string;
};
type JiraIssueType = {
  avatarId: number;
  description: string;
  entityId: string;
  hierarchyLevel: number;
  iconUrl: string;
  id: string;
  name: string;
  self: string;
  subtask: boolean;
};
type JiraPriority = {
  iconUrl: string;
  id: string;
  name: string;
  self: string;
};
type JiraProgress = {
  progress: number;
  total: number;
  percent?: number;
};
type JiraProject = {
  avatarUrls: {
    "16x16": string;
    "24x24": string;
    "32x32": string;
    "48x48": string;
  };
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  self: string;
  simplified: boolean;
};
type JiraSubTask = {
  id: string;
  key: string;
  self: string;
  fields: {
    issuetype: JiraIssueType;
    priority: JiraPriority;
    status: JiraStatus;
    summary: string;
  };
};
type JiraIssueLinkType = {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self: string;
};
type JiraBriefIssue = {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: JiraStatus;
    priority: JiraPriority;
    issuetype: JiraIssueType;
  };
};
type JiraIssueLink = {
  id: string;
  self: string;
  type: JiraIssueLinkType;
  inwardIssue?: JiraBriefIssue;
  outwardIssue?: JiraBriefIssue;
};
type JiraIssue = {
  expand: string;
  id: string;
  self: string;
  key: string;
  fields: {
    assignee?: JiraUser;
    created: string;
    description: ADFNode;
    issuelinks: JiraIssueLink[];
    issuetype: JiraIssueType;
    labels?: string[];
    priority: JiraPriority;
    progress: JiraProgress;
    project: JiraProject;
    reporter?: JiraUser;
    creator: JiraUser;
    resolutiondate?: string;
    status: JiraStatus;
    subtasks: JiraSubTask[];
    summary: string;
    timeestimate?: number;
    timespent?: number;
    updated: string;
    duedate?: string;
    parent?: JiraBriefIssue;
  };
};
type JiraDescriptionFormatter = (content: ADFNode | null | undefined, issue?: JiraIssue) => string | ADFNode | null;
type JiraAPIResponse = {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
};
interface ADFNode {
  type: string;
  text?: string;
  content?: ADFNode[];
  attrs?: Record<string, unknown>;
}
interface ADFDocument extends ADFNode {
  type: "doc";
  version: number;
  content: ADFNode[];
}
declare function adfToText(adf: ADFNode | null | undefined): string;
declare const formatJiraDescriptionAsJSON: JiraDescriptionFormatter;
declare const formatJiraDescriptionAsText: JiraDescriptionFormatter;
/**
 * Interface representing the parameters for configuring the
 * JiraDocumentConverter.
 */
interface JiraDocumentConverterParams {
  host: string;
  projectKey: string;
  formatter?: JiraDescriptionFormatter;
}
/**
 * Class responsible for converting Jira issues to Document objects
 */
declare class JiraDocumentConverter {
  readonly host: string;
  readonly projectKey: string;
  private readonly formatter;
  constructor({
    host,
    projectKey,
    formatter
  }: JiraDocumentConverterParams);
  convertToDocuments(issues: JiraIssue[]): Document[];
  private documentFromIssue;
  private formatIssueInfo;
  private getLinkToIssue;
  private formatMainIssueInfoText;
}
/**
 * Interface representing the parameters for configuring the
 * JiraProjectLoader.
 */
interface JiraProjectLoaderParams {
  host: string;
  projectKey: string;
  username?: string;
  accessToken?: string;
  personalAccessToken?: string;
  limitPerRequest?: number;
  createdAfter?: Date;
  filterFn?: (issue: JiraIssue) => boolean;
  descriptionFormatter?: JiraDescriptionFormatter;
}
/**
 * Class representing a document loader for loading pages from Confluence.
 */
declare class JiraProjectLoader extends BaseDocumentLoader {
  private readonly accessToken?;
  readonly host: string;
  readonly projectKey: string;
  readonly username?: string;
  readonly limitPerRequest: number;
  private readonly createdAfter?;
  private readonly filterFn?;
  private readonly documentConverter;
  private readonly personalAccessToken?;
  constructor({
    host,
    projectKey,
    username,
    accessToken,
    limitPerRequest,
    createdAfter,
    personalAccessToken,
    filterFn,
    descriptionFormatter: formatter
  }: JiraProjectLoaderParams);
  private buildAuthorizationHeader;
  load(): Promise<Document[]>;
  loadAsIssues(): Promise<JiraIssue[]>;
  protected toJiraDateString(date: Date | undefined): string | undefined;
  protected fetchIssues(): AsyncIterable<JiraIssue[]>;
}
//#endregion
export { ADFDocument, ADFNode, JiraAPIResponse, JiraBriefIssue, JiraDescriptionFormatter, JiraDocumentConverter, JiraDocumentConverterParams, JiraIssue, JiraIssueLink, JiraIssueLinkType, JiraIssueType, JiraPriority, JiraProgress, JiraProject, JiraProjectLoader, JiraProjectLoaderParams, JiraStatus, JiraStatusCategory, JiraSubTask, JiraUser, adfToText, formatJiraDescriptionAsJSON, formatJiraDescriptionAsText };
//# sourceMappingURL=jira.d.ts.map