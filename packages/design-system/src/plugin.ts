/* eslint-disable @typescript-eslint/naming-convention */
import type { PluginObject } from 'vue';
import {
	N8nActionBox,
	N8nActionDropdown,
	N8nActionToggle,
	N8nAlert,
	N8nAvatar,
	N8nBadge,
	N8nBlockUi,
	N8nButton,
	N8nElButton,
	N8nCallout,
	N8nCard,
	N8nDatatable,
	N8nFormBox,
	N8nFormInputs,
	N8nFormInput,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInfoAccordion,
	N8nInfoTip,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nLink,
	N8nLoading,
	N8nMarkdown,
	N8nMenu,
	N8nMenuItem,
	N8nNodeCreatorNode,
	N8nNodeIcon,
	N8nNotice,
	N8nOption,
	N8nPopover,
	N8nPulse,
	N8nRadioButtons,
	N8nSelect,
	N8nSpinner,
	N8nSticky,
	N8nTabs,
	N8nTag,
	N8nTags,
	N8nText,
	N8nTooltip,
	N8nTree,
	N8nUserInfo,
	N8nUserSelect,
	N8nUsersList,
	N8nResizeWrapper,
	N8nRecycleScroller,
	N8nCheckbox,
} from './components';

export const N8nPlugin: PluginObject<{}> = {
	install: (app) => {
		app.component('n8n-info-accordion', N8nInfoAccordion);
		app.component('n8n-action-box', N8nActionBox);
		app.component('n8n-action-dropdown', N8nActionDropdown);
		app.component('n8n-action-toggle', N8nActionToggle);
		app.component('n8n-alert', N8nAlert);
		app.component('n8n-avatar', N8nAvatar);
		app.component('n8n-badge', N8nBadge);
		app.component('n8n-block-ui', N8nBlockUi);
		app.component('n8n-button', N8nButton);
		app.component('el-button', N8nElButton);
		app.component('n8n-callout', N8nCallout);
		app.component('n8n-card', N8nCard);
		app.component('n8n-datatable', N8nDatatable);
		app.component('n8n-form-box', N8nFormBox);
		app.component('n8n-form-inputs', N8nFormInputs);
		app.component('n8n-form-input', N8nFormInput);
		app.component('n8n-icon', N8nIcon);
		app.component('n8n-icon-button', N8nIconButton);
		app.component('n8n-info-tip', N8nInfoTip);
		app.component('n8n-input', N8nInput);
		app.component('n8n-input-label', N8nInputLabel);
		app.component('n8n-input-number', N8nInputNumber);
		app.component('n8n-loading', N8nLoading);
		app.component('n8n-heading', N8nHeading);
		app.component('n8n-link', N8nLink);
		app.component('n8n-markdown', N8nMarkdown);
		app.component('n8n-menu', N8nMenu);
		app.component('n8n-menu-item', N8nMenuItem);
		app.component('n8n-node-creator-node', N8nNodeCreatorNode);
		app.component('n8n-node-icon', N8nNodeIcon);
		app.component('n8n-notice', N8nNotice);
		app.component('n8n-option', N8nOption);
		app.component('n8n-popover', N8nPopover);
		app.component('n8n-pulse', N8nPulse);
		app.component('n8n-select', N8nSelect);
		app.component('n8n-spinner', N8nSpinner);
		app.component('n8n-sticky', N8nSticky);
		app.component('n8n-radio-buttons', N8nRadioButtons);
		app.component('n8n-tags', N8nTags);
		app.component('n8n-tabs', N8nTabs);
		app.component('n8n-tag', N8nTag);
		app.component('n8n-text', N8nText);
		app.component('n8n-tooltip', N8nTooltip);
		app.component('n8n-user-info', N8nUserInfo);
		app.component('n8n-tree', N8nTree);
		app.component('n8n-users-list', N8nUsersList);
		app.component('n8n-user-select', N8nUserSelect);
		app.component('n8n-resize-wrapper', N8nResizeWrapper);
		app.component('n8n-recycle-scroller', N8nRecycleScroller);
		app.component('n8n-checkbox', N8nCheckbox);
	},
};
