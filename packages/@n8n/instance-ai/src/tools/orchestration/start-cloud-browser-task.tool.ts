/**
 * start-cloud-browser-task — starts a browser task that runs in the background in a cloud browser.
 *
 * The host owns the task: its browser session, the sub-agent that drives it, and its billing.
 * When the task ends, the host sends its result to the orchestrator in a follow-up message. This
 * tool is a thin wrapper: it validates the input and calls the host.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

/** The browser only opens websites. Zod still runs this check after a failed `.url()`. */
function isWebUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}

export const cloudBrowserTaskInputSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1)
		.max(60)
		.describe('A short name for the task, 2 to 5 words, for example "Compare plan prices".'),
	goal: z
		.string()
		.trim()
		.min(1)
		.describe(
			'What to do in the browser, with every detail the browser agent needs: the site, the data ' +
				'to find or enter, and what to report back. The browser agent cannot see this conversation. ' +
				'If the user wants results as seen from a specific country, name the country.',
		),
	startUrl: z
		.string()
		.url()
		.refine(isWebUrl, 'The start URL must use http or https.')
		.optional()
		.describe('The page to open first. Leave it out when you do not know the URL.'),
	credentialsToCreate: z
		.array(
			z.object({
				type: z
					.string()
					.trim()
					.min(1)
					.describe(
						'The n8n credential type, for example "httpBasicAuth". Find it with workflow_builder_credentials(action="search-types").',
					),
				name: z
					.string()
					.trim()
					.min(1)
					.describe("The credential's name in the user's credentials list."),
			}),
		)
		.optional()
		.describe(
			'New n8n credentials the browser agent creates from values it finds on the pages. Never put the values in the goal.',
		),
});
export type CloudBrowserTaskInput = z.infer<typeof cloudBrowserTaskInputSchema>;

export type CloudBrowserTaskStartResult =
	| { status: 'started'; taskId: string }
	/** `message` says why, in words the orchestrator can pass on to the user. */
	| { status: 'rejected'; message: string };

/** The host side of the tool, bound to one orchestrator run. */
export type StartCloudBrowserTask = (
	input: CloudBrowserTaskInput,
) => Promise<CloudBrowserTaskStartResult>;

export function createStartCloudBrowserTaskTool(start: StartCloudBrowserTask) {
	return new Tool(ORCHESTRATION_TOOL_IDS.START_CLOUD_BROWSER_TASK)
		.description(
			'Do a task on a website in a cloud browser. The task runs in the background with its own ' +
				'browser, so you can keep talking to the user. Do not wait for it: you get the result ' +
				'when it ends. Write a complete goal, because the browser agent cannot see this conversation.',
		)
		.input(cloudBrowserTaskInputSchema)
		.handler(async (input: CloudBrowserTaskInput) => await start(input))
		.build();
}
