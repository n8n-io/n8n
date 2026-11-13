import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

// A declarative webhook trigger (preview). n8n builds `webhookMethods` and `webhook()`
// from `description.trigger`. This example uses a placeholder API that:
// - registers a webhook with `POST /webhooks` and returns `{ "id": "...", "status": "active" }`
// - reads a webhook with `GET /webhooks/{id}` and removes it with `DELETE /webhooks/{id}`
// - signs each event with HMAC-SHA256 over `<timestamp>.<body>`
// - sends events as `{ "event": "task.created", "data": { ... } }`
// The trigger emits the full event body, so the workflow can read `event`.
export class ExampleWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Example Webhook Trigger',
		name: 'exampleWebhookTrigger',
		icon: { light: 'file:../../icons/example.svg', dark: 'file:../../icons/example.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when an event happens in the Example API',
		defaults: {
			name: 'Example Webhook Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'exampleApi', required: true }],
		requestDefaults: {
			baseURL: 'https://api.example.com/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		// The webhook endpoint must have the name `default`.
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['task.created'],
				options: [
					// The API also gets `["*"]` for this option. Make sure that it accepts this value.
					{ name: 'All Events', value: '*' },
					{ name: 'Task Created', value: 'task.created' },
					{ name: 'Task Deleted', value: 'task.deleted' },
				],
				description: 'The events that start the workflow',
			},
		],
		trigger: {
			type: 'webhook',
			// Registers the webhook when the workflow activates and removes it when it deactivates.
			// `$staticData` holds the values that `create.store` writes.
			lifecycle: {
				checkExists: {
					routing: {
						request: {
							method: 'GET',
							url: '=/webhooks/{{$staticData.webhookId}}',
						},
					},
					// Register again if the secret is missing, because no event can pass verification.
					requireKeys: ['webhookSecret'],
				},
				create: {
					// Make a random signing secret and send it to the API.
					generate: { secret: { type: 'hex', length: 32 } },
					routing: {
						request: {
							method: 'POST',
							url: '/webhooks',
							body: {
								url: '={{$webhookUrl}}',
								events: '={{$parameter["events"]}}',
								secret: '={{$generated.secret}}',
							},
						},
					},
					validateResponse: '={{$response.status === "active"}}',
					// Always store the webhook ID, so that `checkExists` and `delete` can use it.
					store: {
						webhookId: '={{$response.id}}',
						webhookSecret: '={{$generated.secret}}',
					},
				},
				delete: {
					routing: {
						request: {
							method: 'DELETE',
							url: '=/webhooks/{{$staticData.webhookId}}',
						},
					},
				},
			},
			// Handles each incoming request. `$webhookRequest` holds its headers and body.
			handler: {
				// A request with a wrong signature gets 401 and starts no workflow.
				verification: {
					algorithm: 'hmac-sha256',
					signatureHeader: 'x-example-signature',
					secret: '={{$staticData.webhookSecret}}',
					timestampHeader: 'x-example-timestamp',
					// Sign the timestamp too, so that an old request cannot be sent again.
					signedPayload: '={{$webhookRequest.headers["x-example-timestamp"]}}.{body}',
				},
				// The API sends `{ "type": "ping" }` to test the URL. n8n replies and starts no workflow.
				// Verification runs first, so the ping must also have a valid signature.
				// If the API tests the URL while it registers, n8n does not have the secret yet. Use `handshake` for that test.
				ping: { when: '={{$webhookRequest.body.type === "ping"}}' },
				// Start the workflow only for the events that the user selected.
				filter: {
					allowed: '={{$parameter["events"]}}',
					actual: '={{$webhookRequest.body.event}}',
					wildcard: '*',
				},
			},
		},
	};
}
