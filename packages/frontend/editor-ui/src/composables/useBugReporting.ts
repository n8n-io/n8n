import { useDebugInfo } from '@/composables/useDebugInfo';

const BASE_FORUM_URL = 'https://github.com/n8n-io/n8n/issues/new?labels=bug-report';

const REPORT_TEMPLATE = `
<!-- Please follow the template below. Skip the questions that are not relevant to you. -->

## Describe the problem/error/question


## What is the error message (if any)?


## Please share your workflow/screenshots/recording

\`\`\`
(Select the nodes on your canvas and use the keyboard shortcuts CMD+C/CTRL+C and CMD+V/CTRL+V to copy and paste the workflow.)
⚠️ WARNING ⚠️ If you have sensitive data in your workflow (like API keys), please remove it before sharing.
\`\`\`


## Share the output returned by the last node
<!-- If you need help with data transformations, please also share your expected output. -->

`;

export function useBugReporting() {
	const debugInfo = useDebugInfo();

	const getReportingURL = () => {
		const url = new URL(BASE_FORUM_URL);

		const report = `${REPORT_TEMPLATE}\n${debugInfo.generateDebugInfo({ skipSensitive: true, secondaryHeader: true })}}`;
		url.searchParams.append('body', report);

		return url.toString();
	};

	return {
		getReportingURL,
	};
}
