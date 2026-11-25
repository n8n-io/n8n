/** One admin consent grants every permission the app declares, so they are approved together. */
export const GRAPH_APP_ROLES: ReadonlyArray<{ permission: string; id: string }> = [
	{ permission: 'Files.Read.All', id: '01d4889c-1287-42c6-ac1f-5d1e02578ef6' },
	{ permission: 'User.ReadBasic.All', id: '97235f07-e226-4f63-ace3-39588e11d3a1' },
	{ permission: 'Team.ReadBasic.All', id: '2280dda6-0bfd-44ee-a2f4-cb867cfc4c1e' },
	{ permission: 'Channel.ReadBasic.All', id: '59a6b24b-4225-4393-8165-ebaec5f55d7a' },
];
