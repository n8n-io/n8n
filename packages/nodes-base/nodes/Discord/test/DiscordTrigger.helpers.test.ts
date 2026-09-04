import {
	buildEventItems,
	computeIntents,
	parseContentTypeFilter,
	type EventFilters,
} from '../DiscordTrigger.helpers';

const GUILD_MESSAGES = 1 << 9;
const GUILD_MESSAGE_REACTIONS = 1 << 10;
const MESSAGE_CONTENT = 1 << 15;
const GUILD_MEMBERS = 1 << 1;

describe('DiscordTrigger helpers', () => {
	describe('computeIntents', () => {
		it('requests message + content intents for messageCreate', () => {
			expect(computeIntents(['messageCreate'])).toBe(GUILD_MESSAGES | MESSAGE_CONTENT);
		});

		it('requests reaction intent for reactionAdd', () => {
			expect(computeIntents(['reactionAdd'])).toBe(GUILD_MESSAGE_REACTIONS);
		});

		it('requests the privileged members intent for memberAdd', () => {
			expect(computeIntents(['memberAdd'])).toBe(GUILD_MEMBERS);
		});

		it('ORs intents for multiple events without duplicating bits', () => {
			expect(computeIntents(['messageCreate', 'reactionAdd', 'memberAdd'])).toBe(
				GUILD_MESSAGES | MESSAGE_CONTENT | GUILD_MESSAGE_REACTIONS | GUILD_MEMBERS,
			);
		});

		it('returns 0 when nothing is selected', () => {
			expect(computeIntents([])).toBe(0);
		});

		it('maps the member and reaction-removed events to their intents', () => {
			expect(computeIntents(['reactionRemove'])).toBe(GUILD_MESSAGE_REACTIONS);
			expect(computeIntents(['memberRemove'])).toBe(GUILD_MEMBERS);
			expect(computeIntents(['memberUpdate'])).toBe(GUILD_MEMBERS);
			// memberAdd/Remove/Update all share one intent - no duplication
			expect(computeIntents(['memberAdd', 'memberRemove', 'memberUpdate'])).toBe(GUILD_MEMBERS);
		});
	});

	describe('parseContentTypeFilter', () => {
		it('returns an empty list for empty or whitespace-only input', () => {
			expect(parseContentTypeFilter('')).toEqual([]);
			expect(parseContentTypeFilter(undefined)).toEqual([]);
			expect(parseContentTypeFilter('   ')).toEqual([]);
			expect(parseContentTypeFilter(', ,  ,')).toEqual([]);
		});

		it('trims, lowercases, and drops blank entries', () => {
			expect(parseContentTypeFilter(' Image/PNG , ,image/GIF ')).toEqual([
				'image/png',
				'image/gif',
			]);
		});
	});

	describe('buildEventItems', () => {
		const baseFilters: EventFilters = {
			selectedEvents: ['messageCreate'],
			guildId: 'guild-1',
			channelIds: [],
			ignoreBots: false,
			excludeSelf: false,
			includeRoles: [],
			excludeRoles: [],
			attachmentContentTypes: [],
		};

		it('returns an item for a matching event and tags it with the eventType', () => {
			const items = buildEventItems(
				'MESSAGE_CREATE',
				{ guild_id: 'guild-1', channel_id: 'chan-1', content: 'hello' },
				baseFilters,
			);
			expect(items).toEqual([
				{
					json: {
						eventType: 'messageCreate',
						guild_id: 'guild-1',
						channel_id: 'chan-1',
						content: 'hello',
					},
				},
			]);
		});

		it('returns null when the gateway event is not selected', () => {
			expect(
				buildEventItems('MESSAGE_REACTION_ADD', { guild_id: 'guild-1' }, baseFilters),
			).toBeNull();
		});

		it('returns null for an unknown gateway event', () => {
			expect(buildEventItems('TYPING_START', { guild_id: 'guild-1' }, baseFilters)).toBeNull();
		});

		it('filters out events from a different guild', () => {
			expect(
				buildEventItems('MESSAGE_CREATE', { guild_id: 'other-guild' }, baseFilters),
			).toBeNull();
		});

		it('applies the channel filter when set', () => {
			const filters = { ...baseFilters, channelIds: ['chan-1'] };
			expect(
				buildEventItems('MESSAGE_CREATE', { guild_id: 'guild-1', channel_id: 'chan-2' }, filters),
			).toBeNull();
			expect(
				buildEventItems('MESSAGE_CREATE', { guild_id: 'guild-1', channel_id: 'chan-1' }, filters),
			).not.toBeNull();
		});

		it('fires for any of several selected channels', () => {
			const filters = { ...baseFilters, channelIds: ['chan-1', 'chan-3'] };
			expect(
				buildEventItems('MESSAGE_CREATE', { guild_id: 'guild-1', channel_id: 'chan-1' }, filters),
			).not.toBeNull();
			expect(
				buildEventItems('MESSAGE_CREATE', { guild_id: 'guild-1', channel_id: 'chan-3' }, filters),
			).not.toBeNull();
			expect(
				buildEventItems('MESSAGE_CREATE', { guild_id: 'guild-1', channel_id: 'chan-2' }, filters),
			).toBeNull();
		});

		it('listens to all channels when no channel is selected', () => {
			expect(
				buildEventItems(
					'MESSAGE_CREATE',
					{ guild_id: 'guild-1', channel_id: 'any-chan' },
					baseFilters,
				),
			).not.toBeNull();
		});

		it('drops a channel-bearing event with no channel_id when channels are filtered', () => {
			const filters = { ...baseFilters, channelIds: ['chan-1'] };
			expect(buildEventItems('MESSAGE_CREATE', { guild_id: 'guild-1' }, filters)).toBeNull();
		});

		describe('ignoreBots (Ignore Bot Actions)', () => {
			const botFilters = { ...baseFilters, ignoreBots: true };

			it('drops bot messages and keeps human messages for messageCreate', () => {
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', author: { bot: true } },
						botFilters,
					),
				).toBeNull();
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', author: { bot: false } },
						botFilters,
					),
				).not.toBeNull();
			});

			it('drops a bot reaction and keeps a human reaction for reactionAdd', () => {
				const filters = { ...botFilters, selectedEvents: ['reactionAdd'] };
				expect(
					buildEventItems(
						'MESSAGE_REACTION_ADD',
						{ guild_id: 'guild-1', member: { user: { bot: true } } },
						filters,
					),
				).toBeNull();
				expect(
					buildEventItems(
						'MESSAGE_REACTION_ADD',
						{ guild_id: 'guild-1', member: { user: { bot: false } } },
						filters,
					),
				).not.toBeNull();
			});

			it('drops a bot joining and keeps a human joining for memberAdd', () => {
				const filters = { ...botFilters, selectedEvents: ['memberAdd'] };
				expect(
					buildEventItems(
						'GUILD_MEMBER_ADD',
						{ guild_id: 'guild-1', user: { bot: true } },
						filters,
					),
				).toBeNull();
				expect(
					buildEventItems(
						'GUILD_MEMBER_ADD',
						{ guild_id: 'guild-1', user: { bot: false } },
						filters,
					),
				).not.toBeNull();
			});

			it('passes through events whose actor is unknown (reaction-removed, message-deleted)', () => {
				expect(
					buildEventItems(
						'MESSAGE_REACTION_REMOVE',
						{ guild_id: 'guild-1', user_id: 'someone' },
						{ ...botFilters, selectedEvents: ['reactionRemove'] },
					),
				).not.toBeNull();
				expect(
					buildEventItems(
						'MESSAGE_DELETE',
						{ guild_id: 'guild-1' },
						{ ...botFilters, selectedEvents: ['messageDelete'] },
					),
				).not.toBeNull();
			});
		});

		it('matches reaction-removed and member left/updated events', () => {
			expect(
				buildEventItems(
					'MESSAGE_REACTION_REMOVE',
					{ guild_id: 'guild-1', channel_id: 'c1' },
					{ ...baseFilters, selectedEvents: ['reactionRemove'] },
				),
			).toEqual([{ json: { eventType: 'reactionRemove', guild_id: 'guild-1', channel_id: 'c1' } }]);

			expect(
				buildEventItems(
					'GUILD_MEMBER_REMOVE',
					{ guild_id: 'guild-1', user: { id: 'u1' } },
					{ ...baseFilters, selectedEvents: ['memberRemove'] },
				),
			).not.toBeNull();

			expect(
				buildEventItems(
					'GUILD_MEMBER_UPDATE',
					{ guild_id: 'guild-1', user: { id: 'u1' } },
					{ ...baseFilters, selectedEvents: ['memberUpdate'] },
				),
			).not.toBeNull();
		});

		describe('excludeSelf', () => {
			const selfFilters = { ...baseFilters, excludeSelf: true, botUserId: 'bot-1' };

			it("drops the bot's own message", () => {
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', author: { id: 'bot-1' } },
						selfFilters,
					),
				).toBeNull();
			});

			it("drops the bot's own reaction", () => {
				expect(
					buildEventItems(
						'MESSAGE_REACTION_ADD',
						{ guild_id: 'guild-1', user_id: 'bot-1' },
						{ ...selfFilters, selectedEvents: ['reactionAdd'] },
					),
				).toBeNull();
			});

			it('keeps events from other users', () => {
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', author: { id: 'someone' } },
						selfFilters,
					),
				).not.toBeNull();
			});

			it('does nothing without a known botUserId', () => {
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', author: { id: 'bot-1' } },
						{ ...baseFilters, excludeSelf: true },
					),
				).not.toBeNull();
			});
		});

		describe('role filters', () => {
			it('excludeRoles drops an actor holding an excluded role (via member.roles)', () => {
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', member: { roles: ['r1', 'r2'] } },
						{ ...baseFilters, excludeRoles: ['r2'] },
					),
				).toBeNull();
			});

			it('includeRoles keeps only actors with a listed role', () => {
				const filters = { ...baseFilters, includeRoles: ['vip'] };
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', member: { roles: ['vip'] } },
						filters,
					),
				).not.toBeNull();
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', member: { roles: ['other'] } },
						filters,
					),
				).toBeNull();
			});

			it('reads roles from the top-level field for member events', () => {
				expect(
					buildEventItems(
						'GUILD_MEMBER_UPDATE',
						{ guild_id: 'guild-1', roles: ['admin'] },
						{ ...baseFilters, selectedEvents: ['memberUpdate'], excludeRoles: ['admin'] },
					),
				).toBeNull();
			});

			it('passes through when role data is absent (e.g. message-deleted)', () => {
				// includeRoles set, but a deleted message carries no member/roles → must still fire
				expect(
					buildEventItems(
						'MESSAGE_DELETE',
						{ guild_id: 'guild-1', id: 'm1' },
						{ ...baseFilters, selectedEvents: ['messageDelete'], includeRoles: ['vip'] },
					),
				).not.toBeNull();
			});
		});

		describe('attachment content-type filter', () => {
			const imageMsg = {
				guild_id: 'guild-1',
				attachments: [{ content_type: 'image/png' }],
			};

			it('keeps a message whose attachment matches a glob pattern', () => {
				expect(
					buildEventItems('MESSAGE_CREATE', imageMsg, {
						...baseFilters,
						attachmentContentTypes: ['image/*'],
					}),
				).not.toBeNull();
			});

			it('drops a message with no attachments when the filter is set', () => {
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', content: 'hi' },
						{ ...baseFilters, attachmentContentTypes: ['image/*'] },
					),
				).toBeNull();
			});

			it('drops a message whose attachment type does not match', () => {
				expect(
					buildEventItems('MESSAGE_CREATE', imageMsg, {
						...baseFilters,
						attachmentContentTypes: ['application/pdf'],
					}),
				).toBeNull();
			});

			it('matches any attachment with the * wildcard, even unknown content types', () => {
				expect(
					buildEventItems(
						'MESSAGE_CREATE',
						{ guild_id: 'guild-1', attachments: [{}] },
						{ ...baseFilters, attachmentContentTypes: ['*'] },
					),
				).not.toBeNull();
			});

			it('does not gate non-message events (reaction passes through)', () => {
				expect(
					buildEventItems(
						'MESSAGE_REACTION_ADD',
						{ guild_id: 'guild-1' },
						{
							...baseFilters,
							selectedEvents: ['reactionAdd'],
							attachmentContentTypes: ['image/*'],
						},
					),
				).not.toBeNull();
			});
		});

		it('does not apply the channel filter to events without a channel (memberAdd)', () => {
			const filters: EventFilters = {
				selectedEvents: ['memberAdd'],
				guildId: 'guild-1',
				channelIds: ['chan-1'],
				ignoreBots: false,
				excludeSelf: false,
				includeRoles: [],
				excludeRoles: [],
				attachmentContentTypes: [],
			};
			const items = buildEventItems(
				'GUILD_MEMBER_ADD',
				{ guild_id: 'guild-1', user: { id: 'u1' } },
				filters,
			);
			expect(items).not.toBeNull();
		});
	});
});
