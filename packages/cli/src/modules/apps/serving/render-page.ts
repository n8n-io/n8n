import { renderTemplate } from '../rendering/templates';

export const renderAppPageNotFound = async () => await renderTemplate('app-page-404', {});

export const renderAppPageUnpublished = async () =>
	await renderTemplate('app-page-unpublished', {});
