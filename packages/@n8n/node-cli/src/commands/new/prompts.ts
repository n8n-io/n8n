import { select, text } from '@clack/prompts';

import { templates } from '../../template/templates';
import { withCancelHandler } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';

export const nodeNamePrompt = async () =>
	await withCancelHandler(
		text({
			message: 'What is your node called?',
			placeholder: 'n8n-nodes-example',
			validate: validateNodeName,
			defaultValue: 'n8n-nodes-example',
		}),
	);

export const nodeTypePrompt = async () =>
	await withCancelHandler(
		select<'declarative' | 'programmatic'>({
			message: 'What kind of node are you building?',
			options: [
				{
					label: 'HTTP API',
					value: 'declarative',
					hint: 'Low-code, faster approval for n8n Cloud',
				},
				{
					label: 'Other',
					value: 'programmatic',
					hint: 'Programmatic node with full flexibility',
				},
			],
			initialValue: 'declarative',
		}),
	);

export const declarativeTemplatePrompt = async () =>
	await withCancelHandler(
		select<keyof typeof templates.declarative>({
			message: 'What template do you want to use?',
			options: Object.entries(templates.declarative).map(([value, template]) => ({
				value: value as keyof typeof templates.declarative,
				label: template.name,
				hint: template.description,
			})),
			initialValue: 'githubIssues',
		}),
	);
