import { customTemplate } from './declarative/custom/template';
import { githubIssuesTemplate } from './declarative/github-issues/template';
import { exampleTemplate } from './programmatic/example/template';

export const templates = {
	declarative: { githubIssues: githubIssuesTemplate, custom: customTemplate },
	programmatic: { example: exampleTemplate },
};
