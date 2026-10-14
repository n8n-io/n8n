/** What the app package is called wherever it is offered. */
export const TEAMS_PACKAGE_FILENAME = 'n8n-agent-teams-app.zip';

/** The four availability settings a Teams channel runs on. */
export interface TeamsAvailability {
	teamChannels: boolean;
	groupChats: boolean;
	readAllChannelMessages: boolean;
	readAllGroupMessages: boolean;
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
