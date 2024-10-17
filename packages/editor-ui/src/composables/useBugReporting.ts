/**
 * Report bugs to Forum
 */

import { useDebugInfo } from './useDebugInfo';

const BASE_FORUM_URL =
	'https://community.n8n.io/new-topic?utm_source=n8n_app&category=questions&tags=bug-report';

const REPORT_TEMPLATE = `
> Hey! The fastest way to find solutions is by using the 🔎 search function at the upper right.
> If your question hasn't been asked before, please follow the template below. Skip the questions that are not relevant to you.

## Describe the problem/error/question

## What is the error message (if any)?

## Please share your workflow/screenshots/recording

\`\`\`
(Select the nodes on your canvas and use the keyboard shortcuts CMD+C/CTRL+C and CMD+V/CTRL+V to copy and paste the workflow.)
\`\`\`


## Share the output returned by the last node
> If you need help with data transformations, please also share your expected output.
`;

export function useBugReporting() {
	const debugInfo = useDebugInfo();

	const getReportingURL = (config: { medium: string }) => {
		const url = new URL(BASE_FORUM_URL);

		url.searchParams.append('utm_medium', config.medium);

		const report = `${REPORT_TEMPLATE}\n${debugInfo.generateDebugInfo({ skipSensitive: true, secondaryHeader: true })}}`;
		url.searchParams.append('body', report);

		return url.toString();
	};

	return {
		getReportingURL,
	};
}
