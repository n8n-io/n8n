import { useDebugInfo } from '@/composables/useDebugInfo';

const BASE_FORUM_URL = 'https://github.com/n8n-io/n8n/issues/new?labels=bug-report';

const REPORT_TEMPLATE = `
<!-- Please follow the template below. -->
<!-- Please do not use this for general support, feature requests or questions -->

## Bug Description
<!-- Describe the bug in as much detail as possible. -->


## To Reproduce
<!-- Steps to reproduce the behavior. If possible, provide a link to a workflow that can be imported into n8n. -->

\`\`\`
(Select the nodes on your canvas and use the keyboard shortcuts CMD+C/CTRL+C and CMD+V/CTRL+V to copy and paste the workflow.)
⚠️ WARNING ⚠️ If you have sensitive data in your workflow (like API keys), please remove it before sharing.
\`\`\`

## Expected Behavior
<!-- A clear and concise description of what you expected to happen. -->
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
