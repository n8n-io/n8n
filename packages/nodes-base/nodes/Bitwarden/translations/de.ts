module.exports = {
	de: {
		bitwarden: {

			// ----------------------------------
			//       credentials params
			// ----------------------------------

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

			// ----------------------------------
			//          node params
			// ----------------------------------

			parameters: {

				/**
				 * Examples of `options` parameters.
				 */
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

				/**
				 * Examples of `string`, `number` and `boolean` parameters.
				 */
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

				/**
				 * Example of `collection` parameters.
				 */
				filters: {
					displayName: 'Filter',
					options: {
						actingUserId: {
							displayName: 'Handelnder Benutzer',
							description: 'Die eindeutige Kennung des handelnden Benutzers.',
						},
						start: {
							displayName: 'Startdatum',
						},
						end: {
							displayName: 'Enddatum',
						},
					},
				},

				/**
				 * Examples of fields in `collection` parameters.
				 * Note: Same level of nesting as `collection`.
				 */
				actingUserId: {
					displayName: 'Handelnder Benutzer',
				},
				start: {
					displayName: 'Startdatum',
					placeholder: 'Deutsch',
				},
				end: {
					displayName: 'Enddatum',
					placeholder: 'Deutsch',
				},

			},
		},
	},
};
