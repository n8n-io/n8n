import { TELEMETRY_EVENT } from '../telemetry-events';
import { getEventValidationError } from '../validate';

const events = TELEMETRY_EVENT.CUSTOM_MCP_SERVERS;
const builderEvents = [
	events.USER_CREATED_CUSTOM_MCP_SERVER,
	events.USER_ADDED_TOOL_TO_CUSTOM_MCP_SERVER,
	events.USER_DRAFTED_TOOL_OF_CUSTOM_MCP_SERVER,
	events.USER_BLOCKED_PERSON_FROM_CUSTOM_MCP_SERVER,
	events.USER_RESTORED_ACCESS_TO_CUSTOM_MCP_SERVER,
	events.USER_DELETED_CUSTOM_MCP_SERVER,
];
const clientEvents = [
	events.USER_CONNECTED_TO_CUSTOM_MCP_SERVER,
	events.USER_CALLED_CUSTOM_MCP_SERVER_TOOL,
];
const backendEvents = [...builderEvents, ...clientEvents];
// The share page also works without a sign-in, so these events can have no `user_id`.
const sharePageEvents = [
	events.USER_VIEWED_MCP_SERVER_SHARE_PAGE,
	events.USER_CLICKED_CLIENT_ON_MCP_SERVER_SHARE_PAGE,
];

describe('custom MCP server events', () => {
	it('has the seven backend events of the build spec, the draft event, and the two share page events', () => {
		expect(Object.values(events)).toEqual(
			expect.arrayContaining([...backendEvents, ...sharePageEvents]),
		);
		expect(Object.keys(events)).toHaveLength(10);
	});

	it.each(backendEvents.map((event) => [event.name, event]))(
		'%s needs the user id, because PostHog drops a backend event without it',
		(_name, event) => {
			const shape = event.properties.shape as Record<
				string,
				{ safeParse(v: unknown): { success: boolean } }
			>;
			expect(shape.user_id.safeParse(undefined).success).toBe(false);
		},
	);

	it.each(builderEvents.map((event) => [event.name, event]))(
		'%s says if the action came from the UI or the Assistant',
		(_name, event) => {
			const shape = event.properties.shape as Record<
				string,
				{ safeParse(v: unknown): { success: boolean } }
			>;
			expect(shape.source.safeParse('ui').success).toBe(true);
			expect(shape.source.safeParse('assistant').success).toBe(true);
			expect(shape.source.safeParse('api').success).toBe(false);
		},
	);

	it.each(clientEvents.map((event) => [event.name, event]))(
		'%s has no source, because an AI client starts it',
		(_name, event) => {
			expect(Object.keys(event.properties.shape)).not.toContain('source');
		},
	);

	it('accepts a share page view without a sign-in', () => {
		expect(
			getEventValidationError(events.USER_VIEWED_MCP_SERVER_SHARE_PAGE, {
				server_id: 'server-1',
				signed_in: false,
				can_connect: false,
				result: 'found',
			}),
		).toBeNull();
	});

	it('accepts a share page view that finds no server, without a server id', () => {
		expect(
			getEventValidationError(events.USER_VIEWED_MCP_SERVER_SHARE_PAGE, {
				user_id: 'user-1',
				signed_in: true,
				can_connect: false,
				result: 'not_found',
			}),
		).toBeNull();
	});

	it('refuses a client click with an unknown method', () => {
		expect(
			getEventValidationError(events.USER_CLICKED_CLIENT_ON_MCP_SERVER_SHARE_PAGE, {
				server_id: 'server-1',
				client: 'cursor',
				method: 'open',
			}),
		).not.toBeNull();
	});

	it('accepts a draft for one field, and refuses an unknown status', () => {
		const draft = {
			server_id: 'server-1',
			user_id: 'user-1',
			field: 'toolName',
			status: 'drafted',
			source: 'ui',
		};

		expect(
			getEventValidationError(events.USER_DRAFTED_TOOL_OF_CUSTOM_MCP_SERVER, draft),
		).toBeNull();
		expect(
			getEventValidationError(events.USER_DRAFTED_TOOL_OF_CUSTOM_MCP_SERVER, {
				...draft,
				status: 'timeout',
			}),
		).not.toBeNull();
	});

	it('accepts a tool call from a client', () => {
		expect(
			getEventValidationError(events.USER_CALLED_CUSTOM_MCP_SERVER_TOOL, {
				server_id: 'server-1',
				user_id: 'user-1',
				client_name: 'Claude Code',
				tool_kind: 'workflow',
				status: 'error',
				duration_ms: 120,
			}),
		).toBeNull();
	});
});
