import { t } from '../../../../locale';
import { renderSuggestionMenu } from '../suggestionMenu';
import type { MarkdownSlashCommand } from './types';

const translate = (path: string) => t(path, undefined);

export const renderSlashCommandMenu = () =>
	renderSuggestionMenu<MarkdownSlashCommand>({
		ariaLabel: translate('markdownEditor.slashCommandMenuLabel'),
		dataTestId: 'markdown-slash-command-menu',
		itemDataTestIdPrefix: 'markdown-slash-command',
	});
