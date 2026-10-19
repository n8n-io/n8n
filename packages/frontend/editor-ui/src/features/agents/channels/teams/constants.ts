/** What the app package is called wherever it is offered. */
export const TEAMS_PACKAGE_FILENAME = 'n8n-agent-teams-app.zip';

export function entraApiPermissionsUrl(appId: string): string {
	return `https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallAnAPI/appId/${encodeURIComponent(appId)}`;
}

// The bot's subscription and resource group are picked in Azure, so this lists every Azure Bot.
export const AZURE_BOTS_URL = 'https://portal.azure.com/#browse/Microsoft.BotService%2FbotServices';

export const ENTRA_APP_REGISTRATIONS_URL =
	'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade';

/** The four availability settings a Teams channel runs on. */
export interface TeamsAvailability {
	teamChannels: boolean;
	groupChats: boolean;
	readAllChannelMessages: boolean;
	readAllGroupMessages: boolean;
}

/** Files shared there live in SharePoint or OneDrive, which needs an admin's approval to read. */
export function readsSharedConversations(availability: TeamsAvailability): boolean {
	return availability.teamChannels || availability.groupChats;
}

/** The settings a saved channel runs on, defaulted for a channel with none. */
export function availabilityFrom(saved?: Partial<TeamsAvailability>): TeamsAvailability {
	return {
		teamChannels: saved?.teamChannels ?? false,
		groupChats: saved?.groupChats ?? false,
		readAllChannelMessages: saved?.readAllChannelMessages ?? false,
		readAllGroupMessages: saved?.readAllGroupMessages ?? false,
	};
}
