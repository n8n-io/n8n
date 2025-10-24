import { DOCS_DOMAIN } from '@/constants';

export const COMMUNITY_PACKAGE_INSTALL_MODAL_KEY = 'communityPackageInstall';
export const COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY = 'communityPackageManageConfirm';

export const COMMUNITY_NODES_INSTALLATION_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/community-nodes/installation/gui-install/`;
export const COMMUNITY_NODES_RISKS_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/community-nodes/risks/`;
export const COMMUNITY_NODES_BLOCKLIST_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/community-nodes/blocklist/`;
export const NPM_KEYWORD_SEARCH_URL =
	'https://www.npmjs.com/search?q=keywords%3An8n-community-node-package';

export const COMMUNITY_PACKAGE_MANAGE_ACTIONS = {
	UNINSTALL: 'uninstall',
	UPDATE: 'update',
	VIEW_DOCS: 'view-documentation',
};
