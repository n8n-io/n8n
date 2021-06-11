module.exports = {
	de: {
		bitwarden: {
			credentials: {
				bitwardenApi: {
					environment: {
						displayName: 'Umgebung',
						options: {
							cloudHosted: {
								displayName: 'Cloud-gehostet',
							},
							selfcloudHosted: {
								displayName: 'Selbst gehostet',
							},
						},
					},
				},
			},

			parameters: {
				resource: {
					displayName: 'Ressource',
					options: {
						collection: {
							displayName: 'Sammlung',
						},
						event: {
							displayName: 'Ereignis',
						},
						group: {
							displayName: 'Gruppe',
						},
						member: {
							displayName: 'Mitglied',
						},
					},
				},
				operation: {
					displayName: 'Aktion',
					options: {
						get: {
							displayName: 'Holen',
						},
						delete: {
							displayName: 'Löschen',
						},
						getAll: {
							displayName: 'Alle holen',
						},
						update: {
							displayName: 'Editieren',
						},
					},
				},
				collectionId: {
					displayName: 'Sammlung-ID',
				},
				returnAll: {
					displayName: 'Alle bringen',
				},
				limit: {
					displayName: 'Grenze',
				},
				// filters: {
				// 	displayName: 'Filter',
				// },
				// actingUserId: {
				// 	displayName: 'Handelnder Benutzer',
				// 	description: 'Die eindeutige Kennung des handelnden Benutzers.',
				// },
				// startDate: {
				// 	displayName: 'Startdatum',
				// },
				// endDate: {
				// 	displayName: 'Enddatum',
				// },
				// itemId: {
				// 	displayName: 'Artikel-ID',
				// },

				filters: {
					displayName: 'Filter',
					options: {
						author: {
							displayName: 'Autor',
						},
						branch: {
							displayName: 'Ast',
						},
						committer: {
							displayName: 'Commit-Macher',
						},
					},
				},
			},
		},
	},
};
