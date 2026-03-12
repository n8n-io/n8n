/**
 * F45: SAP Connection
 *
 * Demonstrates authenticating with SAP Business One Service Layer
 * API. Sets up login credentials, attempts connection with error
 * handling, and extracts the session ID on success.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F45 - Sap Connection (Requires credentials)',
	triggers: [webhook('/f45-sap-connection', { method: 'POST' })],
	async run(ctx) {
		const loginData = await ctx.step({ name: 'Set Login Data' }, async () => {
			return {
				sapUrl: ctx.getSecret('SAP_URL') ?? 'https://dummyjson.com/',
				sapUsername: ctx.getSecret('SAP_USERNAME') ?? '',
				sapPassword: ctx.getSecret('SAP_PASSWORD') ?? '',
				sapCompanyDb: ctx.getSecret('SAP_COMPANY_DB') ?? '',
			};
		});

		try {
			const connection = await ctx.step({ name: 'SAP Connection' }, async () => {
				const res = await fetch(`${loginData.sapUrl}Login`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						UserName: loginData.sapUsername,
						Password: loginData.sapPassword,
						CompanyDB: loginData.sapCompanyDb,
					}),
				});
				if (!res.ok) throw new Error(`SAP login failed: HTTP ${res.status}`);
				return (await res.json()) as { SessionId: string };
			});

			const success = await ctx.step({ name: 'Success' }, async () => {
				return { sessionID: connection.SessionId };
			});

			return success;
		} catch (error) {
			const failed = await ctx.step({ name: 'Failed' }, async () => {
				return {
					error: true,
					errorMessage: error instanceof Error ? error.message : 'Unknown error',
				};
			});
			return failed;
		}
	},
});
